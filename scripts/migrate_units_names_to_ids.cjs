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

    // Load all companies
    const { rows: companies } = await client.query('SELECT id FROM companies');

    for (const comp of companies) {
      const companyId = comp.id;

      // Load units for company
      const { rows: units } = await client.query('SELECT id, name, abbreviation FROM units WHERE company_id = $1', [companyId]);

      // Load BOQs for company
      const { rows: boqs } = await client.query('SELECT id, data FROM boqs WHERE company_id = $1', [companyId]);

      for (const b of boqs) {
        let changed = false;
        const data = b.data || {};
        if (!data.sections || !Array.isArray(data.sections)) continue;

        for (const sec of data.sections) {
          if (!sec.items || !Array.isArray(sec.items)) continue;
          for (const item of sec.items) {
            // If already has unit_id, skip
            if (item.unit_id) continue;

            const unitName = item.unit_name || item.unit;
            if (!unitName) continue;

            // Try to find unit by name (case-insensitive) or abbreviation
            let match = units.find(u => u.name && u.name.toLowerCase() === unitName.toLowerCase());
            if (!match) match = units.find(u => u.abbreviation && u.abbreviation.toLowerCase() === unitName.toLowerCase());

            if (match) {
              item.unit_id = match.id;
              item.unit_name = match.name;
              item.unit_abbreviation = match.abbreviation || null;
              changed = true;
            } else {
              // Create new unit for this company
              const abbrev = unitName.length <= 6 ? unitName : unitName.substring(0,3).toUpperCase();
              const res = await client.query(`INSERT INTO units (company_id, name, abbreviation, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW()) RETURNING id, name, abbreviation`, [companyId, unitName, abbrev]);
              const newUnit = res.rows[0];
              item.unit_id = newUnit.id;
              item.unit_name = newUnit.name;
              item.unit_abbreviation = newUnit.abbreviation || null;
              changed = true;

              // also push to units array to avoid duplicate inserts
              units.push({ id: newUnit.id, name: newUnit.name, abbreviation: newUnit.abbreviation });
            }
          }
        }

        if (changed) {
          await client.query('UPDATE boqs SET data = $1, updated_at = NOW() WHERE id = $2', [data, b.id]);
          console.log('Updated BOQ', b.id);
        }
      }
    }

    await client.query('COMMIT');
    console.log('Unit migration completed');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed', err);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
