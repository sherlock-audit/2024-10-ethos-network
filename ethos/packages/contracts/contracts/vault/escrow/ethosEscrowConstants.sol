// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { IContractAddressManager } from "../../interfaces/IContractAddressManager.sol";

abstract contract EthosEscrowConstants {
  // @dev Address that is mapped to the chain native token
  address internal constant NATIVE_TOKEN_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
  IContractAddressManager public immutable CONTRACT_MANAGER;
}
