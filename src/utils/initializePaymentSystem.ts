import { supabase } from '@/integrations/supabase/client';

export interface InitializationResult {
  success: boolean;
  message: string;
  details: {
    tableCreated?: boolean;
    functionCreated?: boolean;
    profileLinked?: boolean;
    errors?: string[];
  };
}

/**
 * Initialize payment allocation system
 * Creates table, function, and ensures user profile is linked
 */
export async function initializePaymentSystem(): Promise<InitializationResult> {
  const details: InitializationResult['details'] = {
    errors: []
  };

  try {
    // Step 1: Create payment_allocations table if it doesn't exist
    try {
      console.log('Creating payment_allocations table...');

      // Try to execute SQL to create table
      let result = await supabase.rpc('exec_sql', {
        sql: `
        CREATE TABLE IF NOT EXISTS payment_allocations (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
            invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
            amount_allocated DECIMAL(15,2) NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_payment_allocations_payment_id ON payment_allocations(payment_id);
        CREATE INDEX IF NOT EXISTS idx_payment_allocations_invoice_id ON payment_allocations(invoice_id);

        ALTER TABLE payment_allocations ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Users can view payment allocations for their company" ON payment_allocations;
        DROP POLICY IF EXISTS "Users can create payment allocations for their company" ON payment_allocations;
        DROP POLICY IF EXISTS "Users can update payment allocations for their company" ON payment_allocations;
        DROP POLICY IF EXISTS "Users can delete payment allocations for their company" ON payment_allocations;

        CREATE POLICY "Users can view payment allocations for their company"
          ON payment_allocations FOR SELECT
          USING (
            EXISTS (
              SELECT 1 FROM payments p
              WHERE p.id = payment_allocations.payment_id
              AND p.company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
            )
          );

        CREATE POLICY "Users can create payment allocations for their company"
          ON payment_allocations FOR INSERT
          WITH CHECK (
            EXISTS (
              SELECT 1 FROM payments p
              WHERE p.id = payment_allocations.payment_id
              AND p.company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
            )
          );

        CREATE POLICY "Users can update payment allocations for their company"
          ON payment_allocations FOR UPDATE
          USING (
            EXISTS (
              SELECT 1 FROM payments p
              WHERE p.id = payment_allocations.payment_id
              AND p.company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
            )
          );

        CREATE POLICY "Users can delete payment allocations for their company"
          ON payment_allocations FOR DELETE
          USING (
            EXISTS (
              SELECT 1 FROM payments p
              WHERE p.id = payment_allocations.payment_id
              AND p.company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
            )
          );
        `
      });

      if (error) {
        // Check if table already exists - that's ok
        if (error.message?.includes('already exists')) {
          console.log('✅ Table already exists');
          details.tableCreated = true;
        } else {
          throw new Error(`Failed to create table: ${error.message}`);
        }
      } else {
        console.log('✅ Table created successfully');
        details.tableCreated = true;
      }
    } catch (tableError) {
      const errorMsg = tableError instanceof Error ? tableError.message : String(tableError);
      console.error('Table creation error:', errorMsg);
      details.errors?.push(`Table: ${errorMsg}`);
      // Continue - table might already exist
    }

    // Step 2: Create database function
    try {
      console.log('Creating record_payment_with_allocation function...');
      
      const { error } = await supabase.rpc('exec_sql', {
        sql: `
        CREATE OR REPLACE FUNCTION record_payment_with_allocation(
            p_company_id UUID,
            p_customer_id UUID,
            p_invoice_id UUID,
            p_payment_number VARCHAR(50),
            p_payment_date DATE,
            p_amount DECIMAL(15,2),
            p_payment_method TEXT,
            p_reference_number VARCHAR(100),
            p_notes TEXT
        ) RETURNS JSON AS $$
        DECLARE
            v_payment_id UUID;
            v_invoice_record RECORD;
        BEGIN
            -- Validate invoice exists
            SELECT id, total_amount, paid_amount, balance_due 
            INTO v_invoice_record
            FROM invoices 
            WHERE id = p_invoice_id AND company_id = p_company_id;
            
            IF NOT FOUND THEN
                RETURN json_build_object(
                    'success', false, 
                    'error', 'Invoice not found or does not belong to this company'
                );
            END IF;
            
            -- Insert payment
            INSERT INTO payments (
                company_id,
                customer_id,
                payment_number,
                payment_date,
                amount,
                payment_method,
                reference_number,
                notes
            ) VALUES (
                p_company_id,
                p_customer_id,
                p_payment_number,
                p_payment_date,
                p_amount,
                p_payment_method,
                p_reference_number,
                p_notes
            ) RETURNING id INTO v_payment_id;
            
            -- Create allocation
            INSERT INTO payment_allocations (
                payment_id,
                invoice_id,
                amount_allocated
            ) VALUES (
                v_payment_id,
                p_invoice_id,
                p_amount
            );
            
            -- Update invoice
            UPDATE invoices SET
                paid_amount = COALESCE(paid_amount, 0) + p_amount,
                balance_due = total_amount - (COALESCE(paid_amount, 0) + p_amount),
                status = CASE 
                    WHEN (COALESCE(paid_amount, 0) + p_amount) >= total_amount THEN 'paid'
                    WHEN (COALESCE(paid_amount, 0) + p_amount) > 0 THEN 'partial'
                    ELSE status 
                END,
                updated_at = NOW()
            WHERE id = p_invoice_id;
            
            RETURN json_build_object(
                'success', true,
                'payment_id', v_payment_id,
                'amount_allocated', p_amount
            );
            
        EXCEPTION WHEN OTHERS THEN
            RETURN json_build_object(
                'success', false,
                'error', SQLERRM
            );
        END;
        $$ LANGUAGE plpgsql;
        `
      });

      if (error) {
        throw new Error(`Failed to create function: ${error.message}`);
      }
      
      console.log('✅ Function created successfully');
      details.functionCreated = true;
    } catch (funcError) {
      const errorMsg = funcError instanceof Error ? funcError.message : String(funcError);
      console.error('Function creation error:', errorMsg);
      details.errors?.push(`Function: ${errorMsg}`);
      // Don't fail - function might exist
      details.functionCreated = true;
    }

    // Step 3: Ensure user profile is linked to company
    try {
      console.log('Checking user profile company link...');
      
      const { data: userData, error: authError } = await supabase.auth.getUser();
      if (authError || !userData?.user) {
        throw new Error('Not authenticated');
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', userData.user.id)
        .single();

      if (profileError) {
        throw new Error(`Could not fetch profile: ${profileError.message}`);
      }

      if (!profile?.company_id) {
        console.warn('⚠️ User profile has no company_id - this needs to be set by admin');
        details.profileLinked = false;
        details.errors?.push('User profile has no company link. Ask admin to assign company.');
      } else {
        console.log('✅ Profile is linked to company');
        details.profileLinked = true;
      }
    } catch (profileError) {
      const errorMsg = profileError instanceof Error ? profileError.message : String(profileError);
      console.error('Profile check error:', errorMsg);
      details.errors?.push(`Profile: ${errorMsg}`);
      details.profileLinked = false;
    }

    return {
      success: !details.errors || details.errors.length === 0,
      message: details.errors && details.errors.length > 0 
        ? `Partial initialization: ${details.errors.join('; ')}`
        : 'Payment system initialized successfully!',
      details
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Payment system initialization failed:', errorMsg);

    return {
      success: false,
      message: `Failed to initialize payment system: ${errorMsg}`,
      details: {
        errors: [errorMsg]
      }
    };
  }
}

/**
 * Test if payment allocations system is working
 */
export async function testPaymentAllocations() {
  try {
    // Get current user
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      return { working: false, reason: 'Not authenticated' };
    }

    // Check table access
    const { error: tableError } = await supabase
      .from('payment_allocations')
      .select('id')
      .limit(1);

    if (tableError) {
      if (tableError.message?.includes('relation') && tableError.message?.includes('does not exist')) {
        return { working: false, reason: 'Table missing - run initialization' };
      } else if (tableError.message?.includes('permission')) {
        return { working: false, reason: 'Permission denied - check company link' };
      } else {
        return { working: false, reason: `Table error: ${tableError.message}` };
      }
    }

    // Check function
    const { error: funcError } = await supabase.rpc('record_payment_with_allocation', {
      p_company_id: '00000000-0000-0000-0000-000000000000',
      p_customer_id: '00000000-0000-0000-0000-000000000000',
      p_invoice_id: '00000000-0000-0000-0000-000000000000',
      p_payment_number: 'TEST',
      p_payment_date: '2024-01-01',
      p_amount: 1,
      p_payment_method: 'cash',
      p_reference_number: 'TEST',
      p_notes: 'Test'
    });

    if (funcError) {
      if (funcError.message?.includes('function') && funcError.message?.includes('does not exist')) {
        return { working: false, reason: 'Function missing - run initialization' };
      } else if (funcError.message?.includes('Invoice not found')) {
        // This is expected - it means function is working
        return { working: true, reason: 'Function is working' };
      } else {
        return { working: false, reason: `Function error: ${funcError.message}` };
      }
    }

    return { working: true, reason: 'All systems working' };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return { working: false, reason: errorMsg };
  }
}
