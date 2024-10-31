// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { IContractAddressManager } from "../interfaces/IContractAddressManager.sol";
import { IEthosVaultManager } from "../interfaces/IEthosVaultManager.sol";
import { IEthosProfile } from "../interfaces/IEthosProfile.sol";
import { IEthosEscrow } from "../interfaces/IEthosEscrow.sol";
import { ETHOS_PROFILE, ETHOS_VAULT_MANAGER } from "../utils/Constants.sol";
import { EthosEscrowVariables } from "./escrow/ethosEscrowVariables.sol";
import { EthosEscrowEvents } from "./escrow/ethosEscrowEvents.sol";
import { EthosEscrowErrors } from "./escrow/ethosEscrowErrors.sol";

/* @title Ethos Escrow Contract
 * @dev Handles deposits and withdrawals of ERC20 tokens and native ETH for registered vaults linked to user profiles.
 * @notice This contract assumes that only registered vaults will interact with deposits as it checks the vault's registration status with the Ethos Vault Manager.
 */
contract EthosEscrow is
  IEthosEscrow,
  ReentrancyGuard,
  EthosEscrowVariables,
  EthosEscrowEvents,
  EthosEscrowErrors
{
  using SafeERC20 for IERC20;

  /* @dev Initializes the contract with the address of the Contract Address Manager.
   * @param _contractManager Address of the Contract Address Manager.
   */
  constructor(IContractAddressManager _contractManager) {
    CONTRACT_MANAGER = _contractManager;
  }

  /* @dev Deposits ERC20 tokens into the escrow for a specific profile.
   * @notice Only callable by registered vaults.
   * @param token The address of the ERC20 token to deposit.
   * @param amount The amount of tokens to deposit.
   */
  function deposit(address token, uint256 amount) external {
    uint256 profileId = IEthosVaultManager(
      CONTRACT_MANAGER.getContractAddressForName(ETHOS_VAULT_MANAGER)
    ).getProfileIdByVault(msg.sender); // assumption is that msg.sender is vault address
    require(profileId != 0, InvalidVault()); // when profileId == 0 it means that the vault is not registered in the vault manager
    require(amount > 0, AmountMustBeGreaterThanZero());
    require(token != address(0), TokenAddressCannotBeZero());
    require(token != NATIVE_TOKEN_ADDRESS, TokenAddressCannotBeNativeTokenAddress());
    IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
    balances[profileId][token] += amount;
    emit Deposited(token, profileId, amount);
  }

  /* @dev Allows registered vaults to deposit native ETH into escrow.
   * @notice Only callable by registered vaults.
   */
  function depositETH() external payable {
    uint256 profileId = IEthosVaultManager(
      CONTRACT_MANAGER.getContractAddressForName(ETHOS_VAULT_MANAGER)
    ).getProfileIdByVault(msg.sender); // msg.sender is vault address
    require(profileId != 0, InvalidVault()); // when profileId == 0 it means that the vault is not registered in the vault manager
    require(msg.value > 0, ETHMustBeGreaterThanZero());
    balances[profileId][NATIVE_TOKEN_ADDRESS] += msg.value;
    emit Deposited(NATIVE_TOKEN_ADDRESS, profileId, msg.value);
  }

  /* @dev Withdraws ERC20 tokens or native ETH from escrow back to a specified receiver.
   * @notice Withdrawals can only be initiated by the owner of the profile linked to the tokens.
   * @param token The address of the token to withdraw.
   * @param receiver The address where the tokens will be sent.
   * @param amount The amount of tokens to withdraw.
   */
  function withdraw(address token, address receiver, uint256 amount) external nonReentrant {
    uint256 profileId = IEthosProfile(CONTRACT_MANAGER.getContractAddressForName(ETHOS_PROFILE))
      .profileIdByAddress(msg.sender);
    require(profileId != 0, InvalidVault()); // when profileId == 0 it means that the vault is not registered in the vault manager
    require(balances[profileId][token] >= amount, InsufficientBalance());
    balances[profileId][token] -= amount;
    if (token == NATIVE_TOKEN_ADDRESS) {
      payable(receiver).transfer(amount);
    } else {
      IERC20(token).safeTransfer(receiver, amount);
    }
    emit Withdrawn(token, receiver, profileId, amount);
  }

  /* @dev Returns the balance of a given token for a specified profile.
   * @param profileId ID of the profile to check the balance for.
   * @param token The token address to check the balance of.
   * @return The balance of the token for the specified profile.
   */
  function balanceOf(uint256 profileId, address token) external view returns (uint256) {
    return balances[profileId][token];
  }
}
