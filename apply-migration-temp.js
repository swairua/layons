import { Client } from 'pg';
import fs from 'fs';

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  try {
    await client.connect();
    console.log('✅ Connected to database');
    
    const migrationSql = fs.readFileSync('supabase/migrations/20250205000000_add_unit_of_measure_to_line_items.sql', 'utf8');
    
    await client.query(migrationSql);
    console.log('✅ Migration applied successfully');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
