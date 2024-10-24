// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/*
 * @dev Interface for ITargetStatus Smart Contract.
 */
interface ITargetStatus {
  /**
   * @dev Checks whether target exists and is allowed to be used for given Id. Target can be any entity like Review, Vouch, Attestation etc.
   * @param _targetId Target id.
   * @return exists Whether target exists.
   * @return allowed Whether target is allowed to be used.
   */
  function targetExistsAndAllowedForId(
    uint256 _targetId
  ) external view returns (bool exists, bool allowed);
}
