const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

(async () => {
  const sqlPath = path.resolve(__dirname, '../migrations/001_init.sql');
  if (!fs.existsSync(sqlPath)) {
    console.error('SQL file not found at', sqlPath);
    process.exit(1);
  }
  const sql = fs.readFileSync(sqlPath, 'utf8');

  const connectionString = process.env.DATABASE_URL || process.env.MIGRATE_DATABASE_URL;
  if (!connectionString) {
    console.error('Missing DATABASE_URL environment variable');
    process.exit(1);
  }

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Running migration (this may take a moment)...');
    await client.query(sql);
    console.log('✅ Migration completed successfully');
  } catch (err) {
    console.error('❌ Migration failed:', err.message || err);
    process.exitCode = 1;
  } finally {
    try { await client.end(); } catch {}
  }
})();
