// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { EthosAttestation } from "../../EthosAttestation.sol";

contract EthosAttestationMock is EthosAttestation {
  uint256 public testValue;

  function setTestValue(uint256 _testValue) external {
    testValue = _testValue;
  }
}
