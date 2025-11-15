const { Client } = require('pg');

(async () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('Missing DATABASE_URL');
    process.exit(1);
  }

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    await client.query('BEGIN');

    // Ensure uuid_generate_v4 exists
    await client.query("CREATE EXTENSION IF NOT EXISTS pgcrypto;");

    // Find a company id if exists
    const { rows: companies } = await client.query('SELECT id, name FROM companies LIMIT 1');
    const companyId = companies.length ? companies[0].id : null;

    // Find or create a sample profile (admin) to be the creator
    const email = 'info@construction.com';
    const { rows: users } = await client.query('SELECT id FROM auth.users WHERE email = $1', [email]);
    let userId;
    if (users.length === 0) {
      // insert a placeholder auth user row to link profile - we won't set password here
      const ins = await client.query("INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, role, aud, confirmation_token, recovery_token, email_change_token_new, email_change) VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', $1, '', NOW(), NOW(), NOW(), 'authenticated', 'authenticated', '', '', '', '') RETURNING id", [email]);
      userId = ins.rows[0].id;
    } else {
      userId = users[0].id;
    }

    // Upsert profile for user
    await client.query(
      `INSERT INTO public.profiles (id, email, full_name, role, status, department, position, created_at, updated_at)
       VALUES ($1, $2, 'System Administrator', 'admin', 'active', 'Administration', 'System Administrator', NOW(), NOW())
       ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, role = 'admin', status = 'active', updated_at = NOW();`,
      [userId, email]
    );

    // Check if sample BOQ exists
    const sampleNumber = 'BOQ-SAMPLE-001';
    const { rows: existing } = await client.query('SELECT id FROM boqs WHERE number = $1 LIMIT 1', [sampleNumber]);
    if (existing.length === 0) {
      const data = {
        number: sampleNumber,
        date: new Date().toISOString().split('T')[0],
        client: { name: 'Sample Client', email: 'client@example.com', phone: '+254700000000', address: 'Nairobi, Kenya' },
        contractor: 'Sample Contractor',
        project_title: 'Sample Project',
        sections: [
          { title: 'General Works', items: [ { description: 'Excavation', quantity: 10, unit: 'm3', rate: 1500 } ] }
        ],
        notes: 'This is a seeded sample BOQ.'
      };

      await client.query(
        `INSERT INTO boqs (company_id, number, boq_date, client_name, client_email, client_phone, client_address, client_city, client_country, contractor, project_title, currency, subtotal, tax_amount, total_amount, data, created_by, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW(), NOW())`,
        [
          companyId,
          sampleNumber,
          data.date,
          data.client.name,
          data.client.email,
          data.client.phone,
          data.client.address,
          null,
          null,
          data.contractor,
          data.project_title,
          'KES',
          15000.00,
          0.00,
          15000.00,
          JSON.stringify(data),
          userId
        ]
      );

      console.log('Inserted sample BOQ:', sampleNumber);
    } else {
      console.log('Sample BOQ already exists:', sampleNumber);
    }

    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Failed to seed sample BOQ:', e);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
