// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { IEthosProfile } from "./interfaces/IEthosProfile.sol";
import { ITargetStatus } from "./interfaces/ITargetStatus.sol";
import { UUPSUpgradeable } from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import { ETHOS_REVIEW, ETHOS_ATTESTATION } from "./utils/Constants.sol";
import { AccessControl } from "./utils/AccessControl.sol";
import { ProfileNotFound, ProfileExists, ProfileNotFoundForAddress, AddressCompromised, AddressAlreadyInvited, MaxInvitesReached, MaxAddressesReached, ProfileExistsForAddress, ProfileAccess, AddressAuthorization, InsufficientInvites, AddressNotInvited, InvalidSender, InvalidIndex } from "./errors/ProfileErrors.sol";
import { Common } from "./utils/Common.sol";

/**
 * @title EthosProfile
 * @dev The EthosProfile contract serves as the primary profile management system of the Ethos Network protocol.
 * Users who join the network will first interact with EthosProfile to create their profile and receive a unique profile ID.
 * This profile ID serves as the user's identity in the Ethos Network and allows users to interact with all other Ethos Network smart contract systems.
 * All protocol interactions are associated with this profile ID, which also serves a record-keeping purpose.
 *
 * Key Features:
 * - Users can associate multiple addresses with a single profile ID, enabling participation from any wallet they own.
 * - Profiles are fully public and transparent, acting as a tool for others to verify on-chain activities and history.
 * - Implements an invite system for creating new profiles.
 * - Supports the creation of "mock" profiles for tracking reviews and attestations without associated subjects.
 * - Allows users to archive and restore their profiles.
 *
 * Invite System:
 * - To create a profile on Ethos Network, a user's address must first be invited by an existing profile.
 * - The inviting profile must hold sufficient invites (distributed by admin).
 * - Upon receiving an invite, the user may accept it and create a profile.
 * - A user may receive multiple concurrent invites for the same address.
 * - The profile ID of the inviter is forever associated with the newly created profile.
 * - This system promotes responsible growth of the network and creates a chain of accountability among users.
 *
 * Multiple Addresses:
 * - Users are encouraged to register different addresses with their profile ID.
 * - In case of account compromises, a profile can unregister an account and mark it as compromised.
 * - After registration, an address can never again be registered to another profile, even if it is archived.
 * - Unregistered accounts still remain associated with their original profile for historical tracking.
 *
 * Mock Profiles:
 * - In addition to user profiles, EthosProfile is used to track reviews (from EthosReview.sol) and attestations (from EthosAttestation.sol)
 * - When a review or attestation is created without an associated subject profileId, EthosProfile will issue a "mock id" to it.
 * - A mock ID is an empty, non-user profile used to track these activity items. This ensures reviews and attestations for the same
 *   subject are linked together with a distinct ID.
 */
contract EthosProfile is IEthosProfile, ITargetStatus, AccessControl, UUPSUpgradeable, Common {
  /**
   * @dev Constructor that disables initializers when the implementation contract is deployed.
   * This prevents the implementation contract from being initialized, which is important for
   * security since the implementation contract should never be used directly, only through
   * delegatecall from the proxy.
   */
  constructor() {
    _disableInitializers();
  }

  enum AddressClaimStatus {
    Unclaimed,
    Claimed
  }

  // Tracks the total number of profiles created. Initial value is 1 since no profile with ID 0 exists.
  uint256 public profileCount;
  // Default number of invites each profile starts with upon creation. Can be modified by an admin.
  uint256 public defaultNumberOfInvites;

  // Stores profile information, where the key is the profile ID, and the value is the Profile struct.
  mapping(uint256 => Profile) private profiles;
  // Maps a user's address to their profile ID for quick lookups. This includes removed addresses; do not rely on it for verification.
  mapping(address => uint256) public profileIdByAddress;
  // Keeps track of addresses that have been removed from a profile, preventing certain actions from being taken by these addresses.
  mapping(address => bool) public isAddressCompromised;
  // Maps an attestation hash to a profile ID, linking attestations to profiles.
  mapping(bytes32 => uint256) public profileIdByAttestation;
  // Tracks the timestamp at which a specific user was invited by a profile.
  mapping(uint256 => mapping(address => uint256)) public sentAt;

  // Add storage gap as the last storage variable
  // This allows us to add new storage variables in future upgrades
  // by reducing the size of this gap
  uint256[50] private __gap;

  event MockProfileCreated(uint256 indexed mockId);
  event ProfileCreated(uint256 indexed profileId, address indexed addr);
  event ProfileArchived(uint256 indexed profileId);
  event ProfileRestored(uint256 indexed profileId);
  event AddressClaim(
    uint256 indexed profileId,
    address indexed addr,
    AddressClaimStatus indexed claim
  );
  event UserInvited(uint256 inviterID, address inviteeAddress);
  event DefaultInvitesChanged(uint256 defaultInvites);
  event InvitesAdded(uint256 profileId, uint256 amount);
  event Uninvited(
    uint256 inviterId,
    address inviterAddress,
    uint256 remainingInvites,
    address uninvitedUser
  );

  modifier isEthosAttestation() {
    if (msg.sender != contractAddressManager.getContractAddressForName(ETHOS_ATTESTATION)) {
      revert InvalidSender();
    }
    _;
  }

  modifier onlyNonCompromisedAddress(address addr) {
    if (isAddressCompromised[addr]) {
      revert AddressCompromised(addr);
    }
    _;
  }

  /**
   * @dev Initializes the contract.
   * @param owner Owner address.
   * @param admin Admin address.
   * @param expectedSigner ExpectedSigner address.
   * @param signatureVerifier SignatureVerifier address.
   * @param contractAddressManagerAddr ContractAddressManagerAddr address.
   */
  function initialize(
    address owner,
    address admin,
    address expectedSigner,
    address signatureVerifier,
    address contractAddressManagerAddr
  ) external initializer {
    __accessControl_init(
      owner,
      admin,
      expectedSigner,
      signatureVerifier,
      contractAddressManagerAddr
    );
    __UUPSUpgradeable_init();
    maxNumberOfInvites = 2048;
    maxNumberOfAddresses = 128;
    profileCount = 1; // no profiles with id 0
    _createProfile(owner);
    profiles[1].inviteInfo.available = 10;
    // only the origin can invite themself
    profiles[1].inviteInfo.invitedBy = 1;
  }

  /**
   * @notice Restricts upgrading to owner
   * @param newImplementation Address of new implementation contract
   */
  function _authorizeUpgrade(
    address newImplementation
  ) internal override onlyOwner onlyNonZeroAddress(newImplementation) {
    // Intentionally left blank to ensure onlyOwner and zeroCheck modifiers run
  }

  /**
   * @dev Creates a new Ethos profile for the sender.
   * @param inviterId Profile ID of the account that is inviting the new user
   * @notice This function can only be called by an address that has been invited by an existing profile.
   * The inviter must have available invites and their profile must be active.
   */
  function createProfile(
    uint256 inviterId
  ) external whenNotPaused onlyNonCompromisedAddress(msg.sender) {
    (
      bool inviteSenderVerified,
      bool inviteSenderArchived,
      bool inviteSenderIsMock
    ) = profileStatusById(inviterId);
    if (!inviteSenderVerified || inviteSenderArchived || inviteSenderIsMock) {
      revert InvalidSender();
    }
    _inviterProfileAuthorizedSender(inviterId, msg.sender);

    uint256 newID = _createProfile(msg.sender);
    profiles[newID].inviteInfo.invitedBy = inviterId;
    profiles[inviterId].inviteInfo.acceptedIds.push(newID);
  }

  /**
   * @dev Enables user to authorize the address of an invitee to create a profile
   * @param invitee Address of user invited to ETHOS
   * @notice This function checks if the sender has available invites and if the invitee
   * is eligible to receive an invite. It updates the invite information and emits an event.
   */
  function inviteAddress(
    address invitee
  ) public whenNotPaused onlyNonZeroAddress(invitee) onlyNonCompromisedAddress(invitee) {
    (bool verified, bool archived, bool mock, ) = profileStatusByAddress(msg.sender);

    if (!verified || archived || mock) {
      revert InvalidSender();
    }

    // because profileStatusByAddress does not check if the address has been removed,
    // this will prevent invitations being sent to removed addresses
    (bool recipientExists, , bool recipientMock, ) = profileStatusByAddress(invitee);

    if (recipientExists && !recipientMock) {
      revert ProfileExistsForAddress(invitee);
    }

    uint256 profile = profileIdByAddress[msg.sender];

    _profileShouldHaveInvites(profile);

    _isAddressAlreadyInvited(profile, invitee);

    sentInviteIndexByProfileIdAndAddress[profile][invitee] = profiles[profile]
      .inviteInfo
      .sent
      .length;
    profiles[profile].inviteInfo.sent.push(invitee);
    profiles[profile].inviteInfo.available--;
    sentAt[profile][invitee] = block.timestamp;
    emit UserInvited(profile, invitee);
  }

  /**
   * @dev Allows a user to invite multiple addresses in a single transaction.
   * @param invitees An array of addresses to be invited.
   * @notice It is up to the caller to determine the array size and feasible gas costs.
   * All conditions from inviteAddress are still applicable.
   * The gas cost increases linearly with the number of invitees, so be mindful of potential gas limits.
   */
  function bulkInviteAddresses(address[] calldata invitees) external whenNotPaused {
    for (uint256 i = 0; i < invitees.length; i++) {
      inviteAddress(invitees[i]);
    }
  }

  /**
   * @dev Enables existing user to remove a pending invite and restore available invites
   * @param user Address of user invited to ETHOS
   */
  function uninviteUser(address user) external onlyNonZeroAddress(user) {
    uint256 id = profileIdByAddress[msg.sender];
    Profile storage inviter = profiles[id];
    if (inviter.archived) {
      revert ProfileAccess(id, "Profile is archived");
    }

    uint256 index = sentInviteIndexByProfileIdAndAddress[id][user];
    if (index >= inviter.inviteInfo.sent.length || inviter.inviteInfo.sent[index] != user) {
      revert AddressNotInvited();
    }

    // Get last address before removing from array (needed for updating index mapping)
    address lastAddress = inviter.inviteInfo.sent[inviter.inviteInfo.sent.length - 1];

    _removeFromArray(index, inviter.inviteInfo.sent);

    // Update the index mapping for the moved address
    if (lastAddress != user) {
      sentInviteIndexByProfileIdAndAddress[id][lastAddress] = index;
    }
    delete sentInviteIndexByProfileIdAndAddress[id][user];

    inviter.inviteInfo.available++;
    sentAt[id][user] = 0;
    emit Uninvited(id, msg.sender, inviter.inviteInfo.available, user);
  }

  /**
   * @dev Creates a "mock" (user-less) profile to assist with tracking of reviews
   * @notice Only callable by EthosReview.sol and EthosAttestation.sol
   * @param isAttestation Flag if the mock belongs to an attestation or address
   * @param subject Address of subject if mock belongs to an address. address(0) if isAttestation
   * @param attestation Hash of attestation. Will be blank 0x if mock is for an address.
   * @return profileId The ID of the newly created mock profile
   */
  function incrementProfileCount(
    bool isAttestation,
    address subject,
    bytes32 attestation
  ) external whenNotPaused onlyNonCompromisedAddress(subject) returns (uint256 profileId) {
    if (
      msg.sender != contractAddressManager.getContractAddressForName(ETHOS_REVIEW) &&
      msg.sender != contractAddressManager.getContractAddressForName(ETHOS_ATTESTATION)
    ) {
      revert InvalidSender();
    }
    profileId = profileCount;
    if (isAttestation) {
      profileIdByAttestation[attestation] = profileId;
    } else {
      profileIdByAddress[subject] = profileId;
    }
    profileCount++;

    emit MockProfileCreated(profileId);
  }

  /**
   * @dev Assigns a profileId to an attestation hash
   * @notice Callable from ethosAttestation
   * @param attestationHash Hash from ethosAttestation
   * @param profileId Profile id to assign to hash
   */
  function assignExistingProfileToAttestation(
    bytes32 attestationHash,
    uint256 profileId
  ) external isEthosAttestation whenNotPaused {
    profileIdByAttestation[attestationHash] = profileId;
  }

  /**
   * @dev Archives a profile for the sender.
   * @notice This function allows a user to temporarily disable their profile.
   * An archived profile cannot perform most actions on the Ethos network.
   */
  function archiveProfile() external whenNotPaused {
    (bool verified, bool archived, bool mock, uint256 profileId) = profileStatusByAddress(
      msg.sender
    );
    if (!verified) {
      revert ProfileNotFoundForAddress(msg.sender);
    }
    if (archived || mock) {
      revert ProfileAccess(profileId, "Profile is archived");
    }

    profiles[profileId].archived = true;
    emit ProfileArchived(profileId);
  }

  /**
   * @dev Restores a profile for the sender.
   * @notice This function allows a user to reactivate their previously archived profile.
   */
  function restoreProfile() external whenNotPaused {
    (bool verified, bool archived, bool mock, uint256 profileId) = profileStatusByAddress(
      msg.sender
    );
    if (!verified) {
      revert ProfileNotFoundForAddress(msg.sender);
    }
    if (!archived || mock) {
      revert ProfileAccess(profileId, "Profile is not archived");
    }

    delete profiles[profileId].archived;
    emit ProfileRestored(profileId);
  }

  /**
   * @dev Registers an address for the profile.
   * @param addressStr Address to be registered.
   * @param profileId Profile id to be registered for.
   * @param randValue Random value to be used for signature. Use case: user can register, unregister and register again the same address.
   * @param signature Signature to be verified.
   * @notice This function allows a user to add a new address to their profile.
   * The address must not be compromised or already associated with another profile.
   */
  function registerAddress(
    address addressStr,
    uint256 profileId,
    uint256 randValue,
    bytes calldata signature
  ) external whenNotPaused onlyNonZeroAddress(addressStr) onlyNonCompromisedAddress(addressStr) {
    // the target profile must contain the msg.sender address among the list of valid, non-removed addresses
    if (profileIdByAddress[msg.sender] != profileId) {
      revert ProfileNotFoundForAddress(msg.sender);
    }

    (bool verified, bool archived, bool mock) = profileStatusById(profileId);
    if (!verified) {
      revert ProfileNotFound(profileId);
    }
    if (archived || mock) {
      revert ProfileAccess(profileId, "Profile is archived");
    }
    (bool addressAlreadyRegistered, , , uint256 registeredProfileId) = profileStatusByAddress(
      addressStr
    );
    if (addressAlreadyRegistered && registeredProfileId != profileId) {
      revert ProfileExistsForAddress(addressStr);
    }

    validateAndSaveSignature(
      _keccakForRegisterAddress(addressStr, profileId, randValue),
      signature
    );

    addressIndexByProfileIdAndAddress[profileId][addressStr] = profiles[profileId].addresses.length;
    profiles[profileId].addresses.push(addressStr);
    profileIdByAddress[addressStr] = profileId;

    checkMaxAddresses(profileId);

    emit AddressClaim(profileId, addressStr, AddressClaimStatus.Claimed);
  }

  function deleteAddress(address addressStr, bool markAsCompromised) external whenNotPaused {
    uint256 profileId = profileIdByAddress[msg.sender];
    uint256 index = addressIndexByProfileIdAndAddress[profileId][addressStr];
    deleteAddressAtIndex(index, markAsCompromised);
  }

  /**
   * @dev Deletes an address at index.
   * @notice Deleted addresses can be re-registered to any profile.
   * @notice Compromised addresses cannot be re-registered. Only an admin can revoke compromised addresses.
   * @param addressIndex Index of address to be archived.
   * @param markAsCompromised Whether to mark the address as compromised.
   */
  function deleteAddressAtIndex(uint256 addressIndex, bool markAsCompromised) public whenNotPaused {
    uint256 profileId = profileIdByAddress[msg.sender];
    (bool verified, bool archived, bool mock) = profileStatusById(profileId);
    if (!verified) {
      revert ProfileNotFoundForAddress(msg.sender);
    }
    if (archived || mock) {
      revert ProfileAccess(profileId, "Profile is archived");
    }

    address[] storage addresses = profiles[profileId].addresses;
    if (addresses.length <= addressIndex) {
      revert InvalidIndex();
    }

    address addressStr = addresses[addressIndex];
    _addressShouldDifferFromSender(addressStr);

    if (markAsCompromised) {
      isAddressCompromised[addressStr] = true;
    }

    _deleteAddressAtIndexFromArray(addressIndex, addresses);
    delete profileIdByAddress[addressStr];

    emit AddressClaim(profileId, addressStr, AddressClaimStatus.Unclaimed);
  }

  /**
   * @dev Restores a compromised address.
   * @notice Only callable by an admin.
   * @param addressStr Address to be restored.
   */
  function restoreCompromisedAddress(address addressStr) external onlyAdmin whenNotPaused {
    isAddressCompromised[addressStr] = false;
  }

  /**
   * @dev Retrieves a profile by its ID.
   * @param id The profile ID to retrieve.
   * @return profile The Profile struct associated with the given ID.
   */
  function getProfile(uint256 id) external view returns (Profile memory profile) {
    if (id == 0 || id >= profileCount) revert ProfileNotFound(id);
    profile = profiles[id];
  }

  /**
   * @dev Returns addresses for profile.
   * @param profileId Profile id.
   * @return Addresses for profile.
   */
  function addressesForProfile(uint256 profileId) external view returns (address[] memory) {
    return profiles[profileId].addresses;
  }

  /**
   * @dev Returns array of IDs that accepted an invite
   * @param profileId Profile id.
   * @return inviting profileID
   */
  function invitedIdsForProfile(uint256 profileId) external view returns (uint256[] memory) {
    return profiles[profileId].inviteInfo.acceptedIds;
  }

  /**
   * @dev Returns array of addresses that have pending invites for given profileId
   * @param profileId Profile id.
   * @return array of addresses
   */
  function sentInvitationsForProfile(uint256 profileId) external view returns (address[] memory) {
    return profiles[profileId].inviteInfo.sent;
  }

  /**
   * @dev Returns InviteInfo struct of a given profile
   * @notice does not include array elements
   * @param profileId Profile id.
   * @return InviteInfo for subject profileId
   */
  function inviteInfoForProfileId(uint256 profileId) external view returns (InviteInfo memory) {
    return profiles[profileId].inviteInfo;
  }

  // ITargetStatus implementation
  /**
   * @dev Checks whether profile verified & is allowed to be used.
   * @param targetId Profile id.
   * @return exist Whether profile verified.
   * @return allowed Whether profile is allowed to be used.
   * @notice This is a standard function used across Ethos contracts to validate profiles.
   */
  function targetExistsAndAllowedForId(
    uint256 targetId
  ) external view returns (bool exist, bool allowed) {
    Profile storage profile = profiles[targetId];

    exist = profile.createdAt > 0;
    allowed = exist;
  }

  /**
   * @dev Returns the status of a profile by its ID.
   * @param profileId The ID of the profile to check.
   * @return verified Whether the profile is verified.
   * @return archived Whether the profile is archived.
   * @return mock Whether the profile is a mock profile.
   */
  function profileStatusById(
    uint256 profileId
  ) public view returns (bool verified, bool archived, bool mock) {
    Profile storage profile = profiles[profileId];
    // mock profileIds do not have a profile struct, and so this returns false
    verified = profile.profileId > 0;
    archived = verified && profile.archived;
    mock = profileId > 0 && !verified && profileId < profileCount;
  }

  /**
   * @dev Returns the status of a profile by its associated address.
   * @notice This does not check if the address has been removed from the profile.
   * It will return the profileId even if the address has been removed.
   * @param addressStr The address to check.
   * @return verified Whether the profile is verified.
   * @return archived Whether the profile is archived.
   * @return mock Whether the profile is a mock profile.
   * @return profileId The ID of the profile associated with the address.
   */
  function profileStatusByAddress(
    address addressStr
  ) public view returns (bool verified, bool archived, bool mock, uint256 profileId) {
    profileId = profileIdByAddress[addressStr];
    (verified, archived, mock) = profileStatusById(profileId);
  }

  // IEthosProfile implementation
  /**
   * @dev Checks whether address belongs to profile.
   * @param addressStr Address to be checked.
   * @param profileId Profile id.
   * @return Whether address belongs to profile.
   */
  function addressBelongsToProfile(
    address addressStr,
    uint256 profileId
  ) external view returns (bool) {
    if (profileIdByAddress[addressStr] == 0) {
      revert ProfileNotFoundForAddress(addressStr);
    }
    return profileIdByAddress[addressStr] == profileId;
  }

  /**
   * LEGACY INTERFACE FUNCTIONS
   *
   * These satisfy the IEthosProfile interface but are more difficult to understand than profileStatus* functions
   * and should be deprecated on the next major upgrade.
   */
  function profileExistsAndArchivedForId(
    uint256 profileId
  ) external view returns (bool verified, bool archived) {
    (bool _verified, bool _archived, bool mock) = profileStatusById(profileId);
    return (_verified && !mock, _archived && !mock);
  }

  function verifiedProfileIdForAddress(address _address) external view returns (uint256) {
    (bool verified, bool archived, bool mock, uint256 profileId) = profileStatusByAddress(_address);
    if (!verified || archived || mock) {
      revert ProfileNotFoundForAddress(_address);
    }
    return profileId;
  }

  // private functions

  /**
   * @dev Deletes address at index.
   * @param index Index of address to be deleted.
   * @param addresses Address array to be modified.
   */
  function _deleteAddressAtIndexFromArray(uint256 index, address[] storage addresses) private {
    address addressToRemove = addresses[index];
    address lastAddress = addresses[addresses.length - 1];

    _removeFromArray(index, addresses);

    if (lastAddress != addressToRemove) {
      uint256 profileId = profileIdByAddress[msg.sender];
      addressIndexByProfileIdAndAddress[profileId][lastAddress] = index;
    }

    delete addressIndexByProfileIdAndAddress[profileIdByAddress[msg.sender]][addressToRemove];
  }

  /**
   * @dev Checks whether address is not the same as sender.
   * @param addressStr Address to be checked.
   */
  function _addressShouldDifferFromSender(address addressStr) private view {
    if (addressStr == msg.sender) {
      revert AddressAuthorization(addressStr, "Address == msg.sender");
    }
  }

  /**
   * @dev Checks whether profile has sufficient invites.
   * @param profileId Profile id to be checked.
   */
  function _profileShouldHaveInvites(uint256 profileId) private view {
    uint256 availableInvites = profiles[profileId].inviteInfo.available;

    if (availableInvites == 0) {
      revert InsufficientInvites(profileId);
    }
  }

  /**
   * @dev Checks if address has already been invited.
   * @param profileId Profile id to be checked.
   * @param invitee address of user being invited
   */
  function _isAddressAlreadyInvited(uint256 profileId, address invitee) private view {
    if (sentAt[profileId][invitee] != 0) {
      revert AddressAlreadyInvited(profileId, invitee);
    }
  }

  /**
   * @dev Internal function for setting up new profile
   * @param user Address of the new user creating profile.
   * @return profileId The ID of the newly created profile
   * @notice This function handles the core logic of profile creation, including
   * assigning a new profile ID and initializing the profile's invite information.
   */
  function _createProfile(address user) internal returns (uint256 profileId) {
    (bool verified, , bool mock, uint256 existingProfileId) = profileStatusByAddress(user);
    if (verified) {
      revert ProfileExists(existingProfileId);
    } else if (mock) {
      profileId = existingProfileId;
    } else {
      profileId = profileCount;
      profileCount++;
    }

    profileIdByAddress[user] = profileId;
    profiles[profileId].profileId = profileId;
    profiles[profileId].createdAt = block.timestamp;
    profiles[profileId].inviteInfo.available = defaultNumberOfInvites;
    profiles[profileId].addresses.push(user);

    emit ProfileCreated(profileId, user);
    return profileId;
  }

  /**
   * @dev Checks if new user has been authorized by inviter for profile creation
   * @param inviterId profile ID of inviting user
   * @param user address of new user attempting to create profile
   */
  function _inviterProfileAuthorizedSender(uint256 inviterId, address user) internal {
    Profile storage inviter = profiles[inviterId];

    uint256 index = sentInviteIndexByProfileIdAndAddress[inviterId][user];
    if (index >= inviter.inviteInfo.sent.length || inviter.inviteInfo.sent[index] != user) {
      revert AddressNotInvited();
    }

    // Update the index mapping for the moved address
    address lastAddress = inviter.inviteInfo.sent[inviter.inviteInfo.sent.length - 1];
    if (lastAddress != user) {
      sentInviteIndexByProfileIdAndAddress[inviterId][lastAddress] = index;
    }

    _removeFromArray(index, inviter.inviteInfo.sent);
    delete sentInviteIndexByProfileIdAndAddress[inviterId][user];
  }

  /**
   * @dev Gets hash for the address registration.
   * @param addressStr Address to be registered.
   * @param profileId Profile id to be registered for.
   * @param randValue Random value.
   * @return Hash.
   */
  function _keccakForRegisterAddress(
    address addressStr,
    uint256 profileId,
    uint256 randValue
  ) private pure returns (bytes32) {
    return keccak256(abi.encodePacked(addressStr, profileId, randValue));
  }

  /**
   * @dev Modifies default number of invites new profiles start with
   * @param defaultInvites new default invite amount
   */
  function setDefaultNumberOfInvites(uint256 defaultInvites) external onlyAdmin whenNotPaused {
    defaultNumberOfInvites = defaultInvites;
    if (defaultInvites > maxNumberOfInvites) {
      revert MaxInvitesReached(0);
    }
    emit DefaultInvitesChanged(defaultInvites);
  }

  /**
   * @dev Adds invites to an individual profile
   * @param user address of profile
   * @param amount quantity of invites to add to the profile
   */
  function addInvites(address user, uint256 amount) public onlyAdmin whenNotPaused {
    (bool verified, bool archived, bool mock, uint256 id) = profileStatusByAddress(user);
    if (!verified || archived || mock) {
      revert ProfileNotFoundForAddress(user);
    }
    profiles[id].inviteInfo.available += amount;
    checkMaxInvites(id);
    emit InvitesAdded(id, amount);
  }

  /**
   * @dev Batch adds invites to many profiles
   * @notice can hit gas limit if list too long
   * @param users array of addresses to add invites
   * @param amount quantity of invites to add to the profiles
   */
  function addInvitesBatch(
    address[] calldata users,
    uint256 amount
  ) external onlyAdmin whenNotPaused {
    for (uint256 i; i < users.length; i++) {
      addInvites(users[i], amount);
    }
  }

  /**
   * @dev Calculates the total number of invites for a profile
   * @param profileId The ID of the profile
   * @return The sum of available, sent, and accepted invites
   */
  function _sumInvites(uint256 profileId) internal view returns (uint256) {
    uint256 sum = profiles[profileId].inviteInfo.available;
    sum += profiles[profileId].inviteInfo.sent.length;
    sum += profiles[profileId].inviteInfo.acceptedIds.length;
    return sum;
  }

  /**
   * @dev Checks if the total number of invites for a profile exceeds the maximum allowed
   * @param profileId The ID of the profile to check
   */
  function checkMaxInvites(uint256 profileId) internal view {
    if (_sumInvites(profileId) > maxNumberOfInvites) {
      revert MaxInvitesReached(profileId);
    }
  }

  /**
   * @dev Checks if the total number of addresses for a profile exceeds the maximum allowed
   * @param profileId The ID of the profile to check
   */
  function checkMaxAddresses(uint256 profileId) internal view {
    uint256 sum = profiles[profileId].addresses.length;
    if (sum > maxNumberOfAddresses) {
      revert MaxAddressesReached(profileId);
    }
  }

  /**
   * @dev Sets the maximum number of addresses allowed per profile
   * @param maxAddresses The new maximum number of addresses
   */
  function setMaxAddresses(uint256 maxAddresses) external onlyAdmin whenNotPaused {
    maxNumberOfAddresses = maxAddresses;
    if (maxAddresses > 2048) {
      revert MaxAddressesReached(0);
    }
  }

  /**
   * @dev Sets the maximum number of invites allowed per profile
   * @param maxInvites The new maximum number of invites
   */
  function setMaxInvites(uint256 maxInvites) external onlyAdmin whenNotPaused {
    maxNumberOfInvites = maxInvites;
    if (maxInvites > 2048) {
      revert MaxInvitesReached(0);
    }
  }

  // state variables added after initial deployment; upgrades require new state to be added after all existing storage
  // Maximum number of addresses that can be associated with a single profile
  uint256 public maxNumberOfAddresses;
  // Maximum number of invites a profile can have (including available, sent, and accepted)
  uint256 public maxNumberOfInvites;
  // Maps profileId -> invitee address -> index in the sent invites array
  // Used for efficient removal of sent invites
  mapping(uint256 => mapping(address => uint256)) private sentInviteIndexByProfileIdAndAddress;
  // Maps inviter profileId -> invited profileId -> index in the acceptedIds array
  // This ended up being unused in the final implementation
  mapping(uint256 => mapping(uint256 => uint256)) private acceptedIdIndexByProfileIdAndId;
  // Maps profileId -> address -> index in the addresses array
  mapping(uint256 => mapping(address => uint256)) private addressIndexByProfileIdAndAddress;
}
