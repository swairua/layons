-- Add header_image and stamp_image columns to companies table for PDF customization
-- header_image: displayed at the top of generated PDFs
-- stamp_image: displayed as a watermark/stamp in PDFs

ALTER TABLE companies
ADD COLUMN IF NOT EXISTS header_image TEXT,
ADD COLUMN IF NOT EXISTS stamp_image TEXT;

-- Add comments to document the field purposes
COMMENT ON COLUMN companies.header_image IS 'Full-width header image URL or base64 data displayed at the top of generated PDFs';
COMMENT ON COLUMN companies.stamp_image IS 'Stamp/watermark image URL or base64 data displayed in generated PDFs';
