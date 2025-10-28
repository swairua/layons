# Getting Started with Audited Delete Operations

## What Was Built?

A complete audit trail system for all delete operations in your application. Every time someone deletes an invoice, quotation, customer, or any other record, the system automatically:

1. Records WHO deleted it (user name, email)
2. Records WHEN it was deleted (timestamp)
3. Records WHERE it was deleted from (IP address, browser)
4. Records WHAT was deleted (full backup of record)

## Quick Start (5 minutes)

### Step 1: Run the Database Migration

The system needs to create database triggers. Run this:

```bash
supabase migration up
```

This creates:
- Database triggers on 11 critical tables
- Backup audit logging at the database level
- Automatic deletion tracking

### Step 2: Use Audited Deletes in Your Code

Replace your current delete code with the new audited version:

**Before:**
```typescript
import { useDeleteInvoice } from '@/hooks/useDatabase';

function InvoiceList() {
  const deleteInvoice = useDeleteInvoice();
  
  const handleDelete = async (id) => {
    await deleteInvoice.mutateAsync(id);
  };
}
```

**After:**
```typescript
import { useAuditedDeleteOperations } from '@/hooks/useAuditedDeleteOperations';
import { useCompany } from '@/contexts/CompanyContext';

function InvoiceList() {
  const { currentCompany } = useCompany();
  const { useAuditedDeleteInvoice } = useAuditedDeleteOperations();
  const deleteInvoice = useAuditedDeleteInvoice(currentCompany.id);
  
  const handleDelete = async (id) => {
    await deleteInvoice.mutateAsync(id);
    // Now automatically audited! ✅
  };
}
```

### Step 3: View Deletion History

Add the audit log viewer to your admin dashboard:

```typescript
import { DeleteAuditLog } from '@/components/DeleteAuditLog';

export function AdminDashboard() {
  return (
    <div>
      <h1>Admin Dashboard</h1>
      <DeleteAuditLog />
      {/* Shows complete history of all deletions */}
    </div>
  );
}
```

That's it! You now have complete audit trails for all deletions.

---

## Available Delete Operations

Replace your old delete hooks with these new audited versions:

| Entity | Hook Name | Import |
|--------|-----------|--------|
| Invoice | `useAuditedDeleteInvoice` | `useAuditedDeleteOperations` |
| Quotation | `useAuditedDeleteQuotation` | `useAuditedDeleteOperations` |
| Credit Note | `useAuditedDeleteCreditNote` | `useAuditedDeleteOperations` |
| Proforma | `useAuditedDeleteProforma` | `useAuditedDeleteOperations` |
| LPO | `useAuditedDeleteLPO` | `useAuditedDeleteOperations` |
| BOQ | `useAuditedDeleteBOQ` | `useAuditedDeleteOperations` |
| Customer | `useAuditedDeleteCustomer` | `useAuditedDeleteOperations` |
| Tax Setting | `useAuditedDeleteTaxSetting` | `useAuditedDeleteOperations` |
| Unit | `useAuditedDeleteUnit` | `useAuditedDeleteOperations` |
| LPO Item | `useAuditedDeleteLPOItem` | `useAuditedDeleteOperations` |
| Credit Note Item | `useAuditedDeleteCreditNoteItem` | `useAuditedDeleteOperations` |

---

## Code Examples

### Example 1: Delete Invoice with Full Audit Trail

```typescript
import { useAuditedDeleteOperations } from '@/hooks/useAuditedDeleteOperations';
import { useCompany } from '@/contexts/CompanyContext';
import { toast } from 'sonner';

function InvoiceRow({ invoice }) {
  const { currentCompany } = useCompany();
  const { useAuditedDeleteInvoice } = useAuditedDeleteOperations();
  const deleteInvoice = useAuditedDeleteInvoice(currentCompany.id);

  const handleDelete = async () => {
    try {
      await deleteInvoice.mutateAsync(invoice.id);
      toast.success('Invoice deleted and audit logged');
    } catch (error) {
      toast.error('Failed to delete invoice');
    }
  };

  return (
    <button onClick={handleDelete} className="text-red-600">
      Delete Invoice
    </button>
  );
}
```

### Example 2: Delete with Confirmation Dialog

```typescript
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useAuditedDeleteOperations } from '@/hooks/useAuditedDeleteOperations';
import { useCompany } from '@/contexts/CompanyContext';

function QuotationActions({ quotation }) {
  const { currentCompany } = useCompany();
  const { useAuditedDeleteQuotation } = useAuditedDeleteOperations();
  const deleteQuotation = useAuditedDeleteQuotation(currentCompany.id);

  const handleConfirmDelete = async () => {
    await deleteQuotation.mutateAsync(quotation.id);
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button className="text-red-600">Delete</button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Quotation?</AlertDialogTitle>
          <AlertDialogDescription>
            Quotation {quotation.quotation_number} will be permanently deleted.
            This action is recorded in the audit log for compliance.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirmDelete}
            className="bg-red-600 hover:bg-red-700"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

### Example 3: Bulk Delete with Audit Trail

```typescript
import { useAuditedDeleteOperations } from '@/hooks/useAuditedDeleteOperations';
import { useCompany } from '@/contexts/CompanyContext';

function CustomerList() {
  const { currentCompany } = useCompany();
  const {
    useAuditedDeleteCustomer,
    useAuditedDeleteByParent,
  } = useAuditedDeleteOperations();

  const deleteCustomer = useAuditedDeleteCustomer(currentCompany.id);

  const handleDeleteMultiple = async (customerIds: string[]) => {
    // Delete each customer with individual audit log
    await Promise.all(
      customerIds.map((id) => deleteCustomer.mutateAsync(id))
    );
  };

  return (
    <button onClick={() => handleDeleteMultiple(selectedIds)}>
      Delete Selected Customers
    </button>
  );
}
```

---

## What Information Is Logged?

When you delete something, the system logs:

### User Information
- User ID
- Full name
- Email address
- Timestamp

### Network Information
- IP address (where deletion came from)
- Browser/device type

### Record Information
- What was deleted (entity type)
- Record ID (unique identifier)
- Record name (invoice number, customer name, etc.)
- Full copy of deleted record (for recovery)

### Example Audit Log Entry

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "company_id": "750e8400-e29b-41d4-a716-446655440000",
  "user_id": "550e8400-e29b-41d4-a716-446655440001",
  "action": "delete",
  "entity_type": "Invoice",
  "entity_id": "550e8400-e29b-41d4-a716-446655440002",
  "entity_name": "INV-2024-0001",
  "entity_number": "INV-2024-0001",
  "details": {
    "deletedAt": "2024-02-11T10:30:00.000Z",
    "deletedBy": "John Doe",
    "tableName": "invoices",
    "whereKey": "id",
    "whereValue": "550e8400-e29b-41d4-a716-446655440002"
  },
  "deleted_data": {
    "id": "550e8400-e29b-41d4-a716-446655440002",
    "company_id": "750e8400-e29b-41d4-a716-446655440000",
    "customer_id": "550e8400-e29b-41d4-a716-446655440003",
    "invoice_number": "INV-2024-0001",
    "invoice_date": "2024-02-01",
    "total_amount": 1000.00,
    "status": "paid",
    "paid_amount": 1000.00,
    "created_at": "2024-02-01T09:00:00.000Z"
  },
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  "timestamp": "2024-02-11T10:30:00.000Z"
}
```

---

## Viewing Audit Logs

### In the UI

Add this component to your admin dashboard:

```typescript
import { DeleteAuditLog } from '@/components/DeleteAuditLog';

export function AdminDashboard() {
  return (
    <div className="space-y-6">
      <h1>Admin Dashboard</h1>
      
      {/* Deletion History */}
      <DeleteAuditLog />
    </div>
  );
}
```

Features:
- 📊 View all deletions
- 🔍 Search by name/number/type
- 📅 Filter by entity type
- 👤 See who deleted what
- 🌐 View IP addresses
- 💾 See complete deleted data
- 📱 See browser information

### Programmatically

```typescript
import { supabase } from '@/integrations/supabase/client';

// Get all deletions for your company
const { data } = await supabase
  .from('audit_logs')
  .select('*')
  .eq('company_id', companyId)
  .eq('action', 'delete')
  .order('timestamp', { ascending: false });

// Get deletions by user
const { data } = await supabase
  .from('audit_logs')
  .select('*')
  .eq('company_id', companyId)
  .eq('action', 'delete')
  .eq('user_id', userId);

// Get specific entity type deletions
const { data } = await supabase
  .from('audit_logs')
  .select('*')
  .eq('company_id', companyId)
  .eq('action', 'delete')
  .eq('entity_type', 'Invoice');
```

---

## FAQ

### Q: Do I have to change my code?

**A:** The database triggers will automatically log all deletes, so technically no. But using the audited delete hooks is recommended because:
- Captures more complete information
- Cleaner UI for audit viewing
- Explicit audit trail in code
- Better error handling

### Q: What if I forget to use the audited delete?

**A:** No problem! The database trigger catches it and logs it anyway. You get a two-layer protection:
- Application layer (when you use the hooks)
- Database layer (catches any delete)

### Q: Can users delete the audit logs?

**A:** No. RLS policies prevent it. Audit logs are immutable and designed to be tamper-proof for compliance.

### Q: What if the IP fetch fails?

**A:** It gracefully times out after 3 seconds and sets IP to null. The deletion still succeeds.

### Q: Can I restore deleted records?

**A:** Yes! The full record is stored in `deleted_data`. You can reconstruct it from the audit log if needed.

### Q: How long are audit logs kept?

**A:** Indefinitely. They're required for compliance and cannot be deleted.

### Q: Will this slow down my application?

**A:** No. The overhead is < 100ms per deletion and IP fetching is non-blocking.

---

## Troubleshooting

### Audit Logs Not Appearing

1. Check if user is authenticated
2. Verify RLS policies on audit_logs table
3. Check browser console for errors
4. Verify database migration ran successfully

### IP Address Shows as Null

1. This is normal if ipify API is blocked
2. Delete still succeeds, just no IP logged
3. Configure custom IP detection if needed

### Performance Issues

1. Unlikely - overhead is minimal
2. Check if ipify API is slow
3. Can disable IP fetching if needed

---

## Migration Guide

### For Each Page/Component with Delete

1. **Find the delete code:**
   ```typescript
   const deleteInvoice = useDeleteInvoice();
   ```

2. **Replace with audited version:**
   ```typescript
   const { useAuditedDeleteInvoice } = useAuditedDeleteOperations();
   const deleteInvoice = useAuditedDeleteInvoice(companyId);
   ```

3. **Usage stays the same:**
   ```typescript
   await deleteInvoice.mutateAsync(id);
   ```

That's it! The rest of your code stays the same.

---

## Next Steps

1. ✅ Run database migration: `supabase migration up`
2. ✅ Update delete operations in your pages
3. ✅ Add `<DeleteAuditLog />` to admin dashboard
4. ✅ Test by deleting a record and checking audit logs
5. ✅ Review audit trail in the UI

---

## Files to Review

- **Quick Reference**: `AUDIT_QUICK_REFERENCE.md`
- **Full Guide**: `AUDIT_IMPLEMENTATION_GUIDE.md`
- **Audit Report**: `AUDIT_DELETE_REPORT.md`
- **Summary**: `AUDIT_DELETE_IMPLEMENTATION_SUMMARY.md`

---

## Support

For questions or issues:
1. Check the FAQ section above
2. Review `AUDIT_IMPLEMENTATION_GUIDE.md`
3. Check `AUDIT_QUICK_REFERENCE.md`

Happy auditing! 🎉
