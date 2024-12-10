// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

error WrongPaymentAmount(address paymentToken, uint256 amount);
error WrongPaymentToken(address paymentToken);
error InvalidReviewDetails(string message);
error SelfReview(address subject);
error ReviewNotFound(uint256 reviewId);
error WithdrawalFailed(bytes data, string message);
error ReviewIsArchived(uint256 reviewId);
error ReviewNotArchived(uint256 reviewId);
error MustCreateAttestationFirst();
error UnauthorizedEdit(uint256 reviewId);
