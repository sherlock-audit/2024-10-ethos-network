// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { UUPSUpgradeable } from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import { ITargetStatus } from "./interfaces/ITargetStatus.sol";
import { AccessControl } from "./utils/AccessControl.sol";
import { Common } from "./utils/Common.sol";
import { IEthosProfile } from "./interfaces/IEthosProfile.sol";
import { ETHOS_PROFILE } from "./utils/Constants.sol";
import { TargetNotFound } from "./errors/TargetStatusErrors.sol";

/**
 * @title EthosVote
 * @dev The EthosVote contract enables users to upvote or downvote any Ethos activity item
 * (i.e. comments/replies, attestations, vouches, profiles, etc.). Similar to standard
 * upvote/downvote systems in traditional social media, voting enables the user base to
 * express their opinion on events/interactions within the Ethos ecosystem.
 *
 * Key Features:
 * - Voting requires the user to have an Ethos profile.
 * - Users can only vote once on any activity item.
 * - Users can change their vote or remove (archive) it.
 * - Tracks total votes for each activity item and individual votes per user.
 */
contract EthosVote is AccessControl, Common, UUPSUpgradeable {
  /**
   * @dev Constructor that disables initializers when the implementation contract is deployed.
   * This prevents the implementation contract from being initialized, which is important for
   * security since the implementation contract should never be used directly, only through
   * delegatecall from the proxy.
   */
  constructor() {
    _disableInitializers();
  }

  /**
   * @dev Stores information related to individual votes.
   * @param isUpvote Indicates if the vote is an upvote (true) or a downvote (false).
   * @param isArchived Indicates whether the vote has been archived (aka unvote).
   * @param targetContract The address of the Ethos contract containing the activity item.
   * @param voter The ID of the profile that cast the vote.
   * @param targetId The ID of the activity item voted on.
   * @param createdAt The timestamp when the vote was created.
   */
  struct Vote {
    bool isUpvote;
    bool isArchived;
    address targetContract;
    uint256 voter;
    uint256 targetId;
    uint256 createdAt;
  }

  /**
   * @dev Stores aggregated vote data for a specific activity item.
   * @param upvotesCount Tracks the total number of upvotes.
   * @param downvotesCount Tracks the total number of downvotes.
   * @param voteIndexes An array storing the vote IDs for this activity item.
   * @param voteIndexForVoter Maps profile ID to the vote ID for this activity item.
   */
  struct VotesGeneral {
    uint256 upvotesCount;
    uint256 downvotesCount;
    uint256[] voteIndexes; // index in votes
    mapping(uint256 => uint256) voteIndexForVoter; // voter => index in votes
  }

  // Tracks the total number of votes cast (across all activity items)
  // Starts from 1, with 0 reserved for indicating no vote
  uint256 public voteCount;

  // Mapping that stores each vote by its ID
  mapping(uint256 => Vote) public votes; // [0] is empty vote
  // Nested mapping that tracks votes for each target
  // First level: targetContract address
  // Second level: targetId
  // Value: VotesGeneral struct containing aggregated vote data and vote indexes
  mapping(address => mapping(uint256 => VotesGeneral)) private votesGeneralByContractByTargetId;

  // Add storage gap as the last storage variable
  // This allows us to add new storage variables in future upgrades
  // by reducing the size of this gap
  uint256[50] private __gap;

  event Voted(
    bool isUpvote,
    uint256 indexed voter,
    address indexed targetContract,
    uint256 indexed targetId,
    uint256 voteId
  );

  event VoteChanged(
    bool isUnvote,
    bool isUpvote,
    uint256 indexed voter,
    address indexed targetContract,
    uint256 indexed targetId,
    uint256 voteId
  );

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
    voteCount = 1;
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
   * @dev Votes for a target contract with a target id. Example: review with id.
   * @param targetContract Target contract address. Must implement IVotable.
   * @param targetId Target id.
   * @param isUpvote Whether upvote or downvote.
   */
  function voteFor(address targetContract, uint256 targetId, bool isUpvote) external whenNotPaused {
    (bool exists, ) = ITargetStatus(targetContract).targetExistsAndAllowedForId(targetId);

    if (!exists) {
      revert TargetNotFound(targetContract, targetId);
    }

    uint256 voter = IEthosProfile(contractAddressManager.getContractAddressForName(ETHOS_PROFILE))
      .verifiedProfileIdForAddress(msg.sender);

    if (hasVotedFor(voter, targetContract, targetId)) {
      _modifyVote(targetContract, targetId, voter, isUpvote);
    } else {
      _recordVote(voter, targetContract, targetId, isUpvote);
    }
  }

  /**
   * @dev Changes, archives, or re-instates previously archived vote
   * @param voter profileID of the voter
   * @param targetContract Target contract address. Must implement IVotable.
   * @param targetId Target id.
   * @param isUpvote status of the new vote.
   * @notice if the status of isUpvote is the same as existing vote, the vote is archived.
   */
  function _modifyVote(
    address targetContract,
    uint256 targetId,
    uint256 voter,
    bool isUpvote
  ) internal {
    uint256 voteIndex = voteIndexFor(voter, targetContract, targetId);
    VotesGeneral storage vg = votesGeneralByContractByTargetId[targetContract][targetId];
    Vote storage vote = votes[voteIndex];
    bool isUnvote = vote.isUpvote == isUpvote;
    if (vote.isArchived) {
      // Re-vote
      isUpvote ? vg.upvotesCount++ : vg.downvotesCount++;

      vote.isArchived = false;
      vote.isUpvote = isUpvote;
    } else {
      if (isUnvote) {
        // archive vote
        vote.isUpvote ? vg.upvotesCount-- : vg.downvotesCount--;
        vote.isArchived = true;
      } else {
        // change vote
        if (vote.isUpvote) {
          vg.upvotesCount--;
          vg.downvotesCount++;
        } else {
          vg.upvotesCount++;
          vg.downvotesCount--;
        }
        vote.isUpvote = !vote.isUpvote;
      }
    }

    emit VoteChanged(isUnvote, isUpvote, voter, targetContract, targetId, voteIndex);
  }

  /**
   * @dev Retrieves the unique vote id for a given voter and target.
   * @param voter The profile ID of the voter.
   * @param targetContract The address of the contract being voted on.
   * @param targetId The ID of the specific item within the target contract being voted on.
   * @return The unique index of the vote in the votes mapping. Returns 0 if no vote exists.
   */
  function voteIndexFor(
    uint256 voter,
    address targetContract,
    uint256 targetId
  ) public view returns (uint256) {
    VotesGeneral storage vg = votesGeneralByContractByTargetId[targetContract][targetId];
    return vg.voteIndexForVoter[voter];
  }

  /**
   * @dev Checks whether the sender has voted.
   * @param voter Voter address.
   * @param targetContract Target contract address.
   * @param targetId Target id.
   * @return Whether the sender has voted.
   */
  function hasVotedFor(
    uint256 voter,
    address targetContract,
    uint256 targetId
  ) public view returns (bool) {
    uint256 voteIndex = voteIndexFor(voter, targetContract, targetId);
    return voteIndex != 0;
  }

  /**
   * @dev Returns the number of upvotes and downvotes.
   * @param targetContract Target contract address.
   * @param targetId Target id.
   * @return upvotes Number of upvotes.
   * @return downvotes Number of downvotes.
   */
  function votesCountFor(
    address targetContract,
    uint256 targetId
  ) external view returns (uint256 upvotes, uint256 downvotes) {
    VotesGeneral storage vg = votesGeneralByContractByTargetId[targetContract][targetId];

    upvotes = vg.upvotesCount;
    downvotes = vg.downvotesCount;
  }

  /**
   * @dev Gets votes in range.
   * @param targetContract Target contract address.
   * @param targetId Target id.
   * @param fromIdx Start index.
   * @param maxLength Maximum length of votes to return.
   * @return result Votes in range.
   */
  function votesInRangeFor(
    address targetContract,
    uint256 targetId,
    uint256 fromIdx,
    uint256 maxLength
  ) external view returns (Vote[] memory result) {
    VotesGeneral storage vg = votesGeneralByContractByTargetId[targetContract][targetId];
    uint256[] memory voteIndexes = vg.voteIndexes;

    return _votesInRange(maxLength, fromIdx, voteIndexes);
  }

  /**
   * @dev Records a vote.
   * @param voter Voter address.
   * @param targetContract Target contract address.
   * @param targetId Target id.
   * @param isUpvote Whether upvote or downvote.
   */
  function _recordVote(
    uint256 voter,
    address targetContract,
    uint256 targetId,
    bool isUpvote
  ) private {
    VotesGeneral storage vg = votesGeneralByContractByTargetId[targetContract][targetId];
    vg.voteIndexForVoter[voter] = voteCount;
    vg.voteIndexes.push(voteCount);

    isUpvote ? vg.upvotesCount++ : vg.downvotesCount++;

    votes[voteCount] = Vote(isUpvote, false, targetContract, voter, targetId, block.timestamp);

    emit Voted(isUpvote, voter, targetContract, targetId, voteCount);

    voteCount++;
  }

  /**
   * @dev Returns votes in range.
   * @param maxLength Maximum length of items to return.
   * @param fromIdx Start index.
   * @param idArray Array of ids.
   * @return result Votes array.
   */
  function _votesInRange(
    uint256 maxLength,
    uint256 fromIdx,
    uint256[] memory idArray
  ) private view returns (Vote[] memory result) {
    uint256 idArrayLength = idArray.length;

    uint256 length = _correctLength(idArrayLength, maxLength, fromIdx);
    if (length == 0) {
      return result;
    }

    result = new Vote[](length);

    for (uint256 i = 0; i < length; ++i) {
      result[i] = votes[idArray[fromIdx + i]];
    }
  }
}
