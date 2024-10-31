// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/*
 * @dev Interface for SignatureVerifier Smart Contract.
 */
interface ISignatureVerifier {
  function verifySignature(
    address _expectedSigner,
    bytes32 _messageHash,
    bytes memory _signature
  ) external view returns (bool);
}
