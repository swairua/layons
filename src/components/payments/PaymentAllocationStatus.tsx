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
  Zap
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { initializePaymentSystem } from '@/utils/initializePaymentSystem';
import { toast } from 'sonner';

interface StatusCheck {
  name: string;
  status: 'checking' | 'working' | 'error';
  details?: string;
  suggestion?: string;
}

export function PaymentAllocationStatus() {
  const [checks, setChecks] = useState<StatusCheck[]>([
    { name: 'Payment Allocations Table', status: 'checking' },
    { name: 'Database Function', status: 'checking' },
    { name: 'User Profile', status: 'checking' }
  ]);
  const [isInitializing, setIsInitializing] = useState(false);

  const updateCheck = (index: number, updates: Partial<StatusCheck>) => {
    setChecks(prev => prev.map((check, i) => 
      i === index ? { ...check, ...updates } : check
    ));
  };

  const handleInitialize = async () => {
    setIsInitializing(true);
    try {
      const result = await initializePaymentSystem();
      
      if (result.success) {
        toast.success('Payment system initialized successfully!');
        // Re-run checks
        runStatusChecks();
      } else {
        toast.error(result.message);
        console.error('Initialization details:', result.details);
      }
    } catch (error) {
      console.error('Initialization error:', error);
      toast.error('Failed to initialize payment system');
    } finally {
      setIsInitializing(false);
    }
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
            suggestion: 'Click "Initialize System" to create the table'
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
            suggestion: 'Click "Initialize System" to fix'
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
            suggestion: 'Click "Initialize System" to create the function'
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
            suggestion: 'Click "Initialize System" to fix'
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
                Payment allocation may not work correctly. Try the options below to fix.
              </AlertDescription>
            </Alert>

            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={handleInitialize}
                disabled={isInitializing}
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
              >
                {isInitializing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Initializing...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Initialize System
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={runStatusChecks}
                disabled={isInitializing}
              >
                Refresh Status
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
