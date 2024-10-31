// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { EthosVaultManagerConstants } from "./ethosVaultManagerConstants.sol";

abstract contract EthosVaultManagerVariables is EthosVaultManagerConstants {
  mapping(uint256 => address) internal profileIdToVault;
  mapping(address => uint256) internal vaultToProfileId;
  address internal feeProtocolAddress;
  uint256 internal entryProtocolFeeBasisPoints;
  uint256 internal entryDonationFeeBasisPoints;
  uint256 internal entryVouchersPoolFeeBasisPoints;
  uint256 internal exitFeeBasisPoints;
}
