// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { AttestationDetails } from "../utils/Structs.sol";

/*
 * @dev Interface for EthosAttestation Smart Contract.
 */
interface IEthosAttestation {
  struct Attestation {
    bool archived;
    uint256 attestationId;
    uint256 profileId;
    uint256 createdAt;
    string account;
    string service;
  }

  function createAttestation(
    uint256 profileId,
    uint256 randValue,
    AttestationDetails calldata attestationDetails,
    string calldata evidence,
    bytes calldata signature
  ) external;

  function archiveAttestation(bytes32 attestationHash) external;

  function restoreAttestation(bytes32 attestationHash) external;

  function attestationExistsForHash(bytes32 attestationHash) external view returns (bool);

  function getServiceAndAccountHash(
    string calldata service,
    string calldata account
  ) external pure returns (bytes32);

  function getAttestationHashesByProfileId(
    uint256 profileId
  ) external view returns (bytes32[] memory);

  function getAttestationByHash(bytes32) external view returns (Attestation memory);
}
