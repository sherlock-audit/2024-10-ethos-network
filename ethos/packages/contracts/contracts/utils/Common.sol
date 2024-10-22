// SPDX-License-Identifier: MIT

pragma solidity 0.8.26;

contract Common {
  /**
   * @dev Returns correct length for an array to be created.
   * @param arrayLength Length of array.
   * @param maxLength Maximum length to be used.
   * @param fromIdx Start index.
   * @return Correct length.
   */
  function _correctLength(
    uint256 arrayLength,
    uint256 maxLength,
    uint256 fromIdx
  ) internal pure returns (uint256) {
    if (arrayLength == 0 || maxLength == 0 || fromIdx >= arrayLength) {
      return 0;
    }

    uint256 availableLength = arrayLength - fromIdx;
    return maxLength > availableLength ? availableLength : maxLength;
  }
}
