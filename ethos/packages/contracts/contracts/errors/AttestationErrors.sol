// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

error AddressNotInProfile(address _address, uint256 profileId);
error AttestationAlreadyExists(bytes32 attestationHash);
error AttestationNotArchived(bytes32 attestationHash);
error AttestationNotFound(bytes32 attestationHash);
error ProfileNotFound(uint256 profileId);
error AttestationInvalid(string service, string account);
