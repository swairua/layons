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
    const { rows: boqs } = await client.query('SELECT id, number, data FROM boqs');
    let total = boqs.length;
    let withLegacy = 0;
    let missingAbbrev = 0;
    const legacyList = [];
    const missingList = [];

    for (const b of boqs) {
      const data = b.data || {};
      let hasLegacy = false;
      let hasMissingAbbrev = false;
      if (!data.sections || !Array.isArray(data.sections)) continue;
      for (const sec of data.sections) {
        if (!sec.items || !Array.isArray(sec.items)) continue;
        for (const it of sec.items) {
          if (it.unit || it.unit_name) hasLegacy = true;
          if (!it.unit_abbreviation) hasMissingAbbrev = true;
        }
      }
      if (hasLegacy) { withLegacy++; legacyList.push({ id: b.id, number: b.number }); }
      if (hasMissingAbbrev) { missingAbbrev++; missingList.push({ id: b.id, number: b.number }); }
    }

    console.log('Total BOQs:', total);
    console.log('BOQs with legacy unit fields (unit or unit_name):', withLegacy);
    if (legacyList.length) console.log('Sample legacy BOQs:', legacyList.slice(0, 20));
    console.log('BOQs with missing unit_abbreviation:', missingAbbrev);
    if (missingList.length) console.log('Sample missing-abbrev BOQs:', missingList.slice(0, 20));

    process.exit(0);
  } catch (err) {
    console.error('Audit failed', err);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
