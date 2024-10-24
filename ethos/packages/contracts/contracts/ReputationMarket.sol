// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;
import { UUPSUpgradeable } from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import { AccessControl } from "./utils/AccessControl.sol";
import { ETHOS_PROFILE } from "./utils/Constants.sol";
import { IEthosProfile } from "./interfaces/IEthosProfile.sol";
import { InsufficientInitialLiquidity, InsufficientFunds, InsufficientVotesOwned, InsufficientVotesToSell, InvalidProfileId, MarketAlreadyExists, MarketCreationErrorCode, MarketCreationUnauthorized, MarketDoesNotExist, SlippageLimitExceeded } from "./errors/ReputationMarketErrors.sol";

contract ReputationMarket is AccessControl, UUPSUpgradeable {
  uint256 private constant PRICE_MAXIMUM = 0.001 ether;
  uint256 private constant TRUST = 1;
  uint256 private constant DISTRUST = 0;
  /**
   * @dev The multiplier for converting slippage basis points to a percentage.
   * 1 basis point = 0.01%.
   */
  uint256 private constant SLIPPAGE_POINTS_BASE = 10000;

  struct Market {
    uint256[2] votes;
  }
  struct MarketInfo {
    uint256 profileId;
    uint256 trustVotes;
    uint256 distrustVotes;
  }

  // profileId => isPositive => votes
  mapping(uint256 => Market) private markets;
  // profileId => MarketUpdateInfo
  mapping(uint256 => MarketUpdateInfo) private lastMarketUpdates;
  // msg.sender => profileId => isPositive => votes
  mapping(address => mapping(uint256 => Market)) private votesOwned;
  // profileId => participant address
  // append only; don't bother removing. Use isParticipant to check if they've sold all their votes.
  mapping(uint256 => address[]) public participants;
  // profileId => participant => isParticipant
  mapping(uint256 => mapping(address => bool)) public isParticipant;

  // Mapping to store the allow list of profileIds that can create their market.
  // profileId => isAllowed bool;
  mapping(uint256 => bool) private creationAllowedProfileIds;

  // This is used to control whether anyone can create a market or only the contract admin or addresses in the allow list.
  bool private enforceCreationAllowList;

  event MarketCreated(uint256 indexed profileId, address indexed creator);
  event VotesBought(
    uint256 indexed profileId,
    address indexed buyer,
    bool indexed isPositive,
    uint256 amount,
    uint256 funds,
    uint256 boughtAt
  );
  event VotesSold(
    uint256 indexed profileId,
    address indexed seller,
    bool indexed isPositive,
    uint256 amount,
    uint256 funds,
    uint256 soldAt
  );
  event MarketUpdated(
    uint256 indexed profileId,
    uint256 indexed voteTrust,
    uint256 indexed voteDistrust,
    uint256 positivePrice,
    uint256 negativePrice,
    int256 deltaVoteTrust,
    int256 deltaVoteDistrust,
    int256 deltaPositivePrice,
    int256 deltaNegativePrice,
    uint256 blockNumber,
    uint256 updatedAt
  );

  struct MarketUpdateInfo {
    uint256 voteTrust;
    uint256 voteDistrust;
    uint256 positivePrice;
    uint256 negativePrice;
    uint256 lastUpdateBlock;
  }

  /**
   * @dev initializer in place of constructor.
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
    enforceCreationAllowList = true;
  }

  /**
   * @dev Sets the user's ability to create a market.
   * @param profileId The profileId of the user to allow/disallow market creation.
   * @param value is profileId allowed to create a market
   */
  function setUserAllowedToCreateMarket(uint256 profileId, bool value) public onlyAdmin {
    creationAllowedProfileIds[profileId] = value;
  }

  /**
   * @dev Checks if the user is allowed to create a market.
   * @param profileId The profileId of the user to check.
   * @return True if the profile is allowed to create a market, false otherwise.
   */
  function isAllowedToCreateMarket(uint256 profileId) public view returns (bool) {
    return creationAllowedProfileIds[profileId];
  }

  /**
   * @dev Disables the allow list enforcement
   * Anyone may create a market for their own profile.
   * @param value true if profile can create their market, false otherwise.
   */
  function setAllowListEnforcement(bool value) public onlyAdmin {
    enforceCreationAllowList = value;
  }

  function getMarket(uint256 profileId) public view returns (MarketInfo memory) {
    return
      MarketInfo({
        profileId: profileId,
        trustVotes: markets[profileId].votes[TRUST],
        distrustVotes: markets[profileId].votes[DISTRUST]
      });
  }

  function getVotePrice(uint256 profileId, bool isPositive) public view returns (uint256) {
    _checkMarketExists(profileId);
    return _calcVotePrice(markets[profileId], isPositive);
  }

  function getUserVotes(address user, uint256 profileId) public view returns (MarketInfo memory) {
    return
      MarketInfo({
        profileId: profileId,
        trustVotes: votesOwned[user][profileId].votes[TRUST],
        distrustVotes: votesOwned[user][profileId].votes[DISTRUST]
      });
  }

  function getParticipantCount(uint256 profileId) public view returns (uint256) {
    _checkMarketExists(profileId);
    return participants[profileId].length;
  }

  function createMarket(uint256 profileId) public payable whenNotPaused {
    if (profileId == 0) {
      revert InvalidProfileId();
    }
    _checkCanCreateMarket(profileId);

    if (markets[profileId].votes[TRUST] != 0 || markets[profileId].votes[DISTRUST] != 0) {
      revert MarketAlreadyExists(profileId);
    }

    uint256 initialLiquidityRequired = 2 * PRICE_MAXIMUM;
    if (msg.value < initialLiquidityRequired) {
      revert InsufficientInitialLiquidity();
    }

    // Create the new market
    markets[profileId].votes[TRUST] = 1;
    markets[profileId].votes[DISTRUST] = 1;

    // Refund any remaining funds
    payable(msg.sender).transfer(msg.value - initialLiquidityRequired);
    emit MarketCreated(profileId, msg.sender);
    _emitMarketUpdate(profileId);
  }

  /**
   * @dev Buys votes for a given market.
   * @param profileId The profileId of the market to buy votes for.
   * @param isPositive Whether the votes are trust or distrust.
   * @param expectedVotes The expected number of votes to buy. This is used as the basis for the slippage check.
   * @param slippageBasisPoints The slippage tolerance in basis points (1 basis point = 0.01%).
   */
  function buyVotes(
    uint256 profileId,
    bool isPositive,
    uint256 expectedVotes,
    uint256 slippageBasisPoints
  ) public payable whenNotPaused {
    _checkMarketExists(profileId);
    _checkAddressHasProfile();

    // determine how many votes can be bought with the funds provided
    (uint256 votesBought, uint256 fundsPaid, ) = _calculateBuy(
      markets[profileId],
      isPositive,
      msg.value
    );

    _checkSlippageLimit(votesBought, expectedVotes, slippageBasisPoints);

    // Update market state
    markets[profileId].votes[isPositive ? TRUST : DISTRUST] += votesBought;
    votesOwned[msg.sender][profileId].votes[isPositive ? TRUST : DISTRUST] += votesBought;

    // Add buyer to participants if not already a participant
    if (!isParticipant[profileId][msg.sender]) {
      participants[profileId].push(msg.sender);
      isParticipant[profileId][msg.sender] = true;
    }

    // Refund any remaining funds
    payable(msg.sender).transfer(msg.value - fundsPaid);
    emit VotesBought(profileId, msg.sender, isPositive, votesBought, fundsPaid, block.timestamp);
    _emitMarketUpdate(profileId);
  }

  function sellVotes(uint256 profileId, bool isPositive, uint256 amount) public whenNotPaused {
    _checkMarketExists(profileId);
    _checkAddressHasProfile();

    // calculate the amount of votes to sell and the funds received
    (uint256 votesSold, uint256 fundsReceived, ) = _calculateSell(
      markets[profileId],
      profileId,
      isPositive,
      amount
    );

    // update the market state
    markets[profileId].votes[isPositive ? TRUST : DISTRUST] -= votesSold;
    votesOwned[msg.sender][profileId].votes[isPositive ? TRUST : DISTRUST] -= votesSold;

    // Check if seller has no votes left after selling
    if (
      votesOwned[msg.sender][profileId].votes[TRUST] == 0 &&
      votesOwned[msg.sender][profileId].votes[DISTRUST] == 0
    ) {
      isParticipant[profileId][msg.sender] = false;
    }

    // send the proceeds to the seller
    payable(msg.sender).transfer(fundsReceived);
    emit VotesSold(profileId, msg.sender, isPositive, votesSold, fundsReceived, block.timestamp);
    _emitMarketUpdate(profileId);
  }

  function simulateSell(
    uint256 profileId,
    bool isPositive,
    uint256 amount
  ) public view returns (uint256 votesSold, uint256 fundsReceived, uint256 newVotePrice) {
    _checkMarketExists(profileId);
    return _calculateSell(markets[profileId], profileId, isPositive, amount);
  }

  function simulateBuy(
    uint256 profileId,
    bool isPositive,
    uint256 funds
  ) public view returns (uint256 votesBought, uint256 fundsPaid, uint256 newVotePrice) {
    _checkMarketExists(profileId);
    return _calculateBuy(markets[profileId], isPositive, funds);
  }

  /**
   * @notice restricts upgrading to owner
   * @param newImplementation address of new implementation contract
   */
  function _authorizeUpgrade(
    address newImplementation
  ) internal override onlyOwner onlyNonZeroAddress(newImplementation) {
    // Intentionally left blank to ensure onlyOwner and zeroCheck modifiers run
  }

  function _calcVotePrice(Market memory market, bool isPositive) private pure returns (uint256) {
    uint256 totalVotes = market.votes[TRUST] + market.votes[DISTRUST];
    return (market.votes[isPositive ? TRUST : DISTRUST] * PRICE_MAXIMUM) / totalVotes;
  }

  function _calculateBuy(
    Market memory market,
    bool isPositive,
    uint256 funds
  ) private pure returns (uint256 votesBought, uint256 fundsPaid, uint256 newVotePrice) {
    uint256 fundsAvailable = funds;
    uint256 votePrice = _calcVotePrice(market, isPositive);

    if (fundsAvailable < votePrice) {
      revert InsufficientFunds();
    }

    while (fundsAvailable >= votePrice) {
      fundsAvailable -= votePrice;
      fundsPaid += votePrice;
      votesBought++;

      market.votes[isPositive ? TRUST : DISTRUST] += 1;

      votePrice = _calcVotePrice(market, isPositive);
    }

    return (votesBought, fundsPaid, votePrice);
  }

  function _calculateSell(
    Market memory market,
    uint256 profileId,
    bool isPositive,
    uint256 amount
  ) private view returns (uint256 votesSold, uint256 fundsReceived, uint256 newVotePrice) {
    uint256 votesAvailable = votesOwned[msg.sender][profileId].votes[isPositive ? TRUST : DISTRUST];

    if (votesAvailable < amount) {
      revert InsufficientVotesOwned(profileId, msg.sender);
    }

    uint256 votePrice = _calcVotePrice(market, isPositive);
    while (votesSold < amount) {
      if (market.votes[isPositive ? TRUST : DISTRUST] <= 1) {
        revert InsufficientVotesToSell(profileId);
      }

      market.votes[isPositive ? TRUST : DISTRUST] -= 1;
      votePrice = _calcVotePrice(market, isPositive);
      fundsReceived += votePrice;
      votesSold++;
    }

    return (votesSold, fundsReceived, votePrice);
  }

  function _checkMarketExists(uint256 profileId) private view {
    if (markets[profileId].votes[TRUST] == 0 && markets[profileId].votes[DISTRUST] == 0) {
      revert MarketDoesNotExist(profileId);
    }
  }

  function _emitMarketUpdate(uint256 profileId) private {
    _checkMarketExists(profileId);
    uint256 currentPositivePrice = getVotePrice(profileId, true);
    uint256 currentNegativePrice = getVotePrice(profileId, false);

    MarketUpdateInfo storage lastUpdate = lastMarketUpdates[profileId];

    int256 deltaVoteTrust;
    int256 deltaVoteDistrust;
    int256 deltaPositivePrice;
    int256 deltaNegativePrice;

    if (lastUpdate.lastUpdateBlock != 0) {
      deltaVoteTrust = int256(markets[profileId].votes[TRUST]) - int256(lastUpdate.voteTrust);
      deltaVoteDistrust =
        int256(markets[profileId].votes[DISTRUST]) -
        int256(lastUpdate.voteDistrust);
      deltaPositivePrice = int256(currentPositivePrice) - int256(lastUpdate.positivePrice);
      deltaNegativePrice = int256(currentNegativePrice) - int256(lastUpdate.negativePrice);
    } else {
      deltaVoteTrust = int256(markets[profileId].votes[TRUST]);
      deltaVoteDistrust = int256(markets[profileId].votes[DISTRUST]);
      deltaPositivePrice = int256(currentPositivePrice);
      deltaNegativePrice = int256(currentNegativePrice);
    }

    emit MarketUpdated(
      profileId,
      markets[profileId].votes[TRUST],
      markets[profileId].votes[DISTRUST],
      currentPositivePrice,
      currentNegativePrice,
      deltaVoteTrust,
      deltaVoteDistrust,
      deltaPositivePrice,
      deltaNegativePrice,
      block.number,
      block.timestamp
    );

    // Update the lastMarketUpdates mapping
    lastMarketUpdates[profileId] = MarketUpdateInfo({
      voteTrust: markets[profileId].votes[TRUST],
      voteDistrust: markets[profileId].votes[DISTRUST],
      positivePrice: currentPositivePrice,
      negativePrice: currentNegativePrice,
      lastUpdateBlock: block.number
    });
  }

  /**
   * @dev Checks if the sender can create the market for the given profileId.
   * @param profileId The profileId to check.
   */
  function _checkCanCreateMarket(uint256 profileId) private view {
    _checkProfileExists(profileId);

    if (hasRole(ADMIN_ROLE, msg.sender)) {
      return;
    }

    uint256 senderProfileId = _checkAddressHasProfile();

    if (enforceCreationAllowList && !creationAllowedProfileIds[senderProfileId]) {
      revert MarketCreationUnauthorized(
        MarketCreationErrorCode.PROFILE_NOT_AUTHORIZED,
        msg.sender,
        profileId
      );
    }

    if (senderProfileId != profileId) {
      revert MarketCreationUnauthorized(
        MarketCreationErrorCode.PROFILE_MISMATCH,
        msg.sender,
        profileId
      );
    }
  }

  /**
   * @dev Convenience function to assert the profileId exists.
   */
  function _checkProfileExists(uint256 profileId) private view {
    address ethosProfileContract = contractAddressManager.getContractAddressForName(ETHOS_PROFILE);
    (bool exists, bool archived) = IEthosProfile(ethosProfileContract)
      .profileExistsAndArchivedForId(profileId);
    if (!exists || archived) {
      revert InvalidProfileId();
    }
  }

  /**
   * @dev Convenience function to assert the address has an Ethos Profile.
   */
  function _checkAddressHasProfile() private view returns (uint256) {
    address ethosProfileContract = contractAddressManager.getContractAddressForName(ETHOS_PROFILE);
    return IEthosProfile(ethosProfileContract).verifiedProfileIdForAddress(msg.sender);
  }

  /**
   * @dev Checks if the actual votes bought are within range of the expected votes bought given a slippage tolerance in basis points.
   * @param actual The actual votes bought.
   * @param expected The expected votes bought.
   * @param slippageBasisPoints The slippage tolerance in basis points (1 basis point = 0.01%).
   */
  function _checkSlippageLimit(
    uint256 actual,
    uint256 expected,
    uint256 slippageBasisPoints
  ) private pure {
    uint256 toleratedVotes = (expected * ((SLIPPAGE_POINTS_BASE - slippageBasisPoints))) /
      SLIPPAGE_POINTS_BASE;
    if (actual < toleratedVotes) {
      revert SlippageLimitExceeded(actual, expected, slippageBasisPoints);
    }
  }
}
