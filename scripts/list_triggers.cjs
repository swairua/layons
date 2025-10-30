const { Client } = require('pg');

(async () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('Missing DATABASE_URL');
    process.exit(1);
  }
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    const tables = ['invoices', 'customers', 'quotations', 'companies'];
    for (const t of tables) {
      const res = await client.query(`
        SELECT tgname, pg_get_triggerdef(t.oid) as definition
        FROM pg_trigger t
        WHERE t.tgrelid = $1::regclass
      `, [t]);
      console.log(`\nTriggers on table ${t}:`);
      if (res.rows.length === 0) console.log('  (none)');
      res.rows.forEach(r => console.log(r.tgname, '\n', r.definition));
    }

    // Also list functions that contain 'company_id' in their source
    const funcs = await client.query(`
      SELECT p.proname, pg_get_functiondef(p.oid) as src
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE pg_get_functiondef(p.oid) ILIKE '%company_id%'
      LIMIT 50;
    `);
    console.log('\nFunctions containing company_id:');
    if (funcs.rows.length === 0) console.log('  (none)');
    funcs.rows.forEach(f => console.log(f.proname, '\n', f.src));

  } catch (err) {
    console.error('Error listing triggers/functions:', err.message || err);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
