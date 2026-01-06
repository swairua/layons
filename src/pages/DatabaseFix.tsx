import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Copy, CheckCircle, ExternalLink, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { fixDeleteInvoiceRLS } from '@/utils/fixDeleteInvoiceRLS';
import { supabase } from '@/integrations/supabase/client';

export default function DatabaseFix() {
  const [isApplying, setIsApplying] = useState(false);
  const [fixStatus, setFixStatus] = useState<'idle' | 'applying' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [copied, setCopied] = useState(false);

  const sqlFix = `BEGIN TRANSACTION;

-- Drop the problematic policy that references non-existent company_id column
DROP POLICY IF EXISTS "Users can access invoices in their company" ON invoices;
DROP POLICY IF EXISTS "Company scoped access" ON invoices;
DROP POLICY IF EXISTS "Invoices are accessible to authenticated users" ON invoices;

-- Create a simple permissive policy for authenticated users
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage invoices" ON invoices
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

COMMIT;`;

  const handleAutomaticFix = async () => {
    setIsApplying(true);
    setFixStatus('applying');
    try {
      const result = await fixDeleteInvoiceRLS();
      if (result.success) {
        setFixStatus('success');
        toast.success('✅ RLS policy fixed successfully!');
        setTimeout(() => {
          window.location.href = '/invoices';
        }, 2000);
      } else {
        setFixStatus('error');
        setErrorMessage('Automatic fix failed. Please use the manual method below.');
        toast.error('Automatic fix failed - please use manual method');
      }
    } catch (error) {
      setFixStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error occurred');
      toast.error('Error applying fix');
    } finally {
      setIsApplying(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(sqlFix);
      setCopied(true);
      toast.success('SQL copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy SQL');
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Database Configuration</h1>
        <p className="text-muted-foreground mt-2">
          Fix RLS (Row Level Security) policy issues to enable invoice deletion
        </p>
      </div>

      {fixStatus === 'success' && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-900">Success!</AlertTitle>
          <AlertDescription className="text-green-800">
            The RLS policy has been fixed successfully. Redirecting you to invoices...
          </AlertDescription>
        </Alert>
      )}

      {fixStatus === 'error' && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-900">Fix Failed</AlertTitle>
          <AlertDescription className="text-red-800">
            {errorMessage}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-600" />
            Automatic Fix (Recommended)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Click the button below to automatically apply the RLS policy fix. This requires that you have a valid Supabase session and database access.
          </p>
          <Button 
            onClick={handleAutomaticFix}
            disabled={isApplying || fixStatus === 'success'}
            size="lg"
            className="gap-2"
          >
            {isApplying ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Applying Fix...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" />
                Apply Fix Automatically
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manual Fix (If Automatic Fails)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            If the automatic fix doesn't work, you can manually apply the SQL in Supabase SQL Editor:
          </p>

          <div className="bg-slate-900 text-slate-100 p-4 rounded font-mono text-xs overflow-x-auto max-h-96 overflow-y-auto">
            <pre>{sqlFix}</pre>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={handleCopy}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              {copied ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy SQL
                </>
              )}
            </Button>
            <Button 
              variant="default"
              size="sm"
              onClick={() => window.open('https://supabase.com/dashboard', '_blank')}
              className="gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Open Supabase Dashboard
            </Button>
          </div>

          <Alert>
            <AlertTitle className="text-sm">Steps to apply manually:</AlertTitle>
            <AlertDescription className="text-sm space-y-2 mt-2">
              <ol className="list-decimal list-inside space-y-1">
                <li>Click "Open Supabase Dashboard"</li>
                <li>Select your project</li>
                <li>Navigate to <strong>SQL Editor</strong></li>
                <li>Click <strong>New Query</strong></li>
                <li>Paste the SQL above (click "Copy SQL" to copy)</li>
                <li>Click <strong>Run</strong> button</li>
                <li>Return here and click "Check Fix"</li>
              </ol>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">What is this fix?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Your Supabase database has an RLS (Row Level Security) policy on the invoices table that references a <code className="bg-slate-100 px-2 py-1 rounded">company_id</code> column that doesn't exist.
          </p>
          <p>
            This prevents the delete operation from working with the error: <code className="bg-slate-100 px-2 py-1 rounded text-xs">record "old" has no field "company_id"</code>
          </p>
          <p>
            The fix drops the problematic policy and creates a simpler one that allows authenticated users to manage invoices.
          </p>
        </CardContent>
      </Card>

      <Button 
        variant="outline"
        onClick={() => window.location.href = '/invoices'}
      >
        Back to Invoices
      </Button>
    </div>
  );
}
