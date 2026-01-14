/**
 * Hook for handling numeric inputs that allows clearing values without them reverting to 0
 * @param initialValue - The initial numeric value
 * @param onChange - Callback when value changes
 * @returns Object with value and handleChange for use in input onChange
 */
export function useNumberInput(
  initialValue: number,
  onChange: (value: number | '') => void
) {
  const handleChange = (inputValue: string) => {
    // Allow empty strings to be set (e.g., when user clears the input)
    if (inputValue === '') {
      onChange('');
      return;
    }

    // Only update state with valid numbers
    const numValue = parseFloat(inputValue);
    if (!isNaN(numValue)) {
      onChange(numValue);
    }
    // If parseFloat returns NaN, don't update (user is still typing)
  };

  return {
    handleChange,
    formatValue: (value: number | '') => {
      // Format value for display in input
      return value === '' ? '' : value.toString();
    }
  };
}

/**
 * Utility to safely convert numeric input values to numbers, handling empty strings
 * @param value - The value from form state (could be number or empty string)
 * @param defaultValue - Value to use if empty string
 * @returns The numeric value
 */
export function parseNumericValue(value: number | string | '', defaultValue: number = 0): number {
  if (value === '' || value === null || value === undefined) {
    return defaultValue;
  }
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return isNaN(num) ? defaultValue : num;
}
