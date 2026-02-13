-- Migration: Add terms_and_conditions column to boqs table
-- Purpose: Enable dynamic, editable terms and conditions per BOQ

ALTER TABLE IF EXISTS boqs ADD COLUMN IF NOT EXISTS terms_and_conditions TEXT;

-- Populate existing BOQs with default terms if they don't have any
UPDATE boqs
SET terms_and_conditions = '1. Payment terms - 50% Advance, 40% Upon commencement, 10% Upon completion

2. Validity: This quotation is valid for 7 days from the date of issue

3. Warranty: As per contract terms and conditions

4. Scope of Work: As detailed in the specifications and drawings

5. General: Excludes site supervision, public liability insurance, and other items not mentioned

6. Acceptance of Quote: Acceptance is confirmed when the client signs both copies of this document and returns one copy to us'
WHERE terms_and_conditions IS NULL;

-- Create index for query optimization (using BTREE for TEXT columns)
CREATE INDEX IF NOT EXISTS idx_boqs_terms_and_conditions ON boqs(terms_and_conditions);

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
