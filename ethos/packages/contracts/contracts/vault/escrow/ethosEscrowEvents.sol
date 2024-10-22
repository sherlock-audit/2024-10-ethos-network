// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

abstract contract EthosEscrowEvents {
  event Deposited(address indexed token, uint256 indexed profileId, uint256 amount);
  event Withdrawn(
    address indexed token,
    address indexed user,
    uint256 indexed profileId,
    uint256 amount
  );
}
