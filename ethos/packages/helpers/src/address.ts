import { type Address, isAddress, isAddressEqual, zeroAddress } from 'viem';

export function isAddressEqualSafe(a: Address, b: Address): boolean {
  try {
    return isAddressEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Checks if the given address is valid and not equal to the zero address.
 *
 * @param address The address to check.
 * @returns True if the address is valid and not equal to the zero address, otherwise false.
 */
export function isValidAddress(address?: string | null): address is Address {
  if (!address) return false;
  if (!isAddress(address)) return false;
  if (isAddressEqualSafe(address, zeroAddress)) return false;

  return true;
}
