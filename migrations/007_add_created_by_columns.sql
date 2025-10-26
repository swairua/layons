-- Add created_by column to quotations if it doesn't exist
ALTER TABLE quotations 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add created_by column to invoices if it doesn't exist
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add created_by column to proforma_invoices if it doesn't exist
ALTER TABLE proforma_invoices 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add created_by column to remittance_advice if it doesn't exist
ALTER TABLE remittance_advice 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add created_by column to credit_notes if it doesn't exist
ALTER TABLE credit_notes 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_quotations_created_by ON quotations(created_by);
CREATE INDEX IF NOT EXISTS idx_invoices_created_by ON invoices(created_by);
CREATE INDEX IF NOT EXISTS idx_proforma_invoices_created_by ON proforma_invoices(created_by);
CREATE INDEX IF NOT EXISTS idx_remittance_advice_created_by ON remittance_advice(created_by);
CREATE INDEX IF NOT EXISTS idx_credit_notes_created_by ON credit_notes(created_by);
