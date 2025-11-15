-- Create stock_movements table for inventory tracking
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    product_id UUID NOT NULL,
    movement_type VARCHAR(50) NOT NULL CHECK (movement_type IN ('IN', 'OUT', 'ADJUSTMENT')),
    reference_type VARCHAR(50) CHECK (reference_type IN ('INVOICE', 'DELIVERY_NOTE', 'RESTOCK', 'ADJUSTMENT', 'CREDIT_NOTE', 'PURCHASE')),
    reference_id UUID,
    quantity DECIMAL(10,3) NOT NULL,
    cost_per_unit DECIMAL(15,2),
    notes TEXT,
    movement_date DATE DEFAULT CURRENT_DATE,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_stock_movements_company_id FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    CONSTRAINT fk_stock_movements_product_id FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_stock_movements_company_id ON stock_movements(company_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_reference ON stock_movements(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(movement_date);
CREATE INDEX IF NOT EXISTS idx_stock_movements_company_product_date ON stock_movements(company_id, product_id, movement_date);

-- Create function to update product stock based on movements
CREATE OR REPLACE FUNCTION update_product_stock(
    product_uuid UUID,
    movement_type VARCHAR(50),
    quantity DECIMAL(10,3)
)
RETURNS VOID AS $$
BEGIN
    IF movement_type = 'IN' THEN
        UPDATE products 
        SET stock_quantity = COALESCE(stock_quantity, 0) + quantity,
            updated_at = NOW()
        WHERE id = product_uuid;
    ELSIF movement_type = 'OUT' THEN
        UPDATE products 
        SET stock_quantity = GREATEST(COALESCE(stock_quantity, 0) - quantity, 0),
            updated_at = NOW()
        WHERE id = product_uuid;
    ELSIF movement_type = 'ADJUSTMENT' THEN
        UPDATE products 
        SET stock_quantity = quantity,
            updated_at = NOW()
        WHERE id = product_uuid;
    END IF;
END;
$$ LANGUAGE plpgsql;
