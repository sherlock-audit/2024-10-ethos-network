// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

interface IEthosEscrow {
  function deposit(address token, uint256 amount) external;

  function depositETH() external payable;

  function withdraw(address token, address receiver, uint256 amount) external;
}
