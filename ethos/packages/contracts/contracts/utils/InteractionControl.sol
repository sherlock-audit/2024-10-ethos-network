// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { IPausable } from "../interfaces/IPausable.sol";
import { IContractAddressManager } from "../interfaces/IContractAddressManager.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @notice The owner of this smart contract must be an administrator in other contracts.
 * @title InteractionControl Smart Contract.
 * @dev Controls interaction with other contracts.
 */
contract InteractionControl is Ownable {
  address public contractAddressManager;

  string[] private controlledContractNames;

  // Add storage gap as the last storage variable
  // This allows us to add new storage variables in future upgrades
  // by reducing the size of this gap
  uint256[50] private __gap;

  /**
   * @dev Constructor.
   * @param owner Owner address.
   * @param contractAddressManagerAddr ContractAddressManager contract address.
   */
  constructor(address owner, address contractAddressManagerAddr) Ownable(owner) {
    contractAddressManager = contractAddressManagerAddr;
  }

  /**
   * @dev Updates the contract address manager.
   * @param contractAddressManagerAddr ContractAddressManager contract address.
   */
  function updateContractAddressManager(address contractAddressManagerAddr) external onlyOwner {
    contractAddressManager = contractAddressManagerAddr;
  }

  // Controlled contracts
  /**
   * @dev Returns the controlledContracts array.
   * @return The array of controlled contracts.
   */
  function getControlledContractNames() external view returns (string[] memory) {
    return controlledContractNames;
  }

  /**
   * @dev Adds a list of contract names to the controlledContracts array.
   * @param contractNames The names of the contracts to be added.
   */
  function addControlledContractNames(string[] memory contractNames) external onlyOwner {
    for (uint256 i = 0; i < contractNames.length; ++i) {
      controlledContractNames.push(contractNames[i]);
    }
  }

  /**
   * @dev Removes a contract name from the controlledContracts array.
   * @param contractName The name of the contract to be removed.
   */
  function removeControlledContractName(string calldata contractName) external onlyOwner {
    for (uint256 i = 0; i < controlledContractNames.length; ++i) {
      if (
        keccak256(abi.encodePacked(controlledContractNames[i])) ==
        keccak256(abi.encodePacked(contractName))
      ) {
        controlledContractNames[i] = controlledContractNames[controlledContractNames.length - 1];
        controlledContractNames.pop();
        break;
      }
    }
  }

  /**
   * @dev Pauses all controlled contracts.
   */
  function pauseAll() external onlyOwner {
    for (uint256 i = 0; i < controlledContractNames.length; ++i) {
      address addr = IContractAddressManager(contractAddressManager).getContractAddressForName(
        controlledContractNames[i]
      );
      _pauseContract(addr);
    }
  }

  /**
   * @dev Unpauses all controlled contracts.
   */
  function unpauseAll() external onlyOwner {
    for (uint256 i = 0; i < controlledContractNames.length; ++i) {
      address addr = IContractAddressManager(contractAddressManager).getContractAddressForName(
        controlledContractNames[i]
      );
      _unpauseContract(addr);
    }
  }

  /**
   * @dev Pauses a specific contract.
   * @param contractName The name of the contract to be paused.
   */
  function pauseContract(string calldata contractName) external onlyOwner {
    address addr = IContractAddressManager(contractAddressManager).getContractAddressForName(
      contractName
    );
    _pauseContract(addr);
  }

  /**
   * @dev Unpauses a specific contract.
   * @param contractName The name of the contract to be unpaused.
   */
  function unpauseContract(string calldata contractName) external onlyOwner {
    address addr = IContractAddressManager(contractAddressManager).getContractAddressForName(
      contractName
    );
    _unpauseContract(addr);
  }

  // Private functions
  /**
   * @dev Pauses a specific contract.
   * @param contractAddress The address of the contract to be paused.
   */
  function _pauseContract(address contractAddress) private {
    if (!IPausable(contractAddress).paused()) {
      IPausable(contractAddress).pause();
    }
  }

  /**
   * @dev Unpauses a specific contract.
   * @param contractAddress The address of the contract to be unpaused.
   */
  function _unpauseContract(address contractAddress) private {
    if (IPausable(contractAddress).paused()) {
      IPausable(contractAddress).unpause();
    }
  }
}
