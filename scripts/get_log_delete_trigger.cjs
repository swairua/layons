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
    const res = await client.query("SELECT pg_get_functiondef(p.oid) as src FROM pg_proc p WHERE p.proname = 'log_delete_trigger' LIMIT 1");
    if (res.rows.length === 0) {
      console.log('log_delete_trigger not found');
    } else {
      console.log(res.rows[0].src);
    }
  } catch (err) {
    console.error('Error:', err.message || err);
  } finally {
    await client.end();
  }
})();
