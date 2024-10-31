// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

contract PaymentToken is ERC20, Ownable {
  constructor(
    string memory name_,
    string memory symbol_
  ) ERC20(name_, symbol_) Ownable(msg.sender) {
    _mint(msg.sender, 1000000 * 10 ** decimals());
  }

  function mint(address to, uint256 amount) external onlyOwner {
    _mint(to, amount);
  }
}
