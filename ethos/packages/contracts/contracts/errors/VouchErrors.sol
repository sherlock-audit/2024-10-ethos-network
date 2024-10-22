// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

error InvalidEthosProfileForVouch(uint256 ethosProfileId);
error AlreadyVouched(uint256 author, uint256 voucheeEthosProfileId);
error SelfVouch(uint256 author, uint256 voucheeEthosProfileId);
error VouchNotFound(uint256 vouchId);
error NotAuthorForVouch(uint256 vouchId, uint256 user);
error WrongSubjectProfileIdForVouch(uint256 vouchId, uint256 subjectProfileId);
error WithdrawalFailed(bytes data, string message);
error CannotMarkVouchAsUnhealthy(uint256 vouchId);
error AlreadyUnvouched(uint256 vouchId);
error ETHTransferFailed();
error InvalidFeeMultiplier(uint256 newFee);
error MinimumVouchAmount(uint256 amount);
