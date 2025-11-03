// Safe formatting utilities for numeric values from PHP API
// Handles string-to-number conversion needed when data comes from MySQLi

/**
 * Safely format a numeric value (which might be a string from PHP API) to fixed decimal places
 * @param value - The value to format (can be number or string)
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string with specified decimal places
 */
export function toFixed(value: any, decimals: number = 2): string {
  if (value === null || value === undefined) {
    return '0.' + '0'.repeat(decimals);
  }

  // Convert to number if it's a string
  const numValue = typeof value === 'string' ? parseFloat(value) : Number(value);

  // Return formatted value
  if (isNaN(numValue)) {
    return '0.' + '0'.repeat(decimals);
  }

  return numValue.toFixed(decimals);
}

/**
 * Format a numeric value as currency
 * @param value - The value to format (can be number or string)
 * @param currency - Currency symbol (default: '$')
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted currency string
 */
export function formatCurrency(value: any, currency: string = '$', decimals: number = 2): string {
  return `${currency}${toFixed(value, decimals)}`;
}

/**
 * Convert a numeric value (might be string) to a number
 * @param value - The value to convert
 * @returns Numeric value or 0 if conversion fails
 */
export function toNumber(value: any): number {
  if (value === null || value === undefined) {
    return 0;
  }

  const numValue = typeof value === 'string' ? parseFloat(value) : Number(value);
  return isNaN(numValue) ? 0 : numValue;
}
