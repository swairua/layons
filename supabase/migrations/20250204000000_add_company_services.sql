-- Add company_services field to companies table for storing company services/description text
-- This text will appear in quotation and invoice PDFs

ALTER TABLE companies
ADD COLUMN IF NOT EXISTS company_services TEXT;

-- Add comment to document the field purpose
COMMENT ON COLUMN companies.company_services IS 'Services/description text that appears in quotation and invoice PDFs';
