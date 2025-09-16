const fs = require('fs');
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
    const { rows: boqs } = await client.query('SELECT id, number, company_id, data FROM boqs');
    const out = [];
    out.push(['boq_id','boq_number','company_id','section_title','item_index','item_description','unit_id','unit_name','unit_abbreviation','rate','quantity','line_total'].join(','));

    for (const b of boqs) {
      const d = b.data || {};
      if (!d.sections || !Array.isArray(d.sections)) continue;
      for (let si = 0; si < d.sections.length; si++) {
        const sec = d.sections[si];
        if (!sec.items || !Array.isArray(sec.items)) continue;
        for (let ii = 0; ii < sec.items.length; ii++) {
          const it = sec.items[ii];
          const row = [
            b.id,
            (b.number || '').replace(/\n/g,' '),
            b.company_id || '',
            (sec.title || '').replace(/\n/g,' '),
            ii,
            '"' + ((it.description || '').replace(/"/g,'""')) + '"',
            it.unit_id || '',
            '"' + ((it.unit_name || '').replace(/"/g,'""')) + '"',
            '"' + ((it.unit_abbreviation || '').replace(/"/g,'""')) + '"',
            it.rate !== undefined ? it.rate : '',
            it.quantity !== undefined ? it.quantity : '',
            it.line_total !== undefined ? it.line_total : ''
          ];
          out.push(row.join(','));
        }
      }
    }

    const outDir = 'outputs';
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
    const path = `${outDir}/boq_units_report.csv`;
    fs.writeFileSync(path, out.join('\n'));
    console.log('Wrote CSV to', path);
    process.exit(0);
  } catch (err) {
    console.error('Export failed', err);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
