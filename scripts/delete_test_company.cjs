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
    console.log('Connected to DB');

    const companyName = 'Test Company for Document Numbering';

    // Find company
    const findRes = await client.query('SELECT id FROM companies WHERE name = $1', [companyName]);
    if (findRes.rowCount === 0) {
      console.log('No company found with name:', companyName);
      process.exit(0);
    }

    const companyId = findRes.rows[0].id;
    console.log('Found company id:', companyId);

    // Delete company (cascades)
    const delRes = await client.query('DELETE FROM companies WHERE id = $1 RETURNING id', [companyId]);
    if (delRes.rowCount > 0) {
      console.log('Deleted company and cascaded related rows for company id:', companyId);
    } else {
      console.log('No rows deleted.');
    }

  } catch (err) {
    console.error('Error deleting test company:', err.message || err);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
