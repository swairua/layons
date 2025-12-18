const { Client } = require('pg');

(async () => {
  const connectionString = process.env.DATABASE_URL || process.env.MIGRATE_DATABASE_URL;
  if (!connectionString) {
    console.error('Missing DATABASE_URL');
    process.exit(1);
  }

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    await client.query('BEGIN');

    // Find the Layons company ID
    const layonsResult = await client.query(
      "SELECT id FROM companies WHERE name = 'Layons Construction Ltd' OR name = 'Layons Construction Limited' ORDER BY created_at ASC LIMIT 1"
    );

    if (layonsResult.rows.length === 0) {
      console.error('Error: Layons Construction company not found. Please run seed_layons.cjs first.');
      await client.query('ROLLBACK');
      process.exit(1);
    }

    const layonsCompanyId = layonsResult.rows[0].id;
    console.log('Found Layons company ID:', layonsCompanyId);

    // Find BOQs with the old company ID
    const oldCompanyId = 'feefc655-c389-4d31-a4d8-24fee8735022';
    const boqsResult = await client.query(
      'SELECT id, number FROM boqs WHERE company_id = $1',
      [oldCompanyId]
    );

    console.log(`Found ${boqsResult.rows.length} BOQs to migrate`);

    if (boqsResult.rows.length > 0) {
      // Update BOQs to use Layons company ID
      const updateResult = await client.query(
        'UPDATE boqs SET company_id = $1 WHERE company_id = $2',
        [layonsCompanyId, oldCompanyId]
      );

      console.log(`Migrated ${updateResult.rowCount} BOQs to Layons company`);

      // Show the migrated BOQs
      console.log('Migrated BOQs:');
      boqsResult.rows.forEach(boq => {
        console.log(`  - BOQ ${boq.number} (ID: ${boq.id})`);
      });
    }

    await client.query('COMMIT');
    console.log('Migration completed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
})().catch(async (e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
