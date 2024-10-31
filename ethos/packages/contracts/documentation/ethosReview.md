# Ethos Network Protocol Technical Documentation

## EthosReview v1

### Overview

The purpose of `ethosReview.sol` is to allow users to leave reviews of either users or attestations within the Ethos network. Reviews contain a score (positive, neutral, or negative), a comment, and optional metadata. The contract also includes functionality for handling payments for review services using specific tokens. Each review is tied to both the author’s and the subject’s Ethos profiles, and the contract supports adding, archiving, and restoring reviews.

---

### Features

A review can be based on either a user address (aka subject) or an attestation. The target of the review can be unaffiliated with Ethos (meaning no profile currently assigned to it). If a subject or attestation does not have existing Ethos profiles, a "mock" profile is created for them (see ethosProfile doc). To leave a review, the user must pay a protocol fee set by the admin team. This differentiates reviews from discussions, as it acts as a form of Sybil protection while also elevating their significance compared to other activity items (such as votes or replies).

---

### Dependencies

`ethosReview` inherits the following utility and third-party (OpenZeppelin) dependencies:

- **AccessControl**
  In-house custom access control contract based on `Ownable` and `AccessControl` from OpenZeppelin, which grants an owner and admin role to the contract. It also includes signature control and interfaces for the Ethos Network contract address manager (see AccessControl and ContractManager docs).

- **Common**
  In-house library with helper functions (see Utility docs).

- **UUPSUpgradeable** (OpenZeppelin)
  Enables functionality for upgradeable contract systems. EthosProfile is an upgradeable smart contract utilizing the proxy/implementation pattern.

---

### Storage Variables

- **reviewCount**: `(uint256)`
  Tracks the total number of reviews created. Incremented every time a new review is added.

- **reviewPrice**: `(mapping(address => PaymentToken))`
  A mapping from payment token addresses to `PaymentToken` structs, which define whether the token is allowed for payment and its price.

- **reviews**: `(mapping(uint256 => Review))`
  A mapping from review ID to the `Review` struct containing information about each review.

- **reviewIdsByAuthorProfileId**: `(mapping(uint256 => uint256[]))`
  A mapping from the author’s profile ID to an array of review IDs authored by that profile.

- **reviewIdsBySubjectProfileId**: `(mapping(uint256 => uint256[]))`
  A mapping from the subject’s profile ID to an array of review IDs related to that profile.

---

### Structs

- **Review**:
  Stores information about individual reviews.

  - **archived**: `(bool)`
    Indicates whether the review is archived.
  - **score**: `(Score)`
    The score of the review (positive, neutral, or negative).
  - **author**: `(address)`
    The address of the review author.
  - **subject**: `(address)`
    The address of the subject being reviewed. Should be the zero address if the review is for an attestation.
  - **reviewId**: `(uint256)`
    The unique ID of the review.
  - **authorProfileId**: `(uint256)`
    The Ethos profile ID of the author.
  - **createdAt**: `(uint256)`
    The timestamp of when the review was created.
  - **comment**: `(string)`
    The review comment provided by the author.
  - **metadata**: `(string)`
    Additional metadata associated with the review.
  - **attestationDetails**: `(AttestationDetails)`
    Details of the attestation if the review is based on an attestation. The details should be empty strings if the review is for an address. See ethosAttestation docs for more details on this struct.

- **PaymentToken**:
  Defines the payment details for a specific token.

  - **allowed**: `(bool)`
    Indicates whether the token is allowed for payment.
  - **price**: `(uint256)`
    The price for creating a review with this token.

---

### Events

The following are descriptions of events emitted from `ethosReview`:

- **ReviewCreated(Score score, address indexed author, bytes32 attestationHash, address indexed subject, uint256 reviewId, uint256 profileId)**
  Emitted when a new review is created, either for an address (subject) or based on an attestation.

- **ReviewEdited(uint256 indexed reviewId, address indexed author, address indexed subject)**
  Emitted when a review is edited by the author.

- **ReviewArchived(uint256 indexed reviewId, address indexed author, address indexed subject)**
  Emitted when a review is archived by the author.

- **ReviewRestored(uint256 indexed reviewId, address indexed author, address indexed subject)**
  Emitted when an archived review is restored by the author.

---

### Modifiers

- **onlyNonZeroAddress(address addr)**
  Ensures that the address provided is not the zero address. Reverts if the address is zero.

- **whenNotPaused**
  Ensures that the contract is not paused before executing certain functions. This is a standard pause mechanism often used for emergency stops (see AccessControl docs).

- **onlyValidPaymentToken(address paymentToken)**
  Ensures that the payment token provided is valid and allowed for payments. Reverts with `WrongPaymentToken` if the token is invalid.

---

### External/Public Functions

The following are descriptions of user-facing and/or externally accessible functions:

- **initialize(address owner, address admin, address expectedSigner, address signatureVerifier, address contractAddressManagerAddr)**
  Initializes the contract by setting the owner, admin, and other important contract addresses. This function replaces the constructor and ensures that important roles are assigned during deployment.

- **addReview(Score score, address subject, address paymentToken, string calldata comment, string calldata metadata, AttestationDetails calldata attestationDetails)**
  Allows users to add a review for either a subject (address) or a service/account via attestation. Handles payment validation and records the review in storage. If the subject or attestation does not have an existing profile ID, a mock ID is created for them (via ethosProfile).

- **archiveReview(uint256 reviewId)**
  Allows the author to archive a review, marking it as inactive. Reverts if the review does not exist or if the caller is not the author.

- **restoreReview(uint256 reviewId)**
  Allows the author to restore a previously archived review. Reverts if the review does not exist, if the caller is not the author, or if the review is not archived.

- **setReviewPrice(bool allowed, address paymentToken, uint256 price)**
  Allows an admin to set or remove the allowed status and price for a specific payment token.

- **withdrawFunds(address paymentToken)**
  Allows the owner to withdraw funds collected from review payments, either in the form of the native token or other ERC20 tokens. For native (gas) tokens, the `paymentToken` address is the zero address.

- **editReview(uint256 reviewId, string calldata comment, string calldata metadata)**
  Allows the original author to edit an existing review. Only the comment and metadata can be modified, not the score or subject details. Reverts if the caller is not the original author or if the review is archived.

---

### View Functions

The following are view functions that return information pertaining to storage on `ethosReview`:

- **reviewsByAuthorInRange(uint256 authorProfileId, uint256 fromIdx, uint256 maxLength)**
  Returns an array of reviews written by a specific author, within a specified range for pagination purposes.

- **reviewsBySubjectInRange(uint256 subjectProfileId, uint256 fromIdx, uint256 maxLength)**
  Returns an array of reviews written about a specific subject, within a specified range for pagination purposes.

- **reviewsByAttestationHashInRange(bytes32 attestationHash, uint256 fromIdx, uint256 maxLength)**
  Returns an array of reviews related to a specific attestation hash, within a specified range for pagination purposes.

- **numberOfReviewsBy(ReviewsBy reviewsBy, uint256 profileId, bytes32 attestationHash)**
  Returns the total number of reviews either by author, subject, or attestation hash.

- **reviewIdsBySubjectAddress(address subjectAddress)**
  Returns an array of review IDs related to a specific subject address.

- **reviewIdsBySubjectAttestationHash(bytes32 attestationHash)**
  Returns an array of review IDs related to a specific attestation hash.

- **targetExistsAndAllowedForId(uint256 targetId)**
  Implements the `ITargetStatus` interface to check whether a review ID exists and is allowed to be used, based on the review ID. Returns two booleans: `exists` (whether the review exists) and `allowed` (whether the review is allowed). Used by other Ethos contracts to perform actions associated with review IDs.

---

### Internal/Private Functions

The following functions are internal/private functions only accessible by public/external functions. These typically perform checks and other maintenance tasks:

- **_authorizeUpgrade(address newImplementation)**
  Restricts contract upgrades to the owner. Ensures the new implementation address is valid.

- **_addReview(uint256 mockId, address subject, bool isAttestation, bytes32 attestationHash, IEthosProfile ethosProfile)**
  Internal function for adding a review. It handles both subject-based and attestation-based reviews. Creates a mock ID (via ethosProfile) if the subject or attestation is not associated with an existing profile.
