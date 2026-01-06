import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Copy, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

const SIMPLE_FIX_SQL = `ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;`;

export function AdminDiagnostics() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [showSqlFix, setShowSqlFix] = useState(false);

  // Auto-expand the SQL fix panel when recursion error is detected
  useEffect(() => {
    if (error.includes('infinite recursion')) {
      setShowSqlFix(true);
    }
  }, [error]);

  const diagnose = async () => {
    if (!email) {
      toast.error('Please enter an email address');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      // Check if profile exists
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email.toLowerCase())
        .maybeSingle();

      if (profileError) {
        setError(`Profile fetch error: ${profileError.message}`);
        setLoading(false);
        return;
      }

      if (!profile) {
        setError(`No profile found for email: ${email}`);
        setLoading(false);
        return;
      }

      setResult(profile);

      // Show diagnosis
      if (profile.role !== 'admin') {
        toast.info('User exists but is not admin. Fixing now...');
        
        // Update to admin
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ role: 'admin' })
          .eq('id', profile.id);

        if (updateError) {
          setError(`Failed to update role: ${updateError.message}`);
        } else {
          toast.success('User is now an admin! Please refresh your browser.');
        }
      } else {
        toast.success('User is already an admin!');
      }
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Admin Diagnostics & Fix</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Email Address</label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="info@construction.com"
              className="mt-1"
            />
          </div>

          <Button onClick={diagnose} disabled={loading} className="w-full">
            {loading ? 'Diagnosing...' : 'Diagnose & Fix'}
          </Button>

          {error && (
            <div className="space-y-3">
              <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                <p className="font-semibold mb-2">Error: {error}</p>
              </div>

              {error.includes('infinite recursion') && (
                <Card className="border-yellow-200 bg-yellow-50">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm text-yellow-900">🔧 Database RLS Fix Required</CardTitle>
                      <button
                        onClick={() => setShowSqlFix(!showSqlFix)}
                        className="text-yellow-700 hover:text-yellow-900"
                      >
                        {showSqlFix ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </div>
                  </CardHeader>

                  {showSqlFix && (
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-sm text-yellow-900 mb-2">The database has conflicting RLS policies. Follow these steps:</p>
                        <ol className="list-decimal list-inside space-y-2 text-xs text-yellow-800">
                          <li>Go to your <a href="https://app.supabase.com" target="_blank" rel="noopener noreferrer" className="underline font-semibold">Supabase Dashboard</a></li>
                          <li>Select your project</li>
                          <li>Go to <strong>SQL Editor</strong> (left sidebar)</li>
                          <li>Click <strong>New Query</strong></li>
                          <li>Copy the SQL below and paste it</li>
                          <li>Click <strong>Run</strong> (or press Ctrl+Enter)</li>
                          <li>Wait for success, then refresh this page</li>
                        </ol>
                      </div>

                      <div className="bg-gray-900 text-gray-100 p-3 rounded text-xs font-mono overflow-auto max-h-48">
                        {FIX_SQL}
                      </div>

                      <Button
                        onClick={() => {
                          navigator.clipboard.writeText(FIX_SQL);
                          toast.success('SQL copied to clipboard!');
                        }}
                        className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy SQL to Clipboard
                      </Button>
                    </CardContent>
                  )}
                </Card>
              )}
            </div>
          )}

          {result && (
            <div className="p-3 bg-green-50 border border-green-200 rounded text-sm space-y-2">
              <p><strong>Email:</strong> {result.email}</p>
              <p><strong>Role:</strong> <span className="font-bold text-green-700">{result.role}</span></p>
              <p><strong>Status:</strong> {result.status}</p>
              <p><strong>User ID:</strong> {result.id}</p>
              <p><strong>Company ID:</strong> {result.company_id || 'Not set'}</p>
              <p className="text-xs text-gray-600 mt-2">After fixing, sign out and sign back in for changes to take effect.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
