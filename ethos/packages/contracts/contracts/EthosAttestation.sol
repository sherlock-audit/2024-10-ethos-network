// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { UUPSUpgradeable } from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import { IEthosAttestation } from "./interfaces/IEthosAttestation.sol";
import { IEthosProfile } from "./interfaces/IEthosProfile.sol";
import { ITargetStatus } from "./interfaces/ITargetStatus.sol";
import { AccessControl } from "./utils/AccessControl.sol";
import { AttestationAlreadyExists, ProfileNotFound, AddressNotInProfile, AttestationNotArchived, AttestationNotFound, AttestationInvalid } from "./errors/AttestationErrors.sol";
import { ETHOS_PROFILE } from "./utils/Constants.sol";
import { AttestationDetails } from "./utils/Structs.sol";

/**
 * @title EthosAttestation
 * @dev EthosAttestation records external attestations of web2 services and accounts for Ethos.
 * These attestations play a crucial role in establishing a user's identity and reputation across
 * various platforms integrated with the Ethos Network.
 *
 * Key Features:
 * - Creation: Users with valid Ethos Profiles can create attestations.
 * - Claiming: Existing attestations can be claimed by other profiles.
 * - Archiving: Users can archive their attestations, temporarily removing them from active use.
 * - Restoration: Archived attestations can be restored, bringing them back into active use.
 *
 * The contract works closely with the EthosProfile contract to ensure that all attestations
 * are properly linked to valid user profiles.
 *
 * Attestation Lifecycle:
 * 1. Creation: Users with valid Ethos Profiles create attestations with evidence.
 * 2. Claiming: Existing attestations can be claimed by other profiles.
 * 3. Archiving: Users can archive their attestations, temporarily removing them from active use.
 * 4. Restoration: Archived attestations can be restored to active use.
 *
 * Interaction with EthosProfile:
 * - Verifies profile existence and activity.
 * - Ensures address belongs to the claimed profile.
 * - Updates EthosProfile contract on attestation creation or claiming.
 *
 * Hashing and Verification:
 * Uses a hashing mechanism to uniquely identify attestations based on service and account info.
 * This allows efficient storage, retrieval, and prevents duplicate attestations.
 *
 * Security Considerations:
 * - The contract uses signature verification to ensure that attestation creations are authorized.
 *   The Ethos web application has the private key for the expected signer, allowing it to act
 *   as an oracle for external web2 services (such as X, Discord, etc).
 * - Access control is implemented to restrict certain functions to the contract owner or admin.
 * - The contract interacts closely with the EthosProfile contract to ensure that all attestations
 *   are associated with valid profiles.
 * - Archiving and restoring attestations provide a way to manage the lifecycle of attestations
 *   without permanently deleting data.
 *
 * Upgrade Mechanism:
 * EthosAttestation is an upgradeable contract utilizing the UUPS (Universal Upgradeable Proxy Standard) pattern.
 * This allows for future improvements and bug fixes while maintaining the contract's address and state.
 * The `_authorizeUpgrade` function restricts upgrade capabilities to the contract owner,
 * ensuring that only authorized parties can perform upgrades.
 */
contract EthosAttestation is IEthosAttestation, AccessControl, UUPSUpgradeable {
  /**
   * @dev Constructor that disables initializers when the implementation contract is deployed.
   * This prevents the implementation contract from being initialized, which is important for
   * security since the implementation contract should never be used directly, only through
   * delegatecall from the proxy.
   */
  constructor() {
    _disableInitializers();
  }

  // Tracks the total number of attestations created
  uint256 public attestationCount;

  // Stores attestation information, where the key is the attestation ID, and the value is the Attestation struct
  mapping(uint256 => Attestation) public attestationById;
  // Maps the hash of service and account to the Attestation id, allowing quick lookups
  mapping(bytes32 => uint256) public attestationIdByHash;
  // Stores all attestation hashes associated with a specific profile ID
  mapping(uint256 => bytes32[]) public attestationHashesByProfileId;
  // A nested mapping that stores the index of an attestation hash in the attestationHashesByProfileId array for efficient lookups and removals
  mapping(uint256 => mapping(bytes32 => uint256)) private hashIndexByProfileIdAndHash;

  // Add storage gap as the last storage variable
  // This allows us to add new storage variables in future upgrades
  // by reducing the size of this gap
  uint256[50] private __gap;

  /**
   * @dev Emitted when a new attestation is successfully created
   * @param profileId The ID of the profile creating the attestation
   * @param service The name of the service being attested
   * @param account The account name or identifier for the attestation
   * @param evidence Evidence supporting the attestation
   * @param attestationId The unique identifier for the new attestation
   */
  event AttestationCreated(
    uint256 indexed profileId,
    string service,
    string account,
    string evidence,
    uint256 indexed attestationId
  );

  /**
   * @dev Emitted when an attestation is archived (made inactive)
   * @param profileId The ID of the profile archiving the attestation
   * @param service The name of the service for the archived attestation
   * @param account The account name or identifier for the archived attestation
   * @param attestationId The unique identifier of the archived attestation
   */
  event AttestationArchived(
    uint256 indexed profileId,
    string service,
    string account,
    uint256 indexed attestationId
  );

  /**
   * @dev Emitted when an existing attestation is claimed by a different profile
   * @param attestationId The unique identifier of the claimed attestation
   * @param service The name of the service for the claimed attestation
   * @param account The account name or identifier for the claimed attestation
   * @param evidence New evidence supporting the claim
   * @param profileId The ID of the profile claiming the attestation
   */
  event AttestationClaimed(
    uint256 indexed attestationId,
    string service,
    string account,
    string evidence,
    uint256 indexed profileId
  );

  /**
   * @dev Emitted when a previously archived attestation is restored (made active again)
   * @param attestationId The unique identifier of the restored attestation
   * @param service The name of the service for the restored attestation
   * @param account The account name or identifier for the restored attestation
   * @param profileId The ID of the profile restoring the attestation
   */
  event AttestationRestored(
    uint256 indexed attestationId,
    string service,
    string account,
    uint256 indexed profileId
  );

  /**
   * @dev Initializes the contract.
   * @param owner Owner address.
   * @param admin Admin address.
   * @param expectedSigner ExpectedSigner address for signature verification.
   * @param signatureVerifier SignatureVerifier address.
   * @param contractAddressManagerAddr ContractAddressManager address.
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
    attestationCount = 1;
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
   * @dev Convenience function to get the Ethos Profile contract.
   * @return The address of the Ethos Profile contract.
   */
  function _getEthosProfile() private view returns (address) {
    return contractAddressManager.getContractAddressForName(ETHOS_PROFILE);
  }

  /**
   * @notice Creates attestation.
   * @param profileId Profile id. Use max uint for non-existing profile.
   * @param randValue Random value.
   * @param attestationDetails Attestation details.
   * @param evidence Evidence of attestation.
   * @param signature Signature of the attestation.
   */
  function createAttestation(
    uint256 profileId,
    uint256 randValue,
    AttestationDetails calldata attestationDetails,
    string calldata evidence,
    bytes calldata signature
  ) external whenNotPaused {
    validateAndSaveSignature(
      _keccakForCreateAttestation(
        profileId,
        randValue,
        attestationDetails.account,
        attestationDetails.service,
        evidence
      ),
      signature
    );

    bytes32 hashStr = getServiceAndAccountHash(
      attestationDetails.service,
      attestationDetails.account
    );

    bool isClaimed = _claimAttestation(profileId, hashStr, evidence);
    if (isClaimed) {
      return;
    }

    bool isRestore = restoreIfArchived(hashStr);
    if (isRestore) {
      return;
    }

    _attestationShouldNotExist(hashStr);

    address ethosProfile = _getEthosProfile();

    // ensure specified profile is active
    (bool profileExists, ) = ITargetStatus(ethosProfile).targetExistsAndAllowedForId(profileId);
    if (!profileExists) {
      revert ProfileNotFound(profileId);
    }

    // ensure profile exists for sender address
    uint256 verifiedProfileId = IEthosProfile(ethosProfile).verifiedProfileIdForAddress(msg.sender);
    // ensure the requested attestation profile is the same as the sender's verified profile
    if (verifiedProfileId != profileId) {
      revert AddressNotInProfile(msg.sender, profileId);
    }

    attestationHashesByProfileId[profileId].push(hashStr);
    hashIndexByProfileIdAndHash[profileId][hashStr] =
      attestationHashesByProfileId[profileId].length -
      1;

    attestationById[attestationCount] = Attestation({
      archived: false,
      attestationId: attestationCount,
      createdAt: block.timestamp,
      profileId: profileId,
      account: attestationDetails.account,
      service: attestationDetails.service
    });
    attestationIdByHash[hashStr] = attestationCount;

    // keep the profile contract up to date re: registered attestations
    IEthosProfile(ethosProfile).assignExistingProfileToAttestation(hashStr, profileId);

    emit AttestationCreated(
      profileId,
      attestationDetails.service,
      attestationDetails.account,
      evidence,
      attestationCount
    );
    attestationCount++;
  }

  /**
   * @dev Claim previously created attestation.
   * @param profileId Profile id.
   * @param attestationHash Hash of the attestation.
   * @param evidence Evidence of attestation.
   * @return Whether the attestation was successfully claimed.
   */
  function _claimAttestation(
    uint256 profileId,
    bytes32 attestationHash,
    string calldata evidence
  ) private returns (bool) {
    if (!attestationExistsForHash(attestationHash)) {
      return false;
    }

    Attestation memory attestation = attestationById[attestationIdByHash[attestationHash]];

    if (attestation.profileId == profileId) {
      return false;
    }

    address ethosProfile = _getEthosProfile();

    (bool profileExists, bool isArchived, bool isMock) = IEthosProfile(ethosProfile)
      .profileStatusById(profileId);

    // only allow valid, non-archived, non-mock profiles to claim attestations
    if (!profileExists || isArchived || isMock) {
      revert ProfileNotFound(profileId);
    }

    bool senderBelongsToProfile = IEthosProfile(ethosProfile).addressBelongsToProfile(
      msg.sender,
      profileId
    );

    if (!senderBelongsToProfile) {
      revert AddressNotInProfile(msg.sender, profileId);
    }

    // Remove attestation from the previous profile
    _removeAttestationFromPreviousProfile(attestation.profileId, attestationHash);

    // Set new profileId for attestation
    attestationById[attestationIdByHash[attestationHash]].profileId = profileId;
    attestationHashesByProfileId[profileId].push(attestationHash);
    // Update the index of the hash in the new profile
    hashIndexByProfileIdAndHash[profileId][attestationHash] =
      attestationHashesByProfileId[profileId].length -
      1;

    // Restore attestation if it was previously archived
    if (attestationById[attestationIdByHash[attestationHash]].archived) {
      attestationById[attestationIdByHash[attestationHash]].archived = false;
    }

    // Keep the profile contract up to date re: registered attestations
    IEthosProfile(ethosProfile).assignExistingProfileToAttestation(attestationHash, profileId);

    emit AttestationClaimed(
      attestationById[attestationIdByHash[attestationHash]].attestationId,
      attestationById[attestationIdByHash[attestationHash]].service,
      attestationById[attestationIdByHash[attestationHash]].account,
      evidence,
      profileId
    );

    return true;
  }

  /**
   * @dev Archives attestation.
   * @param attestationHash Hash of the attestation.
   */
  function archiveAttestation(bytes32 attestationHash) external whenNotPaused {
    // ensure attestation exists
    Attestation storage attestation = attestationById[attestationIdByHash[attestationHash]];
    if (attestation.createdAt == 0) {
      revert AttestationNotFound(attestationHash);
    }
    // ensure attestation belongs to sender
    uint256 profileId = attestation.profileId;
    IEthosProfile ethosProfile = IEthosProfile(_getEthosProfile());
    bool senderBelongsToProfile = ethosProfile.addressBelongsToProfile(msg.sender, profileId);

    if (!senderBelongsToProfile) {
      revert AddressNotInProfile(msg.sender, profileId);
    }

    // ensure profile is not archived or mock
    (, bool isArchived, bool isMock) = ethosProfile.profileStatusById(profileId);
    if (isArchived || isMock) {
      revert ProfileNotFound(profileId);
    }

    attestationById[attestationIdByHash[attestationHash]].archived = true;

    emit AttestationArchived(
      profileId,
      attestation.service,
      attestation.account,
      attestation.attestationId
    );
  }

  /**
   * @dev Restores attestation.
   * @param attestationHash Hash of the attestation.
   */
  function restoreAttestation(bytes32 attestationHash) public whenNotPaused {
    uint256 profileId = attestationById[attestationIdByHash[attestationHash]].profileId;

    address ethosProfile = _getEthosProfile();

    (, bool isArchived) = IEthosProfile(ethosProfile).profileExistsAndArchivedForId(profileId);

    if (isArchived) {
      revert ProfileNotFound(profileId);
    }

    bool senderBelongsToProfile = IEthosProfile(ethosProfile).addressBelongsToProfile(
      msg.sender,
      profileId
    );

    if (!senderBelongsToProfile) {
      revert AddressNotInProfile(msg.sender, profileId);
    }

    if (!attestationById[attestationIdByHash[attestationHash]].archived) {
      revert AttestationNotArchived(attestationHash);
    }

    attestationById[attestationIdByHash[attestationHash]].archived = false;

    emit AttestationRestored(
      attestationById[attestationIdByHash[attestationHash]].attestationId,
      attestationById[attestationIdByHash[attestationHash]].service,
      attestationById[attestationIdByHash[attestationHash]].account,
      profileId
    );
  }

  /**
   * @notice Restores attestation if archived.
   * @param attestationHash The hash of the attestation.
   * @return Whether the attestation was restored.
   */
  function restoreIfArchived(bytes32 attestationHash) private returns (bool) {
    if (attestationById[attestationIdByHash[attestationHash]].archived) {
      restoreAttestation(attestationHash);
      return true;
    } else {
      return false;
    }
  }

  /**
   * @dev Checks whether the attestation exists for provided hash.
   * @param attestationHash The hash of the attestation.
   * @return Whether the attestation exists.
   */
  function attestationExistsForHash(bytes32 attestationHash) public view returns (bool) {
    return attestationById[attestationIdByHash[attestationHash]].createdAt > 0;
  }

  /**
   * @dev Gets hash of service and account.
   * @param service Service name.
   * @param account Account name.
   * @return Hash of service and account.
   */
  function getServiceAndAccountHash(
    string calldata service,
    string calldata account
  ) public pure returns (bytes32) {
    if (bytes(service).length == 0 || bytes(account).length == 0) {
      revert AttestationInvalid(service, account);
    }
    return keccak256(abi.encode(service, account));
  }

  /**
   * @dev Gets attestation hashes by profile id.
   * @param profileId Profile id.
   * @return Attestation hashes.
   */
  function getAttestationHashesByProfileId(
    uint256 profileId
  ) external view returns (bytes32[] memory) {
    return attestationHashesByProfileId[profileId];
  }

  /**
   * @dev Gets Attestation struct of a given hash.
   * @param _hash bytes32 mapped to the attestation
   * @return attestation returns struct
   */
  function getAttestationByHash(
    bytes32 _hash
  ) external view returns (Attestation memory attestation) {
    attestation = attestationById[attestationIdByHash[_hash]];
  }

  /**
   * @dev Gets attestation index in `attestationHashesByProfileId` mapping by profile id and hash.
   * @param profileId Profile id.
   * @param attestationHash Hash of the attestation.
   * @return The index of the attestation hash.
   */
  function getAttestationIndexByProfileIdAndHash(
    uint256 profileId,
    bytes32 attestationHash
  ) public view returns (uint256) {
    bytes32[] storage hashes = attestationHashesByProfileId[profileId];
    uint256 index = hashIndexByProfileIdAndHash[profileId][attestationHash];

    if (hashes[index] != attestationHash) {
      revert AttestationNotFound(attestationHash);
    }

    return index;
  }

  /**
   * @dev Removes an attestation from its previous profile when it's being claimed by a new profile.
   * @param profileId The ID of the previous profile.
   * @param attestationHash The hash of the attestation being removed.
   */
  function _removeAttestationFromPreviousProfile(
    uint256 profileId,
    bytes32 attestationHash
  ) private {
    bytes32[] storage hashes = attestationHashesByProfileId[profileId];
    uint256 length = hashes.length;
    uint256 prevIndex = getAttestationIndexByProfileIdAndHash(profileId, attestationHash);

    // Update the index of the last hash in the array to the index of the hash being removed
    hashIndexByProfileIdAndHash[profileId][hashes[length - 1]] = prevIndex;
    // Replace the hash being removed with the last hash in the array
    hashes[hashIndexByProfileIdAndHash[profileId][attestationHash]] = hashes[length - 1];
    // Remove the last hash from the array
    hashes.pop();
  }

  /**
   * @notice Fails if attestation already exists.
   * @dev Checks whether the attestation does not exist.
   * @param attestationHash The hash of the attestation.
   */
  function _attestationShouldNotExist(bytes32 attestationHash) private view {
    if (attestationExistsForHash(attestationHash)) {
      revert AttestationAlreadyExists(attestationHash);
    }
  }

  /**
   * @dev Gets hash for create attestation method.
   * @param profileId Profile id.
   * @param randValue Random value.
   * @param account Account name.
   * @param service Service name.
   * @param evidence Evidence of attestation.
   * @return Hash.
   */
  function _keccakForCreateAttestation(
    uint256 profileId,
    uint256 randValue,
    string calldata account,
    string calldata service,
    string calldata evidence
  ) private pure returns (bytes32) {
    return keccak256(abi.encode(profileId, randValue, account, service, evidence));
  }

  // ITargetStatus implementation
  /**
   * @dev Checks whether attestation exists and is allowed to be used.
   * @param targetId Attestation id.
   * @return exist Whether attestation exists.
   * @return allowed Whether attestation is allowed to be used.
   */
  function targetExistsAndAllowedForId(
    uint256 targetId
  ) external view returns (bool exist, bool allowed) {
    Attestation memory attestation = attestationById[targetId];

    exist = attestation.createdAt > 0;
    allowed = exist;
  }

  /**
   * @dev Gets the Attestation struct for a given attestation hash
   * @param attestationHash The hash of the service and account to look up
   * @return The Attestation struct containing the attestation details
   */
  function attestationByHash(bytes32 attestationHash) external view returns (Attestation memory) {
    return attestationById[attestationIdByHash[attestationHash]];
  }
}
