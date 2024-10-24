// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IContractAddressManager } from "../interfaces/IContractAddressManager.sol";

interface IEthosVaultFactory {
  function createVault(
    IERC20 assetToken,
    string memory name,
    string memory symbol,
    IContractAddressManager contractAddressManager
  ) external returns (address);
}
