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

    // Create a test company
    const companyRes = await client.query(
      `INSERT INTO companies (name) VALUES ($1) RETURNING id`,
      ['Test Company for Document Numbering']
    );
    const companyId = companyRes.rows[0].id;
    console.log('Created company:', companyId);

    // Create a test customer
    const customerRes = await client.query(
      `INSERT INTO customers (company_id, customer_code, name, email) VALUES ($1, $2, $3, $4) RETURNING id`,
      [companyId, 'TSTCUST1', 'Test Customer 1', 'test@example.com']
    );
    const customerId = customerRes.rows[0].id;
    console.log('Created customer:', customerId);

    // Generate quotation number via DB function
    const qnumRes = await client.query('SELECT generate_quotation_number($1) AS quotation_number', [companyId]);
    const quotationNumber = qnumRes.rows[0].quotation_number;
    console.log('Generated quotation number:', quotationNumber);

    // Insert quotation
    const insertQuotationRes = await client.query(
      `INSERT INTO quotations (company_id, customer_id, quotation_number, quotation_date, status, subtotal, total_amount)
       VALUES ($1, $2, $3, CURRENT_DATE, 'draft', 0, 0)
       RETURNING id, quotation_number`,
      [companyId, customerId, quotationNumber]
    );
    console.log('Inserted quotation:', insertQuotationRes.rows[0]);

    // Generate invoice number via DB function
    const inumRes = await client.query('SELECT generate_invoice_number($1) AS invoice_number', [companyId]);
    const invoiceNumber = inumRes.rows[0].invoice_number;
    console.log('Generated invoice number:', invoiceNumber);

    // Insert invoice
    const insertInvoiceRes = await client.query(
      `INSERT INTO invoices (company_id, customer_id, invoice_number, invoice_date, due_date, status, subtotal, total_amount)
       VALUES ($1, $2, $3, CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', 'draft', 0, 0)
       RETURNING id, invoice_number`,
      [companyId, customerId, invoiceNumber]
    );
    console.log('Inserted invoice:', insertInvoiceRes.rows[0]);

    // Show combined listing for this company
    const combinedRes = await client.query(
      `SELECT 'quotation' AS type, id, quotation_number AS number FROM quotations WHERE company_id = $1
       UNION ALL
       SELECT 'invoice' AS type, id, invoice_number AS number FROM invoices WHERE company_id = $1
       ORDER BY number`,
      [companyId]
    );

    console.log('All documents for test company:');
    combinedRes.rows.forEach(r => console.log(r));

    console.log('\nTEST COMPLETE');
  } catch (err) {
    console.error('Error during test:', err.message || err);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
