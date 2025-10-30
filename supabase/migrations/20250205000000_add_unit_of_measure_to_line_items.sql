-- Add unit_of_measure column to quotation_items
ALTER TABLE quotation_items
ADD COLUMN IF NOT EXISTS unit_of_measure VARCHAR(50);

-- Add unit_of_measure column to invoice_items
ALTER TABLE invoice_items
ADD COLUMN IF NOT EXISTS unit_of_measure VARCHAR(50);

-- Add unit_of_measure column to proforma_invoice_items (if exists)
ALTER TABLE IF EXISTS proforma_invoice_items
ADD COLUMN IF NOT EXISTS unit_of_measure VARCHAR(50);

-- Add unit_of_measure column to delivery_note_items (if exists)
ALTER TABLE IF EXISTS delivery_note_items
ADD COLUMN IF NOT EXISTS unit_of_measure VARCHAR(50);

-- Add unit_of_measure column to credit_note_items (if exists)
ALTER TABLE IF EXISTS credit_note_items
ADD COLUMN IF NOT EXISTS unit_of_measure VARCHAR(50);
