// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { EthosEscrowConstants } from "./ethosEscrowConstants.sol";

abstract contract EthosEscrowVariables is EthosEscrowConstants {
  mapping(uint256 => mapping(address => uint256)) balances; // profileId => token => balance
}
