const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function applyMigrations() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('❌ DATABASE_URL not set');
    process.exit(1);
  }

  const client = new Client({ 
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');
    
    const files = fs.readdirSync('migrations')
      .filter(f => f.endsWith('.sql'))
      .sort();
    
    for (const file of files) {
      const sql = fs.readFileSync(path.join('migrations', file), 'utf8');
      try {
        await client.query(sql);
        console.log('✅ Applied', file);
      } catch (err) {
        if (err.message.includes('already exists') || err.message.includes('duplicate')) {
          console.log('⏭️  Skipped', file, '(already applied)');
        } else {
          console.error('❌ Error applying', file, ':', err.message);
        }
      }
    }
  } finally {
    await client.end();
  }
}

applyMigrations();
