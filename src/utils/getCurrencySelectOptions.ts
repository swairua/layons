/**
 * Centralized currency selector options
 * Ensures consistent currency lists across all modules
 */

export const CURRENCY_SELECT_OPTIONS = [
  { value: 'KES', label: 'Ksh - Kenyan Shilling' },
  { value: 'USD', label: '$ - US Dollar' },
  { value: 'EUR', label: '€ - Euro' },
  { value: 'GBP', label: '£ - British Pound' }
];

/**
 * Get all available currency options for selects
 */
export const getCurrencyOptions = () => CURRENCY_SELECT_OPTIONS;

/**
 * Get currency label by code
 */
export const getCurrencyLabel = (code: string): string => {
  const option = CURRENCY_SELECT_OPTIONS.find(opt => opt.value === code);
  return option?.label || code;
};
