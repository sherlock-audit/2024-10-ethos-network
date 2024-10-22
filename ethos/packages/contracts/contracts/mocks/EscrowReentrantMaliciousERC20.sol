// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { IEthosEscrow } from "../interfaces/IEthosEscrow.sol";

contract EscrowReentrantMaliciousERC20 is ERC20, ReentrancyGuard {
  address public escrowContract;

  constructor(
    string memory name,
    string memory symbol,
    address _escrowContract
  ) ERC20(name, symbol) {
    escrowContract = _escrowContract;
  }

  function setEscrowContract(address _escrowContract) public {
    escrowContract = _escrowContract;
  }

  function mint(address to, uint256 amount) public {
    _mint(to, amount);
  }

  function transfer(address recipient, uint256 amount) public virtual override returns (bool) {
    bool result = super.transfer(recipient, amount);
    IEthosEscrow(escrowContract).withdraw(address(this), msg.sender, amount);
    return result;
  }
}
