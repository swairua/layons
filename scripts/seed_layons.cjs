const { Client } = require('pg');

(async () => {
  const connectionString = process.env.DATABASE_URL || process.env.MIGRATE_DATABASE_URL;
  if (!connectionString) {
    console.error('Missing DATABASE_URL');
    process.exit(1);
  }
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const insertSql = `
    INSERT INTO companies (
      name, registration_number, tax_number, email, phone, address, city, state, postal_code, country, currency, fiscal_year_start, created_at, updated_at
    )
    SELECT $1::varchar, NULL, NULL, $2::varchar, $3::varchar, $4::text, $5::varchar, NULL, $6::varchar, $7::varchar, $8::varchar, 1, NOW(), NOW()
    WHERE NOT EXISTS (SELECT 1 FROM companies WHERE name = $1::varchar);
  `;
  const params = [
    'Layons Construction Ltd',
    'info@layons.co.ke',
    '+254700000000',
    'Nairobi, Kenya',
    'Nairobi',
    '00100',
    'Kenya',
    'KES'
  ];
  await client.query('BEGIN');
  await client.query(insertSql, params);
  const { rows } = await client.query('SELECT id, name FROM companies WHERE name = $1', ['Layons Construction Ltd']);
  await client.query('COMMIT');
  console.log('Seed result:', rows);
  await client.end();
})().catch(async (e) => { try { console.error(e); } finally { process.exit(1); } });
