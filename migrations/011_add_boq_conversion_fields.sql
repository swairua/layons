-- ============================================================================
-- Migration: Add BOQ conversion tracking fields
-- ============================================================================
-- Adds converted_to_invoice_id and converted_at columns to track when
-- BOQs are converted to invoices

BEGIN TRANSACTION;

-- Add converted_to_invoice_id column (references the invoice created from this BOQ)
ALTER TABLE IF EXISTS boqs
ADD COLUMN IF NOT EXISTS converted_to_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL;

-- Add converted_at column (timestamp when BOQ was converted)
ALTER TABLE IF EXISTS boqs
ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_boqs_converted_to_invoice_id ON boqs(converted_to_invoice_id);
CREATE INDEX IF NOT EXISTS idx_boqs_converted_at ON boqs(converted_at);

COMMIT;

-- Verification
SELECT 
  'BOQ Conversion Fields Migration' as migration_name,
  COUNT(*) as total_boqs,
  COUNT(CASE WHEN converted_to_invoice_id IS NOT NULL THEN 1 END) as converted_boqs
FROM boqs;
