# Audit UI - Quick Setup Guide

## What You Got

**5 New Components & 1 New Page:**

1. **AuditDashboard** - Statistics & charts (399 lines)
2. **AuditTrailViewer** - All events viewer (389 lines)
3. **DeleteAuditLog** - Deletion history (330 lines)
4. **AuditManagement** - Integrated panel (132 lines)
5. **AuditLogs Page** - Admin page (54 lines)

Plus: 2 migrations (audit_logs table + triggers)

---

## Step 1: Run Database Migrations

```bash
# Apply the audit_logs table and indexes
supabase migration up
```

This creates:
- `audit_logs` table
- RLS policies
- Indexes for performance
- Database triggers

---

## Step 2: Add Route to Your Router

In your router configuration (e.g., `src/App.tsx`):

```typescript
import { AuditLogs } from '@/pages/AuditLogs';

const routes = [
  // ... your existing routes ...
  
  {
    path: '/admin/audit-logs',
    element: <AuditLogs />,
    requiresAuth: true,
  },
];
```

---

## Step 3: Add Navigation Link

In your navigation menu (e.g., `src/components/Layout/Sidebar.tsx` or `Header.tsx`):

```typescript
import { Link } from 'react-router-dom';

export function Navigation() {
  return (
    <nav>
      {/* Existing nav items */}
      
      {/* Add this link */}
      <Link 
        to="/admin/audit-logs"
        className="flex items-center gap-2 px-4 py-2 rounded hover:bg-slate-100"
      >
        📊 Audit Logs
      </Link>
    </nav>
  );
}
```

---

## Step 4: Use in Your Admin Dashboard (Optional)

If you want to embed the components:

```typescript
import { AuditManagement } from '@/components/AuditManagement';

export function AdminDashboard() {
  return (
    <div className="space-y-6">
      <h1>Admin Dashboard</h1>
      
      {/* All audit components in one place */}
      <AuditManagement />
    </div>
  );
}
```

Or use individual components:

```typescript
import { AuditDashboard } from '@/components/AuditDashboard';
import { AuditTrailViewer } from '@/components/AuditTrailViewer';
import { DeleteAuditLog } from '@/components/DeleteAuditLog';

export function AdminDashboard() {
  return (
    <div className="space-y-6">
      <AuditDashboard />
      <AuditTrailViewer />
      <DeleteAuditLog />
    </div>
  );
}
```

---

## Component Locations

```
src/
├── components/
│   ├── AuditDashboard.tsx (statistics & charts)
│   ├── AuditTrailViewer.tsx (all events viewer)
│   ├── DeleteAuditLog.tsx (deletion history)
│   ├── AuditManagement.tsx (integrated panel)
│   └── ... (other components)
├── pages/
│   ├── AuditLogs.tsx (admin page)
│   └── ... (other pages)
```

---

## What Each Component Does

### AuditDashboard
```
Shows:
- Total actions count
- Deletes/Creates/Updates/Restores breakdown
- Daily activity chart
- Top entity types
- Top users
- Recent activity

Time ranges: 7, 30, 90 days
```

### AuditTrailViewer
```
Shows:
- All audit events (create, update, delete, restore)
- Search by name/number/type/user
- Filter by action or entity type
- Sort ascending/descending
- Detailed event modal with all data

Displays:
- User info
- IP address
- Browser info
- Complete record data
```

### DeleteAuditLog
```
Shows:
- Deletion events only
- Search by name/number/type
- Filter by entity type
- Deleted record backup
- User who deleted
- IP address
- Browser info
- Deleted data for recovery
```

### AuditManagement
```
Three tabs:
1. Dashboard - Statistics & charts
2. Audit Trail - All events
3. Deletions - Deletion history

Plus:
- Info alerts
- About section
```

---

## Access Control

Only users with these roles can view:
- `admin`
- `super_admin`

Non-admin users see:
```
❌ "You don't have permission to access audit logs"
```

---

## Data Being Tracked

Each audit entry captures:

```
Who:
- User ID
- User name
- User email

What:
- Entity type
- Entity ID
- Entity name
- Entity number
- Full record (for deletions)

When:
- Timestamp
- Date created

Where:
- IP address
- Browser/user agent

Why:
- Action (delete/create/update/restore)
- Details (custom context)
```

---

## Search & Filter Examples

### Find all invoice deletions
1. Go to Audit Trail tab
2. Filter Action: "delete"
3. Filter Entity Type: "Invoice"

### Find what a user did
1. Go to Audit Trail tab
2. Search for user name
3. See all their actions

### Recover deleted data
1. Go to Deletions tab
2. Search for deleted item name
3. Click "View"
4. See full record in modal

### Analyze deletion patterns
1. Go to Dashboard
2. View "Activity Over Time" chart
3. See daily deletions trend

---

## Customization

### Change Time Range
Default: 30 days

Edit in `AuditDashboard.tsx`:
```typescript
const [timeRange, setTimeRange] = useState<'7' | '30' | '90'>('30');
```

### Change Colors
Edit in `AuditTrailViewer.tsx`:
```typescript
const ACTION_COLORS: Record<string, string> = {
  delete: 'destructive', // red
  create: 'success',     // green
  update: 'secondary',   // gray
  restore: 'default',    // blue
};
```

### Change Record Limit
Edit in `AuditTrailViewer.tsx`:
```typescript
.limit(1000)  // Change this number
```

---

## Required Dependencies

All required packages are already installed:

- `@tanstack/react-query` - Data fetching
- `recharts` - Charts
- `date-fns` - Date formatting
- `lucide-react` - Icons
- `tailwindcss` - Styling

---

## Performance Notes

- Queries limited to 1000 records (adjustable)
- User data cached via React Query
- Database indexes on all filter columns
- Memoized calculations
- Responsive charts

For large datasets:
1. Implement pagination
2. Archive old logs quarterly
3. Use date range filters

---

## Testing

### Test Data Creation

Delete a record through the app:
```typescript
const { useAuditedDeleteInvoice } = useAuditedDeleteOperations();
const deleteInvoice = useAuditedDeleteInvoice(companyId);
await deleteInvoice.mutateAsync(invoiceId);
// Automatically creates audit log
```

### View in Audit Logs

1. Navigate to `/admin/audit-logs`
2. Should see your deletion in:
   - Dashboard (action counts)
   - Audit Trail (all events)
   - Deletions (deletion history)

---

## Compliance Features

✅ **GDPR**
- Full record backup in deleted_data
- User tracking
- Timestamp tracking

✅ **SOX**
- Complete audit trail
- User/IP/timestamp
- Immutable records

✅ **HIPAA**
- Detailed deletion tracking
- Access logs
- Recovery capability

---

## Troubleshooting

### Components show no data
```
1. Check user has admin role
2. Verify company_id is set
3. Check audit_logs table exists
4. Verify migrations ran
```

### Missing user names
```
1. Check profiles table populated
2. Verify user_id references valid
3. Check profile.company_id set
4. Refetch profiles data
```

### Charts not rendering
```
1. Check Recharts is installed
2. Check data is being returned
3. Check container has height
4. Check browser console for errors
```

---

## Full Example

Complete admin dashboard integration:

```typescript
// pages/AdminDashboard.tsx
import { useAuth } from '@/contexts/AuthContext';
import { AuditManagement } from '@/components/AuditManagement';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function AdminDashboard() {
  const { profile } = useAuth();

  if (profile?.role !== 'admin' && profile?.role !== 'super_admin') {
    return (
      <Alert className="text-red-600">
        <AlertDescription>Admin access required</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>
      
      {/* All audit components in tabs */}
      <AuditManagement />
    </div>
  );
}
```

---

## Next Steps

1. ✅ Run migrations
2. ✅ Add route `/admin/audit-logs`
3. ✅ Add navigation link
4. ✅ Test by deleting a record
5. ✅ View in audit logs UI

**You're ready to go!** 🎉

---

## Files Reference

| File | Lines | Purpose |
|------|-------|---------|
| `src/components/AuditDashboard.tsx` | 399 | Statistics & charts |
| `src/components/AuditTrailViewer.tsx` | 389 | All events viewer |
| `src/components/DeleteAuditLog.tsx` | 330 | Deletion history |
| `src/components/AuditManagement.tsx` | 132 | Integrated panel |
| `src/pages/AuditLogs.tsx` | 54 | Admin page |
| `supabase/migrations/20250202000000_create_audit_logs.sql` | - | Audit table |
| `supabase/migrations/20250211000000_add_delete_triggers.sql` | - | Delete triggers |

---

## Support

For detailed information, see:
- `AUDIT_UI_COMPONENTS_GUIDE.md` - Detailed component docs
- `AUDIT_IMPLEMENTATION_GUIDE.md` - Implementation details
- `AUDIT_DELETE_GETTING_STARTED.md` - Getting started guide
