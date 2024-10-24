// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { EthosReview } from "../../EthosReview.sol";

contract EthosReviewMock is EthosReview {
  uint256 public testValue;

  function setTestValue(uint256 _testValue) external {
    testValue = _testValue;
  }
}
