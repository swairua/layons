import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function AdminDiagnostics() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

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

                {error.includes('infinite recursion') && (
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-xs">
                    <p className="font-semibold mb-2">🔧 How to Fix This:</p>
                    <ol className="list-decimal list-inside space-y-1 mb-3">
                      <li>Go to your Supabase Dashboard</li>
                      <li>Navigate to SQL Editor (left sidebar)</li>
                      <li>Create a new SQL query</li>
                      <li>Copy and paste the SQL from <code className="bg-white px-1 rounded">FIX_PROFILES_RLS_RECURSION.sql</code> in the project root</li>
                      <li>Click "Run" or press Ctrl+Enter</li>
                      <li>Wait for completion, then refresh your browser</li>
                    </ol>
                    <p className="text-xs">This will remove the problematic RLS policies that are causing infinite recursion.</p>
                  </div>
                )}
              </div>
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
