const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

(async () => {
  const migrationsDir = path.resolve(__dirname, '../migrations');
  if (!fs.existsSync(migrationsDir)) {
    console.error('Migrations directory not found at', migrationsDir);
    process.exit(1);
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('No migration files found.');
    process.exit(0);
  }

  const connectionString = process.env.DATABASE_URL || process.env.MIGRATE_DATABASE_URL;
  if (!connectionString) {
    console.error('Missing DATABASE_URL environment variable');
    process.exit(1);
  }

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    console.log('Connected to database. Applying migrations:', files.join(', '));

    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      console.log('Applying', filePath);
      const sql = fs.readFileSync(filePath, 'utf8');
      try {
        await client.query(sql);
        console.log('Applied', file);
      } catch (err) {
        console.error('Failed to apply', file, err.message || err);
        throw err;
      }
    }

    console.log('✅ All migrations applied successfully');
  } catch (err) {
    console.error('❌ Migration process failed:', err.message || err);
    process.exitCode = 1;
  } finally {
    try { await client.end(); } catch (e) {}
  }
})();
