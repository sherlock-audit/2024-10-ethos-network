// SPDX-License-Identifier: MIT

pragma solidity 0.8.26;
import { ISignatureVerifier } from "../interfaces/ISignatureVerifier.sol";
import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/**
 * @title SignatureControl Smart Contract.
 * @dev Controls signatures used in functions that must be approved by Ethos.
 */
abstract contract SignatureControl is Initializable {
  address public expectedSigner;
  address public signatureVerifier;

  mapping(bytes => bool) public signatureUsed;

  error SignatureWasUsed();
  error InvalidSignature();
  error ZeroAddress();

  /**
   * @dev Constructor.
   * @param expectedSignerAddr Signer address used for signing methods that should be approved by Ethos.
   * @param signatureVerifierAddr SignatureVerifier contract address.
   */
  // solhint-disable-next-line func-name-mixedcase
  function __signatureControl_init(
    address expectedSignerAddr,
    address signatureVerifierAddr
  ) internal onlyInitializing {
    _updateExpectedSigner(expectedSignerAddr);
    _updateSignatureVerifier(signatureVerifierAddr);
  }

  modifier onlyNonZeroAddress(address addr) {
    _addressShouldNotBeZero(addr);
    _;
  }

  modifier onlyUnusedSignature(bytes calldata signature) {
    if (signatureUsed[signature]) {
      revert SignatureWasUsed();
    }
    _;
  }

  /**
   * @notice Fails if signature is invalid.
   * @dev Verifies signature was signed by expected signer.
   * @param messageHash Message hash.
   * @param signature Message signature.
   */
  function validateAndSaveSignature(
    bytes32 messageHash,
    bytes calldata signature
  ) internal onlyUnusedSignature(signature) {
    bool isValid = ISignatureVerifier(signatureVerifier).verifySignature(
      expectedSigner,
      messageHash,
      signature
    );

    if (!isValid) {
      revert InvalidSignature();
    }

    signatureUsed[signature] = true;
  }

  /**
   * @dev Updates expected signer of signatures.
   * @param signer Signer address.
   */
  function _updateExpectedSigner(address signer) internal onlyNonZeroAddress(signer) {
    expectedSigner = signer;
  }

  /**
   * @dev Updates signature verifier contract address.
   * @param signatureVerifierAddr SignatureVerifier contract address.
   */
  function _updateSignatureVerifier(
    address signatureVerifierAddr
  ) internal onlyNonZeroAddress(signatureVerifierAddr) {
    signatureVerifier = signatureVerifierAddr;
  }

  /**
   * @notice Fails if address is zero.
   * @dev Checks if address is not zero.
   * @param addr Address to be checked.
   */
  function _addressShouldNotBeZero(address addr) internal pure {
    if (addr == address(0)) {
      revert ZeroAddress();
    }
  }
}
