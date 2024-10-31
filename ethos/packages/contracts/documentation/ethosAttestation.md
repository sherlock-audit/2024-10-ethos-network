# Ethos Network Protocol Technical Documentation

## EthosAttestation v1

### Overview

EthosAttestation.sol records external attestations of web2 services and accounts for Ethos. These attestations play a crucial role in establishing a user's identity and reputation across various platforms integrated with the Ethos Network.

The contract allows users to create, claim, archive, and restore attestations, all while maintaining a strong link to the user's Ethos Profile. This connection ensures that all attestations are properly associated with verified user profiles.

### Attestation Lifecycle

1. **Creation**: Users with valid Ethos Profiles can create attestations, providing evidence of their association with a service or account.
2. **Claiming**: Existing attestations can be claimed by other profiles, allowing for transfer of ownership or correction of mistaken associations.
3. **Archiving**: Users can archive their attestations, temporarily removing them from active use.
4. **Restoration**: Archived attestations can be restored, bringing them back into active use.

### Interaction with EthosProfile

EthosAttestation works closely with the EthosProfile contract to ensure that all attestations are properly linked to valid user profiles. This interaction includes:

- Verifying that the profile creating or claiming an attestation exists and is active.
- Ensuring that the address interacting with the contract belongs to the claimed profile.
- Updating the EthosProfile contract when attestations are created or claimed.

### Hashing and Verification

The contract uses a hashing mechanism to uniquely identify attestations based on the service and account information. This allows for efficient storage and retrieval of attestation data, as well as prevention of duplicate attestations for the same service and account combination.

---

## Storage Layout

The following outlines the global storage layout in EthosAttestation:

- **attestationCount**: (uint256) Tracks the total number of attestations created.

- **attestationById**: (mapping(uint256 => Attestation)) Stores attestation information, where the key is the attestation ID, and the value is the Attestation struct.

- **attestationByHash**: (mapping(bytes32 => Attestation)) Maps the hash of service and account to the Attestation struct, allowing quick lookups.

- **attestationHashesByProfileId**: (mapping(uint256 => bytes32[])) Stores all attestation hashes associated with a specific profile ID.

- **hashIndexByProfileIdAndHash**: (mapping(uint256 => mapping(bytes32 => uint256))) A nested mapping that stores the index of an attestation hash in the `attestationHashesByProfileId` array for efficient lookups and removals.

---

## Structs

- **Attestation**: A struct that stores information related to a user's attestation.
  - **archived**: (bool) Indicates whether the attestation has been archived.
  - **attestationId**: (uint256) The unique identifier for the attestation.
  - **createdAt**: (uint256) The timestamp when the attestation was created.
  - **profileId**: (uint256) The ID of the profile associated with this attestation.
  - **account**: (string) The account name or identifier for this attestation.
  - **service**: (string) The service name for this attestation.

---

## Events

The following outlines events emitted by EthosAttestation, typically following state changes:

- **AttestationCreated (profileId, service, account, evidence, attestationId)**: Emitted when a new attestation is successfully created.

- **AttestationArchived (profileId, service, account, attestationId)**: Emitted when an attestation is archived.

- **AttestationClaimed (attestationId, service, account, evidence, profileId)**: Emitted when an existing attestation is claimed by a different profile.

- **AttestationRestored (attestationId, service, account, profileId)**: Emitted when a previously archived attestation is restored.

---

## Modifiers

The contract inherits modifiers from the `AccessControl` contract:

- **onlyOwner**: Ensures that only the contract owner can call specific functions.

- **onlyNonZeroAddress**: Verifies that the provided address is not the zero address.

---

## External/Public Functions

The following outlines basic functionality of all external/public (user-facing) functions:

- **initialize(address owner, address admin, address expectedSigner, address signatureVerifier, address contractAddressManagerAddr)**: Initializes the contract with necessary addresses and sets the initial attestation count.

- **createAttestation(uint256 profileId, uint256 randValue, AttestationDetails calldata attestationDetails, string calldata evidence, bytes calldata signature)**: Creates a new attestation, or claims/restores an existing one if applicable. Verifies the provided signature and checks for profile validity.

- **archiveAttestation(bytes32 attestationHash)**: Archives an existing attestation, making it inactive. Only the owner of the attestation can archive it.

- **restoreAttestation(bytes32 attestationHash)**: Restores an archived attestation, making it active again. Only the owner of the attestation can restore it.

- **attestationExistsForHash(bytes32 attestationHash)**: Checks if an attestation exists for a given hash.

- **getServiceAndAccountHash(string calldata service, string calldata account)**: Generates a unique hash from the service and account strings.

- **getAttestationHashesByProfileId(uint256 profileId)**: Retrieves all attestation hashes associated with a given profile ID.

- **getAttestationByHash(bytes32 _hash)**: Retrieves the Attestation struct for a given hash.

- **getAttestationIndexByProfileIdAndHash(uint256 profileId, bytes32 attestationHash)**: Gets the index of an attestation in the `attestationHashesByProfileId` mapping.

- **targetExistsAndAllowedForId(uint256 targetId)**: Checks if an attestation exists and is allowed for a given ID. This function is part of the ITargetStatus interface implementation.

---

## Internal Functions

An outline of all internal functions:

- **_authorizeUpgrade(address newImplementation)**: Restricts the contract upgrade functionality to only the owner. Ensures that the new implementation address is valid.

- **_getEthosProfile()**: Retrieves the address of the EthosProfile contract from the contract address manager.

- **_claimAttestation(uint256 profileId, bytes32 attestationHash, string calldata evidence)**: Attempts to claim an existing attestation for a profile. Verifies profile existence and ownership.

- **restoreIfArchived(bytes32 attestationHash)**: Restores an attestation if it's archived. Used internally during the creation process.

- **_removeAttestationFromPreviousProfile(uint256 profileId, bytes32 attestationHash)**: Removes an attestation from its previous profile when it's being claimed by a new profile.

- **_attestationShouldNotExist(bytes32 attestationHash)**: Checks if an attestation doesn't exist, reverting if it does. Used to prevent duplicate attestations.

- **_keccakForCreateAttestation(uint256 profileId, uint256 randValue, string calldata account, string calldata service, string calldata evidence)**: Generates a hash for the createAttestation method, used in signature verification.

---

## Security Considerations

- The contract uses signature verification to ensure that attestation creations are authorized. The Ethos web application has the private key for the expected signer, allowing it to act as an oracle for external web2 services (such as X, Discord, etc).
- Access control is implemented to restrict certain functions to the contract owner or admin.
- The contract interacts closely with the EthosProfile contract to ensure that all attestations are associated with valid profiles.
- Archiving and restoring attestations provide a way to manage the lifecycle of attestations without permanently deleting data.

---

## Upgrade Mechanism

EthosAttestation is an upgradeable contract utilizing the UUPS (Universal Upgradeable Proxy Standard) pattern. This allows for future improvements and bug fixes while maintaining the contract's address and state. The `_authorizeUpgrade` function restricts upgrade capabilities to the contract owner, ensuring that only authorized parties can perform upgrades.
