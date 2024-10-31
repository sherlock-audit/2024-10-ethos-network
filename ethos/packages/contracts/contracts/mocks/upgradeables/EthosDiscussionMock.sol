// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { EthosDiscussion } from "../../EthosDiscussion.sol";

contract EthosDiscussionMock is EthosDiscussion {
  uint256 public testValue;

  function setTestValue(uint256 _testValue) external {
    testValue = _testValue;
  }
}
