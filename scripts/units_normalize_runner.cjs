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

    const { rows: companies } = await client.query('SELECT id FROM companies');
    for (const comp of companies) {
      const companyId = comp.id;
      const { rows: units } = await client.query('SELECT id, name, abbreviation FROM units WHERE company_id = $1', [companyId]);
      const { rows: boqs } = await client.query('SELECT id, data FROM boqs WHERE company_id = $1', [companyId]);

      for (const b of boqs) {
        let changed = false;
        const data = b.data || {};
        if (!data.sections || !Array.isArray(data.sections)) continue;

        for (const sec of data.sections) {
          if (!sec.items || !Array.isArray(sec.items)) continue;
          for (const item of sec.items) {
            if (!item.unit_abbreviation) {
              if (item.unit_id) {
                const u = units.find(u => u.id === item.unit_id);
                if (u) { item.unit_abbreviation = u.abbreviation || u.name; item.unit_name = u.name; changed = true; }
              } else if (item.unit_name) {
                const u = units.find(u => u.name && u.name.toLowerCase() === item.unit_name.toLowerCase());
                if (u) { item.unit_id = u.id; item.unit_abbreviation = u.abbreviation || u.name; changed = true; }
              } else if (item.unit) {
                const u = units.find(u => (u.name && u.name.toLowerCase() === item.unit.toLowerCase()) || (u.abbreviation && u.abbreviation.toLowerCase() === item.unit.toLowerCase()));
                if (u) { item.unit_id = u.id; item.unit_abbreviation = u.abbreviation || u.name; item.unit_name = u.name; changed = true; }
              }
            }
          }
        }

        if (changed) {
          await client.query('UPDATE boqs SET data = $1, updated_at = NOW() WHERE id = $2', [data, b.id]);
          console.log('Normalized BOQ', b.id);
        }
      }
    }

    await client.query('COMMIT');
    console.log('Units normalization runner completed');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Normalization runner failed', err);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
