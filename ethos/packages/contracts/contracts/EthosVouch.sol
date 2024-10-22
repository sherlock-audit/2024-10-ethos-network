// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IERC4626 } from "@openzeppelin/contracts/interfaces/IERC4626.sol";
import { UUPSUpgradeable } from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { ITargetStatus } from "./interfaces/ITargetStatus.sol";
import { IEthosProfile } from "./interfaces/IEthosProfile.sol";
import { IEthosVaultManager } from "./interfaces/IEthosVaultManager.sol";
import { IEthosVaultCore } from "./interfaces/IEthosVaultCore.sol";
import { IEthosVaultETHUnderlying } from "./interfaces/IEthosVaultETHUnderlying.sol";
import { ETHOS_PROFILE, ETHOS_VAULT_MANAGER } from "./utils/Constants.sol";
import { AccessControl } from "./utils/AccessControl.sol";
import { Common } from "./utils/Common.sol";
import { VouchNotFound, NotAuthorForVouch, AlreadyVouched, MinimumVouchAmount, WrongSubjectProfileIdForVouch, SelfVouch, CannotMarkVouchAsUnhealthy, AlreadyUnvouched, InvalidEthosProfileForVouch } from "./errors/VouchErrors.sol";

contract EthosVouch is AccessControl, Common, ITargetStatus, UUPSUpgradeable {
  using SafeERC20 for IERC20;

  struct ActivityCheckpoints {
    uint256 vouchedAt;
    uint256 unvouchedAt;
    uint256 unhealthyAt;
  }

  struct Vouch {
    bool archived;
    bool unhealthy;
    uint256 authorProfileId;
    address authorAddress;
    address stakeToken;
    uint256 vouchId;
    uint256 subjectProfileId;
    string comment;
    string metadata;
    ActivityCheckpoints activityCheckpoints;
  }

  address private constant NATIVE_COIN = address(0);
  address public weth;
  uint256 public vouchCount;
  uint256 public unhealthyResponsePeriod;

  mapping(uint256 => Vouch) public vouches;
  mapping(uint256 => uint256[]) private vouchIdsByAuthor;
  mapping(uint256 => uint256[]) private vouchIdsForSubjectProfileId;
  mapping(uint256 => mapping(uint256 => uint256)) private vouchIdByAuthorForSubjectProfileId; // authorProfileId => subjectProfileId => vouchId

  event Vouched(
    uint256 vouchId,
    uint256 indexed authorProfileId,
    uint256 indexed subjectProfileId,
    uint256 indexed amountStaked
  );

  event Unvouched(
    uint256 indexed vouchId,
    uint256 indexed authorProfileId,
    uint256 indexed subjectProfileId
  );

  event MarkedUnhealthy(
    uint256 indexed vouchId,
    uint256 indexed authorProfileId,
    uint256 indexed subjectProfileId
  );

  /**
   * @dev initializer in place of constructor.
   * @param _owner Owner address.
   * @param _admin Admin address.
   * @param _expectedSigner ExpectedSigner address.
   * @param _signatureVerifier SignatureVerifier address.
   * @param _contractAddressManagerAddr ContractAddressManager address.
   * @param _weth Wrapped ETH address.
   */
  function initialize(
    address _owner,
    address _admin,
    address _expectedSigner,
    address _signatureVerifier,
    address _contractAddressManagerAddr,
    address _weth
  ) external initializer {
    __accessControl_init(
      _owner,
      _admin,
      _expectedSigner,
      _signatureVerifier,
      _contractAddressManagerAddr
    );

    __UUPSUpgradeable_init();

    configuredMinimumVouchAmount = ABSOLUTE_MINIMUM_VOUCH_AMOUNT;
    unhealthyResponsePeriod = 24 hours;
    weth = _weth;
  }

  /**
   * @notice restricts upgrading to owner
   * @param newImplementation address of new implementation contract
   */
  function _authorizeUpgrade(
    address newImplementation
  ) internal override onlyOwner onlyNonZeroAddress(newImplementation) {
    // Intentionally left blank to ensure onlyOwner and zeroCheck modifiers run
  }

  // ITargetStatus implementation
  /**
   * @dev Checks if target exists and is allowed to be used.
   * @param targetId Vouch id.
   * @return exists Whether target exists.
   * @return allowed Whether target is allowed to be used.
   */
  function targetExistsAndAllowedForId(
    uint256 targetId
  ) external view returns (bool exists, bool allowed) {
    Vouch storage vouch = vouches[targetId];

    exists = vouch.activityCheckpoints.vouchedAt > 0;
    allowed = exists;
  }

  /**
   * @dev Updates time period for unhealthy response.
   * @param unhealthyResponsePeriodDuration Time period.
   */
  function updateUnhealthyResponsePeriod(
    uint256 unhealthyResponsePeriodDuration
  ) external onlyAdmin {
    unhealthyResponsePeriod = unhealthyResponsePeriodDuration;
  }

  /**
   * @dev Gets vouches count made by author.
   * @param author Author profileId.
   * @return Vouches count.
   */
  function vouchesCountByAuthor(uint256 author) external view returns (uint256) {
    return vouchIdsByAuthor[author].length;
  }

  /**
   * @dev Gets vouches made by author in range.
   * @param author Author profile Id.
   * @param fromIdx Start index.
   * @param maxLength Maximum length of vouches to return.
   * @return result Vouches in range.
   */
  function vouchesByAuthorInRange(
    uint256 author,
    uint256 fromIdx,
    uint256 maxLength
  ) external view returns (Vouch[] memory result) {
    uint256[] storage vouchIds = vouchIdsByAuthor[author];
    return _vouchesInRange(maxLength, fromIdx, vouchIds);
  }

  /**
   * @dev Gets vouches count made for vouchee profile.
   * @param subjectProfileId Subject profile id.
   * @return Vouches count.
   */
  function vouchesCountForSubjectProfileId(
    uint256 subjectProfileId
  ) external view returns (uint256) {
    return vouchIdsForSubjectProfileId[subjectProfileId].length;
  }

  /**
   * @dev Gets vouches made for vouchee profile in range.
   * @param subjectProfileId Vouchee profile id.
   * @param fromIdx Start index.
   * @param maxLength Maximum length of vouches to return.
   * @return result Vouches in range.
   */
  function vouchesForSubjectProfileIdInRange(
    uint256 subjectProfileId,
    uint256 fromIdx,
    uint256 maxLength
  ) external view returns (Vouch[] memory result) {
    uint256[] storage vouchIds = vouchIdsForSubjectProfileId[subjectProfileId];
    return _vouchesInRange(maxLength, fromIdx, vouchIds);
  }

  /**
   * @dev Gets a verified vouch by author for vouchee profile Id.
   * @param author Author profileId.
   * @param subjectProfileId Subject profile Id.
   * @return Vouch.
   */
  function verifiedVouchByAuthorForSubjectProfileId(
    uint256 author,
    uint256 subjectProfileId
  ) public view returns (Vouch memory) {
    uint256 id = vouchIdByAuthorForSubjectProfileId[author][subjectProfileId];

    _vouchShouldBelongToAuthor(id, author);

    if (vouches[id].subjectProfileId != subjectProfileId) {
      revert WrongSubjectProfileIdForVouch(id, subjectProfileId);
    }

    return vouches[id];
  }

  /**
   * @dev Gets a verified vouch by author for subject address.
   * @param author author profileId.
   * @param subjectAddress subject address.
   * @return Vouch.
   */
  function verifiedVouchByAuthorForSubjectAddress(
    uint256 author,
    address subjectAddress
  ) external view returns (Vouch memory) {
    address ethosProfile = contractAddressManager.getContractAddressForName(ETHOS_PROFILE);

    uint256 profileId = IEthosProfile(ethosProfile).verifiedProfileIdForAddress(subjectAddress);

    return verifiedVouchByAuthorForSubjectProfileId(author, profileId);
  }

  /**
   * @dev Checks whether vouch exists for author and subject profile Id.
   * @param author Author profileId.
   * @param subjectProfileId Vouchee profile Id.
   * @return Whether vouch exists.
   */
  function vouchExistsFor(uint256 author, uint256 subjectProfileId) public view returns (bool) {
    uint256 id = vouchIdByAuthorForSubjectProfileId[author][subjectProfileId];
    Vouch storage v = vouches[id];

    return
      v.authorProfileId == author &&
      v.subjectProfileId == subjectProfileId &&
      v.activityCheckpoints.unvouchedAt == 0;
  }

  /**
   * @dev Marks vouch as unhealthy.
   * @param vouchId Vouch Id.
   */
  function markUnhealthy(uint256 vouchId) public {
    Vouch storage v = vouches[vouchId];
    uint256 profileId = IEthosProfile(
      contractAddressManager.getContractAddressForName(ETHOS_PROFILE)
    ).verifiedProfileIdForAddress(msg.sender);

    _vouchShouldExist(vouchId);
    _vouchShouldBePossibleUnhealthy(vouchId);
    _vouchShouldBelongToAuthor(vouchId, profileId);
    IEthosProfile(contractAddressManager.getContractAddressForName(ETHOS_PROFILE))
      .verifiedProfileIdForAddress(msg.sender);

    v.unhealthy = true;
    // solhint-disable-next-line not-rely-on-time
    v.activityCheckpoints.unhealthyAt = block.timestamp;

    emit MarkedUnhealthy(v.vouchId, v.authorProfileId, v.subjectProfileId);
  }

  /**
   * @dev Unvouches vouch.
   * @param vouchId Vouch Id.
   */
  function unvouch(uint256 vouchId) public {
    uint256 profileId = IEthosProfile(
      contractAddressManager.getContractAddressForName(ETHOS_PROFILE)
    ).verifiedProfileIdForAddress(msg.sender);
    Vouch storage v = vouches[vouchId];
    _vouchShouldExist(vouchId);
    _vouchShouldBelongToAuthor(vouchId, profileId);
    _vouchShouldBePossibleUnvouch(vouchId);

    v.archived = true;
    // solhint-disable-next-line not-rely-on-time
    v.activityCheckpoints.unvouchedAt = block.timestamp;

    _withdrawForUnvouch(v.subjectProfileId);

    emit Unvouched(v.vouchId, v.authorProfileId, v.subjectProfileId);
  }

  /**
   * @dev Convenience function that combines unvouch and mark unhealthy to avoid multiple transactions.
   * @param vouchId Vouch Id.
   */
  function unvouchUnhealthy(uint256 vouchId) external {
    unvouch(vouchId);
    markUnhealthy(vouchId);
  }

  /**
   * @dev Vouches for profile Id.
   * @param subjectProfileId Subject profile Id.
   * @param comment Comment.
   * @param metadata Metadata.
   */
  function vouchByProfileId(
    uint256 subjectProfileId,
    string calldata comment,
    string calldata metadata
  ) public payable {
    if (msg.value < configuredMinimumVouchAmount) {
      revert MinimumVouchAmount(configuredMinimumVouchAmount);
    }

    uint256 profileId = IEthosProfile(
      contractAddressManager.getContractAddressForName(ETHOS_PROFILE)
    ).verifiedProfileIdForAddress(msg.sender);

    if (profileId == subjectProfileId) {
      revert SelfVouch(profileId, subjectProfileId);
    }

    _profileShouldBeValidForVouch(subjectProfileId);
    _vouchShouldNotExistFor(profileId, subjectProfileId);
    IEthosVaultManager vaultManager = IEthosVaultManager(
      contractAddressManager.getContractAddressForName(ETHOS_VAULT_MANAGER)
    );
    address vaultAddress = vaultManager.getVaultByProfileId(subjectProfileId);
    if (vaultAddress == address(0)) {
      vaultAddress = vaultManager.createVault(subjectProfileId, IERC20(weth));
    }
    IEthosVaultETHUnderlying(vaultAddress).depositETH{ value: msg.value }(msg.sender);

    uint256 count = vouchCount;

    vouchIdsByAuthor[profileId].push(count);
    vouchIdsForSubjectProfileId[subjectProfileId].push(count);
    vouchIdByAuthorForSubjectProfileId[profileId][subjectProfileId] = count;

    vouches[count] = Vouch({
      archived: false,
      unhealthy: false,
      authorProfileId: profileId,
      authorAddress: msg.sender,
      stakeToken: NATIVE_COIN,
      vouchId: count,
      subjectProfileId: subjectProfileId,
      comment: comment,
      metadata: metadata,
      activityCheckpoints: ActivityCheckpoints({
        vouchedAt: block.timestamp,
        unvouchedAt: 0,
        unhealthyAt: 0
      })
    });

    emit Vouched(count, profileId, subjectProfileId, msg.value);

    vouchCount++;
  }

  /**
   * @dev Vouches for address.
   * @param subjectAddress Vouchee address.
   * @param comment Comment.
   * @param metadata Metadata.
   */
  function vouchByAddress(
    address subjectAddress,
    string calldata comment,
    string calldata metadata
  ) external payable onlyNonZeroAddress(subjectAddress) {
    IEthosProfile profile = IEthosProfile(
      contractAddressManager.getContractAddressForName(ETHOS_PROFILE)
    );
    profile.verifiedProfileIdForAddress(msg.sender);

    uint256 profileId = profile.verifiedProfileIdForAddress(subjectAddress);

    vouchByProfileId(profileId, comment, metadata);
  }

  /**
   * @notice Get the balance of a vouch (excluding exit fees)
   * @dev This function calculates the redeemable balance for a given vouch and owner
   * @param vouchId The ID of the vouch
   * @return The redeemable balance in the underlying asset
   */
  function getBalanceByVouchId(uint256 vouchId) external view returns (uint256) {
    Vouch storage v = vouches[vouchId];
    address vaultAddress = getVaultAddress(vouchId);
    if (v.archived) return 0;

    return
      IEthosVaultCore(vaultAddress).previewRedeemWithoutExitFee(
        IERC4626(vaultAddress).maxRedeem(v.authorAddress)
      );
  }

  /**
   * @notice Get the withdrawable assets for a given vouch ID
   * @dev This function calculates the amount of assets that can be withdrawn for a vouch,
   *      including all applicable fees (exit fees)
   * @param vouchId The ID of the vouch
   * @return The amount of withdrawable assets in the underlying asset, including exit fees
   */
  function getWithdrawableAssetsByVouchId(uint256 vouchId) external view returns (uint256) {
    Vouch storage v = vouches[vouchId];
    if (v.archived) return 0;
    address vaultAddress = getVaultAddress(vouchId);
    return IERC4626(vaultAddress).previewRedeem(IERC4626(vaultAddress).maxRedeem(v.authorAddress));
  }

  // private functions

  function getVaultAddress(uint256 vouchId) private view returns (address) {
    return
      IEthosVaultManager(contractAddressManager.getContractAddressForName("ETHOS_VAULT_MANAGER"))
        .getVaultByProfileId(vouches[vouchId].subjectProfileId);
  }

  /**
   * @notice Fails if vouch does not belong to Author.
   * @dev Checks if vouch belongs to author.
   * @param vouchId Vouch Id.
   * @param author author profileId.
   */
  function _vouchShouldBelongToAuthor(uint256 vouchId, uint256 author) private view {
    if (vouches[vouchId].authorProfileId != author) {
      revert NotAuthorForVouch(vouchId, author);
    }
  }

  /**
   * @notice Fails if vouch does not exist.
   * @dev Checks if vouch exists.
   * @param vouchId Vouch Id.
   */
  function _vouchShouldExist(uint256 vouchId) private view {
    if (vouches[vouchId].activityCheckpoints.vouchedAt == 0) {
      revert VouchNotFound(vouchId);
    }
  }

  /**
   * @notice Fails if vouch should not exist.
   * @dev Checks if vouch does not exist.
   * @param author Author profileId.
   * @param subjectProfileId Subject profile Id.
   */
  function _vouchShouldNotExistFor(uint256 author, uint256 subjectProfileId) private view {
    if (vouchExistsFor(author, subjectProfileId)) {
      revert AlreadyVouched(author, subjectProfileId);
    }
  }

  /**
   * @notice Fails if vouch cannot be set as unhealthy.
   * @dev Checks if vouch can be set as unhealthy.
   * @param vouchId Vouch Id.
   */
  function _vouchShouldBePossibleUnhealthy(uint256 vouchId) private view {
    Vouch storage v = vouches[vouchId];
    bool stillHasTime = block.timestamp <=
      v.activityCheckpoints.unvouchedAt + unhealthyResponsePeriod;

    if (!v.archived || v.unhealthy || !stillHasTime) {
      revert CannotMarkVouchAsUnhealthy(vouchId);
    }
  }

  /**
   * @notice Fails if vouch cannot be unvouched.
   * @dev Checks if vouch can be unvouched.
   * @param vouchId Vouch Id.
   */
  function _vouchShouldBePossibleUnvouch(uint256 vouchId) private view {
    Vouch storage v = vouches[vouchId];

    if (v.archived) {
      revert AlreadyUnvouched(vouchId);
    }
  }

  /**
   * @notice Fails if profile is not valid for vouch.
   * @dev Checks if profile is valid for vouch.
   * @param subjectProfileId Subject profile Id.
   */
  function _profileShouldBeValidForVouch(uint256 subjectProfileId) private view {
    address ethosProfile = contractAddressManager.getContractAddressForName(ETHOS_PROFILE);

    (bool exists, bool archived) = IEthosProfile(ethosProfile).profileExistsAndArchivedForId(
      subjectProfileId
    );

    if (!exists || archived) {
      revert InvalidEthosProfileForVouch(subjectProfileId);
    }
  }

  /**
   * @dev Withdraws amount for unvouch.
   * @param subjectProfileId Subject profile id.
   */
  function _withdrawForUnvouch(uint256 subjectProfileId) private {
    address vaultAddress = IEthosVaultManager(
      contractAddressManager.getContractAddressForName(ETHOS_VAULT_MANAGER)
    ).getVaultByProfileId(subjectProfileId);

    IEthosVaultETHUnderlying(vaultAddress).redeemETH(
      IERC4626(vaultAddress).maxRedeem(msg.sender),
      msg.sender,
      msg.sender
    );
  }

  /**
   * @dev Returns vouches in range.
   * @param maxLength Maximum length of items to return.
   * @param fromIdx Start index.
   * @param idArray Array of ids.
   * @return result Vouches array.
   */
  function _vouchesInRange(
    uint256 maxLength,
    uint256 fromIdx,
    uint256[] memory idArray
  ) private view returns (Vouch[] memory result) {
    uint256 idArrayLength = idArray.length;

    uint256 length = _correctLength(idArrayLength, maxLength, fromIdx);
    if (length == 0) {
      return result;
    }

    result = new Vouch[](length);

    for (uint256 i = 0; i < length; ++i) {
      result[i] = vouches[idArray[fromIdx + i]];
    }
  }

  /**
   * @dev Sets the minimum vouch amount.
   * @param amount New minimum vouch amount in wei.
   */
  function setMinimumVouchAmount(uint256 amount) external onlyAdmin {
    if (amount < ABSOLUTE_MINIMUM_VOUCH_AMOUNT) {
      revert MinimumVouchAmount(ABSOLUTE_MINIMUM_VOUCH_AMOUNT);
    }
    configuredMinimumVouchAmount = amount;
  }

  // new state variables are appended after existing storage
  uint256 public configuredMinimumVouchAmount;
  uint256 private constant ABSOLUTE_MINIMUM_VOUCH_AMOUNT = 0.0001 ether;
}
