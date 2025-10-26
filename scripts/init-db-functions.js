const { Client } = require('pg');

const DOCUMENT_NUMBER_FUNCTIONS = `
-- Generate quotation number
DROP FUNCTION IF EXISTS generate_quotation_number(UUID);
CREATE OR REPLACE FUNCTION generate_quotation_number(company_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    next_number INTEGER;
    year_part VARCHAR(4);
BEGIN
    year_part := EXTRACT(YEAR FROM CURRENT_DATE)::VARCHAR;
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(quotation_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
    INTO next_number
    FROM quotations 
    WHERE company_id = company_uuid 
    AND quotation_number LIKE 'QT-' || year_part || '-%';
    
    RETURN 'QT-' || year_part || '-' || LPAD(next_number::VARCHAR, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- Generate invoice number
DROP FUNCTION IF EXISTS generate_invoice_number(UUID);
CREATE OR REPLACE FUNCTION generate_invoice_number(company_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    next_number INTEGER;
    year_part VARCHAR(4);
BEGIN
    year_part := EXTRACT(YEAR FROM CURRENT_DATE)::VARCHAR;
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
    INTO next_number
    FROM invoices 
    WHERE company_id = company_uuid 
    AND invoice_number LIKE 'INV-' || year_part || '-%';
    
    RETURN 'INV-' || year_part || '-' || LPAD(next_number::VARCHAR, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- Generate remittance number
DROP FUNCTION IF EXISTS generate_remittance_number(UUID);
CREATE OR REPLACE FUNCTION generate_remittance_number(company_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    next_number INTEGER;
    year_part VARCHAR(4);
BEGIN
    year_part := EXTRACT(YEAR FROM CURRENT_DATE)::VARCHAR;
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(remittance_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
    INTO next_number
    FROM remittances 
    WHERE company_id = company_uuid 
    AND remittance_number LIKE 'REM-' || year_part || '-%';
    
    RETURN 'REM-' || year_part || '-' || LPAD(next_number::VARCHAR, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- Generate proforma number
DROP FUNCTION IF EXISTS generate_proforma_number(UUID);
CREATE OR REPLACE FUNCTION generate_proforma_number(company_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    next_number INTEGER;
    year_part VARCHAR(4);
BEGIN
    year_part := EXTRACT(YEAR FROM CURRENT_DATE)::VARCHAR;
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(proforma_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
    INTO next_number
    FROM proformas 
    WHERE company_id = company_uuid 
    AND proforma_number LIKE 'PF-' || year_part || '-%';
    
    RETURN 'PF-' || year_part || '-' || LPAD(next_number::VARCHAR, 3, '0');
END;
$$ LANGUAGE plpgsql;
`;

async function initializeFunctions() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('❌ DATABASE_URL environment variable not set');
    process.exit(1);
  }

  const client = new Client({ 
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');
    
    await client.query(DOCUMENT_NUMBER_FUNCTIONS);
    console.log('✅ Database functions initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing database functions:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

initializeFunctions();
