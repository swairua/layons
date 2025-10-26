#!/usr/bin/env node

/**
 * Script to reset password for info@construction.com in Supabase
 * Usage: node scripts/resetPassword.js
 */

const https = require('https');

const SUPABASE_URL = 'https://eubrvlzkvzevidivsfha.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1YnJ2bHprdnpldmlkaXZzZmhhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODA2MDg1OCwiZXhwIjoyMDczNjM2ODU4fQ.6RdhviRFnVsx8Eq4__ovjssfeUQys-MfD2STag0UyeA';
const EMAIL = 'info@construction.com';
const NEW_PASSWORD = 'Password123';

function resetPassword() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'eubrvlzkvzevidivsfha.supabase.co',
      port: 443,
      path: '/auth/v1/admin/users',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      }
    };

    // First, get the user by email
    const getReq = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const users = JSON.parse(data);
          const user = users.find(u => u.email === EMAIL);

          if (!user) {
            reject(new Error(`User ${EMAIL} not found`));
            return;
          }

          // Now update the password
          updateUserPassword(user.id, resolve, reject);
        } catch (error) {
          reject(new Error(`Failed to parse users response: ${error.message}`));
        }
      });
    });

    getReq.on('error', (error) => {
      reject(error);
    });

    getReq.end();
  });
}

function updateUserPassword(userId, resolve, reject) {
  const updateOptions = {
    hostname: 'eubrvlzkvzevidivsfha.supabase.co',
    port: 443,
    path: `/auth/v1/admin/users/${userId}`,
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json'
    }
  };

  const body = JSON.stringify({
    password: NEW_PASSWORD
  });

  const updateReq = https.request(updateOptions, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      if (res.statusCode === 200) {
        resolve({
          success: true,
          message: `Password reset successfully for ${EMAIL}`,
          userId: userId
        });
      } else {
        reject(new Error(`Failed to reset password. Status: ${res.statusCode}, Response: ${data}`));
      }
    });
  });

  updateReq.on('error', (error) => {
    reject(error);
  });

  updateReq.write(body);
  updateReq.end();
}

// Run the script
console.log(`Resetting password for ${EMAIL}...`);
resetPassword()
  .then((result) => {
    console.log('✅ Success:', result.message);
    console.log(`User ID: ${result.userId}`);
    console.log(`New password: ${NEW_PASSWORD}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
