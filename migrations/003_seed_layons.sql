BEGIN;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM companies WHERE name = 'Layons Construction Ltd') THEN
    INSERT INTO companies (
      name, registration_number, tax_number, email, phone, address, city, state, postal_code, country, currency, fiscal_year_start, created_at, updated_at
    ) VALUES (
      'Layons Construction Ltd', NULL, NULL, 'info@layons.co.ke', '+254700000000', 'Nairobi, Kenya', 'Nairobi', NULL, '00100', 'Kenya', 'KES', 1, NOW(), NOW()
    );
  END IF;
END $$;
COMMIT;
