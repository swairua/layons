-- Create payment allocations table
-- This table links payments to invoices, tracking how much of each payment is allocated to each invoice

CREATE TABLE IF NOT EXISTS payment_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    amount_allocated DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_payment_allocations_payment_id ON payment_allocations(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_invoice_id ON payment_allocations(invoice_id);

-- Enable Row Level Security
ALTER TABLE payment_allocations ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies
-- Allow users to view payment allocations for their company's invoices and payments
CREATE POLICY "Users can view payment allocations for their company"
  ON payment_allocations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM payments p
      WHERE p.id = payment_allocations.payment_id
      AND p.company_id = (
        SELECT company_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Allow users to create payment allocations for their company
CREATE POLICY "Users can create payment allocations for their company"
  ON payment_allocations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM payments p
      WHERE p.id = payment_allocations.payment_id
      AND p.company_id = (
        SELECT company_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Allow users to update payment allocations for their company
CREATE POLICY "Users can update payment allocations for their company"
  ON payment_allocations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM payments p
      WHERE p.id = payment_allocations.payment_id
      AND p.company_id = (
        SELECT company_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Allow users to delete payment allocations for their company
CREATE POLICY "Users can delete payment allocations for their company"
  ON payment_allocations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM payments p
      WHERE p.id = payment_allocations.payment_id
      AND p.company_id = (
        SELECT company_id FROM profiles WHERE id = auth.uid()
      )
    )
  );
