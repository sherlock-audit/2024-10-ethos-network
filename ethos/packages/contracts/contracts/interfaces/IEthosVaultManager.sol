// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IEthosVaultManager {
  function createVault(uint256 profileId, IERC20 assetToken) external returns (address);

  function getVaultByProfileId(uint256 profileId) external view returns (address);

  function getProfileIdByVault(address vault) external view returns (uint256);

  function getFeeProtocolAddress() external view returns (address);

  function getEntryProtocolFeeBasisPoints() external view returns (uint256);

  function getEntryDonationFeeBasisPoints() external view returns (uint256);

  function getEntryVouchersPoolFeeBasisPoints() external view returns (uint256);

  function getExitFeeBasisPoints() external view returns (uint256);
}
