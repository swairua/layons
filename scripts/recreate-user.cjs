#!/usr/bin/env node

const { Client } = require('pg');

(async () => {
  // Use the PostgreSQL connection string provided by user
  const connectionString = 'postgresql://postgres:Sirgeorge.12@db.eubrvlzkvzevidivsfha.supabase.co:5432/postgres';
  
  if (!connectionString) {
    console.error('Missing DATABASE_URL or connection string');
    process.exit(1);
  }

  const email = 'info@construction.com';
  const password = 'Password123';
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    await client.query('BEGIN');
    await client.query("CREATE EXTENSION IF NOT EXISTS pgcrypto;");

    const { rows: userRows } = await client.query('SELECT id FROM auth.users WHERE email = $1', [email]);
    let userId;

    if (userRows.length === 0) {
      console.log(`📝 Creating new user: ${email}`);
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
      console.log(`✅ User created with ID: ${userId}`);
    } else {
      userId = userRows[0].id;
      console.log(`👤 User exists with ID: ${userId}`);
      console.log(`🔑 Updating password...`);
      
      // Update the existing user's password
      await client.query(
        `UPDATE auth.users SET encrypted_password = crypt($1, gen_salt('bf')), updated_at = NOW() WHERE id = $2`,
        [password, userId]
      );
      console.log(`✅ Password updated`);
    }

    // Ensure profile exists
    await client.query(
      `INSERT INTO public.profiles (id, email, full_name, role, status, department, position, created_at, updated_at)
       VALUES ($1, $2, 'Construction Admin', 'admin', 'active', 'Administration', 'Administrator', NOW(), NOW())
       ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, role = 'admin', status = 'active', updated_at = NOW();`,
      [userId, email]
    );
    console.log(`✅ Profile ensured`);

    await client.query('COMMIT');
    console.log('\n✨ User recreation complete!');
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Password: ${password}`);
    console.log(`👤 User ID: ${userId}`);

  } catch (e) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', e.message);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
