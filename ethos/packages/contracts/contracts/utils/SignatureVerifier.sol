// SPDX-License-Identifier: MIT

pragma solidity 0.8.26;
import { SignatureChecker } from "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";
import { ISignatureVerifier } from "../interfaces/ISignatureVerifier.sol";

/**
 * @notice Implementation is generic. Deploy as a separate contract to be used with multiple Smart Contracts.
 * @title SignatureVerifier Smart Contract.
 * @dev Verifies signatures.
 */
contract SignatureVerifier is ISignatureVerifier {
  /**
   * @dev Verifies signature was signed by provided address's pk.
   * @param expectedSigner Expected signature signer.
   * @param messageHash Message hash.
   * @param signature Message signature.
   * @return Whether valid or not.
   */
  function verifySignature(
    address expectedSigner,
    bytes32 messageHash,
    bytes memory signature
  ) external view returns (bool) {
    bytes32 ethSignedMessageHash = _getEthSignedMessageHash(messageHash);

    return SignatureChecker.isValidSignatureNow(expectedSigner, ethSignedMessageHash, signature);
  }

  /**
   * @dev Creates signed message hash.
   * @param messageHash Message hash.
   * @return Signed message hash.
   */
  function _getEthSignedMessageHash(bytes32 messageHash) private pure returns (bytes32) {
    return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
  }
}
