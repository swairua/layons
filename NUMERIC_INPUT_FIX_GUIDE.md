# Numeric Input Zero-Clearing Fix Guide

## Problem
Integer and decimal inputs with default value 0 are "sticky" - they can only be cleared after appending another digit first. This happens because `parseInt(e.target.value) || 0` immediately converts empty string back to 0.

## Solution
Replace the automatic `|| 0` fallback with explicit empty string handling. When user clears the field, allow it to be empty during editing and convert to 0 only on blur.

## Pattern to Replace

### OLD PATTERN (Problematic)
```tsx
<Input
  type="number"
  value={formData.cost_price}
  onChange={(e) => handleInputChange('cost_price', parseFloat(e.target.value) || 0)}
/>
```

### NEW PATTERN (Fixed)
```tsx
<Input
  type="number"
  value={formData.cost_price || ''}
  onChange={(e) => {
    const value = e.target.value;
    if (value === '') {
      handleInputChange('cost_price', '');
    } else {
      const num = parseFloat(value);
      if (!isNaN(num)) {
        handleInputChange('cost_price', num);
      }
    }
  }}
  onBlur={(e) => {
    const value = e.target.value;
    if (value === '') {
      handleInputChange('cost_price', 0);
    }
  }}
/>
```

## For Integer Inputs
Use `parseInt` instead of `parseFloat`:
```tsx
const num = parseInt(value);  // instead of parseFloat
```

## Step-by-Step Implementation

### 1. Update TypeScript Types
Allow numeric fields in formData to be `number | ''`:

```tsx
const [formData, setFormData] = useState<{
  cost_price: number | '';
  selling_price: number | '';
  stock_quantity: number | '';
  // ... other fields
}>({
  cost_price: 0,
  selling_price: 0,
  // ... initial values
});
```

### 2. Update Form Submission
Import and use the helper functions to convert values:

```tsx
import { toNumber, toInteger } from '@/utils/numericFormHelpers';

// In handleSubmit:
const newData = {
  cost_price: toNumber(formData.cost_price, 0),
  selling_price: toNumber(formData.selling_price, 0),
  stock_quantity: toInteger(formData.stock_quantity, 0),
  // ... other fields
};
```

### 3. Update Calculations
When displaying calculated values, convert string to number first:

```tsx
{(() => {
  const cost = toNumber(formData.cost_price, 0);
  const selling = toNumber(formData.selling_price, 0);
  return (
    <div>Margin: {(selling - cost).toFixed(2)}</div>
  );
})()}
```

## Files Already Fixed
- ✅ `src/components/inventory/AddInventoryItemModal.tsx`

## Files That Need Fixing (Priority Order)
1. `src/components/inventory/EditInventoryItemModal.tsx`
2. `src/components/inventory/RestockItemModal.tsx`
3. `src/components/inventory/StockAdjustmentModal.tsx`
4. `src/components/customers/CreateCustomerModal.tsx`
5. `src/components/customers/EditCustomerModal.tsx`
6. `src/components/invoices/CreateInvoiceModal.tsx`
7. `src/components/invoices/EditInvoiceModal.tsx`
8. `src/components/payments/RecordPaymentModal.tsx`
9. `src/components/quotations/CreateQuotationModal.tsx`
10. `src/components/quotations/EditQuotationModal.tsx`
11. `src/components/proforma/CreateProformaModalOptimized.tsx`
12. `src/components/remittance/CreateRemittanceModal.tsx`
13. `src/components/delivery/CreateDeliveryNoteModal.tsx`
14. `src/components/lpo/CreateLPOModal.tsx`
15. And any other modal/form components with numeric inputs

## Alternative: Use the NumberInput Component
For faster implementation, use the provided `NumberInput` component:

```tsx
import { NumberInput } from '@/components/ui/number-input';

<NumberInput
  value={formData.cost_price}
  onChange={(val) => handleInputChange('cost_price', val)}
  step="0.01"
  placeholder="0.00"
/>
```

This component automatically handles the empty string logic and blur conversion.

## Helper Functions Available
Location: `src/utils/numericFormHelpers.ts`

- `toNumber(value, defaultValue)` - Convert to decimal number
- `toInteger(value, defaultValue)` - Convert to integer
- `normalizeNumericFields(data, fieldMap)` - Batch convert multiple fields

## Verification
Test each form by:
1. Click on a numeric input with value 0
2. Select all text (Ctrl+A)
3. Delete (Del or Backspace)
4. Input should clear completely
5. Click elsewhere (blur) and should convert to 0
6. Verify form submission works correctly
