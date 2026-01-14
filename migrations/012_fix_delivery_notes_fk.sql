-- ============================================================================
-- Migration: Fix delivery_notes foreign key constraint
-- ============================================================================
-- Modify the invoice_id foreign key in delivery_notes table to cascade deletes
-- This allows invoices to be deleted without foreign key constraint violations

BEGIN TRANSACTION;

-- Drop the existing foreign key constraint that doesn't allow cascading deletes
-- First, we need to drop it by recreating the table or modifying the constraint

-- Option: Drop and recreate the constraint with ON DELETE CASCADE
ALTER TABLE IF EXISTS delivery_notes
DROP CONSTRAINT IF EXISTS delivery_notes_invoice_id_fkey;

-- Add the constraint back with ON DELETE CASCADE
ALTER TABLE IF EXISTS delivery_notes
ADD CONSTRAINT delivery_notes_invoice_id_fkey 
FOREIGN KEY (invoice_id) 
REFERENCES invoices(id) 
ON DELETE CASCADE;

COMMIT;

-- Verification
SELECT constraint_name, table_name, column_name, referenced_table_name 
FROM information_schema.referential_constraints 
WHERE table_name = 'delivery_notes' 
  AND constraint_name LIKE '%invoice_id%';
