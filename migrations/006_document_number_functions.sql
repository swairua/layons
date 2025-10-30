-- Generate quotation number (shared counter with invoices, format: XXXXMMYYYY)
DROP FUNCTION IF EXISTS generate_quotation_number(UUID);
CREATE OR REPLACE FUNCTION generate_quotation_number(company_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    next_number INTEGER;
    year_part VARCHAR(4);
    month_part VARCHAR(2);
BEGIN
    year_part := EXTRACT(YEAR FROM CURRENT_DATE)::VARCHAR;
    month_part := LPAD(EXTRACT(MONTH FROM CURRENT_DATE)::VARCHAR, 2, '0');

    SELECT COALESCE(MAX(CAST(SUBSTRING(quotation_number FROM '^[0-9]{4}') AS INTEGER)), 0) + 1
    INTO next_number
    FROM (
        SELECT quotation_number FROM quotations WHERE company_id = company_uuid
        UNION ALL
        SELECT invoice_number FROM invoices WHERE company_id = company_uuid
    ) AS all_docs;

    RETURN LPAD(next_number::VARCHAR, 4, '0') || month_part || year_part;
END;
$$ LANGUAGE plpgsql;

-- Generate invoice number (shared counter with quotations, format: XXXXMMYYYY)
DROP FUNCTION IF EXISTS generate_invoice_number(UUID);
CREATE OR REPLACE FUNCTION generate_invoice_number(company_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    next_number INTEGER;
    year_part VARCHAR(4);
    month_part VARCHAR(2);
BEGIN
    year_part := EXTRACT(YEAR FROM CURRENT_DATE)::VARCHAR;
    month_part := LPAD(EXTRACT(MONTH FROM CURRENT_DATE)::VARCHAR, 2, '0');

    SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM '^[0-9]{4}') AS INTEGER)), 0) + 1
    INTO next_number
    FROM (
        SELECT invoice_number FROM invoices WHERE company_id = company_uuid
        UNION ALL
        SELECT quotation_number FROM quotations WHERE company_id = company_uuid
    ) AS all_docs;

    RETURN LPAD(next_number::VARCHAR, 4, '0') || month_part || year_part;
END;
$$ LANGUAGE plpgsql;

-- Generate remittance number
DROP FUNCTION IF EXISTS generate_remittance_number(UUID);
CREATE OR REPLACE FUNCTION generate_remittance_number(company_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    next_number INTEGER;
    year_part VARCHAR(4);
    month_part VARCHAR(2);
BEGIN
    year_part := EXTRACT(YEAR FROM CURRENT_DATE)::VARCHAR;
    month_part := LPAD(EXTRACT(MONTH FROM CURRENT_DATE)::VARCHAR, 2, '0');

    SELECT COALESCE(MAX(CAST(SUBSTRING(remittance_number FROM '^[0-9]{4}') AS INTEGER)), 0) + 1
    INTO next_number
    FROM remittances 
    WHERE company_id = company_uuid;

    RETURN LPAD(next_number::VARCHAR, 4, '0') || month_part || year_part;
END;
$$ LANGUAGE plpgsql;

-- Generate proforma number
DROP FUNCTION IF EXISTS generate_proforma_number(UUID);
CREATE OR REPLACE FUNCTION generate_proforma_number(company_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    next_number INTEGER;
    year_part VARCHAR(4);
    month_part VARCHAR(2);
BEGIN
    year_part := EXTRACT(YEAR FROM CURRENT_DATE)::VARCHAR;
    month_part := LPAD(EXTRACT(MONTH FROM CURRENT_DATE)::VARCHAR, 2, '0');

    SELECT COALESCE(MAX(CAST(SUBSTRING(proforma_number FROM '^[0-9]{4}') AS INTEGER)), 0) + 1
    INTO next_number
    FROM proformas 
    WHERE company_id = company_uuid;

    RETURN LPAD(next_number::VARCHAR, 4, '0') || month_part || year_part;
END;
$$ LANGUAGE plpgsql;
