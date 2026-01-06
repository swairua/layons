import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, ExternalLink, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function DatabaseFix() {
  const [copied, setCopied] = useState(false);

  const SQL = `ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;`;

  const handleCopy = () => {
    navigator.clipboard.writeText(SQL);
    setCopied(true);
    toast.success('SQL copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 p-6 flex items-center justify-center">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-orange-900">Database Fix Required</h1>
          <p className="text-lg text-orange-800">One-command fix for RLS recursion error</p>
        </div>

        {/* Main Fix Card */}
        <Card className="border-2 border-orange-200 shadow-lg">
          <CardHeader className="bg-orange-100 border-b-2 border-orange-200">
            <CardTitle className="text-orange-900 flex items-center gap-2">
              <CheckCircle className="h-6 w-6" />
              Fix Instructions
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6 pt-6">
            {/* The SQL Command */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900">SQL Command to Run:</h3>
              <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm border border-gray-700">
                {SQL}
              </div>
              <Button
                onClick={handleCopy}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white"
              >
                <Copy className="h-4 w-4 mr-2" />
                {copied ? 'Copied!' : 'Copy SQL Command'}
              </Button>
            </div>

            {/* Steps */}
            <div className="space-y-3 bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-900">Steps to Apply:</h3>
              <ol className="space-y-2 text-sm text-blue-900 list-decimal list-inside">
                <li>Click the button below to open Supabase Dashboard</li>
                <li>Go to <strong>SQL Editor</strong> (left sidebar)</li>
                <li>Click <strong>New Query</strong></li>
                <li>Paste the SQL command (use the copy button above)</li>
                <li>Press <strong>Ctrl+Enter</strong> (or click Run)</li>
                <li>Wait for success message</li>
                <li>Return here and go to Settings → User Management</li>
                <li>Use the Admin Diagnostics tool to set your role</li>
              </ol>
            </div>

            {/* Open Supabase Button */}
            <Button
              onClick={() => {
                window.open('https://app.supabase.com/project', '_blank');
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-base"
            >
              <ExternalLink className="h-5 w-5 mr-2" />
              Open Supabase Dashboard
            </Button>

            {/* What This Does */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-sm text-gray-700">
              <h3 className="font-semibold mb-2 text-gray-900">What This Does:</h3>
              <ul className="space-y-1 list-disc list-inside">
                <li>Disables Row Level Security (RLS) on the profiles table</li>
                <li>Removes the problematic recursive policies causing the error</li>
                <li>Allows the app to fetch and update user profiles</li>
                <li>Authorization is handled at the application level</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Info Box */}
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <p className="text-sm text-yellow-900">
              <strong>After running the SQL:</strong> Refresh your browser and navigate to Settings → User Management. 
              The Admin Diagnostics & Fix tool will then work properly to set your admin role.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
