-- BOQs storage
CREATE TABLE IF NOT EXISTS boqs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  number VARCHAR(100) NOT NULL,
  boq_date DATE NOT NULL DEFAULT CURRENT_DATE,
  client_name TEXT NOT NULL,
  client_email TEXT,
  client_phone TEXT,
  client_address TEXT,
  client_city TEXT,
  client_country TEXT,
  contractor TEXT,
  project_title TEXT,
  currency VARCHAR(3) DEFAULT 'KES',
  subtotal NUMERIC(15,2) DEFAULT 0,
  tax_amount NUMERIC(15,2) DEFAULT 0,
  total_amount NUMERIC(15,2) NOT NULL,
  attachment_url TEXT,
  data JSONB, -- full structured BOQ (sections/items/notes)
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, number)
);

CREATE INDEX IF NOT EXISTS idx_boqs_company_id ON boqs(company_id);
CREATE INDEX IF NOT EXISTS idx_boqs_number ON boqs(number);
