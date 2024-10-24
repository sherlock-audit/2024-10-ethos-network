// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

// TODO add netspec for all events
abstract contract EthosVaultManagerEvents {
  event VaultDeployed(address indexed vault, uint256 indexed profileId, bool isNativeUnderlying);
  event FeeProtocolAddressUpdated(address newFeeProtocolAddress);
  event EntryProtocolFeeBasisPointsUpdated(uint256 newProtocolFeeBasisPoints);
  event EntryDonationFeeBasisPointsUpdated(uint256 newDonationFeeBasisPoints);
  event EntryVouchersPoolFeeBasisPointsUpdated(uint256 newVouchersPoolFeeBasisPoints);
  event ExitFeeBasisPointsUpdated(uint256 newExitFeeBasisPoints);
}
