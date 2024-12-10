// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { UUPSUpgradeable } from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import { ITargetStatus } from "./interfaces/ITargetStatus.sol";
import { IEthosProfile } from "./interfaces/IEthosProfile.sol";
import { ETHOS_PROFILE } from "./utils/Constants.sol";
import { Common } from "./utils/Common.sol";
import { TargetNotFound } from "./errors/TargetStatusErrors.sol";
import { NoReplyFound, OnlyAuthorCanEdit } from "./errors/DiscussionErrors.sol";
import { AccessControl } from "./utils/AccessControl.sol";

/**
 * @title EthosDiscussion
 * @dev The EthosDiscussion contract enables users to leave text-based comments on virtually any activity item within the network.
 * These include vouches, attestations, reviews, profiles, or even other comments. Comments can be viewed and created through the Ethos app.
 * They do not cost any deposit to create, however, a commenter's address must be associated with a valid profile that is not archived.
 *
 * Key Features:
 * - Users can create comments as well as modify them.
 * - Comments cannot be deleted on-chain, but can be edited to remove the string content if desired.
 * - All interactions persist on the blockchain and cannot be fully reversed.
 * - The contract is upgradeable, enabling future functionality updates.
 *
 * @notice To get all the replies for a comment, you should call directRepliesInRange() with 2 separate targetContracts:
 * 1) The contract that has the original comment (e.g. EthosReview) - this is to get the replies for the original comment.
 * 2) This contract - this is to get the replies for the replies.
 */
contract EthosDiscussion is ITargetStatus, Common, AccessControl, UUPSUpgradeable {
  /**
   * @dev Constructor that disables initializers when the implementation contract is deployed.
   * This prevents the implementation contract from being initialized, which is important for
   * security since the implementation contract should never be used directly, only through
   * delegatecall from the proxy.
   */
  constructor() {
    _disableInitializers();
  }

  struct Reply {
    bool parentIsOriginalComment;
    address targetContract;
    uint256 authorProfileId;
    uint256 id;
    uint256 parentId;
    uint256 createdAt;
    uint256 edits;
    string content;
    string metadata;
  }

  /// @dev Tracks the total number of replies created. Incremented every time a new reply is added.
  uint256 public replyCount;
  mapping(uint256 => Reply) private replies;
  mapping(uint256 => uint256[]) private replyIdsByAuthor;
  /// @dev A nested mapping that tracks the replies for a specific activity item (aka target).
  /// The first mapping is by the target contract's address, the second is by the target's ID, and the value is an array of reply IDs.
  mapping(address => mapping(uint256 => uint256[]))
    private directReplyIdsByTargetAddressAndTargetId; // targetContract => taget id => reply ids. it can be 1) contractWithOriginalComment => comment id => reply ids; 2) EthosDiscussion => reply id => reply ids

  // Add storage gap as the last storage variable
  // This allows us to add new storage variables in future upgrades
  // by reducing the size of this gap
  uint256[50] private __gap;

  event ReplyAdded(uint256 author, address indexed targetContract, uint256 indexed replyId);

  event ReplyEdited(uint256 author, uint256 replyId);

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
  )
    external
    initializer
    onlyNonZeroAddress(owner)
    onlyNonZeroAddress(admin)
    onlyNonZeroAddress(expectedSigner)
    onlyNonZeroAddress(signatureVerifier)
    onlyNonZeroAddress(contractAddressManagerAddr)
  {
    __accessControl_init(
      owner,
      admin,
      expectedSigner,
      signatureVerifier,
      contractAddressManagerAddr
    );
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
   * @dev Adds a reply to an activity item/target.
   * @param targetContract Target contract address.
   * @param targetId Target id.
   * @param content Comment content.
   * @param metadata Comment metadata.
   */
  function addReply(
    address targetContract,
    uint256 targetId,
    string memory content,
    string memory metadata
  ) external onlyNonZeroAddress(targetContract) whenNotPaused {
    uint256 authorID = IEthosProfile(
      contractAddressManager.getContractAddressForName(ETHOS_PROFILE)
    ).verifiedProfileIdForAddress(msg.sender);

    bool isTargetThisContract = _isAddressThisContract(targetContract);

    if (isTargetThisContract) {
      if (replies[targetId].createdAt == 0) {
        revert TargetNotFound(targetContract, targetId);
      }
    } else {
      _checkIfTargetExistsAndAllowed(targetContract, targetId);
    }

    uint256 _replyCount = replyCount;

    directReplyIdsByTargetAddressAndTargetId[targetContract][targetId].push(_replyCount);
    replyIdsByAuthor[authorID].push(_replyCount);

    replies[_replyCount] = Reply(
      !isTargetThisContract,
      targetContract,
      authorID,
      _replyCount,
      targetId,
      block.timestamp,
      0,
      content,
      metadata
    );

    emit ReplyAdded(authorID, targetContract, _replyCount);

    replyCount++;
  }

  /**
   * @dev Edits an existing reply. The number of edits on a specific reply ID is tracked.
   * @param replyId id of the reply to edit
   * @param content New comment content.
   * @param metadata New comment metadata.
   */
  function editReply(
    uint256 replyId,
    string memory content,
    string memory metadata
  ) external whenNotPaused {
    uint256 authorID = IEthosProfile(
      contractAddressManager.getContractAddressForName(ETHOS_PROFILE)
    ).verifiedProfileIdForAddress(msg.sender);

    _doesReplyExist(replyId);
    if (replies[replyId].authorProfileId != authorID) {
      revert OnlyAuthorCanEdit();
    }
    replies[replyId].content = content;
    replies[replyId].metadata = metadata;
    replies[replyId].edits++;

    emit ReplyEdited(authorID, replyId);
  }

  /**
   * @dev Checks if replyId exists.
   * @param replyId id of the reply to check
   */
  function _doesReplyExist(uint256 replyId) internal view {
    if (replies[replyId].createdAt == 0) {
      revert NoReplyFound(replyId);
    }
  }

  /**
   * @dev Returns replies by id.
   * @param replyIds Reply ids.
   * @return result Replies.
   */
  function repliesById(uint256[] memory replyIds) external view returns (Reply[] memory result) {
    result = new Reply[](replyIds.length);

    for (uint256 i = 0; i < replyIds.length; ++i) {
      uint256 replyId = replyIds[i];

      _doesReplyExist(replyId);

      result[i] = replies[replyId];
    }
  }

  /**
   * @dev Returns replies by author within a given range.
   * @param author Author address.
   * @param fromIdx Start index.
   * @param maxLength Maximum length.
   * @return result Replies.
   */
  function repliesByAuthorInRange(
    uint256 author,
    uint256 fromIdx,
    uint256 maxLength
  ) external view returns (Reply[] memory result) {
    uint256[] memory replyIds = replyIdsByAuthor[author];
    uint256 length = _correctLength(replyIds.length, maxLength, fromIdx);

    if (length == 0) {
      return result;
    }

    result = new Reply[](length);

    for (uint256 i = 0; i < length; ++i) {
      uint256 replyId = replyIds[fromIdx + i];
      result[i] = replies[replyId];
    }
  }

  /**
   * @dev Returns direct replies for a specific target/activity item within a given range.
   * @param targetContract Target contract address.
   * @param parentId Parent id.
   * @param fromIdx Start index.
   * @param maxLength Maximum length.
   * @return result Replies.
   */
  function directRepliesInRange(
    address targetContract,
    uint256 parentId,
    uint256 fromIdx,
    uint256 maxLength
  ) external view returns (Reply[] memory result) {
    uint256[] memory replyIds = directReplyIdsByTargetAddressAndTargetId[targetContract][parentId];
    uint256 length = _correctLength(replyIds.length, maxLength, fromIdx);

    if (length == 0) {
      return result;
    }

    result = new Reply[](length);

    for (uint256 i = 0; i < length; ++i) {
      uint256 replyId = replyIds[fromIdx + i];
      result[i] = replies[replyId];
    }
  }

  // ITargetStatus implementation
  /**
   * @dev Checks whether reply exists & is allowed to be used.
   * @param targetId Reply id.
   * @return exist Whether reply exists.
   * @return allowed Whether reply is allowed to be used.
   */
  function targetExistsAndAllowedForId(
    uint256 targetId
  ) external view returns (bool exist, bool allowed) {
    Reply storage reply = replies[targetId];

    exist = reply.createdAt > 0;
    allowed = exist;
  }

  /**
   * @dev Returns the number of direct replies for a given target.
   * @param targetContract Target contract address.
   * @param targetId Target id.
   * @return count Number of direct replies.
   */
  function directReplyCount(
    address targetContract,
    uint256 targetId
  ) external view returns (uint256 count) {
    count = directReplyIdsByTargetAddressAndTargetId[targetContract][targetId].length;
  }

  /**
   * @dev Returns whether provided address is this contract.
   * @param targetContract Address to check.
   * @return Whether the address is this contract.
   */
  function _isAddressThisContract(address targetContract) private view returns (bool) {
    return targetContract == address(this);
  }

  /**
   * @dev Checks if the target exists and is allowed.
   * @param targetContract Target contract address.
   * @param targetId Target id.
   */
  function _checkIfTargetExistsAndAllowed(address targetContract, uint256 targetId) private view {
    (bool exists, ) = ITargetStatus(targetContract).targetExistsAndAllowedForId(targetId);

    if (!exists) {
      revert TargetNotFound(targetContract, targetId);
    }
  }
}
