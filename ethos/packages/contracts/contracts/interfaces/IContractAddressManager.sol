// SPDX-License-Identifier: MIT

pragma solidity 0.8.26;

interface IContractAddressManager {
  function getContractAddressForName(string memory name) external view returns (address);

  function checkIsEthosContract(address targetAddress) external view returns (bool);
}
