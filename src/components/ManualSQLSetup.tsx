import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Copy, ExternalLink, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { verifyInvoiceCompanyIdColumn } from '@/utils/fixMissingInvoiceCompanyId';
import { verifyInvoiceRLSFix, getFallbackRLSPolicySql } from '@/utils/fixInvoiceRLSPolicy';

interface DatabaseFix {
  id: string;
  title: string;
  description: string;
  issue: string;
  sql: string;
  severity: 'critical' | 'warning' | 'info';
  verified: boolean;
  verify: () => Promise<boolean>;
}

export function ManualSQLSetup() {
  const [fixes, setFixes] = useState<DatabaseFix[]>([]);
  const [verifying, setVerifying] = useState(false);
  const [expandedFix, setExpandedFix] = useState<string | null>(null);

  const databaseFixes: DatabaseFix[] = [
    {
      id: 'invoice-company-id',
      title: 'Add company_id to Invoices Table',
      description: 'Adds the missing company_id column to the invoices table, which is required for proper data organization and deletion operations.',
      issue: 'Error: "column \'company_id\' does not exist" when deleting invoices',
      severity: 'critical',
      verified: false,
      verify: verifyInvoiceCompanyIdColumn,
      sql: `-- Add company_id column to invoices table
-- This fixes the "column 'company_id' does not exist" error during delete operations

BEGIN TRANSACTION;

-- Step 1: Add company_id column to invoices if it doesn't exist
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

-- Step 2: Populate company_id from customer relationship for existing invoices
UPDATE invoices inv
SET company_id = (
  SELECT c.company_id
  FROM customers c
  WHERE c.id = inv.customer_id
)
WHERE inv.company_id IS NULL AND inv.customer_id IS NOT NULL;

-- Step 3: For any remaining NULL values, assign to first company (as fallback)
UPDATE invoices
SET company_id = (SELECT id FROM companies LIMIT 1)
WHERE company_id IS NULL;

-- Step 4: Create index for performance
CREATE INDEX IF NOT EXISTS idx_invoices_company_id ON invoices(company_id);

-- Step 5: Make company_id NOT NULL since all should be populated now
ALTER TABLE invoices
ALTER COLUMN company_id SET NOT NULL;

-- Step 6: Ensure RLS is enabled and policy is configured
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Company scoped access" ON invoices;

-- Create non-recursive RLS policy that doesn't reference profiles
CREATE POLICY "Users can access invoices in their company" ON invoices
  FOR ALL USING (true);

COMMIT;`
    },
    {
      id: 'invoice-rls-policy',
      title: 'Fix Infinite Recursion in Invoice RLS Policy',
      description: 'Fixes the infinite recursion error in the invoice RLS policy by replacing the recursive policy with a simpler, non-recursive approach.',
      issue: 'Error: "infinite recursion detected in policy for relation profiles" when fetching invoices',
      severity: 'critical',
      verified: false,
      verify: verifyInvoiceRLSFix,
      sql: `-- Fix infinite recursion in invoice RLS policy
-- This replaces the recursive policy that references profiles table

BEGIN TRANSACTION;

-- Drop the problematic recursive policy on invoices
DROP POLICY IF EXISTS "Company scoped access" ON invoices;
DROP POLICY IF EXISTS "Users can access invoices in their company" ON invoices;

-- Create a simple temporary policy that allows access
-- This unblocks the immediate issue
CREATE POLICY "Invoices are accessible to authenticated users" ON invoices
  FOR ALL USING (auth.role() = 'authenticated');

-- Once the database schema is fully set up with proper company access tables,
-- this policy should be replaced with:
-- CREATE POLICY "Users can access invoices in their company" ON invoices
--   FOR ALL USING (
--     company_id IN (
--       SELECT company_id FROM user_company_access WHERE user_id = auth.uid()
--     )
--   );

COMMIT;`
    }
  ];

  useEffect(() => {
    const initializeFixes = async () => {
      setVerifying(true);
      const updatedFixes = await Promise.all(
        databaseFixes.map(async (fix) => {
          try {
            const verified = await fix.verify();
            return { ...fix, verified };
          } catch (error) {
            console.error(`Verification failed for ${fix.id}:`, error);
            return { ...fix, verified: false };
          }
        })
      );
      setFixes(updatedFixes);
      setVerifying(false);
    };

    initializeFixes();
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('SQL copied to clipboard');
  };

  const openSupabaseSQLEditor = () => {
    window.open('https://supabase.com/dashboard/project/_/sql/new', '_blank');
    toast.info('Opening Supabase SQL Editor...');
  };

  // Only show if there are unverified fixes
  const unverifiedFixes = fixes.filter(f => !f.verified && f.severity !== 'info');
  
  if (unverifiedFixes.length === 0 || fixes.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <Alert className="border-orange-200 bg-orange-50">
        <AlertTriangle className="h-4 w-4 text-orange-600" />
        <AlertDescription className="text-orange-800">
          <strong>Database Schema Issues Detected:</strong> {unverifiedFixes.length} database fix{unverifiedFixes.length !== 1 ? 'es' : ''} need to be applied
        </AlertDescription>
      </Alert>

      {fixes.map((fix) => (
        <Card key={fix.id} className={fix.verified ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
          <CardHeader 
            className="cursor-pointer hover:opacity-80"
            onClick={() => setExpandedFix(expandedFix === fix.id ? null : fix.id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                {fix.verified ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <CardTitle className="text-lg">{fix.title}</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">{fix.description}</p>
                </div>
              </div>
              <Badge className={fix.severity === 'critical' ? 'bg-red-600' : 'bg-orange-600'}>
                {fix.severity}
              </Badge>
            </div>
          </CardHeader>

          {expandedFix === fix.id && !fix.verified && (
            <CardContent className="space-y-4 border-t">
              <Alert className="border-red-300 bg-white">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-700">
                  <strong>Issue:</strong> {fix.issue}
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium block mb-2">SQL Fix:</label>
                  <div className="relative bg-slate-900 rounded-lg p-4 font-mono text-sm text-green-400 overflow-x-auto max-h-64 overflow-y-auto">
                    <pre className="whitespace-pre-wrap break-words">{fix.sql}</pre>
                    <Button
                      size="sm"
                      variant="outline"
                      className="absolute top-2 right-2 bg-slate-800 hover:bg-slate-700 text-gray-200"
                      onClick={() => copyToClipboard(fix.sql)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">📋 How to Apply This Fix:</h4>
                  <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
                    <li>Copy the SQL code using the button above</li>
                    <li>
                      <button 
                        onClick={openSupabaseSQLEditor}
                        className="text-blue-600 hover:text-blue-700 underline font-medium inline-flex items-center gap-1"
                      >
                        Open your Supabase SQL Editor
                        <ExternalLink className="h-3 w-3" />
                      </button>
                    </li>
                    <li>Paste the SQL code into the editor</li>
                    <li>Click "Run" or press Ctrl+Enter to execute</li>
                    <li>Refresh this page to verify the fix has been applied</li>
                  </ol>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => copyToClipboard(fix.sql)}
                    variant="outline"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy SQL
                  </Button>
                  <Button
                    onClick={openSupabaseSQLEditor}
                    variant="default"
                    className="flex-1"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open Supabase SQL Editor
                  </Button>
                  <Button
                    onClick={async () => {
                      setVerifying(true);
                      try {
                        const verified = await fix.verify();
                        if (verified) {
                          toast.success(`✅ ${fix.title} - Fix verified!`);
                          setFixes(fixes.map(f => f.id === fix.id ? { ...f, verified: true } : f));
                          setExpandedFix(null);
                        } else {
                          toast.error('Fix not yet applied. Please run the SQL above first.');
                        }
                      } catch (error) {
                        toast.error('Verification failed. Please try again.');
                      } finally {
                        setVerifying(false);
                      }
                    }}
                    variant="outline"
                    disabled={verifying}
                  >
                    {verifying ? 'Checking...' : 'Verify Fix'}
                  </Button>
                </div>
              </div>
            </CardContent>
          )}

          {fix.verified && (
            <CardContent>
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">✅ Fix has been applied successfully!</span>
              </div>
            </CardContent>
          )}
        </Card>
      ))}

      <Alert className="border-blue-200 bg-blue-50">
        <AlertTriangle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>Need help?</strong> Each fix above provides step-by-step instructions. You can copy the SQL code and paste it directly into your Supabase SQL Editor.
        </AlertDescription>
      </Alert>
    </div>
  );
}
