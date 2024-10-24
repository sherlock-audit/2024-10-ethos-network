// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { SignatureControl } from "../../utils/SignatureControl.sol";

contract TestOnlyInitializableSignatureControl is SignatureControl {
  function shouldFail() external {
    __signatureControl_init(address(1), address(2));
  }
}
