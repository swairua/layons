# BOQ to Invoice Conversion - Currency Consistency Audit Report

## Executive Summary
Audit of BOQ (Bill of Quantities) to Invoice conversion process reveals **critical currency inconsistencies** across multiple conversion paths (BOQ→Invoice, Quotation→Invoice). While the database layer correctly preserves currency, the UI layer and some conversion processes have hardcoded currency assumptions, leading to:
- Incorrect currency display in success messages
- Missing currency preservation in quotation-to-invoice conversion
- Potential PDF generation issues with non-KES currencies

## Issues Found

### 1. **BOQ to Invoice Conversion - Hardcoded Currency in Toast Message** ⚠️ HIGH PRIORITY
**File**: `src/pages/BOQs.tsx` (Line 104)

**Issue**: The success toast message hardcodes currency formatting to KES and 'en-KE' locale, regardless of the actual invoice's currency.

```typescript
// CURRENT (WRONG):
toast.success(
  `✅ BOQ ${convertDialog.boqNumber} successfully converted to Invoice ${invoice.invoice_number}`,
  {
    description: `Invoice created with ${invoice.total_amount ? `total amount ${new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(invoice.total_amount)}` : 'amount from BOQ'}`,
    duration: 5000
  }
);
```

**Impact**: 
- USD and EUR invoices will display amounts with KES formatting
- Example: $1,000 USD displays as "Ksh 1,000.00" in the success message
- User confusion about actual currency of converted invoice

**Root Cause**: Hardcoded locale and currency string instead of using the created invoice's actual currency

### 2. **Quotation to Invoice Conversion - Missing Currency Field** ⚠️ HIGH PRIORITY
**File**: `src/hooks/useQuotationItems.ts` (Lines 252-265)

**Issue**: The `invoiceData` object created during quotation-to-invoice conversion does **NOT** include the `currency` field, even though quotations may have been created with different currencies.

```typescript
// CURRENT (INCOMPLETE):
const invoiceData = {
  company_id: quotation.company_id,
  customer_id: quotation.customer_id,
  invoice_number: invoiceNumber,
  invoice_date: new Date().toISOString().split('T')[0],
  due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  status: 'sent',
  subtotal: quotation.subtotal,
  tax_amount: quotation.tax_amount,
  total_amount: quotation.total_amount,
  notes: quotation.notes,
  terms_and_conditions: quotation.terms_and_conditions,
  created_by: createdBy
  // ❌ MISSING: currency field
};
```

**Impact**:
- Quotations created in USD/EUR lose their currency when converted to invoices
- Invoices default to NULL or database default currency
- Breaking user workflow for multi-currency quotations

**Root Cause**: Incomplete migration of quotation fields to invoice; currency field not included

### 3. **Quotation Module - Hardcoded KES Currency** ⚠️ MEDIUM PRIORITY
**File**: `src/components/quotations/CreateQuotationModal.tsx` (Lines 295-298)

**Issue**: Quotation creation and display hardcodes currency to KES with 'en-KE' locale.

```typescript
// CURRENT (HARDCODED):
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 2
  }).format(amount);
};
```

**Impact**:
- Quotations cannot be created with different currencies
- UI only shows KES amounts regardless of selected currency
- Inconsistent with BOQ module which supports multiple currencies

**Root Cause**: Quotation module not updated to support multi-currency like BOQ module

### 4. **Quotation Interface Missing Currency Field** ⚠️ MEDIUM PRIORITY
**File**: `src/pages/Quotations.tsx` (Lines 38-58)

**Issue**: The Quotation TypeScript interface doesn't include a `currency` field.

```typescript
interface Quotation {
  id: string;
  quotation_number: string;
  // ... other fields
  total_amount: number;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'processed';
  // ❌ MISSING: currency?: string;
}
```

**Impact**: Type safety issues; developers can't rely on TypeScript to catch currency-related bugs

### 5. **BOQ to Invoice Conversion - Correct Behavior** ✅ CORRECT
**File**: `src/hooks/useBOQ.ts` (Line 213)

**Implementation**: BOQ to Invoice correctly preserves currency.

```typescript
// CORRECT:
const invoiceData = {
  // ... other fields
  currency: boq.currency || 'KES', // ✅ Preserves BOQ currency
  // ... rest of invoice data
};
```

**Note**: This is the correct pattern that should be replicated in quotation and proforma conversions.

### 6. **PDF Generation - Currency Handling** ✅ MOSTLY CORRECT
**File**: `src/utils/pdfGenerator.ts` (Lines 571-573)

**Implementation**: PDF generator correctly uses the provided currency.

```typescript
// CORRECT:
const formatCurrency = (amount: number) => {
  return formatCurrencyUtil(amount, data.currency || 'KES');
};
```

**Note**: This is correct, but relies on proper currency being passed from the UI layer.

## Summary of Issues by Severity

| Severity | Component | Issue | Status |
|----------|-----------|-------|--------|
| 🔴 HIGH | BOQs.tsx | Hardcoded KES in success toast | Not Fixed |
| 🔴 HIGH | useQuotationItems.ts | Missing currency field in conversion | Not Fixed |
| 🟡 MEDIUM | CreateQuotationModal.tsx | Hardcoded KES formatting | Not Fixed |
| 🟡 MEDIUM | Quotations.tsx | Missing currency in interface | Not Fixed |
| 🟢 OK | useBOQ.ts | Correctly preserves currency | ✅ |
| 🟢 OK | pdfGenerator.ts | Uses provided currency correctly | ✅ |

## Recommendations

### Immediate Fixes (HIGH PRIORITY)

1. **Fix BOQ to Invoice Toast Message**
   - Extract `formatCurrency` utility function
   - Use invoice's actual currency in success message
   - Support all currencies: KES, USD, EUR

2. **Fix Quotation to Invoice Conversion**
   - Add `currency: quotation.currency || 'KES'` to invoiceData
   - Verify quotations table has currency column in database
   - Update interface to include currency field

3. **Extend Quotation Module Support**
   - Add currency selector to quotation creation form (like BOQ module)
   - Store currency in quotations table
   - Update formatCurrency to use selected currency
   - Update QuotationModal to support multi-currency display

### Testing Considerations

- ✅ Test BOQ to Invoice with USD and EUR currencies
- ✅ Test Quotation to Invoice with USD and EUR currencies
- ✅ Verify PDF PDFs display correct currency symbols
- ✅ Test toast messages display correct formatted amounts
- ✅ Test database correctly stores currency values

## Database Considerations

Verify the following tables have currency columns:
- ✅ `boqs` - has `currency` field
- ❓ `quotations` - needs verification
- ✅ `invoices` - has `currency` field
- ✅ `proforma_invoices` - likely has `currency` field

## Code Quality Notes

- Currency formatting should use the utility function `formatCurrency` from `currencyFormatter.ts`
- Never hardcode locale/currency in UI components
- Always pass currency through data objects
- Follow BOQ module pattern as the reference implementation
