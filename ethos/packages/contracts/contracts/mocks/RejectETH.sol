// contracts/RejectETHReceiver.sol
// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

error ETHTransferFailed();

contract RejectETHReceiver {
  receive() external payable {
    revert ETHTransferFailed();
  }
}
