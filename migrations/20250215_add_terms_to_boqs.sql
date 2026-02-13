-- Migration: Add terms_and_conditions column to boqs table
-- Purpose: Enable dynamic, editable terms and conditions per BOQ

ALTER TABLE IF EXISTS boqs ADD COLUMN IF NOT EXISTS terms_and_conditions TEXT;

-- Create index for query optimization (using BTREE for TEXT columns)
CREATE INDEX IF NOT EXISTS idx_boqs_terms_and_conditions ON boqs(terms_and_conditions);

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
