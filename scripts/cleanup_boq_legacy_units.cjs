const { Client } = require('pg');

(async () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('Missing DATABASE_URL');
    process.exit(1);
  }

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    await client.query('BEGIN');

    const { rows: boqs } = await client.query('SELECT id, data FROM boqs');
    for (const b of boqs) {
      let changed = false;
      const data = b.data || {};
      if (!data.sections || !Array.isArray(data.sections)) continue;

      for (const sec of data.sections) {
        if (!sec.items || !Array.isArray(sec.items)) continue;
        for (const item of sec.items) {
          // Only remove legacy fields if unit_id exists
          if (item.unit_id && (item.unit || item.unit_name)) {
            delete item.unit;
            delete item.unit_name;
            changed = true;
          }
        }
      }

      if (changed) {
        await client.query('UPDATE boqs SET data = $1, updated_at = NOW() WHERE id = $2', [data, b.id]);
        console.log('Cleaned BOQ', b.id);
      }
    }

    await client.query('COMMIT');
    console.log('Legacy unit cleanup completed');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Cleanup failed', err);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
