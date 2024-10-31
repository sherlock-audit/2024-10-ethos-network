// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

interface IEthosSlashPenalty {
  function slash(uint256 profileId, uint256 percentage) external;

  function updateSlashPoints(
    uint256 voucherProfileId,
    uint256 voucheeProfileId,
    uint256 vouchAmount
  ) external;

  function getSlashFactor(uint256 profileId) external view returns (uint256);

  function getTotalSlashPoints() external view returns (uint256);

  function getSlashPoints(
    uint256 voucherProfileId,
    uint256 voucheeProfileId
  ) external view returns (uint256);
}
