import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Database,
  Loader2,
  Copy,
  ExternalLink
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { associateUserWithCompany } from '@/utils/examineCompaniesTable';

interface StatusCheck {
  name: string;
  status: 'checking' | 'working' | 'error';
  details?: string;
  suggestion?: string;
}

const SETUP_SQL = `-- Payment Allocations Setup
-- Copy and paste this into your Supabase SQL Editor

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

-- Database Function for Payment Recording
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
$$ LANGUAGE plpgsql;`;

export function PaymentAllocationStatus() {
  const [checks, setChecks] = useState<StatusCheck[]>([
    { name: 'Payment Allocations Table', status: 'checking' },
    { name: 'Database Function', status: 'checking' },
    { name: 'User Profile', status: 'checking' }
  ]);
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [isFixingProfile, setIsFixingProfile] = useState(false);

  const updateCheck = (index: number, updates: Partial<StatusCheck>) => {
    setChecks(prev => prev.map((check, i) =>
      i === index ? { ...check, ...updates } : check
    ));
  };

  const handleFixProfile = async () => {
    setIsFixingProfile(true);
    try {
      const result = await associateUserWithCompany();
      if (result.success) {
        toast.success('Profile fixed! Updating status checks...');
        // Wait a moment for the database to update, then refresh checks
        setTimeout(() => {
          runStatusChecks();
          setIsFixingProfile(false);
        }, 1000);
      } else {
        toast.error(`Failed to fix profile: ${result.message}`);
        setIsFixingProfile(false);
      }
    } catch (error) {
      toast.error('Error fixing profile. Please try again.');
      console.error('Error fixing profile:', error);
      setIsFixingProfile(false);
    }
  };

  const copySQL = () => {
    navigator.clipboard.writeText(SETUP_SQL);
    toast.success('Setup SQL copied to clipboard!');
  };

  const runStatusChecks = async () => {
    // Reset to checking state
    setChecks([
      { name: 'Payment Allocations Table', status: 'checking' },
      { name: 'Database Function', status: 'checking' },
      { name: 'User Profile', status: 'checking' }
    ]);

    // Check 1: Payment Allocations Table
    try {
      const { error } = await supabase
        .from('payment_allocations')
        .select('id')
        .limit(1);
      
      if (error) {
        if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
          updateCheck(0, { 
            status: 'error', 
            details: 'Table missing',
            suggestion: 'Click "View Setup Guide" to create the table'
          });
        } else if (error.message?.includes('permission') || error.message?.includes('policy')) {
          updateCheck(0, { 
            status: 'error', 
            details: 'RLS/Permission issue',
            suggestion: 'Check if your profile is linked to a company. Ask your admin to assign you to a company.'
          });
        } else {
          updateCheck(0, { 
            status: 'error', 
            details: error.message || 'Unknown error',
            suggestion: 'Click "View Setup Guide" to fix'
          });
        }
      } else {
        updateCheck(0, { status: 'working', details: 'Table accessible' });
      }
    } catch (err) {
      updateCheck(0, { 
        status: 'error', 
        details: 'Connection failed',
        suggestion: 'Check your internet connection'
      });
    }

    // Check 2: Database Function
    try {
      const { error } = await supabase.rpc('record_payment_with_allocation', {
        p_company_id: '00000000-0000-0000-0000-000000000000',
        p_customer_id: '00000000-0000-0000-0000-000000000000',
        p_invoice_id: '00000000-0000-0000-0000-000000000000',
        p_payment_number: 'TEST',
        p_payment_date: '2024-01-01',
        p_amount: 1,
        p_payment_method: 'cash',
        p_reference_number: 'TEST',
        p_notes: 'TEST'
      });

      if (error) {
        if (error.code === 'PGRST202' || (error.message?.includes('function') && error.message?.includes('does not exist'))) {
          updateCheck(1, { 
            status: 'error', 
            details: 'Function missing',
            suggestion: 'Click "View Setup Guide" to create the function'
          });
        } else if (error.message?.includes('Invoice not found')) {
          updateCheck(1, { status: 'working', details: 'Function available' });
        } else if (error.message?.includes('permission') || error.message?.includes('denied')) {
          updateCheck(1, { 
            status: 'error', 
            details: 'Permission denied',
            suggestion: 'Your profile may not have the required company link'
          });
        } else {
          updateCheck(1, { 
            status: 'error', 
            details: error.message || 'Function error',
            suggestion: 'Click "View Setup Guide" to fix'
          });
        }
      } else {
        updateCheck(1, { status: 'working', details: 'Function working' });
      }
    } catch (err) {
      updateCheck(1, { 
        status: 'error', 
        details: 'Function test failed',
        suggestion: 'Check your connection'
      });
    }

    // Check 3: User Profile
    try {
      const { data, error: userError } = await supabase.auth.getUser();
      const user = data?.user;
      
      if (user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('id', user.id)
          .single();
        
        if (profileError) {
          updateCheck(2, { 
            status: 'error', 
            details: 'Profile not found',
            suggestion: 'Your user profile may not exist yet'
          });
        } else if (profile?.company_id) {
          updateCheck(2, { status: 'working', details: 'Profile linked to company' });
        } else {
          updateCheck(2, { 
            status: 'error', 
            details: 'No company link',
            suggestion: 'Ask your admin to assign you to a company in user management'
          });
        }
      } else if (userError) {
        updateCheck(2, { 
          status: 'error', 
          details: userError.message || 'Authentication error',
          suggestion: 'Please sign in again'
        });
      } else {
        updateCheck(2, { 
          status: 'error', 
          details: 'Not authenticated',
          suggestion: 'Please refresh the page and sign in'
        });
      }
    } catch (err) {
      updateCheck(2, { 
        status: 'error', 
        details: 'Profile check failed',
        suggestion: 'Check your connection'
      });
    }
  };

  useEffect(() => {
    runStatusChecks();
  }, []);

  const getStatusIcon = (status: StatusCheck['status']) => {
    switch (status) {
      case 'working':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />;
    }
  };

  const getStatusBadge = (status: StatusCheck['status']) => {
    switch (status) {
      case 'working':
        return <Badge className="bg-success-light text-success">Working</Badge>;
      case 'error':
        return <Badge className="bg-destructive-light text-destructive">Error</Badge>;
      default:
        return <Badge variant="outline">Checking</Badge>;
    }
  };

  const workingCount = checks.filter(check => check.status === 'working').length;
  const errorCount = checks.filter(check => check.status === 'error').length;
  const checkingCount = checks.filter(check => check.status === 'checking').length;
  const allWorking = workingCount === checks.length;
  const hasErrors = errorCount > 0;

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Database className="h-5 w-5 text-primary" />
          <span>Payment Allocation Status</span>
          {allWorking && (
            <Badge className="bg-success-light text-success">
              <CheckCircle className="h-3 w-3 mr-1" />
              All Systems Working
            </Badge>
          )}
          {hasErrors && (
            <Badge className="bg-destructive-light text-destructive">
              <XCircle className="h-3 w-3 mr-1" />
              {errorCount} Issue{errorCount > 1 ? 's' : ''}
            </Badge>
          )}
          {checkingCount > 0 && (
            <Badge variant="outline">
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              Checking...
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {checks.map((check, index) => (
            <div key={index} className={`flex flex-col space-y-2 p-3 border rounded-lg ${
              check.status === 'error' ? 'border-destructive/30 bg-destructive/5' :
              check.status === 'working' ? 'border-success/30 bg-success/5' :
              'border-muted-foreground/30'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="flex-shrink-0">
                    {getStatusIcon(check.status)}
                  </div>
                  <h4 className="font-medium text-sm">{check.name}</h4>
                </div>
                {getStatusBadge(check.status)}
              </div>
              {check.details && (
                <p className="text-xs text-muted-foreground">{check.details}</p>
              )}
              {check.suggestion && (
                <p className="text-xs text-amber-600 font-medium">{check.suggestion}</p>
              )}
            </div>
          ))}
        </div>

        {allWorking && (
          <Alert className="border-success/20 bg-success-light">
            <CheckCircle className="h-4 w-4 text-success" />
            <AlertDescription className="text-success">
              <strong>✅ Payment Allocation System Active</strong>
              <br />
              All systems are working! Payments will be properly allocated to invoices.
            </AlertDescription>
          </Alert>
        )}

        {hasErrors && (
          <>
            <Alert className="border-warning/20 bg-warning-light">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <AlertDescription className="text-warning">
                <strong>⚠️ Some Issues Detected</strong>
                <br />
                Payment allocation may not work correctly. Follow the setup guide below.
              </AlertDescription>
            </Alert>

            <div className="flex flex-wrap gap-2">
              {checks[2]?.status === 'error' && (
                <Button
                  size="sm"
                  onClick={handleFixProfile}
                  disabled={isFixingProfile}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
                >
                  {isFixingProfile ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Fixing Profile...
                    </>
                  ) : (
                    'Fix Profile'
                  )}
                </Button>
              )}
              <Button
                size="sm"
                onClick={() => setShowSetupGuide(!showSetupGuide)}
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
              >
                {showSetupGuide ? '✓ Hide' : 'View'} Setup Guide
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={runStatusChecks}
              >
                Refresh Status
              </Button>
            </div>

            {showSetupGuide && (
              <div className="space-y-3 p-4 bg-muted rounded-lg border border-muted-foreground/20">
                <h4 className="font-semibold text-sm">Setup Instructions:</h4>
                <ol className="text-xs space-y-2 list-decimal list-inside text-muted-foreground">
                  <li>Click "Copy SQL" button below to copy the setup script</li>
                  <li>Go to your Supabase Dashboard → SQL Editor</li>
                  <li>Create a new query and paste the SQL</li>
                  <li>Click "Run" to execute the setup</li>
                  <li>Return here and click "Refresh Status" to verify</li>
                </ol>

                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    onClick={copySQL}
                    variant="default"
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy SQL
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open('https://supabase.com/dashboard/project/_/sql/new', '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open SQL Editor
                  </Button>
                </div>

                <div className="text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-200 mt-3">
                  <strong>Note:</strong> Make sure you're logged in to your Supabase project before opening the SQL Editor. The SQL will create the payment allocation system with proper security policies.
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
