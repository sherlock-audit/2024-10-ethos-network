// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { EthosVote } from "../../EthosVote.sol";

contract EthosVoteMock is EthosVote {
  uint256 public testValue;

  function setTestValue(uint256 _testValue) external {
    testValue = _testValue;
  }
}
