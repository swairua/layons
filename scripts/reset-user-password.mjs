#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Error: Missing environment variables');
  console.error('Required: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const EMAIL = 'info@construction.com';
const NEW_PASSWORD = 'Password123';

async function updateUserPassword() {
  try {
    console.log(`🔍 Checking user: ${EMAIL}`);

    const { data: users, error: getUserError } = await supabase.auth.admin.listUsers();

    if (getUserError) {
      console.error('❌ Error fetching users:', getUserError.message);
      process.exit(1);
    }

    const user = users.users.find(u => u.email === EMAIL);

    if (!user) {
      console.error(`❌ User not found: ${EMAIL}`);
      console.log('\nAvailable users:');
      users.users.forEach(u => {
        console.log(`  - ${u.email} (${u.id})`);
      });
      process.exit(1);
    }

    console.log(`✅ Found user: ${user.email} (ID: ${user.id})`);
    console.log(`📧 Email confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`);

    console.log(`\n🔑 Updating password to: ${NEW_PASSWORD}`);
    const { data, error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      password: NEW_PASSWORD,
    });

    if (updateError) {
      console.error('❌ Error updating password:', updateError.message);
      process.exit(1);
    }

    console.log('✅ Password updated successfully!');
    console.log(`\n📋 User Details:`);
    console.log(`  Email: ${data.user.email}`);
    console.log(`  ID: ${data.user.id}`);
    console.log(`\n✨ User credentials set:`);
    console.log(`  Email: ${EMAIL}`);
    console.log(`  Password: ${NEW_PASSWORD}`);

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

updateUserPassword();
