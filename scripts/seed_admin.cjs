const { Client } = require('pg');

(async () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('Missing DATABASE_URL');
    process.exit(1);
  }
  const email = 'info@construction.com';
  const password = 'Medplus#2025!';
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query("CREATE EXTENSION IF NOT EXISTS pgcrypto;");
    const { rows } = await client.query('SELECT id FROM auth.users WHERE email = $1', [email]);
    let userId;
    if (rows.length === 0) {
      const insertUser = `
        INSERT INTO auth.users (
          id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, role, aud,
          confirmation_token, recovery_token, email_change_token_new, email_change
        ) VALUES (
          gen_random_uuid(), '00000000-0000-0000-0000-000000000000', $1,
          crypt($2, gen_salt('bf')),
          NOW(), NOW(), NOW(), 'authenticated', 'authenticated', '', '', '', ''
        ) RETURNING id;`;
      const ins = await client.query(insertUser, [email, password]);
      userId = ins.rows[0].id;
    } else {
      userId = rows[0].id;
    }

    await client.query(
      `INSERT INTO public.profiles (id, email, full_name, role, status, department, position, created_at, updated_at)
       VALUES ($1, $2, 'System Administrator', 'admin', 'active', 'Administration', 'System Administrator', NOW(), NOW())
       ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, role = 'admin', status = 'active', updated_at = NOW();`,
      [userId, email]
    );

    await client.query('COMMIT');
    console.log('Seeded/ensured admin user:', email, 'id:', userId);
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(e);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
