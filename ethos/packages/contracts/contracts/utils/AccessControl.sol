// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { IPausable } from "../interfaces/IPausable.sol";
import { IContractAddressManager } from "../interfaces/IContractAddressManager.sol";
import { PausableUpgradeable } from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import { AccessControlEnumerableUpgradeable } from "@openzeppelin/contracts-upgradeable/access/extensions/AccessControlEnumerableUpgradeable.sol";
import { SignatureControl } from "./SignatureControl.sol";
import { ETHOS_INTERACTION_CONTROL } from "./Constants.sol";

/**
 * @dev Contract module that allows children to restrict access to run functions
 * by service account only.
 */
abstract contract AccessControl is
  IPausable,
  PausableUpgradeable,
  AccessControlEnumerableUpgradeable,
  SignatureControl
{
  /**
   * @dev Constructor that disables initializers when the implementation contract is deployed.
   * This prevents the implementation contract from being initialized, which is important for
   * security since the implementation contract should never be used directly, only through
   * delegatecall from the proxy.
   */
  constructor() {
    _disableInitializers();
  }

  bytes32 public constant OWNER_ROLE = keccak256("OWNER_ROLE");
  bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

  IContractAddressManager public contractAddressManager;

  // Add storage gap as the last storage variable
  // This allows us to add new storage variables in future upgrades
  // by reducing the size of this gap
  uint256[50] private __gap;

  /**
   * @dev Constructor.
   * @param owner Owner address.
   * @param admin Admin address.
   * @param expectedSigner Signer address used for signing methods that should be approved by Ethos.
   * @param signatureVerifier SignatureVerifier contract address.
   * @param contractAddressManagerAddr ContractAddressManager contract address.
   */
  // solhint-disable-next-line func-name-mixedcase
  function __accessControl_init(
    address owner,
    address admin,
    address expectedSigner,
    address signatureVerifier,
    address contractAddressManagerAddr
  ) internal onlyInitializing {
    if (owner == address(0) || admin == address(0) || contractAddressManagerAddr == address(0)) {
      revert ZeroAddress();
    }

    __signatureControl_init(expectedSigner, signatureVerifier);

    contractAddressManager = IContractAddressManager(contractAddressManagerAddr);

    _grantRole(OWNER_ROLE, owner);
    _grantRole(ADMIN_ROLE, admin);

    // allowlistEnabled = false;
  }

  modifier onlyOwner() {
    _checkRole(OWNER_ROLE);
    _;
  }

  modifier onlyAdmin() {
    _checkRole(ADMIN_ROLE);
    _;
  }

  modifier onlyInteractionControl() {
    address interactionsControlAddr = contractAddressManager.getContractAddressForName(
      ETHOS_INTERACTION_CONTROL
    );

    if (interactionsControlAddr != msg.sender) {
      revert AccessControlUnauthorizedAccount(msg.sender, keccak256("ETHOS_INTERACTION_CONTROL"));
    }

    _;
  }

  /**
   * @dev Updates ContractAddressManager address.
   * @param contractAddressesAddr ContractAddresses address.
   */
  function updateContractAddressManager(address contractAddressesAddr) external onlyAdmin {
    contractAddressManager = IContractAddressManager(contractAddressesAddr);
  }

  // Owner
  /**
   * @dev Updates owner address.
   * @param owner Owner address to be used instead of current.
   */
  function updateOwner(address owner) external onlyOwner {
    _revokeRole(OWNER_ROLE, getRoleMember(OWNER_ROLE, 0));
    _grantRole(OWNER_ROLE, owner);
  }

  // Admin
  /**
   * @dev Adds admin address.
   * @param admin Admin address to be added.
   */
  function addAdmin(address admin) external onlyOwner {
    _grantRole(ADMIN_ROLE, admin);
  }

  /**
   * @dev Removes admin address.
   * @param admin Admin address to be removed.
   */
  function removeAdmin(address admin) external onlyOwner {
    _revokeRole(ADMIN_ROLE, admin);
  }

  // Signature verification
  /**
   * @dev Updates expected signer of signatures.
   * @param signer Signer address.
   */
  function updateExpectedSigner(address signer) external onlyAdmin {
    _updateExpectedSigner(signer);
  }

  /**
   * @dev Updates signature verifier contract address.
   * @param sinatureVerifier SignatureVerifier contract address.
   */
  function updateSignatureVerifier(address sinatureVerifier) external onlyAdmin {
    _updateSignatureVerifier(sinatureVerifier);
  }

  // Pausable
  function pause() external onlyInteractionControl {
    super._pause();
  }

  function unpause() external onlyInteractionControl {
    super._unpause();
  }

  // IPausable
  function paused() public view override(IPausable, PausableUpgradeable) returns (bool) {
    return super.paused();
  }
}
