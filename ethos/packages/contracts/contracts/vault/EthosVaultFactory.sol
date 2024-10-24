// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IContractAddressManager } from "../interfaces/IContractAddressManager.sol";
import { IWETH9 } from "../interfaces/external/iWETH9.sol";
import { EthosVaultETHUnderlying } from "./EthosVaultETHUnderlying.sol";

contract EthosVaultFactory {
  function createVault(
    IERC20 assetToken,
    string memory name,
    string memory symbol,
    IContractAddressManager contractAddressManager
  ) external returns (address) {
    return
      address(
        new EthosVaultETHUnderlying(
          IWETH9(address(assetToken)),
          name,
          symbol,
          contractAddressManager
        )
      );
  }
}
