// SPDX-License-Identifier: MIT

pragma solidity 0.8.26;
error IndexOutOfBounds();

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

  /**
   * @dev Removes an element from an array by copying the last element into the specified index position
   *      and then removing the last element. This maintains array order but is gas efficient.
   * @param index The index of the element to remove
   * @param array The storage array to modify
   * @notice This function will revert if the index is out of bounds
   */

  function _removeFromArray(uint256 index, address[] storage array) internal {
    if (index >= array.length) revert IndexOutOfBounds();

    // If this is not the last element, copy last element to the index position
    if (index != array.length - 1) {
      array[index] = array[array.length - 1];
    }
    array.pop();
  }
}
