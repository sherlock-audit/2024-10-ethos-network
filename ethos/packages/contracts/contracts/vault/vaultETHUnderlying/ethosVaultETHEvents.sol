// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

abstract contract EthosVaultETHEvents {
  // TODO add netspec
  event DepositETH(address indexed from, uint256 assets, uint256 netStakes);
  // TODO add netspec
  event WithdrawalETH(address indexed to, uint256 assets, uint256 stakes);
  // TODO add netspec
  event RedeemETH(address indexed to, uint256 stakes, uint256 assets);
  // TODO add netspec
  event MintETH(address indexed from, uint256 assets, uint256 netStakes);
}
