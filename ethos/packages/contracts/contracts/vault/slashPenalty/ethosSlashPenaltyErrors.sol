// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

abstract contract EthosSlashPenaltyErrors {
  error InvalidAddress();
  // TODO add netspec
  error InvalidSlashingPercentage();
  // TODO add netspec
  error SlashFactorCannotBeZero();
  error SlashFactorNotInitalized();
  error NotAuthorized();
}
