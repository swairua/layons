/**
 * Safely converts a value (which could be number, string, or empty string) to a number
 * @param value - The value to convert
 * @param defaultValue - Default value if empty or invalid
 * @returns The numeric value
 */
export function toNumber(value: number | string | '', defaultValue: number = 0): number {
  if (value === '' || value === null || value === undefined) {
    return defaultValue;
  }
  
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return isNaN(num) ? defaultValue : num;
}

/**
 * Safely converts a value to an integer
 * @param value - The value to convert
 * @param defaultValue - Default value if empty or invalid
 * @returns The integer value
 */
export function toInteger(value: number | string | '', defaultValue: number = 0): number {
  if (value === '' || value === null || value === undefined) {
    return defaultValue;
  }
  
  const num = typeof value === 'string' ? parseInt(value) : value;
  return isNaN(num) ? defaultValue : num;
}

/**
 * Converts all numeric fields in an object, handling empty string values
 * @param data - Object with potentially mixed number/string values
 * @param fieldMap - Object mapping field names to their parser (toNumber or toInteger)
 * @returns New object with properly typed numeric values
 */
export function normalizeNumericFields<T extends Record<string, any>>(
  data: T,
  fieldMap: Record<string, 'number' | 'integer'>
): T {
  const result = { ...data };
  
  for (const [field, type] of Object.entries(fieldMap)) {
    if (field in result) {
      if (type === 'number') {
        result[field as keyof T] = toNumber(result[field]) as any;
      } else if (type === 'integer') {
        result[field as keyof T] = toInteger(result[field]) as any;
      }
    }
  }
  
  return result;
}

/**
 * Example usage in a form submit handler:
 * 
 * const handleSubmit = async () => {
 *   const normalizedData = normalizeNumericFields(formData, {
 *     cost_price: 'number',
 *     selling_price: 'number',
 *     stock_quantity: 'integer',
 *     min_stock_level: 'integer'
 *   });
 *   // Now use normalizedData with properly typed numbers
 * };
 */
