// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/*
 * @dev Interface for IPausable Smart Contract.
 */

interface IPausable {
  function paused() external view returns (bool);

  function pause() external;

  function unpause() external;
}
