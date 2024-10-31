// SPDX-License-Identifier: MIT

pragma solidity 0.8.26;

import { IContractAddressManager } from "../interfaces/IContractAddressManager.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

contract ContractAddressManager is IContractAddressManager, Ownable(msg.sender) {
  mapping(string => address) private contractAddressForName;
  mapping(address => bool) private isEthosContract;

  event ContractAddressUpdated(string indexed name, address indexed contractAddress);

  error InvalidInputLength();

  /**
   * @dev Updates contract address for a name.
   * @param contractAddresses Contract addresses.
   * @param names Name of the contracts.
   */
  function updateContractAddressesForNames(
    address[] calldata contractAddresses,
    string[] memory names
  ) external onlyOwner {
    if (contractAddresses.length != names.length) {
      revert InvalidInputLength();
    }

    for (uint256 i = 0; i < contractAddresses.length; ++i) {
      address current = contractAddressForName[names[i]];
      if (current != address(0)) {
        isEthosContract[current] = false;
      }
      contractAddressForName[names[i]] = contractAddresses[i];
      isEthosContract[contractAddresses[i]] = true;
      emit ContractAddressUpdated(names[i], contractAddresses[i]);
    }
  }

  /**
   * @dev Returns contract address for a name.
   * @param name Name of the contract.
   * @return Contract address.
   */
  function getContractAddressForName(string memory name) external view returns (address) {
    return contractAddressForName[name];
  }

  /**
   * @dev Returns a flag based on if the target is an ethos contract
   * @param targetAddress address of the contract.
   */
  function checkIsEthosContract(address targetAddress) external view returns (bool) {
    return isEthosContract[targetAddress];
  }
}
