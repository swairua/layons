-- Units table for BOQ units management
CREATE TABLE IF NOT EXISTS units (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  abbreviation TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, name)
);

CREATE INDEX IF NOT EXISTS idx_units_company_id ON units(company_id);
CREATE INDEX IF NOT EXISTS idx_units_name ON units(name);
