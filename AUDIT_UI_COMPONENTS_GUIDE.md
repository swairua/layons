# Audit UI Components - Complete Guide

## Overview

Four comprehensive audit UI components have been created to provide complete visibility into system activities:

1. **AuditDashboard** - Statistics and charts
2. **AuditTrailViewer** - All audit events (create, update, delete, restore)
3. **DeleteAuditLog** - Deletion-specific history
4. **AuditManagement** - Integrated audit panel
5. **AuditLogs Page** - Complete admin page

---

## Components

### 1. AuditDashboard
**File**: `src/components/AuditDashboard.tsx` (399 lines)

**Purpose**: Real-time statistics and visualization of system activity

**Features**:
- Key metrics (total actions, deletions, creations, updates, restores)
- Daily activity chart (stacked bar chart)
- Action distribution pie chart
- Top 10 most active entity types
- Top 10 most active users
- Recent activity summary
- Configurable time range (7, 30, 90 days)

**Usage**:
```typescript
import { AuditDashboard } from '@/components/AuditDashboard';

export function AdminPanel() {
  return <AuditDashboard />;
}
```

**What It Shows**:
- 📊 Activity trends over time
- 📈 Entity type breakdown
- 👥 User activity levels
- 🎯 Action distribution (pie chart)

---

### 2. AuditTrailViewer
**File**: `src/components/AuditTrailViewer.tsx` (389 lines)

**Purpose**: Complete audit trail for all actions (create, update, delete, restore)

**Features**:
- Display all audit events
- Search by name, number, type, or user
- Filter by action type (delete, create, update, restore)
- Filter by entity type
- Sort by date (ascending/descending)
- View detailed information modal
- IP address tracking
- User agent/browser information
- Complete record data viewing

**Usage**:
```typescript
import { AuditTrailViewer } from '@/components/AuditTrailViewer';

export function AuditPage() {
  return <AuditTrailViewer />;
}
```

**What It Shows**:
- ✨ All create events
- ✏️ All update events
- 🗑️ All delete events
- ↩️ All restore events
- 🔍 Searchable and filterable
- 📱 User and IP tracking

---

### 3. DeleteAuditLog
**File**: `src/components/DeleteAuditLog.tsx` (330 lines)

**Purpose**: Focused deletion history with full record backup

**Features**:
- Display deletion events only
- Search by name, number, or type
- Filter by entity type
- View deleted record data for recovery
- IP address and user agent tracking
- Deleted user information
- Timestamp precision

**Usage**:
```typescript
import { DeleteAuditLog } from '@/components/DeleteAuditLog';

export function DeletionHistory() {
  return <DeleteAuditLog />;
}
```

**What It Shows**:
- 🗑️ All deletions
- 📋 Complete deleted record data
- 👤 Who deleted what
- ⏰ When deletions occurred
- 🌐 Where deletions came from (IP)

---

### 4. AuditManagement
**File**: `src/components/AuditManagement.tsx` (132 lines)

**Purpose**: Integrated audit management panel with all components

**Features**:
- Three tabbed sections (Dashboard, Audit Trail, Deletions)
- Compliance information alert
- About audit logs section
- Integrated access to all audit components
- Security and retention information

**Usage**:
```typescript
import { AuditManagement } from '@/components/AuditManagement';

export function AdminDashboard() {
  return <AuditManagement />;
}
```

**Tabs**:
1. **Dashboard** - Statistics and charts
2. **Audit Trail** - All events viewer
3. **Deletions** - Deletion history

---

### 5. AuditLogs Page
**File**: `src/pages/AuditLogs.tsx` (54 lines)

**Purpose**: Complete audit logs admin page with permission checking

**Features**:
- Admin-only access (admin/super_admin roles)
- Permission checking with access denial message
- Integrated AuditManagement component
- Layout wrapper for consistent styling

**Usage in Router**:
```typescript
import { AuditLogs } from '@/pages/AuditLogs';

const routes = [
  // ... other routes
  {
    path: '/admin/audit-logs',
    element: <AuditLogs />,
    requiresAuth: true,
  },
];
```

**Access Control**:
- Only users with `admin` or `super_admin` role can view
- Non-admins see permission denied message

---

## How to Integrate

### Step 1: Add to Admin Dashboard

```typescript
import { AuditManagement } from '@/components/AuditManagement';

export function AdminDashboard() {
  return (
    <div>
      <h1>Admin Dashboard</h1>
      <AuditManagement /> {/* All audit components in tabs */}
    </div>
  );
}
```

### Step 2: Add Route

```typescript
import { AuditLogs } from '@/pages/AuditLogs';

// In your router configuration:
{
  path: '/admin/audit-logs',
  element: <AuditLogs />,
  requiresAuth: true,
}
```

### Step 3: Add Navigation Link

```typescript
// In your navigation menu:
import { Link } from 'react-router-dom';

<nav>
  <Link to="/admin/audit-logs">
    📊 Audit Logs
  </Link>
</nav>
```

---

## Data Structure

All components work with the `audit_logs` table structure:

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL,
  user_id UUID NOT NULL,
  action VARCHAR(50) CHECK (action IN ('delete', 'create', 'update', 'restore')),
  entity_type VARCHAR(100),
  entity_id UUID NOT NULL,
  entity_name VARCHAR(255),
  entity_number VARCHAR(100),
  details JSONB,
  deleted_data JSONB,
  timestamp TIMESTAMP,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP
);
```

---

## Features Summary

### 📊 Dashboard (AuditDashboard)
- Total actions count
- Breakdown by action type (delete, create, update, restore)
- Daily activity trends (14-day chart)
- Entity type distribution
- User activity levels
- Recent activity list
- Percentage calculations
- Time range selector (7/30/90 days)

### 👁️ Audit Trail (AuditTrailViewer)
- Search across all fields
- Multi-filter capability
- Sort options
- Detailed event view
- User information
- Network information (IP, user agent)
- Record data display
- JSONB data visualization

### 🗑️ Deletions (DeleteAuditLog)
- Deletion-focused view
- Entity type filters
- Complete record backup
- Recovery information
- User tracking
- Network tracking
- Timestamp precision

### 🛠️ Management (AuditManagement)
- Integrated tabbed interface
- Compliance information
- Role-based access
- User-friendly organization
- Help and information

---

## Permissions & Security

### Access Control
- Components check for admin/super_admin role
- RLS policies enforce company isolation
- Audit logs are read-only

### Data Protection
- Users only see their company's data
- IP addresses captured for forensics
- User agent for device identification
- Complete record backup for recovery

### Compliance
- GDPR compliant (full record backup)
- SOX compliant (user/IP/timestamp tracking)
- HIPAA ready (detailed audit trail)
- Immutable records (no delete/update policies)

---

## Styling

All components use Tailwind CSS with shadcn/ui components:

- Cards, Badges, Buttons
- Tables, Dialogs, Tabs
- Select dropdowns, Input fields
- Responsive grid layouts
- Charts via Recharts library

---

## Chart Libraries

Components use **Recharts** for visualization:

- BarChart (daily activity, entity types, user activity)
- PieChart (action distribution)
- Responsive containers for mobile/desktop

---

## Time Series Data

Dashboard automatically generates daily activity data:

```typescript
const dailyData = [
  { date: 'Jan 01', delete: 5, create: 10, update: 3, restore: 1 },
  { date: 'Jan 02', delete: 3, create: 8, update: 5, restore: 0 },
  // ...
];
```

---

## Search & Filter Performance

Components optimize queries:

- Filter before rendering (1000 record limit in queries)
- Indexed database columns
- User data cached via React Query
- Memoized calculations

---

## Example Use Cases

### Monitor Deletions
Use **DeleteAuditLog** tab to:
- Track what users are deleting
- Review deleted data for recovery
- Identify deletion patterns
- Ensure compliance with deletion policies

### Activity Tracking
Use **AuditDashboard** to:
- Understand daily usage patterns
- Identify power users
- Track creation vs. deletion ratios
- Monitor system activity trends

### Compliance Audits
Use **AuditTrailViewer** to:
- Generate audit reports
- Track specific user actions
- Verify data protection compliance
- Identify suspicious patterns

### Incident Investigation
Use **All Tabs** to:
- Track who did what and when
- Review network information (IP)
- Understand sequence of events
- Recover deleted data

---

## Troubleshooting

### Components Not Showing Data
1. Verify user has admin role
2. Check company_id is set
3. Verify audit_logs table exists
4. Check RLS policies are correct

### Missing User Names
1. Verify profiles table is populated
2. Check profile.company_id is set
3. Ensure user_id references are valid

### Performance Issues
1. Check database indexes exist
2. Limit time range to smaller windows
3. Archive old audit logs quarterly
4. Monitor audit_logs table size

---

## Future Enhancements

Potential additions:

- [ ] Export audit logs to CSV/PDF
- [ ] Email alerts for critical deletions
- [ ] Restore deleted records UI
- [ ] Advanced filtering (date ranges, custom)
- [ ] Audit log archival/retention policies
- [ ] Real-time notifications
- [ ] Custom audit event types
- [ ] Bulk operations history

---

## Summary

The audit UI system provides:

✅ **Comprehensive Visibility** - See all actions in real-time
✅ **Easy Navigation** - Tabbed interface for different views
✅ **Analytics** - Dashboard with charts and statistics
✅ **Compliance** - Track user actions for regulatory requirements
✅ **Recovery** - Full record backup for data recovery
✅ **Security** - Role-based access and tamper-proof logs
✅ **Performance** - Optimized queries and caching

Start with the **AuditManagement** component to get all features in one place!
