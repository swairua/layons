import { supabase } from '@/integrations/supabase/client';

const FUNCTIONS_SQL = `
-- Generate quotation number
DROP FUNCTION IF EXISTS generate_quotation_number(UUID);
CREATE OR REPLACE FUNCTION generate_quotation_number(company_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    next_number INTEGER;
    year_part VARCHAR(4);
    month_part VARCHAR(2);
    current_pattern VARCHAR(6);
BEGIN
    year_part := EXTRACT(YEAR FROM CURRENT_DATE)::VARCHAR;
    month_part := LPAD(EXTRACT(MONTH FROM CURRENT_DATE)::VARCHAR, 2, '0');
    current_pattern := month_part || year_part;

    SELECT COALESCE(MAX(CAST(SUBSTRING(quotation_number FROM '^[0-9]{4}') AS INTEGER)), 0) + 1
    INTO next_number
    FROM quotations
    WHERE company_id = company_uuid
    AND quotation_number LIKE '%' || current_pattern;

    RETURN LPAD(next_number::VARCHAR, 4, '0') || current_pattern;
END;
$$ LANGUAGE plpgsql;

-- Generate invoice number
DROP FUNCTION IF EXISTS generate_invoice_number(UUID);
CREATE OR REPLACE FUNCTION generate_invoice_number(company_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    next_number INTEGER;
    year_part VARCHAR(4);
    month_part VARCHAR(2);
    current_pattern VARCHAR(6);
BEGIN
    year_part := EXTRACT(YEAR FROM CURRENT_DATE)::VARCHAR;
    month_part := LPAD(EXTRACT(MONTH FROM CURRENT_DATE)::VARCHAR, 2, '0');
    current_pattern := month_part || year_part;

    SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM '^[0-9]{4}') AS INTEGER)), 0) + 1
    INTO next_number
    FROM invoices
    WHERE company_id = company_uuid
    AND invoice_number LIKE '%' || current_pattern;

    RETURN LPAD(next_number::VARCHAR, 4, '0') || current_pattern;
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

let functionsChecked = false;

export async function ensureDatabaseFunctionsExist() {
  // Only check once per session
  if (functionsChecked) return;
  
  try {
    // Try to call generate_quotation_number with a dummy UUID to check if it exists
    const dummyUUID = '00000000-0000-0000-0000-000000000000';
    const { error } = await supabase.rpc('generate_quotation_number', { 
      company_uuid: dummyUUID 
    });

    if (error?.code === 'PGRST202') {
      // Function doesn't exist, attempt to create it
      console.log('⚠️ Database functions missing. Contacting server to initialize...');
      
      try {
        // Use a POST request to a server endpoint that handles this
        const response = await fetch('/api/init-db-functions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
          console.log('✅ Database functions initialized');
        } else {
          console.warn('⚠️ Could not initialize database functions via API');
        }
      } catch (apiError) {
        console.warn('⚠️ API endpoint for initializing functions not available. Ensure server-side initialization is set up.');
      }
    } else {
      console.log('✅ Database functions already exist');
    }
  } catch (error) {
    console.warn('⚠️ Error checking database functions:', error instanceof Error ? error.message : 'Unknown error');
  } finally {
    functionsChecked = true;
  }
}
