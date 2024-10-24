// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

abstract contract EthosSlashPenaltyEvents {
  event Slashed(uint256 indexed profileId, uint256 percentage);
}
