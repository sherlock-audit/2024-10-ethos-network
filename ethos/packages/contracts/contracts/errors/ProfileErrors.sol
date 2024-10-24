// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

error ProfileNotFound(uint256 profileId);
error ProfileNotMock(uint256 profileId);
error ProfileNotFoundForAddress(address userAddress);
error ProfileExists(uint256 profileId);
error ProfileExistsForAddress(address userAddress);
error ProfileAccess(uint256 profileId, string message);
error AddressAuthorization(address userAddress, string message);
error AddressAlreadyInvited(uint256 profileId, address user);
error ZeroAddress();
error InsufficientInvites(uint256 profileId);
error AddressNotInvited();
error AddressCompromised(address user);
error InvalidSender();
error InvalidIndex();
error MaxInvitesReached(uint256 profileId);
error MaxAddressesReached(uint256 profileId);
