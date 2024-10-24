// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { Math } from "@openzeppelin/contracts/utils/math/Math.sol";
import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import { UUPSUpgradeable } from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import { IEthosSlashPenalty } from "../interfaces/IEthosSlashPenalty.sol";
import { IEthosVaultManager } from "../interfaces/IEthosVaultManager.sol";
import { AccessControl } from "../utils/AccessControl.sol";
import { MAX_SLASH_FACTOR, SLASH_PRECISION, PERCENTAGE_PRECISION } from "./Constants.sol";
import { ETHOS_VAULT_MANAGER } from "../utils/Constants.sol";
import { EthosSlashPenaltyConstants } from "./slashPenalty/ethosSlashPenaltyConstants.sol";
import { EthosSlashPenaltyEvents } from "./slashPenalty/ethosSlashPenaltyEvents.sol";
import { EthosSlashPenaltyVariables } from "./slashPenalty/ethosSlashPenaltyVariables.sol";
import { EthosSlashPenaltyErrors } from "./slashPenalty/ethosSlashPenaltyErrors.sol";

contract EthosSlashPenalty is
  IEthosSlashPenalty,
  Initializable,
  EthosSlashPenaltyConstants,
  EthosSlashPenaltyVariables,
  EthosSlashPenaltyEvents,
  EthosSlashPenaltyErrors,
  AccessControl,
  UUPSUpgradeable
{
  using Math for uint256;

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
    address owner,
    address admin,
    address expectedSigner,
    address signatureVerifier,
    address contractAddressManagerAddr
  )
    public
    initializer
    validAddress(owner)
    validAddress(admin)
    validAddress(expectedSigner)
    validAddress(signatureVerifier)
    validAddress(contractAddressManagerAddr)
  {
    __accessControl_init(
      owner,
      admin,
      expectedSigner,
      signatureVerifier,
      contractAddressManagerAddr
    );
    __UUPSUpgradeable_init();
  }

  function _authorizeUpgrade(address) internal override onlyOwner {}

  function updateSlashPoints(
    uint256 voucherProfileId,
    uint256 voucheeProfileId,
    uint256 vouchAmount
  ) external {
    uint256 profileId = IEthosVaultManager(
      contractAddressManager.getContractAddressForName(ETHOS_VAULT_MANAGER)
    ).getProfileIdByVault(msg.sender);
    require(profileId != 0, NotAuthorized());
    if (slashFactors[voucherProfileId] == 0) {
      slashFactors[voucherProfileId] = MAX_SLASH_FACTOR * SLASH_PRECISION;
    }
    uint256 slashPointsAmount = vouchAmount.mulDiv(
      MAX_SLASH_FACTOR * SLASH_PRECISION,
      slashFactors[voucherProfileId],
      Math.Rounding.Floor
    );
    slashPoints[voucherProfileId][voucheeProfileId] = slashPointsAmount;
    totalSlashPoints += slashPointsAmount;
  }

  // TODO Will need to update this from onlyOwner to something more dynamic such that a currently authorized slash contract can make this call.
  function slash(uint256 profileId, uint256 percentage) public onlyOwner {
    require(percentage <= PERCENTAGE_PRECISION && percentage > 0, InvalidSlashingPercentage());
    require(slashFactors[profileId] != 0, SlashFactorNotInitalized());
    slashFactors[profileId] = slashFactors[profileId].mulDiv(
      (PERCENTAGE_PRECISION - percentage),
      PERCENTAGE_PRECISION
    );
    require(slashFactors[profileId] != 0, SlashFactorCannotBeZero()); // TODO to discuss
    emit Slashed(profileId, percentage);
  }

  function getSlashFactor(uint256 profileId) public view returns (uint256) {
    return slashFactors[profileId];
  }

  function getSlashPoints(
    uint256 voucherProfileId,
    uint256 voucheeProfileId
  ) public view returns (uint256) {
    return slashPoints[voucherProfileId][voucheeProfileId];
  }

  function getTotalSlashPoints() public view returns (uint256) {
    return totalSlashPoints;
  }

  // TODO
  //  getUnslashedBalance(profileId) or getSlashedBalance(profileId) or getFundsSlashed(profileId)
  // where getUnslashedBalance(profileId) = getSlashedBalance(profileId) + getFundsSlashed(profileId)
}
