// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IWETH9 } from "../interfaces/external/iWETH9.sol";
import { IContractAddressManager } from "../interfaces/IContractAddressManager.sol";
import { IEthosVaultETHUnderlying } from "../interfaces/IEthosVaultETHUnderlying.sol";
import { IEthosEscrow } from "../interfaces/IEthosEscrow.sol";
import { EthosVaultCore } from "./EthosVaultCore.sol";
import { ETHOS_ESCROW } from "../utils/Constants.sol";
import { EthosVaultETHEvents } from "./vaultETHUnderlying/ethosVaultETHEvents.sol";

contract EthosVaultETHUnderlying is IEthosVaultETHUnderlying, EthosVaultCore, EthosVaultETHEvents {
  constructor(
    IWETH9 weth_,
    string memory _name,
    string memory _symbol,
    IContractAddressManager _contractManager
  ) EthosVaultCore(IERC20(address(weth_)), _name, _symbol, _contractManager) {}

  function depositETH(address receiver) public payable returns (uint256 netStakes) {
    uint256 assets = msg.value;
    netStakes = super.deposit(assets, receiver);
    emit DepositETH(receiver, assets, netStakes);
    return netStakes;
  }

  function deposit(
    uint256 /*assets*/,
    address /*receiver*/
  ) public virtual override returns (uint256) {
    revert NotSupported();
  }

  function redeemETH(
    uint256 stakes,
    address receiver,
    address owner
  ) public returns (uint256 assets) {
    assets = super.redeem(stakes, receiver, owner);
    emit RedeemETH(receiver, stakes, assets);
  }

  function redeem(
    uint256 /*stakes*/,
    address /*receiver*/,
    address /*owner*/
  ) public virtual override returns (uint256) {
    revert NotSupported();
  }

  function withdrawETH(
    uint256 assets,
    address receiver,
    address owner
  ) public virtual returns (uint256 stakes) {
    stakes = super.withdraw(assets, receiver, owner);
    emit WithdrawalETH(receiver, assets, stakes);
  }

  function withdraw(
    uint256 /*assets*/,
    address /*receiver*/,
    address /*owner*/
  ) public virtual override returns (uint256) {
    revert NotSupported();
  }

  function mintETH(
    uint256 stakes, // netStakes
    address receiver
  ) public payable virtual returns (uint256) {
    uint256 assets = super.mint(stakes, receiver);
    IWETH9(asset()).deposit{ value: assets }();
    emit MintETH(receiver, assets, stakes);
    return assets;
  }

  function mint(
    uint256 /*stakes*/,
    address /*receiver*/
  ) public virtual override returns (uint256) {
    revert NotSupported();
  }

  function _deposit(
    address /*caller*/,
    address receiver,
    uint256 assets,
    uint256 stakes
  ) internal virtual override {
    (uint256 feeProtocol, uint256 feeDonation) = _calculateEntryFees(assets);
    _mint(receiver, stakes);
    uint256 assetsToDeposit = assets - feeProtocol - feeDonation;
    IWETH9(asset()).deposit{ value: assetsToDeposit }();

    emit Deposit(msg.sender, receiver, assetsToDeposit, stakes);

    _updateSlashPoints(stakes, receiver);
    _distributeFees(feeProtocol, feeDonation);
  }

  function _distributeFees(uint256 feeProtocol, uint256 feeDonation) internal override {
    address feeProtocolRecipient = _protocolFeeRecipient();
    if (feeProtocol > 0 && feeProtocolRecipient != address(this)) {
      payable(feeProtocolRecipient).transfer(feeProtocol);
    }
    if (feeDonation > 0) {
      IEthosEscrow(CONTRACT_MANAGER.getContractAddressForName(ETHOS_ESCROW)).depositETH{
        value: feeDonation
      }();
    }
  }

  function _withdraw(
    address caller,
    address receiver,
    address owner,
    uint256 assets,
    uint256 stakes
  ) internal virtual override {
    uint256 fee = _feeOnRaw(assets, _exitFeeBasisPoints());
    address feeRecipient = _protocolFeeRecipient();

    // TODO discuss - we dont need allowances as only VouchContract is able to access deposit/withdraw/mint/redeem functions
    // if (caller != owner) {
    //   _spendAllowance(owner, caller, stakes);
    // }

    // If _asset is ERC777, `transfer` can trigger a reentrancy AFTER the transfer happens through the
    // `tokensReceived` hook. On the other hand, the `tokensToSend` hook, that is triggered before the transfer,
    // calls the vault, which is assumed not malicious.
    //
    // Conclusion: we need to do the transfer after the burn so that any reentrancy would happen after the
    // stakes are burned and after the assets are transferred, which is a valid state.
    _burn(owner, stakes);
    IWETH9(asset()).withdraw(assets);
    payable(receiver).transfer(assets - fee);
    emit Withdraw(caller, receiver, owner, assets, stakes);
    if (fee > 0 && feeRecipient != address(this)) {
      payable(feeRecipient).transfer(fee);
    }
  }

  receive() external payable {}
}
