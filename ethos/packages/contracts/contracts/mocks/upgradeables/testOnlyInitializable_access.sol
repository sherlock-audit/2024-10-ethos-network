// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { AccessControl } from "../../utils/AccessControl.sol";

contract TestOnlyInitializableAccessControl is AccessControl {
  function shouldFail() external {
    __accessControl_init(address(1), address(2), address(3), address(4), address(5));
  }
}
