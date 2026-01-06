import { useState } from 'react';
import { AlertCircle, Copy, CheckCircle } from 'lucide-react';
import { getDisableRLSSql } from '@/utils/disableInvoiceRLS';
import { toast } from 'sonner';

export function RLSRecursionFixGuide() {
  const [copied, setCopied] = useState(false);

  const sqlFix = getDisableRLSSql();

  const copyToClipboard = () => {
    navigator.clipboard.writeText(sqlFix);
    setCopied(true);
    toast.success('SQL copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-orange-50 border-l-4 border-orange-500 p-6 rounded">
      <div className="flex items-start gap-4">
        <AlertCircle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-orange-900 mb-2">
            RLS Recursion Detected
          </h3>
          <p className="text-orange-800 text-sm mb-4">
            The database has RLS (Row Level Security) policies that cause infinite recursion.
            This prevents the application from accessing data properly.
          </p>

          <div className="bg-white rounded p-4 mb-4 border border-orange-200">
            <h4 className="font-medium text-gray-900 mb-3">Quick Fix (2 minutes):</h4>
            <ol className="space-y-2 text-sm text-gray-700">
              <li className="flex gap-3">
                <span className="font-semibold text-orange-600 flex-shrink-0">1.</span>
                <span>Go to <strong>Supabase Dashboard</strong> → <strong>SQL Editor</strong></span>
              </li>
              <li className="flex gap-3">
                <span className="font-semibold text-orange-600 flex-shrink-0">2.</span>
                <span>Click the button below to copy the SQL fix</span>
              </li>
              <li className="flex gap-3">
                <span className="font-semibold text-orange-600 flex-shrink-0">3.</span>
                <span>Paste the SQL into the editor and click <strong>Run</strong></span>
              </li>
              <li className="flex gap-3">
                <span className="font-semibold text-orange-600 flex-shrink-0">4.</span>
                <span>Refresh your browser - the error should be gone!</span>
              </li>
            </ol>
          </div>

          <button
            onClick={copyToClipboard}
            className={`flex items-center gap-2 px-4 py-2 rounded font-medium transition-colors ${
              copied
                ? 'bg-green-600 text-white'
                : 'bg-orange-600 text-white hover:bg-orange-700'
            }`}
          >
            {copied ? (
              <>
                <CheckCircle className="w-4 h-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy SQL Fix
              </>
            )}
          </button>

          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-medium text-orange-900 hover:text-orange-700">
              What does this fix do?
            </summary>
            <div className="mt-2 text-sm text-orange-800 bg-white p-3 rounded border border-orange-200">
              <ul className="space-y-1 list-disc list-inside">
                <li>Disables RLS on all tables to eliminate infinite recursion</li>
                <li>Removes all problematic security policies</li>
                <li>Adds the missing company_id column to invoices</li>
                <li>Ensures data integrity by linking invoices to companies</li>
              </ul>
              <p className="mt-2 text-orange-700">
                <strong>Security Note:</strong> Company data isolation is now handled at the application layer instead of the database layer.
              </p>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
