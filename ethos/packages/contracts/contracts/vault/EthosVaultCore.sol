// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { Math } from "@openzeppelin/contracts/utils/math/Math.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { ERC4626 } from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { IContractAddressManager } from "../interfaces/IContractAddressManager.sol";
import { IEthosProfile } from "../interfaces/IEthosProfile.sol";
import { IEthosSlashPenalty } from "../interfaces/IEthosSlashPenalty.sol";
import { IEthosEscrow } from "../interfaces/IEthosEscrow.sol";
import { IEthosVaultManager } from "../interfaces/IEthosVaultManager.sol";
import { IEthosVaultCore } from "../interfaces/IEthosVaultCore.sol";
import { ETHOS_PROFILE, ETHOS_VOUCH, ETHOS_SLASH_PENALTY, ETHOS_VAULT_MANAGER, ETHOS_ESCROW } from "../utils/Constants.sol";
import { MAX_SLASH_FACTOR, SLASH_PRECISION } from "./Constants.sol";
import { EthosVaultErrors } from "./vaultCore/ethosVaultErrors.sol";
import { EthosVaultConstants } from "./vaultCore/ethosVaultConstants.sol";

// TODO check minimum deposit amount to prevent inflation attack
// TODO check max withdraw amount to prevent inflation attack
abstract contract EthosVaultCore is
  IEthosVaultCore,
  EthosVaultConstants,
  ERC4626,
  EthosVaultErrors
{
  using Math for uint256;
  using SafeERC20 for IERC20;

  uint256 private constant _BASIS_POINT_SCALE = 1e4;

  constructor(
    IERC20 _asset,
    string memory _name,
    string memory _symbol,
    IContractAddressManager _contractManager
  ) ERC4626(_asset) ERC20(_name, _symbol) {
    CONTRACT_MANAGER = _contractManager;
  }

  modifier onlyVouchContract() {
    require(
      msg.sender == CONTRACT_MANAGER.getContractAddressForName(ETHOS_VOUCH),
      OnlyVouchContract()
    );
    _;
  }

  function maxWithdraw(address owner) public view virtual override returns (uint256) {
    return _convertToAssets(_calculateStakes(owner), Math.Rounding.Floor);
  }

  function maxRedeem(address owner) public view virtual override returns (uint256) {
    return _calculateStakes(owner);
  }

  function deposit(
    uint256 assets,
    address receiver
  ) public virtual override onlyVouchContract returns (uint256) {
    return super.deposit(assets, receiver);
  }

  /** @dev See {IERC4626-redeem}. */
  function redeem(
    uint256 stakes,
    address receiver,
    address owner
  ) public virtual override onlyVouchContract returns (uint256) {
    uint256 maxStakes = maxRedeem(owner);
    if (stakes > maxStakes) {
      revert ERC4626ExceededMaxRedeem(owner, stakes, maxStakes);
    }

    uint256 assets = super.previewRedeem(stakes);
    _withdraw(_msgSender(), receiver, owner, assets, stakes);

    return assets;
  }

  /** @dev See {IERC4626-withdraw}. */
  function withdraw(
    uint256 assets,
    address receiver,
    address owner
  ) public virtual override onlyVouchContract returns (uint256) {
    uint256 maxAssets = maxWithdraw(owner);
    if (assets > maxAssets) {
      revert ERC4626ExceededMaxWithdraw(owner, assets, maxAssets);
    }

    uint256 stakes = super.previewWithdraw(assets);
    _withdraw(_msgSender(), receiver, owner, assets, stakes);

    return stakes;
  }

  function mint(
    uint256 stakes,
    address receiver
  ) public virtual override onlyVouchContract returns (uint256) {
    return super.mint(stakes, receiver);
  }

  function _calculateStakes(address owner) internal view returns (uint256) {
    uint256 profileId = IEthosProfile(CONTRACT_MANAGER.getContractAddressForName(ETHOS_PROFILE))
      .profileIdByAddress(owner);
    uint256 slashFactor = IEthosSlashPenalty(
      CONTRACT_MANAGER.getContractAddressForName(ETHOS_SLASH_PENALTY)
    ).getSlashFactor(profileId);
    uint256 vaultOwnerProfileId = IEthosVaultManager(
      CONTRACT_MANAGER.getContractAddressForName(ETHOS_VAULT_MANAGER)
    ).getProfileIdByVault(address(this));
    uint256 slashPoints = IEthosSlashPenalty(
      CONTRACT_MANAGER.getContractAddressForName(ETHOS_SLASH_PENALTY)
    ).getSlashPoints(profileId, vaultOwnerProfileId);

    return slashPoints.mulDiv(slashFactor, MAX_SLASH_FACTOR * SLASH_PRECISION, Math.Rounding.Floor);
  }

  function previewDeposit(uint256 assets) public view virtual override returns (uint256) {
    return
      super.previewDeposit(
        assets -
          _feeOnRaw(
            assets,
            _entryProtocolFeeBasisPoints() +
              _entryDonationFeeBasisPoints() +
              _entryVouchersPoolFeeBasisPoints()
          )
      );
  }

  function previewMint(uint256 stakes) public view virtual override returns (uint256) {
    uint256 assets = super.previewMint(stakes);
    return
      assets +
      _feeOnRaw(
        assets,
        _entryProtocolFeeBasisPoints() +
          _entryDonationFeeBasisPoints() +
          _entryVouchersPoolFeeBasisPoints()
      );
  }

  function previewWithdraw(uint256 assets) public view virtual override returns (uint256) {
    uint256 fee = _feeOnRaw(assets, _exitFeeBasisPoints());
    return super.previewWithdraw(assets + fee);
  }

  function previewRedeemWithoutExitFee(uint256 stakes) public view virtual returns (uint256) {
    return super.previewRedeem(stakes);
  }

  function previewRedeem(uint256 stakes) public view virtual override returns (uint256) {
    uint256 assets = super.previewRedeem(stakes);
    return assets - _feeOnRaw(assets, _exitFeeBasisPoints());
  }

  function _deposit(
    address caller,
    address receiver,
    uint256 assets,
    uint256 stakes
  ) internal virtual override {
    (uint256 feeProtocol, uint256 feeDonation) = _calculateEntryFees(assets);
    super._deposit(caller, receiver, assets, stakes);

    _updateSlashPoints(stakes, receiver);
    _distributeFees(feeProtocol, feeDonation);
  }

  function _withdraw(
    address caller,
    address receiver,
    address owner,
    uint256 assets,
    uint256 stakes
  ) internal virtual override {
    uint256 fee = _feeOnRaw(assets, _exitFeeBasisPoints());
    address recipient = _protocolFeeRecipient();

    super._withdraw(caller, receiver, owner, assets, stakes);

    if (fee > 0 && recipient != address(this)) {
      SafeERC20.safeTransfer(IERC20(asset()), recipient, fee);
    }
  }

  function _calculateEntryFees(uint256 assets) internal view virtual returns (uint256, uint256) {
    uint256 feeProtocol = _feeOnRaw(assets, _entryProtocolFeeBasisPoints());
    uint256 feeDonation = _feeOnRaw(assets, _entryDonationFeeBasisPoints());
    return (feeProtocol, feeDonation);
  }

  function _distributeFees(uint256 feeProtocol, uint256 feeDonation) internal virtual {
    address feeProtocolRecipient = _protocolFeeRecipient();
    if (feeProtocol > 0 && feeProtocolRecipient != address(this)) {
      SafeERC20.safeTransfer(IERC20(asset()), feeProtocolRecipient, feeProtocol);
    }
    if (feeDonation > 0) {
      IERC20(asset()).approve(
        CONTRACT_MANAGER.getContractAddressForName(ETHOS_ESCROW),
        feeDonation
      );
      IEthosEscrow(CONTRACT_MANAGER.getContractAddressForName(ETHOS_ESCROW)).deposit(
        asset(),
        feeDonation
      );
    }
  }

  function _updateSlashPoints(uint256 stakes, address receiver) internal {
    uint256 profileId = IEthosProfile(CONTRACT_MANAGER.getContractAddressForName(ETHOS_PROFILE))
      .profileIdByAddress(receiver);
    uint256 vaultOwnerProfileId = IEthosVaultManager(
      CONTRACT_MANAGER.getContractAddressForName(ETHOS_VAULT_MANAGER)
    ).getProfileIdByVault(address(this));
    IEthosSlashPenalty(CONTRACT_MANAGER.getContractAddressForName(ETHOS_SLASH_PENALTY))
      .updateSlashPoints(profileId, vaultOwnerProfileId, stakes);
  }

  function approve(
    address /*spender*/,
    uint256 /*value*/
  ) public pure override(ERC20, IERC20) returns (bool) {
    revert NotTransferable();
  }

  function transfer(
    address /*to*/,
    uint256 /*amount*/
  ) public pure override(ERC20, IERC20) returns (bool) {
    revert NotTransferable();
  }

  function transferFrom(
    address /*from*/,
    address /*to*/,
    uint256 /*amount*/
  ) public pure override(ERC20, IERC20) returns (bool) {
    revert NotTransferable();
  }

  // === Fee configuration ===

  function _entryProtocolFeeBasisPoints() internal view virtual returns (uint256) {
    return
      IEthosVaultManager(CONTRACT_MANAGER.getContractAddressForName(ETHOS_VAULT_MANAGER))
        .getEntryProtocolFeeBasisPoints();
  }

  function _entryDonationFeeBasisPoints() internal view virtual returns (uint256) {
    return
      IEthosVaultManager(CONTRACT_MANAGER.getContractAddressForName(ETHOS_VAULT_MANAGER))
        .getEntryDonationFeeBasisPoints();
  }

  function _entryVouchersPoolFeeBasisPoints() internal view virtual returns (uint256) {
    return
      IEthosVaultManager(CONTRACT_MANAGER.getContractAddressForName(ETHOS_VAULT_MANAGER))
        .getEntryVouchersPoolFeeBasisPoints();
  }

  function _exitFeeBasisPoints() internal view virtual returns (uint256) {
    return
      IEthosVaultManager(CONTRACT_MANAGER.getContractAddressForName(ETHOS_VAULT_MANAGER))
        .getExitFeeBasisPoints();
  }

  function _protocolFeeRecipient() internal view virtual returns (address) {
    return
      IEthosVaultManager(CONTRACT_MANAGER.getContractAddressForName(ETHOS_VAULT_MANAGER))
        .getFeeProtocolAddress();
  }

  // === Fee operations ===

  /* @dev Calculates the fee part of an amount `assets` that already includes fees.
   * Used in {IERC4626-deposit} and {IERC4626-redeem} operations.
   */
  function _feeOnTotal(uint256 assets, uint256 feeBasisPoints) private pure returns (uint256) {
    return assets.mulDiv(feeBasisPoints, feeBasisPoints + _BASIS_POINT_SCALE, Math.Rounding.Ceil);
  }

  /* @dev Calculates the fees that should be added to an amount `assets` that does not already include fees.
   * Used in {IERC4626-mint} and {IERC4626-withdraw} operations.
   */
  function _feeOnRaw(uint256 assets, uint256 feeBasisPoints) internal pure returns (uint256) {
    return assets.mulDiv(feeBasisPoints, _BASIS_POINT_SCALE, Math.Rounding.Ceil);
  }
}
