// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { ERC1967Proxy } from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract CustomERC1967Proxy is ERC1967Proxy {
  constructor(address logic, bytes memory data) ERC1967Proxy(logic, data) {}
}
