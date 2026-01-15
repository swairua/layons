-- Add due_date column to BOQs table
-- This allows BOQs to have a specific due date, similar to invoices

ALTER TABLE boqs ADD COLUMN IF NOT EXISTS due_date DATE;

-- Set default due_date to 30 days from boq_date for existing records
UPDATE boqs SET due_date = boq_date + INTERVAL '30 days' WHERE due_date IS NULL;

-- Create index for due_date for faster filtering
CREATE INDEX IF NOT EXISTS idx_boqs_due_date ON boqs(due_date);
