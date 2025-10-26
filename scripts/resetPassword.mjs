#!/usr/bin/env node

/**
 * Script to reset password for info@construction.com in Supabase
 * Usage: node scripts/resetPassword.mjs
 */

const SUPABASE_URL = 'https://eubrvlzkvzevidivsfha.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1YnJ2bHprdnpldmlkaXZzZmhhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODA2MDg1OCwiZXhwIjoyMDczNjM2ODU4fQ.6RdhviRFnVsx8Eq4__ovjssfeUQys-MfD2STag0UyeA';
const EMAIL = 'info@construction.com';
const NEW_PASSWORD = 'Password123';

async function resetPassword() {
  try {
    // First, get all users
    console.log('Fetching users from Supabase...');
    const getUsersResponse = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!getUsersResponse.ok) {
      throw new Error(`Failed to fetch users: ${getUsersResponse.statusText}`);
    }

    const users = await getUsersResponse.json();
    const user = users.find(u => u.email === EMAIL);

    if (!user) {
      throw new Error(`User ${EMAIL} not found`);
    }

    console.log(`Found user: ${user.email} (ID: ${user.id})`);

    // Now update the password
    console.log('Resetting password...');
    const updateResponse = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${user.id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        password: NEW_PASSWORD
      })
    });

    if (!updateResponse.ok) {
      const errorData = await updateResponse.text();
      throw new Error(`Failed to reset password: ${updateResponse.statusText} - ${errorData}`);
    }

    const result = await updateResponse.json();
    console.log('✅ Password reset successfully!');
    console.log(`Email: ${EMAIL}`);
    console.log(`New password: ${NEW_PASSWORD}`);
    console.log(`User ID: ${user.id}`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
console.log(`Resetting password for ${EMAIL}...`);
resetPassword();
