// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;
enum MarketCreationErrorCode {
  PROFILE_NOT_AUTHORIZED,
  PROFILE_MISMATCH
}

error InvalidProfileId();
error MarketAlreadyExists(uint256 profileId);
error MarketDoesNotExist(uint256 profileId);
error MarketCreationUnauthorized(
  MarketCreationErrorCode code,
  address addressStr,
  uint256 profileId
);
error InsufficientFunds();
error InsufficientInitialLiquidity();
error InsufficientVotesOwned(uint256 profileId, address addressStr);
error InsufficientVotesToSell(uint256 profileId);
error SlippageLimitExceeded(
  uint256 votesBought,
  uint256 expectedVotes,
  uint256 slippageBasisPoints
);
