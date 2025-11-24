-- Create cash_receipts table for tracking cash payment receipts
CREATE TABLE IF NOT EXISTS cash_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    customer_id UUID NOT NULL,
    receipt_number VARCHAR(50) NOT NULL UNIQUE,
    receipt_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_amount DECIMAL(15,2) NOT NULL,
    value_tendered DECIMAL(15,2) NOT NULL,
    change DECIMAL(15,2) NOT NULL DEFAULT 0,
    payment_method VARCHAR(50) NOT NULL, -- 'Cash', 'Cheque', 'Bank Transfer', 'Mobile Money', 'Card', etc.
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraints if the referenced tables exist
DO $$
BEGIN
    -- Add company_id foreign key if companies table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'companies') THEN
        ALTER TABLE cash_receipts 
        ADD CONSTRAINT fk_cash_receipts_company_id 
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
    END IF;

    -- Add customer_id foreign key if customers table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers') THEN
        ALTER TABLE cash_receipts 
        ADD CONSTRAINT fk_cash_receipts_customer_id 
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;
    END IF;

    -- Add created_by foreign key if users table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        ALTER TABLE cash_receipts 
        ADD CONSTRAINT fk_cash_receipts_created_by 
        FOREIGN KEY (created_by) REFERENCES users(id);
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_cash_receipts_company_id ON cash_receipts(company_id);
CREATE INDEX IF NOT EXISTS idx_cash_receipts_customer_id ON cash_receipts(customer_id);
CREATE INDEX IF NOT EXISTS idx_cash_receipts_receipt_number ON cash_receipts(receipt_number);
CREATE INDEX IF NOT EXISTS idx_cash_receipts_receipt_date ON cash_receipts(receipt_date);
CREATE INDEX IF NOT EXISTS idx_cash_receipts_company_date ON cash_receipts(company_id, receipt_date);

-- Enable Row Level Security
ALTER TABLE cash_receipts ENABLE ROW LEVEL SECURITY;

-- Create RLS policy to restrict access to own company data
CREATE POLICY "Users can only access cash receipts for their company" ON cash_receipts
    FOR ALL
    USING (
        company_id IN (
            SELECT id FROM companies 
            WHERE id IN (
                SELECT company_id FROM user_profiles 
                WHERE id = auth.uid()
            )
        )
    );
