#!/usr/bin/env node
/**
 * Migrate all tables and data from Postgres (DATABASE_URL) to Layons PHP API.
 * - Introspects public schema tables
 * - Creates tables via API (mapped types)
 * - Inserts all rows via API
 */

import { Client } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;
const API_URL = process.env.VITE_LAYONS_API_URL || 'https://erp.layonsconstruction.com/api.php';

if (!DATABASE_URL) {
  console.error('Missing DATABASE_URL');
  process.exit(1);
}

function mapPgToMySqlType(pgType, charMaxLen, numericPrecision, numericScale) {
  const t = String(pgType).toLowerCase();
  if (t.includes('serial')) return 'INT AUTO_INCREMENT';
  if (t === 'bigserial') return 'BIGINT AUTO_INCREMENT';
  if (t === 'integer' || t === 'int4') return 'INT';
  if (t === 'bigint' || t === 'int8') return 'BIGINT';
  if (t.startsWith('character varying') || t === 'varchar') {
    const len = charMaxLen && Number(charMaxLen) > 0 ? Number(charMaxLen) : 255;
    return `VARCHAR(${len})`;
  }
  if (t === 'text') return 'TEXT';
  if (t === 'uuid') return 'CHAR(36)';
  if (t === 'boolean' || t === 'bool') return 'TINYINT(1)';
  if (t.startsWith('timestamp')) return 'DATETIME';
  if (t === 'date') return 'DATE';
  if (t === 'json' || t === 'jsonb') return 'JSON';
  if (t === 'double precision' || t === 'float8') return 'DOUBLE';
  if (t === 'real' || t === 'float4') return 'FLOAT';
  if (t === 'numeric' || t === 'decimal') {
    const p = numericPrecision || 10;
    const s = typeof numericScale === 'number' ? numericScale : 2;
    return `DECIMAL(${p},${s})`;
  }
  if (t === 'bytea') return 'BLOB';
  return 'TEXT';
}

async function api(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const txt = await res.text();
  let json = null;
  try { json = txt ? JSON.parse(txt) : null; } catch { json = { raw: txt }; }
  if (!res.ok) {
    throw new Error(`API ${method} ${url} -> ${res.status} ${txt}`);
  }
  return json;
}

async function run() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  const tablesRes = await client.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
       AND table_name NOT LIKE 'pg_%' AND table_name NOT LIKE 'sql_%'
     ORDER BY table_name`
  );
  const tables = tablesRes.rows.map(r => r.table_name);
  console.log(`Found ${tables.length} tables`);

  for (const table of tables) {
    console.log(`\n=== Migrating table: ${table} ===`);

    const colsRes = await client.query(
      `SELECT c.column_name, c.data_type, c.character_maximum_length, c.numeric_precision, c.numeric_scale,
              c.is_nullable,
              EXISTS (
                SELECT 1 FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu
                  ON tc.constraint_name = kcu.constraint_name
                 AND tc.table_schema = kcu.table_schema
               WHERE tc.table_schema = 'public' AND tc.table_name = c.table_name
                 AND tc.constraint_type = 'PRIMARY KEY' AND kcu.column_name = c.column_name
              ) AS is_primary
         FROM information_schema.columns c
        WHERE c.table_schema = 'public' AND c.table_name = $1
        ORDER BY c.ordinal_position`,
      [table]
    );

    const columns = {};
    for (const col of colsRes.rows) {
      const def = mapPgToMySqlType(
        col.data_type,
        col.character_maximum_length,
        col.numeric_precision,
        col.numeric_scale
      );
      let definition = def;
      if (col.is_primary && !def.toUpperCase().includes('PRIMARY KEY')) {
        // Preserve explicit PK; avoid duplicating PRIMARY KEY if already part of type
        definition = `${def} PRIMARY KEY`;
      }
      columns[col.column_name] = definition;
    }

    try {
      const url = `${API_URL}?table=${encodeURIComponent(table)}`;
      const result = await api('POST', url, { create_table: true, columns });
      console.log('Create table result:', result);
    } catch (e) {
      console.warn('Create table error:', e.message);
    }

    const safeTable = String(table).replace(/[^a-zA-Z0-9_]/g, '');
    const dataRes = await client.query(`SELECT * FROM "${safeTable}"`);
    let inserted = 0;
    for (const row of dataRes.rows) {
      const payload = {};
      for (const [k, v] of Object.entries(row)) {
        if (v === null || v === undefined) continue; // skip nulls to avoid API null-string issues
        if (typeof v === 'object' && v !== null) {
          payload[k] = JSON.stringify(v);
        } else {
          payload[k] = String(v);
        }
      }
      try {
        const insUrl = `${API_URL}?table=${encodeURIComponent(table)}`;
        await api('POST', insUrl, payload);
        inserted++;
      } catch (e) {
        console.error(`Insert failed for table ${table}:`, e.message);
      }
    }
    console.log(`Inserted ${inserted} rows into ${table}`);
  }

  await client.end();
  console.log('\nMigration completed');
}

run().catch((e) => {
  console.error('Migration error:', e);
  process.exit(1);
});
