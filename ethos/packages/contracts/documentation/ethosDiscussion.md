# Ethos Network Protocol Technical Documentation

## EthosDiscussion v1

### Overview

The purpose of `ethosDiscussion.sol` is to enable users to leave text-based comments on virtually any activity item within the network. These include vouches, attestations, reviews, profiles, or even other comments. Comments can be viewed and created through the Ethos app. They do not cost any deposit to create, however, a commenter’s address must be associated with a valid profile that is not archived. This document provides a technical overview of all functionality and storage layouts contained within `ethosDiscussion.sol`.

---

### Features

The feature set of the `ethosDiscussion` smart contract module is standard across typical social media platforms. Users can create comments as well as modify them. On-chain, comments cannot be deleted, but can be edited to remove the string content if desired. Do note that actions cannot be fully reversed and records of all interactions persist on the blockchain. As with most other smart contracts in the Ethos Network protocol, `ethosDiscussion` is upgradeable, enabling the team to update functionality in the future. Note that storage remains static and only new storage can be added (existing storage is not mutable).

---

### Dependencies

`ethosDiscussion` inherits the following utility and third-party (OpenZeppelin) dependencies:

- **AccessControl** → In-house custom access control contract based on `Ownable` and `AccessControl` from OpenZeppelin, which grants an owner and admin role to the contract. Also includes signature control and interfaces for the Ethos Network contract address manager (see AccessControl and ContractManager docs).

- **Common** → In-house library with helper functions (see Utility docs).

- **UUPSUpgradeable** (OpenZeppelin) → Enables functionality pertaining to upgradeable contract systems. `ethosDiscussion` is an upgradeable smart contract utilizing the proxy/implementation pattern.

---

### Storage Variables

The following is an overview of the storage layout in `ethosDiscussion.sol` along with their descriptions.

- **replyCount**: `(uint256)`
  Tracks the total number of replies created. Incremented every time a new reply is added.

- **replies**: `(mapping(uint256 => Reply))`
  A mapping that stores reply information, where the key is the reply ID, and the value is the `Reply` struct.

- **replyIdsByAuthor**: `(mapping(uint256 => uint256[]))`
  A mapping from an author's profile ID to an array of reply IDs. This allows for tracking which replies belong to which author profile.

- **directReplyIdsByTargetAddressAndTargetId**: `(mapping(address => mapping(uint256 => uint256[])))`
  A nested mapping that tracks the replies for a specific activity item (aka target). The first mapping is by the target contract's address, the second is by the target's ID, and the value is an array of reply IDs.

---

### Structs

- **Reply**:
  This struct contains the general data behind every comment/reply created.

  - **parentIsOriginalComment**: `(bool)`
    Indicates if the target is another comment (originating from this contract).

  - **targetContract**: `(address)`
    The address of the contract that the reply is targeting (e.g. `ethosVouch`, `ethosReview`, etc.).

  - **authorProfileId**: `(uint256)`
    The profile ID of the author who created the reply.

  - **id**: `(uint256)`
    The unique ID of the reply (from `replyCount`).

  - **parentId**: `(uint256)`
    The ID of the target (i.e. `vouch Id`, `review Id`).

  - **createdAt**: `(uint256)`
    The timestamp when the reply was created.

  - **edits**: `(uint256)`
    The number of times the reply has been edited.

  - **content**: `(string)`
    The actual content of the reply.

  - **metadata**: `(string)`
    Metadata associated with the reply, which can include additional information.

---

### Events

The following are descriptions of events emitted from `ethosDiscussion`:

- **ReplyAdded(authorId, targetContract, replyId)**
  Emitted when a new reply/comment is created.

- **ReplyEdited(authorId, replyId)**
  Emitted when an existing reply/comment is edited.

---

### Modifiers

The following are function modifiers used in `ethosDiscussion`:

- **onlyNonZeroAddress(address addr)**
  Ensures that the address provided is not the zero address. Reverts if the address is zero.

- **whenNotPaused**
  Ensures that the contract is not paused before executing certain functions. This is a standard pause mechanism often used for emergency stops (see AccessControl docs).

---

### External/Public Functions

The following are descriptions of user-facing and/or externally accessible (but permissioned) functions.

- **initialize(address owner, address admin, address expectedSigner, address signatureVerifier, address contractAddressManagerAddr)**
  Initializes the contract by setting the owner, admin, and other important contract addresses. This function replaces the constructor and ensures that important roles are assigned during deployment.

- **addReply(address targetContract, uint256 targetId, string memory content, string memory metadata)**
  Adds a new reply/comment to an activity item/target. The function checks if the target exists and adds the reply under the author's profile. `targetContract` MUST be a current Ethos network smart contract. A unique `replyId` is generated for each new comment/reply.

- **editReply(uint256 replyId, string memory content, string memory metadata)**
  Allows the author of a reply ID to edit its content and/or metadata. The function checks if the reply exists and ensures that only the original author can edit the reply. The number of edits on a specific reply ID is tracked.

---

### View Functions

The following are view functions that return information pertaining to storage on `ethosDiscussion`:

- **repliesById(uint256[] memory replyIds)**
  Retrieves an array of reply structs based on an array of reply IDs. Each reply is checked for existence before being returned.

- **repliesByAuthorInRange(uint256 author, uint256 fromIdx, uint256 maxLength)**
  Retrieves an array of reply IDs pertaining to a specific author within a given range. The function allows pagination by taking a starting index and a maximum length for the number of replies to return.

- **directRepliesInRange(address targetContract, uint256 parentId, uint256 fromIdx, uint256 maxLength)**
  Retrieves an array of reply structs for a specific target/activity item (`targetContract` and `parentId`) within a given range.

- **targetExistsAndAllowedForId(uint256 targetId)**
  Implements the `ITargetStatus` interface to check whether a reply exists and is allowed to be used, based on the reply ID. Returns two booleans: `exist` (whether the reply exists) and `allowed` (whether the reply is allowed). Used by other Ethos contracts to perform actions associated with reply IDs.

- **directReplyCount(address targetContract, uint256 targetId)**
  Returns the number of direct replies for a given target/activity item.

---

### Internal/Private Functions

The following functions are internal/private functions only accessible by public/external functions. These typically perform checks and other maintenance tasks.

- **_authorizeUpgrade(address newImplementation)**
  Restricts the upgrade functionality of the contract to the owner. It ensures that the new implementation address is not zero.

- **_doesReplyExist(uint256 replyId)**
  Checks whether a specific reply exists by verifying its creation timestamp. Reverts if the `createdAt` timestamp is zero.

- **_isAddressThisContract(address targetContract)**
  Checks whether the provided target address is the same as the current contract's address.

- **_checkIfTargetExistsAndAllowed(address targetContract, uint256 targetId)**
  Checks whether a target/activity item exists and is allowed to be used. If not, it reverts with `TargetNotFound`.
