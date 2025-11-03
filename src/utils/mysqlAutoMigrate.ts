import { layonsApi, AlterAction } from '@/integrations/layonsApi/client';

// Minimal required schema for application to run on MySQL via PHP API
// Using CHAR(36) for IDs (UUID-style) to be compatible with migrated data
const REQUIRED_SCHEMA: Record<string, Record<string, string>> = {
  companies: {
    id: 'CHAR(36) PRIMARY KEY',
    name: 'VARCHAR(255)',
    email: 'VARCHAR(255)',
    phone: 'VARCHAR(50)',
    address: 'TEXT',
    city: 'VARCHAR(100)',
    country: 'VARCHAR(100)',
    currency: 'VARCHAR(10)',
    created_at: 'DATETIME',
    updated_at: 'DATETIME'
  },
  profiles: {
    id: 'CHAR(36) PRIMARY KEY',
    email: 'VARCHAR(255)',
    full_name: 'VARCHAR(255)',
    role: 'VARCHAR(50)',
    status: 'VARCHAR(50)',
    phone: 'VARCHAR(50)',
    company_id: 'CHAR(36)',
    last_login: 'DATETIME',
    created_at: 'DATETIME',
    updated_at: 'DATETIME'
  },
  product_categories: {
    id: 'CHAR(36) PRIMARY KEY',
    company_id: 'CHAR(36)',
    name: 'VARCHAR(255)',
    description: 'TEXT',
    created_at: 'DATETIME'
  },
  products: {
    id: 'CHAR(36) PRIMARY KEY',
    company_id: 'CHAR(36)',
    category_id: 'CHAR(36)',
    product_code: 'VARCHAR(100)',
    name: 'VARCHAR(255)',
    description: 'TEXT',
    unit_of_measure: 'VARCHAR(50)',
    cost_price: 'DECIMAL(15,2)',
    selling_price: 'DECIMAL(15,2)',
    stock_quantity: 'INT',
    minimum_stock_level: 'INT',
    reorder_level: 'INT',
    is_active: 'TINYINT(1)',
    created_at: 'DATETIME',
    updated_at: 'DATETIME'
  },
  customers: {
    id: 'CHAR(36) PRIMARY KEY',
    company_id: 'CHAR(36)',
    customer_code: 'VARCHAR(50)',
    name: 'VARCHAR(255)',
    email: 'VARCHAR(255)',
    phone: 'VARCHAR(50)',
    address: 'TEXT',
    city: 'VARCHAR(100)',
    country: 'VARCHAR(100)',
    created_at: 'DATETIME',
    updated_at: 'DATETIME'
  },
  quotations: {
    id: 'CHAR(36) PRIMARY KEY',
    company_id: 'CHAR(36)',
    customer_id: 'CHAR(36)',
    quotation_number: 'VARCHAR(100)',
    quotation_date: 'DATE',
    subtotal: 'DECIMAL(15,2)',
    tax_percentage: 'DECIMAL(5,2)',
    tax_amount: 'DECIMAL(15,2)',
    total_amount: 'DECIMAL(15,2)',
    status: 'VARCHAR(50)',
    notes: 'TEXT',
    created_by: 'CHAR(36)',
    created_at: 'DATETIME',
    updated_at: 'DATETIME'
  },
  quotation_items: {
    id: 'CHAR(36) PRIMARY KEY',
    quotation_id: 'CHAR(36)',
    product_id: 'CHAR(36)',
    description: 'TEXT',
    quantity: 'INT',
    unit_price: 'DECIMAL(15,2)',
    tax_percentage: 'DECIMAL(5,2)',
    tax_amount: 'DECIMAL(15,2)',
    line_total: 'DECIMAL(15,2)',
    created_at: 'DATETIME'
  },
  invoices: {
    id: 'CHAR(36) PRIMARY KEY',
    company_id: 'CHAR(36)',
    customer_id: 'CHAR(36)',
    quotation_id: 'CHAR(36)',
    invoice_number: 'VARCHAR(100)',
    invoice_date: 'DATE',
    due_date: 'DATE',
    subtotal: 'DECIMAL(15,2)',
    tax_percentage: 'DECIMAL(5,2)',
    tax_amount: 'DECIMAL(15,2)',
    total_amount: 'DECIMAL(15,2)',
    amount_paid: 'DECIMAL(15,2)',
    amount_due: 'DECIMAL(15,2)',
    status: 'VARCHAR(50)',
    notes: 'TEXT',
    created_by: 'CHAR(36)',
    created_at: 'DATETIME',
    updated_at: 'DATETIME'
  },
  invoice_items: {
    id: 'CHAR(36) PRIMARY KEY',
    invoice_id: 'CHAR(36)',
    product_id: 'CHAR(36)',
    description: 'TEXT',
    quantity: 'INT',
    unit_price: 'DECIMAL(15,2)',
    tax_percentage: 'DECIMAL(5,2)',
    tax_amount: 'DECIMAL(15,2)',
    line_total: 'DECIMAL(15,2)',
    created_at: 'DATETIME'
  },
  payments: {
    id: 'CHAR(36) PRIMARY KEY',
    company_id: 'CHAR(36)',
    customer_id: 'CHAR(36)',
    invoice_id: 'CHAR(36)',
    amount: 'DECIMAL(15,2)',
    payment_date: 'DATE',
    reference: 'VARCHAR(100)',
    notes: 'TEXT',
    created_at: 'DATETIME'
  },
  payment_allocations: {
    id: 'CHAR(36) PRIMARY KEY',
    payment_id: 'CHAR(36)',
    invoice_id: 'CHAR(36)',
    amount: 'DECIMAL(15,2)',
    created_at: 'DATETIME'
  },
  stock_movements: {
    id: 'CHAR(36) PRIMARY KEY',
    product_id: 'CHAR(36)',
    movement_type: 'VARCHAR(20)',
    reference_type: 'VARCHAR(30)',
    reference_id: 'CHAR(36)',
    quantity: 'INT',
    created_at: 'DATETIME',
    updated_at: 'DATETIME'
  },
  delivery_notes: {
    id: 'CHAR(36) PRIMARY KEY',
    company_id: 'CHAR(36)',
    invoice_id: 'CHAR(36)',
    delivery_date: 'DATE',
    notes: 'TEXT',
    created_at: 'DATETIME'
  },
  delivery_note_items: {
    id: 'CHAR(36) PRIMARY KEY',
    delivery_note_id: 'CHAR(36)',
    product_id: 'CHAR(36)',
    description: 'TEXT',
    quantity: 'INT',
    created_at: 'DATETIME'
  },
  units: {
    id: 'CHAR(36) PRIMARY KEY',
    company_id: 'CHAR(36)',
    name: 'VARCHAR(100)',
    abbreviation: 'VARCHAR(20)'
  },
  boqs: {
    id: 'CHAR(36) PRIMARY KEY',
    company_id: 'CHAR(36)',
    name: 'VARCHAR(255)',
    description: 'TEXT',
    created_at: 'DATETIME'
  },
  fixed_boq_items: {
    id: 'CHAR(36) PRIMARY KEY',
    boq_id: 'CHAR(36)',
    description: 'TEXT',
    unit: 'VARCHAR(50)',
    quantity: 'DECIMAL(15,2)',
    rate: 'DECIMAL(15,2)',
    amount: 'DECIMAL(15,2)'
  },
  credit_notes: {
    id: 'CHAR(36) PRIMARY KEY',
    company_id: 'CHAR(36)',
    customer_id: 'CHAR(36)',
    invoice_id: 'CHAR(36)',
    credit_note_number: 'VARCHAR(100)',
    credit_note_date: 'DATE',
    total_amount: 'DECIMAL(15,2)',
    status: 'VARCHAR(50)',
    created_at: 'DATETIME'
  },
  credit_note_items: {
    id: 'CHAR(36) PRIMARY KEY',
    credit_note_id: 'CHAR(36)',
    product_id: 'CHAR(36)',
    description: 'TEXT',
    quantity: 'INT',
    unit_price: 'DECIMAL(15,2)',
    line_total: 'DECIMAL(15,2)'
  },
  remittance_advice: {
    id: 'CHAR(36) PRIMARY KEY',
    company_id: 'CHAR(36)',
    customer_id: 'CHAR(36)',
    reference: 'VARCHAR(100)',
    remittance_date: 'DATE',
    notes: 'TEXT',
    created_at: 'DATETIME'
  },
  remittance_advice_items: {
    id: 'CHAR(36) PRIMARY KEY',
    remittance_id: 'CHAR(36)',
    invoice_id: 'CHAR(36)',
    amount: 'DECIMAL(15,2)'
  },
  lpos: {
    id: 'CHAR(36) PRIMARY KEY',
    company_id: 'CHAR(36)',
    supplier_name: 'VARCHAR(255)',
    lpo_number: 'VARCHAR(100)',
    lpo_date: 'DATE',
    total_amount: 'DECIMAL(15,2)'
  },
  lpo_items: {
    id: 'CHAR(36) PRIMARY KEY',
    lpo_id: 'CHAR(36)',
    description: 'TEXT',
    quantity: 'INT',
    unit_price: 'DECIMAL(15,2)',
    line_total: 'DECIMAL(15,2)'
  },
  audit_logs: {
    id: 'CHAR(36) PRIMARY KEY',
    user_id: 'CHAR(36)',
    action: 'VARCHAR(100)',
    entity: 'VARCHAR(100)',
    entity_id: 'CHAR(36)',
    details: 'TEXT',
    created_at: 'DATETIME'
  },
  user_permissions: {
    id: 'CHAR(36) PRIMARY KEY',
    user_id: 'CHAR(36)',
    permission_name: 'VARCHAR(100)',
    granted: 'TINYINT(1)',
    granted_at: 'DATETIME'
  }
};

async function ensureTable(table: string, columns: Record<string, string>) {
  // Try to create table if missing
  try {
    await layonsApi.createTable(table, columns);
  } catch {
    // ignore
  }

  // Try to add/modify columns one by one to avoid bulk failure
  for (const [name, definition] of Object.entries(columns)) {
    // Try ADD
    try {
      const actions: AlterAction[] = [{ type: 'ADD', name, definition }];
      await layonsApi.alterTable(table, actions);
      continue;
    } catch {}

    // Try MODIFY if exists
    try {
      const actions: AlterAction[] = [{ type: 'MODIFY', name, definition }];
      await layonsApi.alterTable(table, actions);
      continue;
    } catch {}
  }
}

async function seedIfEmpty() {
  // Seed a default company and minimal data when fresh install
  try {
    const companies = await layonsApi.getAll<any>('companies');
    if (!companies || companies.length === 0) {
      const companyId = crypto.randomUUID();
      await layonsApi.insert('companies', {
        id: companyId,
        name: 'Layons Construction Ltd',
        email: 'info@construction.com',
        country: 'Kenya',
        currency: 'KES',
        created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
        updated_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
      });

      const categoryId = crypto.randomUUID();
      await layonsApi.insert('product_categories', {
        id: categoryId,
        company_id: companyId,
        name: 'General',
        created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
      });

      await layonsApi.insert('products', {
        id: crypto.randomUUID(),
        company_id: companyId,
        category_id: categoryId,
        name: 'Sample Product',
        description: 'Seeded product',
        unit_of_measure: 'pcs',
        selling_price: '100.00',
        cost_price: '80.00',
        stock_quantity: '10',
        created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
        updated_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
      });
    }
  } catch {
    // ignore seed errors
  }
}

export async function runAutoMigrate() {
  for (const [table, columns] of Object.entries(REQUIRED_SCHEMA)) {
    await ensureTable(table, columns);
  }
  await seedIfEmpty();
}
