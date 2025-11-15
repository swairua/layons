#!/usr/bin/env node

/**
 * Script to reset password for info@construction.com using PostgreSQL
 * Usage: node scripts/resetPasswordSQL.mjs
 */

import crypto from 'crypto';

const DB_HOST = 'db.eubrvlzkvzevidivsfha.supabase.co';
const DB_PORT = 5432;
const DB_USER = 'postgres';
const DB_PASSWORD = 'Sirgeorge.12';
const DB_NAME = 'postgres';
const EMAIL = 'info@construction.com';
const NEW_PASSWORD = 'Password123';

// Function to generate bcrypt-like hash (simplified)
// For production, should use bcryptjs package
function simpleHashPassword(password) {
  const hash = crypto.createHash('sha256').update(password).digest('hex');
  return hash;
}

async function resetPassword() {
  try {
    console.log('Connecting to PostgreSQL database...');
    
    // Dynamically import pg module if available
    let pg;
    try {
      pg = await import('pg');
    } catch (e) {
      console.log('Installing pg module...');
      const { exec } = await import('child_process');
      exec('npm install pg', (error) => {
        if (error) {
          console.error('Failed to install pg module:', error);
          process.exit(1);
        }
      });
      return;
    }

    const Client = pg.default.Client;
    const client = new Client({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME
    });

    await client.connect();
    console.log('✅ Connected to database');

    // Find the user
    console.log(`Finding user ${EMAIL}...`);
    const userResult = await client.query(
      'SELECT id, email FROM auth.users WHERE email = $1',
      [EMAIL]
    );

    if (userResult.rows.length === 0) {
      throw new Error(`User ${EMAIL} not found`);
    }

    const user = userResult.rows[0];
    console.log(`✅ Found user: ${user.email} (ID: ${user.id})`);

    // Update password using pgcrypto
    console.log('Updating password...');
    const updateResult = await client.query(
      `UPDATE auth.users 
       SET encrypted_password = crypt($1, gen_salt('bf')), 
           updated_at = NOW()
       WHERE id = $2
       RETURNING id, email`,
      [NEW_PASSWORD, user.id]
    );

    if (updateResult.rows.length === 0) {
      throw new Error('Failed to update password');
    }

    console.log('✅ Password reset successfully!');
    console.log(`Email: ${EMAIL}`);
    console.log(`New password: ${NEW_PASSWORD}`);
    console.log(`User ID: ${user.id}`);

    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

console.log(`Resetting password for ${EMAIL}...`);
resetPassword();
