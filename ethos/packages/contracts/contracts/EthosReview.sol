// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { UUPSUpgradeable } from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import { IEthosAttestation } from "./interfaces/IEthosAttestation.sol";
import { ITargetStatus } from "./interfaces/ITargetStatus.sol";
import { IEthosProfile } from "./interfaces/IEthosProfile.sol";
import { ETHOS_ATTESTATION, ETHOS_PROFILE } from "./utils/Constants.sol";
import { WrongPaymentToken, WrongPaymentAmount, ReviewNotFound, ReviewIsArchived, ReviewNotArchived, InvalidReviewDetails, SelfReview, UnauthorizedEdit } from "./errors/ReviewErrors.sol";
import { AttestationDetails } from "./utils/Structs.sol";
import { AccessControl } from "./utils/AccessControl.sol";
import { Common } from "./utils/Common.sol";

/**
 * @title EthosReview
 * @dev The EthosReview contract allows users to leave reviews of either users or attestations within the Ethos network.
 * Reviews contain a score (positive, neutral, or negative), a comment, and optional metadata.
 * The contract also includes functionality for handling payments for review services using specific tokens.
 * Each review is tied to both the author's and the subject's Ethos profiles, and the contract supports adding, archiving, and restoring reviews.
 *
 * Features:
 * - Reviews can be based on either a user address (aka subject) or an attestation.
 * - The target of the review can be unaffiliated with Ethos (meaning no profile currently assigned to it).
 * - If a subject or attestation does not have existing Ethos profiles, a "mock" profile is created for them.
 * - To leave a review, the user must pay a protocol fee set by the admin team.
 * - This differentiates reviews from discussions, as it acts as a form of Sybil protection while also elevating their significance compared to other activity items.
 */
contract EthosReview is AccessControl, Common, ITargetStatus, UUPSUpgradeable {
  /**
   * @dev Constructor that disables initializers when the implementation contract is deployed.
   * This prevents the implementation contract from being initialized, which is important for
   * security since the implementation contract should never be used directly, only through
   * delegatecall from the proxy.
   */
  constructor() {
    _disableInitializers();
  }

  enum Score {
    Negative,
    Neutral,
    Positive
  }

  enum ReviewsBy {
    Author,
    Subject,
    AttestationHash
  }

  /**
   * @dev Stores information about individual reviews.
   * @param archived Indicates whether the review is archived.
   * @param score The score of the review (positive, neutral, or negative).
   * @param author The address of the review author.
   * @param subject The address of the subject being reviewed. Should be the zero address if the review is for an attestation.
   * @param reviewId The unique ID of the review.
   * @param authorProfileId The Ethos profile ID of the author.
   * @param createdAt The timestamp of when the review was created.
   * @param comment The review comment provided by the author.
   * @param metadata Additional metadata associated with the review.
   * @param attestationDetails Details of the attestation if the review is based on an attestation.
   */
  struct Review {
    bool archived;
    Score score;
    address author;
    address subject;
    uint256 reviewId;
    uint256 createdAt;
    string comment;
    string metadata;
    AttestationDetails attestationDetails;
  }

  /**
   * @dev Defines the payment details for a specific token.
   * @param allowed Indicates whether the token is allowed for payment.
   * @param price The price for creating a review with this token.
   */
  struct PaymentToken {
    bool allowed;
    uint256 price;
  }

  // Tracks the total number of reviews created
  uint256 public reviewCount;

  // Mapping from payment token addresses to PaymentToken structs
  mapping(address => PaymentToken) public reviewPrice;
  // Mapping from review ID to the Review struct
  mapping(uint256 => Review) public reviews;
  // Mapping from author address to review IDs
  mapping(address => uint256[]) public reviewIdsByAuthorAddress;
  // Mapping from subject address to review IDs (when review is for an address)
  mapping(address => uint256[]) public reviewIdsBySubjectAddress;
  // Mapping from attestation hash to review IDs (when review is for an attestation)
  mapping(bytes32 => uint256[]) public reviewIdsByAttestationHash;

  // Add storage gap as the last storage variable
  // This allows us to add new storage variables in future upgrades
  // by reducing the size of this gap
  uint256[50] private __gap;

  event ReviewCreated(
    Score score,
    address indexed author,
    bytes32 indexed attestationHash,
    address indexed subject,
    uint256 reviewId,
    uint256 profileId
  );

  event ReviewEdited(uint256 indexed reviewId, address indexed author, address indexed subject);
  event ReviewArchived(uint256 indexed reviewId, address indexed author, address indexed subject);
  event ReviewRestored(uint256 indexed reviewId, address indexed author, address indexed subject);

  modifier onlyValidPaymentToken(address paymentToken) {
    if (!reviewPrice[paymentToken].allowed) {
      revert WrongPaymentToken(paymentToken);
    }
    _;
  }

  /**
   * @dev Initializes the contract.
   * @param owner Owner address.
   * @param admin Admin address.
   * @param expectedSigner ExpectedSigner address.
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

    // allow Ethereum based reviews by default, at zero cost
    reviewPrice[address(0)] = PaymentToken({ allowed: true, price: 0 });
    __UUPSUpgradeable_init();
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
   * @return The Ethos Profile contract interface
   */
  function _getEthosProfile() private view returns (IEthosProfile) {
    return IEthosProfile(contractAddressManager.getContractAddressForName(ETHOS_PROFILE));
  }

  /**
   * @dev Convenience function to get the Ethos Attestation contract.
   * @return The Ethos Attestation contract interface
   */
  function _getEthosAttestation() private view returns (IEthosAttestation) {
    return IEthosAttestation(contractAddressManager.getContractAddressForName(ETHOS_ATTESTATION));
  }

  /**
   * @dev Adds a review.
   * @param score Review score.
   * @param subject Review subject address. attestationDetails must be empty.
   * @param paymentToken Payment token address.
   * @param comment Comment.
   * @param metadata Metadata.
   * @param attestationDetails Attestation details. subject must be empty.
   */
  function addReview(
    Score score,
    address subject,
    address paymentToken,
    string calldata comment,
    string calldata metadata,
    AttestationDetails calldata attestationDetails
  ) external payable whenNotPaused {
    _validateReviewDetails(subject, attestationDetails);
    IEthosProfile ethosProfile = _getEthosProfile();
    ethosProfile.verifiedProfileIdForAddress(msg.sender);
    bytes32 attestationHash;
    uint256 mockId;
    if (subject != address(0)) {
      mockId = ethosProfile.profileIdByAddress(subject);
      mockId = _addReview(mockId, subject, false, 0x0, ethosProfile);
    } else {
      // convert the service/account to a hash as an identifier
      attestationHash = _getEthosAttestation().getServiceAndAccountHash(
        attestationDetails.service,
        attestationDetails.account
      );
      mockId = ethosProfile.profileIdByAttestation(attestationHash);
      mockId = _addReview(mockId, subject, true, attestationHash, ethosProfile);
    }

    _handlePayment(paymentToken);

    reviews[reviewCount] = Review({
      archived: false,
      score: score,
      author: msg.sender,
      subject: subject,
      reviewId: reviewCount,
      // solhint-disable-next-line not-rely-on-time
      createdAt: block.timestamp,
      comment: comment,
      metadata: metadata,
      attestationDetails: attestationDetails
    });

    // store reference to review in convenience lookup mappings
    reviewIdsByAuthorAddress[msg.sender].push(reviewCount);
    if (subject != address(0)) {
      reviewIdsBySubjectAddress[subject].push(reviewCount);
    } else {
      reviewIdsByAttestationHash[attestationHash].push(reviewCount);
    }

    emit ReviewCreated(score, msg.sender, attestationHash, subject, reviewCount, mockId);
    reviewCount++;
  }

  /**
   * @dev Creates a mock Id in ethos profile if needed
   * @param mockId current pending id of the subject or attestation
   * @param subject address of subject. address(0) if review is for attestation
   * @param isAttestation flag of whether the review is based on an attestation
   * @param attestationHash hash of attestation details. Empty bytes32 if review is not for attestation
   * @param ethosProfile ethosProfile interface to avoid multiple external calls
   * @return subjectProfileId the final id to link to the review
   */
  function _addReview(
    uint256 mockId,
    address subject,
    bool isAttestation,
    bytes32 attestationHash,
    IEthosProfile ethosProfile
  ) internal returns (uint256 subjectProfileId) {
    // if profileId does not exist for subject, create and record a "mock"
    if (mockId == 0) {
      subjectProfileId = ethosProfile.incrementProfileCount(
        isAttestation,
        subject,
        attestationHash
      );
    } else {
      subjectProfileId = mockId;
    }
  }

  /**
   * @notice Allows the original author to edit an existing review
   * They may only modify the comment and metadata, not the score or subject details.
   *
   * @param reviewId The unique identifier of the review to be edited
   * @param comment The new comment text for the review
   * @param metadata The new metadata for the review
   *
   * Emits ReviewEdited when the review is successfully edited
   */
  function editReview(
    uint256 reviewId,
    string calldata comment,
    string calldata metadata
  ) external whenNotPaused {
    Review storage review = reviews[reviewId];
    if (review.archived) {
      revert ReviewIsArchived(reviewId);
    }
    _onlyReviewAuthor(reviewId);

    review.comment = comment;
    review.metadata = metadata;

    emit ReviewEdited(reviewId, msg.sender, review.subject);
  }

  /**
   * @dev Archives review.
   * @param reviewId Review id.
   */
  function archiveReview(uint256 reviewId) external whenNotPaused {
    (bool exists, ) = targetExistsAndAllowedForId(reviewId);
    if (!exists) {
      revert ReviewNotFound(reviewId);
    }

    Review storage review = reviews[reviewId];
    if (review.archived) {
      revert ReviewIsArchived(reviewId);
    }
    _onlyReviewAuthor(reviewId);

    review.archived = true;
    emit ReviewArchived(reviewId, msg.sender, review.subject);
  }

  /**
   * @dev Restores review.
   * @param reviewId Review id.
   */
  function restoreReview(uint256 reviewId) external whenNotPaused {
    Review storage review = reviews[reviewId];
    if (review.author == address(0)) {
      revert ReviewNotFound(reviewId);
    }

    if (!review.archived) {
      revert ReviewNotArchived(reviewId);
    }
    _onlyReviewAuthor(reviewId);

    review.archived = false;
    emit ReviewRestored(reviewId, msg.sender, review.subject);
  }

  /**
   * @notice Set 0 to disable acceptance of specific tokens as payment.
   * @dev Sets review price.
   * @param allowed Whether the token is allowed.
   * @param paymentToken Payment token address.
   * @param price Review price.
   */
  function setReviewPrice(
    bool allowed,
    address paymentToken,
    uint256 price
  ) external onlyAdmin whenNotPaused {
    if (allowed) {
      reviewPrice[paymentToken] = PaymentToken({ allowed: allowed, price: price });
    } else {
      delete reviewPrice[paymentToken];
    }
  }

  /**
   * @dev Withdraws funds.
   * @param paymentToken Payment token address.
   */
  function withdrawFunds(address paymentToken) external onlyOwner whenNotPaused {
    if (paymentToken == address(0)) {
      payable(msg.sender).transfer(address(this).balance);
    } else {
      IERC20(paymentToken).transfer(msg.sender, IERC20(paymentToken).balanceOf(address(this)));
    }
  }

  // ITargetStatus implementation
  /**
   * @dev Checks whether review exists and is allowed to be used.
   * @param targetId Review id.
   * @return exists Whether review exists.
   * @return allowed Whether review is allowed to be used.
   */
  function targetExistsAndAllowedForId(
    uint256 targetId
  ) public view returns (bool exists, bool allowed) {
    Review storage review = reviews[targetId];

    exists = review.createdAt > 0;
    allowed = exists;
  }

  // private functions
  /**
   * @dev Handles payment for reviews.
   * @param paymentToken Payment token address.
   */
  function _handlePayment(address paymentToken) private onlyValidPaymentToken(paymentToken) {
    uint256 price = reviewPrice[paymentToken].price;

    if (price > 0) {
      if (paymentToken == address(0)) {
        if (msg.value != price) {
          revert WrongPaymentAmount(paymentToken, msg.value);
        }
      } else {
        if (msg.value > 0) {
          revert WrongPaymentAmount(address(0), msg.value);
        }

        IERC20(paymentToken).transferFrom(msg.sender, address(this), price);
      }
    }
  }

  /**
   * @dev Validates review details.
   * @param subject Subject address.
   * @param attestationDetails Attestation details.
   */
  function _validateReviewDetails(
    address subject,
    AttestationDetails calldata attestationDetails
  ) private view {
    if (
      subject == address(0) &&
      (bytes(attestationDetails.account).length == 0 ||
        bytes(attestationDetails.service).length == 0)
    ) {
      revert InvalidReviewDetails("None set");
    }

    if (
      subject != address(0) &&
      (bytes(attestationDetails.account).length != 0 ||
        bytes(attestationDetails.service).length != 0)
    ) {
      revert InvalidReviewDetails("Both set");
    }

    // sender and subject are the exact same address
    if (subject == msg.sender) {
      revert SelfReview(subject);
    }

    uint256 authorProfileId = _getEthosProfile().profileIdByAddress(msg.sender);
    if (subject != address(0)) {
      // if reviewing by address, check if the author's profile is the same as the subject's profile
      uint256 subjectProfileId = _getEthosProfile().profileIdByAddress(subject);
      if (authorProfileId == subjectProfileId) {
        revert SelfReview(subject);
      }
    } else {
      // if reviewing by attestation, check if the author's profile is the same as the subject's profile
      bytes32 attestationHash = _getEthosAttestation().getServiceAndAccountHash(
        attestationDetails.service,
        attestationDetails.account
      );
      uint256 subjectProfileId = _getEthosProfile().profileIdByAttestation(attestationHash);
      if (authorProfileId == subjectProfileId) {
        revert SelfReview(subject);
      }
    }
  }

  function _onlyReviewAuthor(uint256 reviewId) private view {
    uint256 senderProfileId = _getEthosProfile().verifiedProfileIdForAddress(msg.sender);
    uint256 authorProfileId = _getEthosProfile().verifiedProfileIdForAddress(
      reviews[reviewId].author
    );
    if (senderProfileId != authorProfileId) {
      revert UnauthorizedEdit(reviewId);
    }
  }

  /**
   * @dev Returns reviews in range.
   * @param maxLength Maximum length of items to return.
   * @param fromIdx Start index.
   * @param idArray Array of ids.
   * @return result Reviews array.
   */
  function _reviewsInRange(
    uint256 maxLength,
    uint256 fromIdx,
    uint256[] memory idArray
  ) private view returns (Review[] memory result) {
    uint256 idArrayLength = idArray.length;

    uint256 length = _correctLength(idArrayLength, maxLength, fromIdx);
    if (length == 0) {
      return result;
    }

    result = new Review[](length);

    for (uint256 i = 0; i < length; ++i) {
      result[i] = reviews[idArray[fromIdx + i]];
    }
  }
}
