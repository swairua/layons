-- Add tax columns to quotation_items table if they don't exist
ALTER TABLE quotation_items
ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS section_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS section_labor_cost DECIMAL(15,2) DEFAULT 0;

-- Add comments explaining the columns
COMMENT ON COLUMN quotation_items.tax_percentage IS 'Tax percentage for this line item';
COMMENT ON COLUMN quotation_items.tax_amount IS 'Calculated tax amount for this line item';
COMMENT ON COLUMN quotation_items.tax_inclusive IS 'Whether tax is included in the unit price';
COMMENT ON COLUMN quotation_items.section_name IS 'Section/category name for grouping items';
COMMENT ON COLUMN quotation_items.section_labor_cost IS 'Labor cost for the section containing this item';
