-- Create cash_receipt_items table for storing individual items in cash receipts
CREATE TABLE IF NOT EXISTS cash_receipt_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cash_receipt_id UUID NOT NULL,
    product_id UUID,
    description VARCHAR(500) NOT NULL,
    quantity DECIMAL(10,3) NOT NULL,
    unit_price DECIMAL(15,2) NOT NULL,
    tax_percentage DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    line_total DECIMAL(15,2) NOT NULL,
    unit_of_measure VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraint
ALTER TABLE cash_receipt_items 
ADD CONSTRAINT fk_cash_receipt_items_cash_receipt_id 
FOREIGN KEY (cash_receipt_id) REFERENCES cash_receipts(id) ON DELETE CASCADE;

-- Add product foreign key if products table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products') THEN
        ALTER TABLE cash_receipt_items 
        ADD CONSTRAINT fk_cash_receipt_items_product_id 
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_cash_receipt_items_cash_receipt_id ON cash_receipt_items(cash_receipt_id);
CREATE INDEX IF NOT EXISTS idx_cash_receipt_items_product_id ON cash_receipt_items(product_id);
