// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

interface IEthosVaultETHUnderlying {
  function depositETH(address receiver) external payable returns (uint256 netStakes);

  function redeemETH(
    uint256 stakes,
    address receiver,
    address owner
  ) external returns (uint256 assets);

  function withdrawETH(
    uint256 assets,
    address receiver,
    address owner
  ) external returns (uint256 stakes);

  function mintETH(
    uint256 stakes, // netStakes
    address receiver
  ) external payable returns (uint256);
}
