// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

abstract contract EthosEscrowErrors {
  // TODO add netspec
  error InvalidVault();
  error AmountMustBeGreaterThanZero();
  error TokenAddressCannotBeZero();
  error TokenAddressCannotBeNativeTokenAddress();
  error ETHMustBeGreaterThanZero();
  error InsufficientBalance();
}
