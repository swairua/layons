-- ============================================================================
-- Migration: Add status field to BOQs table
-- ============================================================================
-- Adds a status column to track BOQ lifecycle (draft, converted, etc.)

BEGIN TRANSACTION;

-- Add status column with default 'draft'
ALTER TABLE IF EXISTS boqs
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'draft';

-- Add constraint to ensure valid status values
ALTER TABLE IF EXISTS boqs
ADD CONSTRAINT valid_boq_status CHECK (status IN ('draft', 'converted', 'cancelled'));

-- Update existing BOQs:
-- - If converted_to_invoice_id is set, mark as 'converted'
-- - Otherwise mark as 'draft'
UPDATE boqs
SET status = CASE 
  WHEN converted_to_invoice_id IS NOT NULL THEN 'converted'
  ELSE 'draft'
END
WHERE status = 'draft';

-- Create index for faster status filtering
CREATE INDEX IF NOT EXISTS idx_boqs_status ON boqs(status);

COMMIT;

-- Verification
SELECT 
  'BOQ Status Migration' as migration_name,
  COUNT(*) as total_boqs,
  COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_count,
  COUNT(CASE WHEN status = 'converted' THEN 1 END) as converted_count,
  COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_count
FROM boqs;
