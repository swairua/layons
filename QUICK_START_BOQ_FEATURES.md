# Quick Start: BOQ Status & Invoice Delete Features

## What's New? 🎉

Three new features are ready to use:

### 1. **BOQ Status Tracking**
- BOQs now have a `status` field: Draft, Converted, or Cancelled
- Status is automatically managed based on BOQ lifecycle

### 2. **BOQ Status Changes on Conversion**
- When you convert a BOQ to an invoice, its status automatically changes to "Converted"
- The Convert and Delete buttons become disabled for converted BOQs

### 3. **Smart Invoice Deletion**
- When you delete an invoice that came from a BOQ:
  - ✅ BOQ status automatically reverts to "Draft"
  - ✅ All inventory movements are reversed
  - ✅ Product stock quantities are restored
- Shows you what was reversed in the success message

---

## Setup (One-Time)

### Step 1: Run the Migration
In **Supabase SQL Editor**, run:
```sql
migrations/20250214_add_boq_status.sql
```

This adds the `status` column to the BOQs table and populates existing BOQs with the correct status.

### Step 2: No Code Deploy Needed!
The code changes are already in:
- ✅ `src/hooks/useBOQ.ts` - Conversion logic updated
- ✅ `src/hooks/useDatabase.ts` - Delete logic updated
- ✅ `src/pages/BOQs.tsx` - Status column added to UI
- ✅ `src/utils/handleInvoiceDelete.ts` - New deletion handler

Just refresh your browser and you're ready to go!

---

## How to Use

### Viewing BOQ Status
1. Go to **BOQs** page
2. Look for the new **Status** column
3. Status badges:
   - 🟡 **Draft** - Ready to convert
   - 🟢 **Converted** - This BOQ has been converted to invoice
   - 🔴 **Cancelled** - This BOQ is cancelled

### Converting BOQ to Invoice (Status Updates Automatically)
1. Click **Convert to Invoice** button on any Draft BOQ
2. BOQ is converted to invoice ✅
3. **Watch the Status change to "Converted"** in the BOQ list
4. Convert button becomes disabled (can't convert twice)
5. Delete button becomes disabled (can't delete converted BOQ)

### Deleting Invoice with BOQ Reversal
1. Go to **Invoices** page
2. Find an invoice you want to delete (especially one from a BOQ)
3. Click the **Delete** (trash) button
4. Confirm deletion
5. **Success! You'll see a message showing**:
   - ✅ Invoice deleted
   - ✅ BOQ status reversed to Draft (if it came from BOQ)
   - ✅ Inventory movements reversed (if applicable)

6. Go back to BOQs page - status should be back to "Draft"
7. You can now convert the same BOQ to a different invoice if needed!

---

## Examples

### Example 1: Convert BOQ → See Status Change
```
1. BOQs List: BOQ-001 has Status = "Draft"
2. Click "Convert to Invoice"
3. Invoice created successfully
4. Refresh BOQs list
5. BOQ-001 now shows Status = "Converted" ✅
6. Convert button is now disabled
```

### Example 2: Delete Invoice → BOQ Reverts
```
1. BOQs List: BOQ-001 has Status = "Converted" (from Invoice INV-123)
2. Go to Invoices, find INV-123
3. Click Delete
4. Success! Message shows:
   - "Invoice deleted successfully"
   - "BOQ status reversed to draft"
   - "Inventory movements reversed" (if any)
5. Go back to BOQs List
6. BOQ-001 now shows Status = "Draft" ✅
7. Can convert to a different invoice now!
```

### Example 3: Delete Regular Invoice (No BOQ)
```
1. Invoices List: INV-456 (created directly, not from BOQ)
2. Click Delete
3. Success! Message shows:
   - "Invoice deleted successfully"
   - (No BOQ status change - this wasn't from a BOQ)
4. Inventory is still reversed if the invoice had products
```

---

## What's Happening Behind the Scenes?

### When Converting BOQ to Invoice:
```
BOQ Update:
  - status: 'draft' → 'converted'
  - converted_to_invoice_id: null → [invoice_id]
  - converted_at: null → [timestamp]
```

### When Deleting Invoice from BOQ:
```
1. Find BOQ that created this invoice
2. Reverse BOQ:
   - status: 'converted' → 'draft'
   - converted_to_invoice_id: [invoice_id] → null
   - converted_at: [timestamp] → null
3. Find all stock movements for invoice
4. Create reverse movements (OUT → IN, IN → OUT)
5. Update product stock levels
6. Delete invoice
7. Return summary of what was reversed
```

---

## Troubleshooting

### Status Column Not Showing?
- Clear browser cache: **Ctrl+Shift+Delete**
- Refresh page: **F5**

### BOQ Status Didn't Change After Conversion?
- Refresh the page
- Check browser console (F12) for errors
- Verify migration was run in Supabase

### Invoice Won't Delete?
- Check if invoice has related payment records
- Look at browser console for specific error
- Try a different invoice first to isolate the issue

### Inventory Not Restored After Delete?
- Inventory reversal is logged separately
- Check Supabase's `stock_movements` table for reverse entries
- Manual stock adjustment might be needed if reversal failed

---

## FAQ

**Q: Can I still delete a BOQ that's been converted to an invoice?**
A: No, the Delete button is disabled for converted BOQs. Delete the invoice first (which reverses the BOQ status), then you can delete the BOQ.

**Q: What if I delete an invoice, then the BOQ conversion fails?**
A: The invoice still deletes. BOQ and inventory reversals are best-effort - if they fail, the invoice is still removed. You'd need to manually fix the BOQ status.

**Q: Can I convert the same BOQ to multiple invoices?**
A: No. Once converted, the BOQ is marked as "Converted" and linked to that invoice. Delete the invoice first to revert the BOQ status.

**Q: Does this affect invoices NOT created from BOQs?**
A: No. Regular invoices can still be deleted normally. Inventory reversal still happens, but BOQ reversal only applies to invoices that came from BOQs.

**Q: What about invoices created from Quotations or Proformas?**
A: Those work normally. This feature only tracks BOQ → Invoice relationships. Other source types aren't affected.

---

## Support

For detailed implementation info, see: **BOQ_INVOICE_STATUS_IMPLEMENTATION.md**

Questions? Check that file for:
- Complete technical details
- Database schema changes
- Files modified
- Advanced testing scenarios
- Future enhancement ideas

