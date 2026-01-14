import React from 'react';
import { Input } from './input';

interface NumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  value: number | string | '';
  onChange: (value: number | '') => void;
  isInteger?: boolean;
  min?: string | number;
  max?: string | number;
  step?: string | number;
}

/**
 * NumberInput component that allows clearing zero values without them reverting back to 0
 * Handles both integer and decimal inputs properly
 * 
 * Usage:
 * <NumberInput
 *   value={formData.cost}
 *   onChange={(val) => setFormData({...formData, cost: val})}
 *   step="0.01"
 *   placeholder="0.00"
 * />
 */
export const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  ({ value, onChange, isInteger = false, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      
      // Allow empty strings - user can clear the field
      if (inputValue === '') {
        onChange('');
        return;
      }
      
      // Parse the input
      const num = isInteger ? parseInt(inputValue) : parseFloat(inputValue);
      
      // Only update if we have a valid number
      if (!isNaN(num)) {
        onChange(num);
      }
      // If parseFloat/parseInt returns NaN, don't update (user is still typing)
    };
    
    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      // Convert empty string to 0 on blur
      const inputValue = e.target.value;
      if (inputValue === '') {
        onChange(0);
      }
      
      // Call original onBlur if provided
      props.onBlur?.(e);
    };
    
    // Display value in input (empty string shows as empty, not "0")
    const displayValue = value === '' ? '' : value;
    
    return (
      <Input
        ref={ref}
        type="number"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        {...props}
      />
    );
  }
);

NumberInput.displayName = 'NumberInput';
