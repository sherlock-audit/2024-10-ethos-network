// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

interface IEthosVaultCore {
  /* @dev Calculates the amount of assets that would be redeemed for a given amount of stakes, without accounting for the exit fee.
   * @param stakes The amount of stakes to redeem.
   * @return The amount of assets that would be redeemed.
   */
  function previewRedeemWithoutExitFee(uint256 stakes) external view returns (uint256);
}
