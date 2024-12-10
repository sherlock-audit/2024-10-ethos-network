# Ethos Network Protocol Technical Documentation

## EthosVote v1

### Overview

The purpose of `ethosVote.sol` is to enable users to upvote or downvote any Ethos activity item (i.e. comments/replies, attestations, vouches, profiles, etc.). Similar to standard upvote/downvote systems in traditional social media, voting enables the user base to express their opinion on events/interactions within the Ethos ecosystem. Voting requires the user to have an Ethos profile, and they can only vote once on any activity item.

---

### Features

The `ethosVote` contract enables profile holders to vote on any Ethos activity item. The vote can be an upvote (to display agreement) or a downvote (to display disagreement). The user also has the ability to remove (archive) their vote or change to the opposite type (i.e. upvote to downvote). The general structure of the contract contains two main tracking structs: a general struct that tracks total votes (as well as the users who voted) for each activity item (if any votes exist), as well as an individual vote struct that exists for each specific vote (includes information on the type of vote and the target). The individual vote structs are tied to the profiles that perform the vote.

---

### Dependencies

`ethosVote` inherits the following utility and third-party (OpenZeppelin) dependencies:

- **AccessControl** → In-house custom access control contract based on `Ownable` and `AccessControl` from OpenZeppelin, which grants an owner and admin role to the contract. Also includes signature control and interfaces for the Ethos Network contract address manager (see AccessControl and ContractManager docs).

- **Common** → In-house library with helper functions (see Utility docs).

- **UUPSUpgradeable** (OpenZeppelin) → Enables functionality pertaining to upgradeable contract systems. EthosProfile is an upgradeable smart contract utilizing the proxy/implementation pattern.

---

### Storage Variables

The following is an overview of the storage layout in `ethosVote` along with their descriptions.

- **voteCount**: `(uint256)`
  Tracks the total number of votes cast (across all activity items). Incremented each time a new vote is added. Starts from `1`.

- **votes**: `(mapping(uint256 => Vote))`
  A mapping that stores each vote by its ID. The key is the vote ID, and the value is a `Vote` struct containing information about the vote.

- **votesGeneralByContractByTargetId**: `(mapping(address => mapping(uint256 => VotesGeneral)))`
  A nested mapping that tracks votes for each target. The first mapping is by the target contract’s address, the second is by the target’s ID, and the value is a `VotesGeneral` struct containing aggregated vote data.

---

### Structs

- **Vote**:
  Stores information related to individual votes.

  - **isUpvote**: `(bool)`
    Indicates if the vote is an upvote (`true`) or a downvote (`false`).

  - **isArchived**: `(bool)`
    Indicates whether the vote has been archived (aka unvote).

  - **targetContract**: `(address)`
    The address of the Ethos contract containing the activity item.

  - **voter**: `(uint256)`
    The ID of the profile that cast the vote.

  - **targetId**: `(uint256)`
    The ID of the activity item voted on.

  - **createdAt**: `(uint256)`
    The timestamp when the vote was created.

- **VotesGeneral**:
  Stores aggregated vote data for a specific activity item.

  - **upvotesCount**: `(uint256)`
    Tracks the total number of upvotes.

  - **downvotesCount**: `(uint256)`
    Tracks the total number of downvotes.

  - **voteIndexes**: `(uint256[])`
    An array storing the vote IDs for this activity item.

  - **voteIndexForVoter**: `(mapping(uint256 => uint256))`
    Maps profile ID to the vote ID for this activity item.

---

### Events

The following are descriptions of events emitted from `ethosVote`:

- **Voted(bool isUpvote, uint256 indexed voter, address indexed targetContract, uint256 indexed targetId, uint256 voteId)**
  Emitted when a new vote is cast.

- **VoteChanged(bool isUnvote, bool isUpvote, uint256 indexed voter, address indexed targetContract, uint256 indexed targetId, uint256 voteId)**
  Emitted when an existing vote is changed or archived.

---

### Modifiers

The following are function modifiers used in `ethosVote`:

- **onlyNonZeroAddress(address addr)**
  Ensures that the address provided is not the zero address. Reverts if the address is zero.

- **whenNotPaused**
  Ensures that the contract is not paused before executing certain functions. This is a standard pause mechanism often used for emergency stops (see AccessControl docs).

---

### External/Public Functions

The following are descriptions of user-facing and/or externally accessible functions:

- **initialize(address owner, address admin, address expectedSigner, address signatureVerifier, address contractAddressManagerAddr)**
  Initializes the contract by setting the owner, admin, and other important contract addresses. This function replaces the constructor and ensures that important roles are assigned during deployment. Sets `voteCount` to `1`.

- **voteFor(address targetContract, uint256 targetId, bool isUpvote)**
  Allows a user to vote on a specific activity item (such as a review or profile). Checks if the activity item exists and whether the user has already voted. If the user has already voted, the vote is modified. If not, a new vote is recorded.

---

### View Functions

The following are view functions that return information pertaining to storage on `ethosVote`:

- **votesCountFor(address targetContract, uint256 targetId)**
  Returns the number of upvotes and downvotes for a given activity item (aka target).

- **votesInRangeFor(address targetContract, uint256 targetId, uint256 fromIdx, uint256 maxLength)**
  Returns an array of votes in a specified range for a given activity item. Supports pagination by allowing the user to specify a starting index and maximum number of votes to retrieve.

- **voteIndexFor(uint256 voter, address targetContract, uint256 targetId)**
  Returns the index of the vote for the specified voter and activity item details (`targetContract`, and `targetId`).

- **hasVotedFor(uint256 voter, address targetContract, uint256 targetId)**
  Checks if a voter has already cast a vote on the specified activity item. Returns `true` if the voter has voted, otherwise `false`.

---

### Internal/Private Functions

The following functions are internal/private functions only accessible by public/external functions. These typically perform checks and other maintenance tasks:

- **_authorizeUpgrade(address newImplementation)**
  Restricts the upgrade functionality of the contract to the owner. It ensures that the new implementation address is not zero.

- **_modifyVote(address targetContract, uint256 targetId, uint256 voter, bool isUpvote)**
  Modifies an existing vote by either archiving it or changing the vote (from upvote to downvote or vice versa). If the vote is archived, the relevant vote counts on the general struct are adjusted. If the vote is changed, the previous vote is reversed, and the new vote is applied.

- **_recordVote(uint256 voter, address targetContract, uint256 targetId, bool isUpvote)**
  Records a new vote and updates the aggregated vote counts in the `VotesGeneral` struct.

- **_votesInRange(uint256 maxLength, uint256 fromIdx, uint256[] memory idArray)**
  Returns an array of votes within a specified range. This is used internally to paginate results when retrieving multiple votes.

