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
    const res = await client.query(`
      SELECT
        con.conname AS constraint_name,
        con.conrelid::regclass::text AS table_from,
        array_agg(a.attname) FILTER (WHERE a.attrelid = con.conrelid) AS columns_from,
        con.confrelid::regclass::text AS table_to,
        array_agg(af.attname) FILTER (WHERE af.attrelid = con.confrelid) AS columns_to
      FROM pg_constraint con
      LEFT JOIN pg_attribute a ON a.attnum = ANY(con.conkey) AND a.attrelid = con.conrelid
      LEFT JOIN pg_attribute af ON af.attnum = ANY(con.confkey) AND af.attrelid = con.confrelid
      WHERE con.contype = 'f' AND con.confrelid = 'companies'::regclass
      GROUP BY con.conname, con.conrelid, con.confrelid
      ORDER BY con.conname;
    `);
    if (res.rows.length === 0) {
      console.log('No foreign key constraints reference companies');
    } else {
      console.log('Foreign key constraints referencing companies:');
      res.rows.forEach(r => console.log(r));
    }
  } catch (err) {
    console.error('Error listing FKs:', err.message || err);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
