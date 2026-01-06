# Payment Allocations Table Setup Guide

## Problem
Payments are being recorded successfully, but allocation is failing with:
```
Failed to create allocation: [object Object]
Error: Could not find the table 'public.payment_allocations' in the schema cache
Code: PGRST205
```

## Root Cause
The `payment_allocations` table does not exist in your Supabase database, even though the code expects it to track how payments are allocated to invoices.

## Solution

### Step 1: Copy the SQL Setup Script
Use the SQL script below to create the `payment_allocations` table with proper structure, indexes, and security policies.

### Step 2: Run in Supabase SQL Editor
1. Go to your Supabase Project Dashboard
2. Navigate to **SQL Editor**
3. Click **New Query** or paste in an existing query window
4. Copy and paste the entire SQL script below
5. Click **Run** button

### SQL Script to Execute

```sql
-- Create payment allocations table
-- This table links payments to invoices, tracking how much of each payment is allocated to each invoice

CREATE TABLE IF NOT EXISTS payment_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    amount_allocated DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_payment_allocations_payment_id ON payment_allocations(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_invoice_id ON payment_allocations(invoice_id);

-- Enable Row Level Security
ALTER TABLE payment_allocations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for secure data access
-- Allow users to view allocations for payments they have access to
CREATE POLICY "Users can view payment allocations for their company"
  ON payment_allocations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM payments p
      WHERE p.id = payment_allocations.payment_id
      AND p.company_id = (
        SELECT company_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Allow users to create allocations for payments in their company
CREATE POLICY "Users can create payment allocations for their company"
  ON payment_allocations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM payments p
      WHERE p.id = payment_allocations.payment_id
      AND p.company_id = (
        SELECT company_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Allow users to update allocations for their company
CREATE POLICY "Users can update payment allocations for their company"
  ON payment_allocations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM payments p
      WHERE p.id = payment_allocations.payment_id
      AND p.company_id = (
        SELECT company_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Allow users to delete allocations for their company
CREATE POLICY "Users can delete payment allocations for their company"
  ON payment_allocations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM payments p
      WHERE p.id = payment_allocations.payment_id
      AND p.company_id = (
        SELECT company_id FROM profiles WHERE id = auth.uid()
      )
    )
  );
```

### Step 3: Verify Setup
After running the SQL script, verify the table was created:

```sql
-- Check if table exists and has rows
SELECT 
  COUNT(*) as total_allocations,
  COUNT(DISTINCT payment_id) as unique_payments,
  COUNT(DISTINCT invoice_id) as unique_invoices
FROM payment_allocations;

-- Check table structure
\d payment_allocations
```

Expected results:
- Table created successfully
- Indexes created for `payment_id` and `invoice_id`
- RLS policies enabled and in place
- Query returns 0 rows (since no allocations yet)

### Step 4: Test Payment Recording
1. Go to the Payments page in the app
2. Try recording a new payment
3. Select an invoice to allocate the payment to
4. The allocation should now succeed

## What Gets Fixed
✅ Payments can now be allocated to invoices  
✅ Payment tracking works correctly  
✅ Invoice balance updates properly  
✅ Payment status updates from "recorded" to "allocated"  

## Table Structure
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Unique allocation ID |
| payment_id | UUID | Links to the payments table |
| invoice_id | UUID | Links to the invoices table |
| amount_allocated | DECIMAL(15,2) | How much of the payment is for this invoice |
| created_at | TIMESTAMP | When the allocation was created |

## Security (RLS Policies)
- Users can only see allocations for payments in their own company
- Users can only create allocations for payments they have access to
- Users can only modify allocations they created or that belong to their company

## Migration File
A migration file has been created at: `supabase/migrations/20250206000200_create_payment_allocations_table.sql`

This migration will automatically apply when you deploy to production via Supabase, but for immediate testing, run the SQL script above directly.

## Troubleshooting

### If you see "table already exists" error:
This is fine - the `IF NOT EXISTS` clause prevents duplicate creation. The table was already successfully created.

### If RLS policy creation fails:
The table itself is the critical part. If the table exists, payments can be recorded and allocated. You can manually create the RLS policies later if needed.

### If you still get allocation errors:
1. Verify the table exists: `SELECT * FROM information_schema.tables WHERE table_name = 'payment_allocations';`
2. Check that `payments` and `invoices` tables exist
3. Verify the foreign key references are working
4. Check browser console for detailed error messages

## Support
If you continue to experience issues:
1. Check the Supabase Status page for service outages
2. Verify your authentication token has sufficient permissions
3. Review the browser console for network errors
4. Check Supabase logs for database errors
