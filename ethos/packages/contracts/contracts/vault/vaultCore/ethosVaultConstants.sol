// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { IContractAddressManager } from "../../interfaces/IContractAddressManager.sol";

abstract contract EthosVaultConstants {
  IContractAddressManager public immutable CONTRACT_MANAGER;
}
