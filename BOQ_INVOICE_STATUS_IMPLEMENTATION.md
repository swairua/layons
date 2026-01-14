# BOQ Status & Invoice Delete Features - Implementation Summary

## Overview

Three interconnected features have been implemented to improve BOQ (Bill of Quantities) and Invoice workflow management:

1. ✅ **BOQ Status Tracking** - Track BOQ lifecycle (draft, converted, cancelled)
2. ✅ **BOQ-to-Invoice Conversion Status Update** - Automatically update BOQ status when converted to invoice
3. ✅ **Invoice Delete with Reversal** - Reverse BOQ status and inventory when invoice is deleted

---

## Feature 1: BOQ Status Field

### What Changed

**New Migration**: `migrations/20250214_add_boq_status.sql`

Added a new `status` column to the `boqs` table with three valid values:
- **`draft`** - BOQ is in draft state (default)
- **`converted`** - BOQ has been converted to an invoice
- **`cancelled`** - BOQ has been cancelled

### Database Changes
```sql
ALTER TABLE boqs ADD COLUMN status VARCHAR(50) DEFAULT 'draft';
ALTER TABLE boqs ADD CONSTRAINT valid_boq_status 
  CHECK (status IN ('draft', 'converted', 'cancelled'));
```

### Why This Matters
- **Track BOQ Lifecycle** - Know at a glance which BOQs have been converted to invoices
- **Prevent Duplicate Conversions** - (Already prevented by existing logic, but status makes intent clearer)
- **Future Extensions** - Can add more statuses like 'pending', 'approved', etc.

### Migration Status
- Run `migrations/20250214_add_boq_status.sql` in Supabase SQL Editor
- Automatically populates existing BOQs:
  - If `converted_to_invoice_id` is set → status = `converted`
  - Otherwise → status = `draft`

---

## Feature 2: BOQ Status Updates on Conversion

### What Changed

**File Updated**: `src/hooks/useBOQ.ts` (lines 384-398)

When a BOQ is converted to an invoice, the `status` field is now updated to `'converted'`.

### Code Changes
```typescript
// Before conversion
const { error: updateError } = await supabase
  .from('boqs')
  .update({
    converted_to_invoice_id: invoice.id,
    converted_at: new Date().toISOString()
  })
  .eq('id', boqId)
  .eq('company_id', companyId);

// After conversion (UPDATED)
const { error: updateError } = await supabase
  .from('boqs')
  .update({
    converted_to_invoice_id: invoice.id,
    converted_at: new Date().toISOString(),
    status: 'converted'  // ← NEW
  })
  .eq('id', boqId)
  .eq('company_id', companyId);
```

### User Experience
1. User converts BOQ to Invoice
2. BOQ status automatically changes to "Converted" (visible in BOQ list)
3. Convert button becomes disabled
4. Delete button becomes disabled (can't delete converted BOQ)

### Status Display in BOQ List
The BOQs page now shows a **Status** column with color-coded badges:
- 🟡 **Draft** - Gray badge (secondary)
- 🟢 **Converted** - Blue badge (default)
- 🔴 **Cancelled** - Red badge (destructive)

---

## Feature 3: Invoice Delete with BOQ & Inventory Reversal

### What Changed

**New Utility File**: `src/utils/handleInvoiceDelete.ts`
**Updated Hook**: `src/hooks/useDatabase.ts` (useDeleteInvoice)

When an invoice is deleted, the system now:
1. Checks if the invoice came from a BOQ
2. If yes, reverses the BOQ status back to `'draft'` and clears conversion markers
3. Finds all stock movements for that invoice
4. Creates reverse movements to restore inventory
5. Updates product stock levels accordingly

### User Flow

```
User deletes invoice
    ↓
System checks: Did this invoice come from a BOQ?
    ├─ YES: Reverse BOQ status to 'draft'
    ├─ Create reverse stock movements
    ├─ Update product quantities
    └─ Show success toast with details
    ↓
Invoice deleted successfully
```

### What Gets Reversed

#### BOQ Reversal
```
Before Delete:
- BOQ status: 'converted'
- converted_to_invoice_id: [invoice_id]
- converted_at: [timestamp]

After Delete:
- BOQ status: 'draft'
- converted_to_invoice_id: null
- converted_at: null
```

#### Inventory Reversal
- If original invoice created stock movements (type='OUT')
- System creates reverse movements (type='IN')
- Product stock quantities are restored
- All movements are logged with reference to original invoice

### Implementation Details

**New Function**: `handleInvoiceDelete(invoiceId)`
```typescript
export async function handleInvoiceDelete(invoiceId: string) {
  // 1. Check for related BOQ
  // 2. Reverse BOQ status if found
  // 3. Find stock movements
  // 4. Create reverse movements
  // 5. Update product stock via RPC
  // 6. Delete invoice
  // Returns detailed summary of what was reversed
}
```

**Error Handling**: Non-critical errors (BOQ or inventory reversal) won't block invoice deletion. The invoice will still be deleted even if BOQ or inventory updates fail. Warnings are logged to console.

### Cache Invalidation
When an invoice is deleted, the following caches are refreshed:
- `invoices_fixed` - Invoice list
- `invoices` - Invoice data
- `boqs` - BOQ list (if status changed)
- `stock_movements` - Inventory movements

---

## Files Modified/Created

### New Files
- ✅ `migrations/20250214_add_boq_status.sql` - Status column migration
- ✅ `src/utils/handleInvoiceDelete.ts` - Invoice deletion handler with reversal logic

### Modified Files
- ✅ `src/hooks/useBOQ.ts` - Added status update on conversion
- ✅ `src/hooks/useDatabase.ts` - Updated useDeleteInvoice to use new handler
- ✅ `src/pages/BOQs.tsx` - Added status column to table display

---

## Testing Checklist

### BOQ Status Display
- [ ] Navigate to BOQs page
- [ ] Verify "Status" column appears with "Draft" for new BOQs
- [ ] Verify existing BOQs show correct status (converted if linked to invoice)

### BOQ Conversion
- [ ] Create a new BOQ
- [ ] Convert BOQ to Invoice
- [ ] Check BOQ list - status should change to "Converted"
- [ ] Verify "Convert" button is now disabled
- [ ] Verify "Delete" button is now disabled

### Invoice Deletion with BOQ Reversal
- [ ] Navigate to Invoices page
- [ ] Find an invoice that was converted from a BOQ
- [ ] Delete the invoice
- [ ] Check toast message for confirmation
- [ ] Verify BOQ status changed back to "Draft"
- [ ] Verify "Convert" and "Delete" buttons are now enabled again

### Inventory Reversal (if applicable)
- [ ] Create an invoice with products that have inventory
- [ ] Check product stock before deletion
- [ ] Delete the invoice
- [ ] Verify product stock was restored
- [ ] Check stock_movements for reverse entries

### Edge Cases
- [ ] Delete invoice created without BOQ (no BOQ reversal should occur)
- [ ] Delete invoice with no inventory impact (no inventory reversal)
- [ ] Refresh page after deletion (verify changes persist)

---

## Future Enhancements

Potential improvements based on this foundation:

1. **Status Transitions** - Add UI to manually change BOQ status (draft → cancelled, etc.)
2. **BOQ Comparison** - Show before/after when BOQ is converted to invoice
3. **Mass Operations** - Convert multiple BOQs to invoices at once
4. **Audit Trail** - Log BOQ status changes in audit log
5. **Approval Workflow** - Add 'pending_approval' and 'approved' statuses

---

## Troubleshooting

### BOQ Status Not Showing
**Problem**: Status column not visible in BOQs page
**Solution**: Clear browser cache (Ctrl+Shift+Delete) and refresh

### Conversion Not Updating Status
**Problem**: BOQ status stays "Draft" after conversion
**Solution**: 
1. Refresh page (F5)
2. Check browser console for errors
3. Verify migration was run in Supabase

### Invoice Delete Fails with Error
**Problem**: "Unable to delete invoice" error when trying to delete
**Solution**: 
1. Check that RLS is disabled (run diagnostic SQL)
2. Look at browser console for specific error
3. Try deleting an invoice that doesn't come from BOQ first (to isolate issue)

### Inventory Not Reversed
**Problem**: Product stock didn't restore after invoice deletion
**Solution**: 
1. Check stock_movements table for reverse entries
2. If missing, the reversal failed (but invoice was still deleted)
3. Run manual SQL to adjust stock if needed

---

## Database Notes

### Schema Summary
```sql
-- BOQs table now has:
boqs.status VARCHAR(50) CHECK (status IN ('draft', 'converted', 'cancelled'))

-- Stock movements uses:
stock_movements.movement_type IN ('IN', 'OUT') -- Direction of movement
stock_movements.reference_type = 'INVOICE' -- Links to invoices
stock_movements.reference_id = invoice.id -- Invoice ID

-- Products table uses:
products.stock_quantity -- Updated via update_product_stock RPC
```

### Key Relationships
```
BOQ → (converted_to_invoice_id) → Invoice
Invoice → (reference_id in stock_movements) → Stock Movements
Stock Movements → (product_id) → Products.stock_quantity
```

---

## Support & Contact

If you encounter issues with these features:
1. Check the troubleshooting section above
2. Review browser console for error messages
3. Check Supabase logs for database errors
4. Screenshot the error and share the console logs

