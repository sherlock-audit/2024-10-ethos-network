// Validate numeric input format
export function isValidAmount(value: string): boolean {
  // Allow empty string or single decimal point
  if (value === '' || value === '.') return true;

  // Check if it's a valid number format
  const regex = /^\d*\.?\d*$/;

  if (!regex.test(value)) return false;

  // Prevent leading zeros unless it's a decimal
  if (value.length > 1 && value[0] === '0' && value[1] !== '.') return false;

  return true;
}
