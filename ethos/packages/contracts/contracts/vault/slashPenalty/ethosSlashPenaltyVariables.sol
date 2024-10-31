// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

abstract contract EthosSlashPenaltyVariables {
  mapping(uint256 => uint256) internal slashFactors; // initialy all profiles should have 100 * precision
  mapping(uint256 => mapping(uint256 => uint256)) internal slashPoints; // voucherProfileId => voucheeProfileId => slashPoints TODO do * precision
  uint256 internal totalSlashPoints;
}
