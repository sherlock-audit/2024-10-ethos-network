// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

// TODO add netspec for all errors
abstract contract EthosVaultManagerErrors {
  error InvalidAddress();
  error InvalidFeeProtocolAddress();
  error OnlyVouchContract();
  error InvalidContractManagerAddress();
  error VaultAlreadyExists();
}
