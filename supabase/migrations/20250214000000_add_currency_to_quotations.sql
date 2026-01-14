-- Add currency column to quotations table if it doesn't exist
ALTER TABLE quotations
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'KES';

-- Add comment explaining the column
COMMENT ON COLUMN quotations.currency IS 'Currency code: KES, USD, EUR, GBP, etc.';
