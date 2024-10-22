// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IContractAddressManager } from "../interfaces/IContractAddressManager.sol";
import { EthosVaultCore } from "./EthosVaultCore.sol";

contract EthosVault is EthosVaultCore {
  constructor(
    IERC20 _asset,
    string memory _name,
    string memory _symbol,
    IContractAddressManager _contractManager
  ) EthosVaultCore(_asset, _name, _symbol, _contractManager) {}
}
