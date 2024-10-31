// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { EthosVouch } from "../../EthosVouch.sol";

contract EthosVouchMock is EthosVouch {
  uint256 public testValue;

  function setTestValue(uint256 _testValue) external {
    testValue = _testValue;
  }
}
