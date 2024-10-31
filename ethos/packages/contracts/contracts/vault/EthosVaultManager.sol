// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.26;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import { UUPSUpgradeable } from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import { AccessControl } from "../utils/AccessControl.sol";
import { ETHOS_VOUCH, ETHOS_VAULT_FACTORY } from "../utils/Constants.sol";
import { IEthosVaultManager } from "../interfaces/IEthosVaultManager.sol";
import { IEthosVaultFactory } from "../interfaces/IEthosVaultFactory.sol";
import { MAX_TOTAL_FEES } from "./Constants.sol";

import { EthosVaultManagerVariables } from "./vaultManager/ethosVaultManagerVariables.sol";
import { EthosVaultManagerEvents } from "./vaultManager/ethosVaultManagerEvents.sol";
import { EthosVaultManagerErrors } from "./vaultManager/ethosVaultManagerErrors.sol";

contract EthosVaultManager is
  IEthosVaultManager,
  Initializable,
  EthosVaultManagerVariables,
  EthosVaultManagerEvents,
  EthosVaultManagerErrors,
  AccessControl,
  UUPSUpgradeable
{
  constructor() {
    // ensure logic contract initializer is not abused by disabling initializing
    // see https://forum.openzeppelin.com/t/security-advisory-initialize-uups-implementation-contracts/15301
    // and https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable#initializing_the_implementation_contract
    _disableInitializers();
  }

  modifier validAddress(address addr) {
    require(addr != address(0), InvalidAddress());
    _;
  }

  function initialize(
    address _owner,
    address _admin,
    address _expectedSigner,
    address _signatureVerifier,
    address _contractAddressManagerAddr,
    address _feeProtocolAddress,
    uint256 _entryProtocolFeeBasisPoints,
    uint256 _entryDonationFeeBasisPoints,
    uint256 _entryVouchersPoolFeeBasisPoints,
    uint256 _exitFeeBasisPoints
  )
    public
    initializer
    validAddress(_owner)
    validAddress(_admin)
    validAddress(_expectedSigner)
    validAddress(_signatureVerifier)
    validAddress(_contractAddressManagerAddr)
  {
    require(_feeProtocolAddress != address(0), InvalidFeeProtocolAddress());
    __accessControl_init(
      _owner,
      _admin,
      _expectedSigner,
      _signatureVerifier,
      _contractAddressManagerAddr
    );
    __UUPSUpgradeable_init();
    feeProtocolAddress = _feeProtocolAddress;
    entryProtocolFeeBasisPoints = _entryProtocolFeeBasisPoints;
    entryDonationFeeBasisPoints = _entryDonationFeeBasisPoints;
    entryVouchersPoolFeeBasisPoints = _entryVouchersPoolFeeBasisPoints;
    exitFeeBasisPoints = _exitFeeBasisPoints;
  }

  function _authorizeUpgrade(address) internal override onlyOwner {
    // Intentionally left blank to ensure onlyOwner modifier runs
  }

  function createVault(
    uint256 profileId,
    IERC20 assetToken
  ) external returns (address vaultAddress) {
    require(
      contractAddressManager.getContractAddressForName(ETHOS_VOUCH) == msg.sender,
      OnlyVouchContract()
    );
    // TODO invalid profileId if 0 ?
    require(address(profileIdToVault[profileId]) == address(0), VaultAlreadyExists());
    vaultAddress = IEthosVaultFactory(
      contractAddressManager.getContractAddressForName(ETHOS_VAULT_FACTORY)
    ).createVault(assetToken, ERC4626_NAME, ERC4626_SYMBOL, contractAddressManager);
    profileIdToVault[profileId] = vaultAddress;
    vaultToProfileId[vaultAddress] = profileId;
    emit VaultDeployed(vaultAddress, profileId, true);
  }

  function checkFeeExceedsMaximum(uint256 currentFee, uint256 newFee) internal view {
    uint256 totalFees = entryProtocolFeeBasisPoints +
      exitFeeBasisPoints +
      entryDonationFeeBasisPoints +
      entryVouchersPoolFeeBasisPoints +
      newFee -
      currentFee;
    require(totalFees <= MAX_TOTAL_FEES, "New fees exceed maximum");
  }

  function setFeeProtocolAddress(address _feeProtocolAddress) external onlyAdmin {
    feeProtocolAddress = _feeProtocolAddress;
    emit FeeProtocolAddressUpdated(_feeProtocolAddress);
  }

  function setEntryProtocolFeeBasisPoints(
    uint256 _newEntryProtocolFeeBasisPoints
  ) external onlyAdmin {
    checkFeeExceedsMaximum(entryProtocolFeeBasisPoints, _newEntryProtocolFeeBasisPoints);
    entryProtocolFeeBasisPoints = _newEntryProtocolFeeBasisPoints;
    emit EntryProtocolFeeBasisPointsUpdated(_newEntryProtocolFeeBasisPoints);
  }

  function setEntryDonationFeeBasisPoints(
    uint256 _newEntryDonationFeeBasisPoints
  ) external onlyAdmin {
    checkFeeExceedsMaximum(entryDonationFeeBasisPoints, _newEntryDonationFeeBasisPoints);
    entryDonationFeeBasisPoints = _newEntryDonationFeeBasisPoints;
    emit EntryDonationFeeBasisPointsUpdated(_newEntryDonationFeeBasisPoints);
  }

  function setEntryVouchersPoolFeeBasisPoints(
    uint256 _newEntryVouchersPoolFeeBasisPoints
  ) external onlyAdmin {
    checkFeeExceedsMaximum(entryVouchersPoolFeeBasisPoints, _newEntryVouchersPoolFeeBasisPoints);
    entryVouchersPoolFeeBasisPoints = _newEntryVouchersPoolFeeBasisPoints;
    emit EntryVouchersPoolFeeBasisPointsUpdated(_newEntryVouchersPoolFeeBasisPoints);
  }

  function setExitFeeBasisPoints(uint256 _newExitFeeBasisPoints) external onlyAdmin {
    checkFeeExceedsMaximum(exitFeeBasisPoints, _newExitFeeBasisPoints);
    exitFeeBasisPoints = _newExitFeeBasisPoints;
    emit ExitFeeBasisPointsUpdated(_newExitFeeBasisPoints);
  }

  function getVaultByProfileId(uint256 profileId) external view returns (address) {
    return profileIdToVault[profileId];
  }

  function getProfileIdByVault(address vault) external view returns (uint256) {
    return vaultToProfileId[vault];
  }

  function getFeeProtocolAddress() external view returns (address) {
    return feeProtocolAddress;
  }

  function getEntryProtocolFeeBasisPoints() external view returns (uint256) {
    return entryProtocolFeeBasisPoints;
  }

  function getEntryDonationFeeBasisPoints() external view returns (uint256) {
    return entryDonationFeeBasisPoints;
  }

  function getEntryVouchersPoolFeeBasisPoints() external view returns (uint256) {
    return entryVouchersPoolFeeBasisPoints;
  }

  function getExitFeeBasisPoints() external view returns (uint256) {
    return exitFeeBasisPoints;
  }
}
