import { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Copy, CheckCircle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface RLSPolicyFixGuideProps {
  show: boolean;
  onDismiss?: () => void;
}

export function RLSPolicyFixGuide({ show, onDismiss }: RLSPolicyFixGuideProps) {
  const [copied, setCopied] = useState(false);

  if (!show) return null;

  const sqlFix = `
BEGIN TRANSACTION;

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
    <Alert className="mb-6 border-amber-200 bg-amber-50">
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <AlertTitle className="text-amber-900">Database Configuration Required</AlertTitle>
      <AlertDescription className="mt-3 text-amber-800">
        <div className="space-y-4">
          <p className="text-sm">
            The invoice management system requires a database configuration fix to enable deletion. This is a one-time setup.
          </p>

          <Card className="bg-white border-amber-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <span>Step 1: Copy the SQL</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="bg-slate-900 text-slate-100 p-4 rounded font-mono text-xs overflow-x-auto max-h-64 overflow-y-auto">
                <pre>{sqlFix}</pre>
              </div>
              <Button 
                onClick={handleCopy}
                size="sm"
                variant="outline"
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
            </CardContent>
          </Card>

          <Card className="bg-white border-amber-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Step 2: Run in Supabase</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <ol className="list-decimal list-inside space-y-2">
                <li>Go to your <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1 inline-flex">Supabase Dashboard <ExternalLink className="h-3 w-3" /></a></li>
                <li>Select your project</li>
                <li>Go to <strong>SQL Editor</strong></li>
                <li>Click <strong>New Query</strong></li>
                <li>Paste the SQL above</li>
                <li>Click <strong>Run</strong></li>
              </ol>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            {onDismiss && (
              <Button 
                onClick={onDismiss}
                variant="outline"
                size="sm"
              >
                Dismiss
              </Button>
            )}
            <Button 
              variant="default"
              size="sm"
              onClick={() => window.open('https://supabase.com', '_blank')}
            >
              Open Supabase Dashboard
            </Button>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}
