const { Client } = require('pg');

(async () => {
  const connectionString = process.env.DATABASE_URL || process.env.MIGRATE_DATABASE_URL;
  if (!connectionString) {
    console.error('Missing DATABASE_URL');
    process.exit(1);
  }
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const sql = `
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
  CREATE EXTENSION IF NOT EXISTS pgcrypto;

  CREATE TABLE IF NOT EXISTS fixed_boq_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    section TEXT,
    item_code TEXT,
    description TEXT NOT NULL,
    unit TEXT DEFAULT 'Item',
    default_qty NUMERIC,
    default_rate NUMERIC,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  DO $$ BEGIN
    ALTER TABLE fixed_boq_items ADD COLUMN IF NOT EXISTS section TEXT;
    ALTER TABLE fixed_boq_items ADD COLUMN IF NOT EXISTS item_code TEXT;
    ALTER TABLE fixed_boq_items ADD COLUMN IF NOT EXISTS default_qty NUMERIC;
    ALTER TABLE fixed_boq_items ADD COLUMN IF NOT EXISTS default_rate NUMERIC;
    ALTER TABLE fixed_boq_items ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
  EXCEPTION WHEN others THEN NULL; END $$;

  CREATE INDEX IF NOT EXISTS idx_fixed_boq_items_company ON fixed_boq_items(company_id);
  `;

  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('✅ fixed_boq_items table prepared.');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('❌ prepare_fixed_boq failed:', e?.message || e);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
