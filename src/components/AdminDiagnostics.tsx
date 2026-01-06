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
                <Card className="border-orange-200 bg-orange-50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-orange-900">⚠️ Database Fix Required</CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm text-orange-900 mb-3">The profiles table has RLS policies causing conflicts. This is a 1-command fix:</p>

                      <div className="bg-gray-900 text-green-400 p-3 rounded text-sm font-mono mb-3">
                        {SIMPLE_FIX_SQL}
                      </div>

                      <div className="space-y-2">
                        <Button
                          onClick={() => {
                            navigator.clipboard.writeText(SIMPLE_FIX_SQL);
                            toast.success('SQL copied! Go to Supabase SQL Editor and paste it.');
                          }}
                          className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copy SQL Command
                        </Button>

                        <Button
                          onClick={() => {
                            window.open('https://app.supabase.com/project', '_blank');
                            toast.info('Open your Supabase project, go to SQL Editor');
                          }}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                          variant="default"
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Open Supabase Dashboard
                        </Button>
                      </div>
                    </div>

                    <div className="text-xs text-orange-800 bg-white p-2 rounded border border-orange-200">
                      <p className="font-semibold mb-1">Steps:</p>
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Click "Open Supabase Dashboard" ☝️</li>
                        <li>Go to SQL Editor (left sidebar)</li>
                        <li>Click "New Query"</li>
                        <li>Paste the SQL command (click copy button)</li>
                        <li>Press Ctrl+Enter to run</li>
                        <li>Refresh this page</li>
                        <li>Click "Diagnose & Fix" again</li>
                      </ol>
                    </div>
                  </CardContent>
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
