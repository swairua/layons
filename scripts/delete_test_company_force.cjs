const { Client } = require('pg');

(async () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('Missing DATABASE_URL');
    process.exit(1);
  }

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

  const tables = [
    'invoice_items', 'quotation_items',
    'invoices', 'quotations', 'proforma_invoices', 'remittance_advice',
    'payments', 'stock_movements', 'delivery_notes', 'boqs', 'fixed_boq_items',
    'lpos', 'product_categories', 'products', 'customers', 'profiles', 'units', 'audit_logs'
  ];

  try {
    await client.connect();
    console.log('Connected to DB');

    const companyName = 'Test Company for Document Numbering';
    const findRes = await client.query('SELECT id FROM companies WHERE name = $1', [companyName]);
    if (findRes.rowCount === 0) {
      console.log('No company found with name:', companyName);
      process.exit(0);
    }
    const companyId = findRes.rows[0].id;
    console.log('Found company id:', companyId);

    // Disable triggers to avoid trigger-based errors
    await client.query("SET session_replication_role = 'replica'");
    console.log('Triggers disabled for this session');

    for (const table of tables) {
      // Check if table exists and has company_id
      const colRes = await client.query(
        `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = 'company_id'`,
        [table]
      );
      if (colRes.rowCount === 0) {
        console.log(`Skipping ${table}: no company_id column`);
        continue;
      }

      try {
        const delRes = await client.query(`DELETE FROM ${table} WHERE company_id = $1 RETURNING id`, [companyId]);
        console.log(`Deleted ${delRes.rowCount} rows from ${table}`);
      } catch (err) {
        console.warn(`Error deleting from ${table}:`, err.message || err);
      }
    }

    // Finally delete company row
    const delCompanyRes = await client.query('DELETE FROM companies WHERE id = $1 RETURNING id', [companyId]);
    if (delCompanyRes.rowCount > 0) {
      console.log('Deleted company id:', companyId);
    } else {
      console.log('Company deletion returned no rows');
    }

    // Re-enable triggers
    await client.query("SET session_replication_role = 'origin'");
    console.log('Triggers re-enabled');

    console.log('Force deletion completed');
  } catch (err) {
    console.error('Error during force deletion:', err.message || err);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
