/**
 * Generates the next sequential BOQ number in format BOQ-NNN (e.g., BOQ-001, BOQ-002)
 * @param existingBOQs - Array of BOQ objects with a 'number' property
 * @returns Next BOQ number formatted as BOQ-NNN
 */
export function generateNextBOQNumber(existingBOQs: Array<{ number: string }>): string {
  if (!existingBOQs || existingBOQs.length === 0) {
    return 'BOQ-001';
  }

  // Extract numeric part only from sequential BOQ numbers (BOQ-NNN format)
  // Ignore date-based BOQ numbers (BOQ-YYYYMMDD-XXXX format)
  let maxNumber = 0;

  existingBOQs.forEach((boq) => {
    // Match only BOQ-NNN format where NNN is 1-3 digits and not followed by a dash
    const match = boq.number.match(/^BOQ-(\d{1,3})$/);
    if (match && match[1]) {
      const numericPart = parseInt(match[1], 10);
      if (!isNaN(numericPart) && numericPart > maxNumber) {
        maxNumber = numericPart;
      }
    }
  });

  // Generate next number with leading zeros
  const nextNumber = maxNumber + 1;
  const formattedNumber = String(nextNumber).padStart(3, '0');

  return `BOQ-${formattedNumber}`;
}
