import { supabase } from '@/integrations/supabase/client';

const DOCUMENT_NUMBER_FUNCTIONS = {
  generate_quotation_number: `
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
  `,
  
  generate_invoice_number: `
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
  `,
  
  generate_remittance_number: `
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
  `,
  
  generate_proforma_number: `
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
  `,
};

export async function initializeDatabaseFunctions() {
  try {
    // Check if the functions exist by trying to call them
    const { error: quotationError } = await supabase.rpc('generate_quotation_number', { 
      company_uuid: '00000000-0000-0000-0000-000000000000' 
    });

    if (quotationError && quotationError.code === 'PGRST202') {
      console.log('🔧 Database functions missing. Creating them now...');
      
      // Create all functions
      for (const [functionName, functionSql] of Object.entries(DOCUMENT_NUMBER_FUNCTIONS)) {
        const { error } = await supabase.rpc('exec', { sql: functionSql });
        if (error) {
          console.warn(`⚠️ Could not create ${functionName}:`, error.message);
        } else {
          console.log(`✅ Created ${functionName}`);
        }
      }
    } else {
      console.log('✅ Database functions already exist');
    }
  } catch (error) {
    console.error('�� Error initializing database functions:', error);
    // Don't throw - this is not critical, app can still function
  }
}
