# Ethos Network Protocol Technical Documentation

## EthosProfile v1

### Overview

EthosProfile.sol serves as the primary profile management system of the Ethos Network protocol. Users who join the network will first interact with EthosProfile in order to create their profile and receive a unique profile ID. This profile ID will serve as the user’s identity in the Ethos Network and allow users to interact with all other Ethos Network smart contract systems. All protocol interactions are associated with this profile ID, which also serves a record-keeping purpose. Users are able to associate multiple addresses with a single profile ID, enabling them to participate from any wallet they own. The profile is meant to be fully public and transparent, and acts as a tool for others to verify on-chain activities and history.

### Invite System

To create a profile on Ethos Network, the user’s address must first be invited by an existing profile ID. The inviting profile must also hold sufficient invites (distributed by admin). Upon receiving an invite, the user may accept it and create a profile. The profile ID of the inviter is forever associated with the newly created profile. Therefore, who a profile invites, and from which profile an invitation is accepted, will have an impact on overall Ethos reputation.

### Multiple Addresses

Users are given the option (and encouraged) to register all of their different addresses with their profile ID. This promotes transparency and honesty by the user and helps others keep tabs on that user’s history. In the case of any account compromises, a profile is allowed to unregister an account and mark it as compromised. Once registered, an address can never again be registered to another profile, even if it is archived/unregistered from the first profile. Unregistered accounts still remain associated with their original profile.

### Mock Profiles

In addition to user profiles, EthosProfile is also used to track reviews (from ethosReview.sol) and attestations (from ethosAttestation.sol) which were created without an associated subject profileId. For these interactions, EthosProfile will issue a “mock id” to an unassociated review or attestation. A mock ID is an empty, non-user profile used to track these activity items.

### Archiving Profiles

If a user wishes to leave the Ethos network and disable their profile, they are permitted to do so by archiving the profile and rendering it inactive. An inactive profile will not be able to utilize most features of the Ethos network. However, should a user choose to return, they are permitted to re-activate their profiles if they wish.

### Dependencies

EthosProfile inherits the following utility and third-party (openzeppelin) dependencies:

- **AccessControl**: In-house custom access control contract based on `Ownable` and `AccessControl` from OpenZeppelin, which grants an owner and admin role to the contract. Also includes signature control and interfaces for the Ethos Network contract address manager (see AccessControl and ContractManager docs).

- **UUPSUpgradeable** (openzeppelin): Enables functionality pertaining to upgradeable contract systems. EthosProfile is an upgradeable smart contract utilizing the proxy/implementation pattern.

---

## Storage Layout

The following is an outline with descriptions of the global storage layout in EthosProfile.

- **profileCount**: (uint256) Tracks the total number of profiles created. Initial value is 1 since no profile with ID 0 exists.

- **defaultNumberOfInvites**: (uint256) Default number of invites each profile starts with upon creation. Can be modified by an admin.

- **profiles**: (mapping(uint256 => Profile)) A mapping that stores profile information, where the key is the profile ID, and the value is the Profile struct.

- **profileIdByAddress**: (mapping(address => uint256)) A mapping from a user’s address to their profile ID. This allows quick lookups to determine which profile belongs to a specific address.

- **isAddressCompromised**: (mapping(address => bool)) Keeps track of addresses that are compromised, preventing certain actions from being taken by these addresses. Compromised addresses cannot ever be added to, or create a profile.

- **profileIdByAttestation**: (mapping(bytes32 => uint256)) A mapping from an attestation hash to a profile ID. This links attestations to profiles. (see docs for ethosAttestation.sol)

- **sentAt**: (mapping(uint256 => mapping(address => uint256))) Tracks the timestamp at which a specific user was invited by a profile. The first mapping is by profile ID, and the second is by the invited user’s address.

- **maxNumberOfInvites**: (uint256) The maximum number of invites a profile can have, including available, sent, and accepted invites. Default value is 2048.

- **maxNumberOfAddresses**: (uint256) The maximum number of addresses (both current and removed) that can be associated with a profile. Default value is 128.

- **sentInviteIndexByProfileIdAndAddress**: (mapping(uint256 => mapping(address => uint256))) A nested mapping that stores the index of an invited address in the `sent` array of a profile's `InviteInfo`. This allows for efficient lookup and removal of invited addresses.

---

## Structs

- **Profile**: A struct that stores information related to a user’s profile.
  - **archived**: (bool) Indicates whether the profile has been archived. If true, the profile is no longer active.
  - **profileId**: (uint256) The unique identifier for the profile.
  - **createdAt**: (uint256) The timestamp when the profile was created.
  - **addresses**: (address[]) An array of addresses associated with this profile.
  - **removedAddresses**: (address[]) An array of addresses that were previously associated with the profile but have since been removed.
  - **inviteInfo**: (InviteInfo) A struct containing details about the profile’s invitation system, such as sent invites and available invites.

- **InviteInfo**: A struct that stores details regarding invitations sent and accepted by the profile.
  - **sent**: (address[]) An array of addresses to which this profile has sent invitations.
  - **acceptedIds**: (uint256[]) An array of profile IDs that accepted invitations from this profile.
  - **available**: (uint256) The number of remaining invites available for the profile to send.
  - **invitedBy**: (uint256) The profile ID of the user who invited this profile. If the profile was not invited, this value will be 0.

---

## Events

The following is an outline of events emitted by EthosProfile, typically following state changes.

- **MockProfileCreated (mockId)**: Emitted when a "mock" profile is created to assist with tracking of reviews or attestations.

- **ProfileCreated (profileId, addr)**: Emitted when a new profile is successfully created.

- **ProfileArchived (profileId)**: Emitted when a profile is archived.

- **ProfileRestored (profileId)**: Emitted when a previously archived profile is restored.

- **AddressClaim(profileId, addr, claim)**: Emitted when an address claims or unclaims its association with a profile.

- **UserInvited(inviterID, inviteeAddress)**: Emitted when a user invites another user to create a profile.

- **DefaultInvitesChanged(defaultInvites)**: Emitted when the default number of invites is changed by an admin.

- **InvitesAdded(profileId, amount)**: Emitted when additional invites are added to a profile.

- **Uninvited(inviterId, inviterAddress, remainingInvites, uninvitedUser)**: Emitted when a previously invited user is uninvited.

- **MaxInvitesReached(uint256 profileId)**: Emitted when an operation would cause the number of invites for a profile to exceed `maxNumberOfInvites`.

- **MaxAddressesReached(uint256 profileId)**: Emitted when an operation would cause the number of addresses for a profile to exceed `maxNumberOfAddresses`.

---

## Modifiers

Special functions run prior to function execution, usually to perform checks on function params and/or state.

- **isEthosAttestation()**: Ensures that only the Ethos Attestation contract can call specific functions. Reverts if the caller is not the contract address for Ethos Attestation.

- **checkIfCompromised(address addr)**: Checks whether the address is compromised by verifying the `isAddressCompromised` mapping. Reverts if the address is flagged as compromised.

---

## External/Public Functions

The following outlines basic functionality of all external/public (user-facing) functions.

- **initialize(address owner, address admin, address expectedSigner, address signatureVerifier, address contractAddressManagerAddr)**: Initializes the contract with an owner and admin, and sets up other important contract addresses. It also creates the first profile for the owner and sets the default number of invites.

- **createProfile(uint256 inviterId)**: Allows a user to create a profile after being invited by another profile. The inviter’s profile must be valid, and the invitee must not already have a profile.

- **inviteAddress(address invitee)**: Allows a profile to invite another address to create a profile. Checks for compromised addresses and whether the invitee already has a profile.

- **uninviteUser(address user)**: Allows a profile to retract an invitation to a user and restore available invites.

- **incrementProfileCount(bool isAttestation, address subject, bytes32 attestation)**: Increments the profile count and creates a "mock" profile for either an attestation or a subject address. Only callable by specific Ethos contracts.

- **assignExistingProfileToAttestation(bytes32 attestationHash, uint256 profileId)**: Associates an existing profile with an attestation hash. Only callable by EthosAttestation.

- **archiveProfile()**: Archives the caller’s profile, rendering it inactive.

- **restoreProfile()**: Restores an archived profile, making it active again.

- **registerAddress(address addressStr, uint256 profileId, uint256 randValue, bytes calldata signature)**: Registers an address with an existing profile by verifying a signature. The address must not be compromised or already associated with another profile.

- **deleteAddressAtIndex(uint256 addressIndex)**: Deletes an address from a profile’s list of associated addresses. Flags the address as compromised.

- **addressesForProfile(uint256 profileId)**: Returns the list of addresses associated with a specific profile.

- **invitedIdsForProfile(uint256 profileId)**: Returns the list of IDs that have accepted an invitation from a specific profile.

- **sentInvitationsForProfile(uint256 profileId)**: Returns the list of addresses that have been invited but have not yet accepted an invitation from a specific profile.

- **inviteInfoForProfileId(uint256 profileId)**: Returns non-array elements of the invite information for a specific profile.

- **setMaxAddresses(uint256 maxAddresses)**: Allows an admin to set the maximum number of addresses that can be associated with a profile. Reverts if the new maximum exceeds 2048.

- **setMaxInvites(uint256 maxInvites)**: Allows an admin to set the maximum number of invites a profile can have. Reverts if the new maximum exceeds 2048.

- **bulkInviteAddresses(address[] calldata invitees)**: Allows a user to invite multiple addresses in a single transaction. This function iterates through the provided array of addresses and calls `inviteAddress` for each one. It's subject to the same conditions and checks as individual invitations. Note that the gas cost increases with the number of invitees, so the caller should be mindful of potential gas limits.

- **uninviteUser(address user)**: Enables an existing user to remove a pending invite and restore available invites. This function removes the invited address from the sender's list of sent invitations, updates the necessary mappings, and increases the available invites count.

---

## Validation Functions

The following contains outlines of all validating functions.

- **targetExistsAndAllowedForId(uint256 targetId)**: Returns whether a profile exists and is allowed to be used based on its ID. A standard function name used by all Ethos contracts.

- **addressBelongsToProfile(address addressStr, uint256 profileId)**: Checks if a specific address belongs to a given profile ID.

- **verifiedProfileIdForAddress(address addressStr)**: Returns the verified profile ID for an address, ensuring that it belongs to the Ethos ecosystem.

- **profileExistsAndArchivedForId(uint256 profileId)**: Returns whether a profile exists and if it is archived.

- **verifiedProfileIdAndNotArchivedForAddress(address addressStr)**: Returns the verified profile ID for an address if it is not archived.

- **verifiedProfileIdAndArchivedForAddress(address addressStr)**: Returns the verified profile ID for an address if it is archived.

- **checkIsAddressCompromised(address addressStr)**: Returns whether a given address is compromised. Reverts if the address is compromised.

---

## Internal/Private Functions

An outline of all internal functions:

- **_authorizeUpgrade(address newImplementation)**: Restricts the contract upgrade functionality to only the owner. Ensures that the new implementation address is valid.

- **_deleteAddressAtIndexFromArray(uint256 index, address[] storage addresses, address[] storage removedAddresses)**: Internal function to delete an address at a specific index from an array of addresses.

- **_addressShouldDifferFromSender(address addressStr)**: Ensures that the address is not the same as the caller’s address.

- **_profileIdShouldExistForAddress(address addressStr)**: Verifies that a profile ID exists for a specific address. Reverts if no profile exists for the address.

- **_profileShouldNotExistForAddress(address addressStr)**: Verifies that a profile does not exist for a given address. Reverts if a profile ID does exist.

- **_profileShouldExistForId(uint256 profileId)**: Verifies that a profile exists for a specific profile ID. Reverts if profile ID param is invalid.

- **_profileShouldHaveInvites(uint256 profileId)**: Ensures that a profile has available invites. Reverts if the profile has no invites.

- **_isAddressAlreadyInvited(uint256 profileId, address invitee)**: Verifies that an invitee has not already been invited by the profile. Reverts if they have already been invited.

- **_inviterProfileAuthorizedSender(uint256 inviterId, address user)**: Checks if a new user has been authorized by the inviter to create a profile.

- **_createProfile(address user)**: Internal function that handles the creation of a new profile, assigning an ID and initializing the profile’s invite system.

- **_keccakForRegisterAddress(address addressStr, uint256 profileId, uint256 randValue)**: Returns a hash used for address registration verification.

- **_sumInvites(uint256 profileId)**: Internal function that calculates the total number of invites for a profile, including available, sent, and accepted invites.

- **checkMaxInvites(uint256 profileId)**: Internal function that checks if the total number of invites for a profile exceeds the `maxNumberOfInvites`. Reverts if the limit is exceeded.

- **checkMaxAddresses(uint256 profileId)**: Internal function that checks if the total number of addresses (current and removed) for a profile exceeds the `maxNumberOfAddresses`. Reverts if the limit is exceeded.

---

## Admin Functions

An outline of all functions only callable by admin. These functions modify global state rules.

- **setDefaultNumberOfInvites(uint256 defaultInvites)**: Allows an admin to modify the default number of invites new profiles start with.

- **addInvites(address user, uint256 amount)**: Allows an admin to add a specific number of invites to a profile.

- **addInvitesBatch(address[] calldata users, uint256 amount)**: Allows an admin to batch-add invites to multiple profiles simultaneously.

