// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { EthosProfile } from "../../EthosProfile.sol";

contract EthosProfileMock is EthosProfile {
  uint256 public testValue;

  function setTestValue(uint256 _testValue) external {
    testValue = _testValue;
  }
}
