# Audited Delete Operations - Implementation Guide

## Overview

This guide explains how to implement audited delete operations across the codebase. The system provides:

- ✅ Centralized delete utility with automatic audit logging
- ✅ Audited delete hooks for all major entities
- ✅ Database-level triggers for backup logging
- ✅ Audit log viewing UI component
- ✅ Complete deletion history with user, IP, and browser tracking

## Files Created

### 1. Core Utilities
- **`src/utils/auditedDelete.ts`** - Centralized delete functions
  - `performAuditedDelete()` - Delete single record with audit
  - `performAuditedDeleteMultiple()` - Delete multiple records with audit
  - Helper functions for IP and user agent collection

### 2. Hooks
- **`src/hooks/useAuditedDeleteOperations.ts`** - React hooks for audited deletes
  - Provides audited delete mutations for all entity types
  - Automatically fetches data for audit purposes
  - Integrates with React Query for cache invalidation

### 3. UI Components
- **`src/components/DeleteAuditLog.tsx`** - Audit log viewer
  - Display deletion history
  - Search and filter by entity type
  - View full deletion details with deleted data
  - User and IP tracking visualization

### 4. Database
- **`supabase/migrations/20250211000000_add_delete_triggers.sql`**
  - Creates `log_delete_trigger()` function
  - Adds triggers to critical tables
  - Provides database-level backup logging

## How to Use

### Option 1: Using Audited Delete Hooks (Recommended)

```typescript
import { useAuditedDeleteOperations } from '@/hooks/useAuditedDeleteOperations';
import { useCompany } from '@/contexts/CompanyContext';

export function MyComponent() {
  const { currentCompany } = useCompany();
  const { useAuditedDeleteInvoice } = useAuditedDeleteOperations();
  
  const deleteInvoice = useAuditedDeleteInvoice(currentCompany.id);

  const handleDelete = async (invoiceId: string) => {
    try {
      await deleteInvoice.mutateAsync(invoiceId);
      toast.success('Invoice deleted and audit logged');
    } catch (error) {
      toast.error('Failed to delete invoice');
    }
  };

  return (
    <button onClick={() => handleDelete(invoiceId)}>
      Delete Invoice
    </button>
  );
}
```

### Option 2: Using Centralized Delete Utility

```typescript
import { performAuditedDelete, getClientIp, getUserAgent } from '@/utils/auditedDelete';
import { useAuth } from '@/contexts/AuthContext';

export async function deleteCustomer(
  customerId: string,
  companyId: string,
  customerName: string
) {
  const { profile } = useAuth();
  const ipAddress = await getClientIp();
  const userAgent = getUserAgent();

  const result = await performAuditedDelete(
    'customers',
    'id',
    customerId,
    {
      entityType: 'Customer',
      entityId: customerId,
      entityName: customerName,
    },
    {
      companyId,
      userId: profile.id,
      userFullName: profile.full_name,
      userEmail: profile.email,
      ipAddress,
      userAgent,
    }
  );

  if (!result.success) {
    throw result.error;
  }
}
```

### Option 3: Direct Database Trigger (Automatic)

No code changes needed! The database triggers automatically log all deletes:

```typescript
// Old way - still works, but now also logs to audit_logs
await supabase
  .from('invoices')
  .delete()
  .eq('id', invoiceId);

// This delete is NOW automatically logged by the database trigger
```

## Migration Steps

### Step 1: Apply Database Migration

```bash
# The migration file is at:
# supabase/migrations/20250211000000_add_delete_triggers.sql

# Apply using Supabase CLI:
supabase migration up
```

### Step 2: Update Components to Use Audited Deletes

For each delete operation in your code:

**Before:**
```typescript
const deleteInvoice = useMutation({
  mutationFn: async (id: string) => {
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['invoices'] });
  },
});
```

**After (Option 1 - Using Hook):**
```typescript
const { useAuditedDeleteInvoice } = useAuditedDeleteOperations();
const deleteInvoice = useAuditedDeleteInvoice(companyId);

// Usage remains the same:
// deleteInvoice.mutateAsync(invoiceId);
```

**After (Option 2 - Using Utility):**
```typescript
const result = await performAuditedDelete(
  'invoices',
  'id',
  invoiceId,
  {
    entityType: 'Invoice',
    entityId: invoiceId,
    entityName: invoice.invoice_number,
    entityNumber: invoice.invoice_number,
    deletedData: invoice,
  },
  {
    companyId,
    userId: profile.id,
    userFullName: profile.full_name,
    userEmail: profile.email,
    ipAddress: await getClientIp(),
    userAgent: getUserAgent(),
  }
);
```

### Step 3: Add Audit Log Viewer to Admin Dashboard

```typescript
import { DeleteAuditLog } from '@/components/DeleteAuditLog';

export function AdminDashboard() {
  return (
    <div>
      <h1>Admin Dashboard</h1>
      <DeleteAuditLog />
    </div>
  );
}
```

## Audit Log Structure

Each deletion creates an audit log entry:

```json
{
  "id": "UUID",
  "company_id": "UUID",
  "user_id": "UUID of deleting user",
  "action": "delete",
  "entity_type": "Invoice",
  "entity_id": "UUID of deleted record",
  "entity_name": "Invoice #INV-2024-001",
  "entity_number": "INV-2024-001",
  "details": {
    "deletedAt": "2024-02-11T10:30:00Z",
    "deletedBy": "John Doe",
    "tableName": "invoices",
    "whereKey": "id",
    "whereValue": "record-uuid",
    "databaseTrigger": false
  },
  "deleted_data": {
    "id": "record-uuid",
    "company_id": "company-uuid",
    "invoice_number": "INV-2024-001",
    "customer_id": "customer-uuid",
    "total_amount": 1000.00,
    ...full_record_data
  },
  "ip_address": "192.168.1.1",
  "user_agent": "Mozilla/5.0...",
  "timestamp": "2024-02-11T10:30:00Z"
}
```

## Entities with Audited Deletes

The following entities now have complete audit trails:

### Critical Financial Records (Highest Priority)
- ✅ Invoices - `useAuditedDeleteInvoice()`
- ✅ Quotations - `useAuditedDeleteQuotation()`
- ✅ Credit Notes - `useAuditedDeleteCreditNote()`
- ✅ Proforma Invoices - `useAuditedDeleteProforma()`
- ✅ LPOs - `useAuditedDeleteLPO()`

### Important Documents (High Priority)
- ✅ BOQs - `useAuditedDeleteBOQ()`
- ✅ Customers - `useAuditedDeleteCustomer()`

### Operational Data (Medium Priority)
- ✅ LPO Items - `useAuditedDeleteLPOItem()`
- ✅ Credit Note Items - `useAuditedDeleteCreditNoteItem()`

### Reference Data (Low Priority)
- ✅ Tax Settings - `useAuditedDeleteTaxSetting()`
- ✅ Units - `useAuditedDeleteUnit()`

## Features

### 1. User Tracking
- Records the ID, name, and email of the user who performed the deletion
- Distinguishes between application-logged deletes and database trigger-logged deletes

### 2. IP Address Logging
- Captures the user's IP address at the time of deletion
- Helps with security audits and fraud detection
- Uses ipify API (configurable, with fallback to null)

### 3. Browser Tracking
- Logs the user agent string for browser/device identification
- Useful for detecting suspicious deletion patterns

### 4. Complete Record Backup
- Stores the full deleted record in `deleted_data` JSONB field
- Allows data recovery if needed
- Useful for compliance and dispute resolution

### 5. Cascade Delete Tracking
- When deleting a parent record with many child records:
  - Parent delete is logged individually
  - Each child delete is logged separately with cascade context
  - Parent ID is tracked for relationship reconstruction

### 6. Error Handling
- Deletion proceeds even if audit logging fails
- Graceful degradation - audit failure doesn't block the delete
- Errors are logged to console for debugging

## Database Triggers

The migration creates triggers on these tables:

- `customers` → logs to audit_logs
- `invoices` → logs to audit_logs
- `quotations` → logs to audit_logs
- `credit_notes` → logs to audit_logs
- `proforma_invoices` → logs to audit_logs
- `lpos` → logs to audit_logs
- `boqs` → logs to audit_logs
- `tax_settings` → logs to audit_logs
- `credit_note_items` → logs to audit_logs
- `lpo_items` → logs to audit_logs
- `proforma_items` → logs to audit_logs

**Security:** Triggers use `SECURITY DEFINER` to bypass RLS and always record the deletion.

## Querying Audit Logs

### Get all deletions for a company
```typescript
const { data } = await supabase
  .from('audit_logs')
  .select('*')
  .eq('company_id', companyId)
  .eq('action', 'delete');
```

### Get deletions by entity type
```typescript
const { data } = await supabase
  .from('audit_logs')
  .select('*')
  .eq('company_id', companyId)
  .eq('action', 'delete')
  .eq('entity_type', 'Invoice');
```

### Get deletions by user
```typescript
const { data } = await supabase
  .from('audit_logs')
  .select('*')
  .eq('company_id', companyId)
  .eq('action', 'delete')
  .eq('user_id', userId);
```

### Get deletions in a date range
```typescript
const { data } = await supabase
  .from('audit_logs')
  .select('*')
  .eq('company_id', companyId)
  .eq('action', 'delete')
  .gte('timestamp', startDate)
  .lte('timestamp', endDate);
```

## Best Practices

### 1. Always Provide Entity Information
```typescript
// Good ✅
await performAuditedDelete(
  'invoices',
  'id',
  invoiceId,
  {
    entityType: 'Invoice',
    entityId: invoiceId,
    entityName: 'INV-2024-001',  // Include readable name
    entityNumber: 'INV-2024-001', // Include document number
    deletedData: completeInvoiceRecord,
  },
  options
);

// Avoid ❌
await performAuditedDelete(
  'invoices',
  'id',
  invoiceId,
  {
    entityType: 'Invoice',
    entityId: invoiceId,
    // Missing entityName and entityNumber makes audit logs hard to read
  },
  options
);
```

### 2. Fetch Data Before Deletion
```typescript
// Good ✅
const { data: invoice } = await supabase
  .from('invoices')
  .select('*')
  .eq('id', invoiceId)
  .single();

const result = await performAuditedDelete(
  'invoices',
  'id',
  invoiceId,
  {
    entityType: 'Invoice',
    entityId: invoiceId,
    entityName: invoice.invoice_number,
    deletedData: invoice,  // Store full record
  },
  options
);

// Avoid ❌
// Deleting without storing the record data makes recovery impossible
```

### 3. Handle Cascade Deletes
```typescript
// When deleting a parent record with items:
const items = await supabase
  .from('invoice_items')
  .select('id')
  .eq('invoice_id', invoiceId);

// Log parent delete
await performAuditedDelete(
  'invoices',
  'id',
  invoiceId,
  { entityType: 'Invoice', entityId: invoiceId, ... },
  options
);

// Log item deletes
await performAuditedDeleteMultiple(
  'invoice_items',
  'invoice_id',
  invoiceId,
  {
    entityType: 'InvoiceItem',
    entityIds: items.map(i => i.id),
  },
  options
);
```

### 4. Use Hooks in React Components
```typescript
// Recommended ✅
function InvoiceList() {
  const { useAuditedDeleteInvoice } = useAuditedDeleteOperations();
  const deleteInvoice = useAuditedDeleteInvoice(companyId);

  const handleDelete = async (id) => {
    await deleteInvoice.mutateAsync(id);
    // Automatic cache invalidation via React Query
  };
}

// Also works, but more verbose ❌
function InvoiceList() {
  const { profile } = useAuth();
  const ipAddress = await getClientIp();
  // ... manual implementation ...
}
```

## Compliance & Legal

### Data Retention
- Audit logs are retained indefinitely
- Compliance requirement: Cannot delete audit logs
- RLS prevents users from seeing other company's deletes

### Regulatory Alignment
- GDPR: Full record backup allows proving data was properly deleted
- SOX: User tracking and IP logging for compliance audits
- HIPAA: Complete audit trail for healthcare systems

### Access Control
- Users can only view deletes for their company
- Row Level Security (RLS) enforces company isolation
- Only authenticated users can insert/view audit logs

## Troubleshooting

### Issue: Audit logs not appearing
**Solution:**
1. Check RLS policies on audit_logs table
2. Verify user has permission to insert
3. Check browser console for errors
4. Verify database triggers are created: `SELECT * FROM information_schema.triggers WHERE event_object_table IN (...)`

### Issue: Performance degradation after adding triggers
**Solution:**
1. Triggers are minimal overhead (simple inserts)
2. Audit_logs table has indexes on all filter columns
3. Consider archiving old logs quarterly
4. Monitor with: `SELECT COUNT(*) FROM audit_logs WHERE timestamp < NOW() - INTERVAL '1 year'`

### Issue: IP address showing as null
**Solution:**
1. ipify API might be blocked or slow
2. Uses 3-second timeout, falls back to null gracefully
3. Can implement custom IP detection if needed

## Testing

```typescript
// Test basic delete audit
async function testDeleteAudit() {
  const { useAuditedDeleteInvoice } = useAuditedDeleteOperations();
  const deleteInvoice = useAuditedDeleteInvoice(testCompanyId);

  const invoiceId = 'test-id';
  await deleteInvoice.mutateAsync(invoiceId);

  // Verify audit log was created
  const { data: logs } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('entity_id', invoiceId)
    .eq('action', 'delete');

  assert(logs.length === 1, 'Audit log should be created');
  assert(logs[0].ip_address !== null, 'IP should be logged');
  assert(logs[0].user_agent !== null, 'User agent should be logged');
}
```

## Summary

The complete audit delete system provides:
- ✅ Centralized utility for consistent audit logging
- ✅ Hooks for easy React integration
- ✅ Database triggers for backup logging
- ✅ Complete deletion history viewing
- ✅ User, IP, and browser tracking
- ✅ Full record backup for recovery
- ✅ Compliance-ready implementation

Start using `useAuditedDeleteOperations()` hooks in your components for a production-ready audit trail system!
