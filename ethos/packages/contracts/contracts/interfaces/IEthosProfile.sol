// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/*
 * @dev Interface for EthosProfile Smart Contract.
 */
interface IEthosProfile {
  struct Profile {
    bool archived;
    uint256 profileId;
    uint256 createdAt;
    address[] addresses;
    InviteInfo inviteInfo;
  }

  struct InviteInfo {
    address[] sent;
    uint256[] acceptedIds;
    uint256 available;
    uint256 invitedBy;
  }

  function sentAt(uint256 profile, address invitee) external view returns (uint256);

  function profileExistsAndArchivedForId(
    uint256 profileId
  ) external view returns (bool exists, bool archived);

  function addressBelongsToProfile(
    address _address,
    uint256 _profileId
  ) external view returns (bool);

  function verifiedProfileIdForAddress(address _address) external view returns (uint256);

  function profileStatusById(
    uint256 profileId
  ) external view returns (bool verified, bool archived, bool mock);

  function profileStatusByAddress(
    address _address
  ) external view returns (bool verified, bool archived, bool mock, uint256 profileId);

  function profileIdByAddress(address user) external view returns (uint256);

  function profileIdByAttestation(bytes32 attestationHash) external view returns (uint256);

  function incrementProfileCount(
    bool isAttestation,
    address subject,
    bytes32 attestation
  ) external returns (uint256 count);

  function assignExistingProfileToAttestation(bytes32 attestation, uint256 profileId) external;

  function getProfile(uint256 id) external view returns (Profile memory profile);
}
