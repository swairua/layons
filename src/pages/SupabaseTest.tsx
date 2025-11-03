import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertTriangle, Database } from 'lucide-react';
import { layonsApi } from '@/integrations/layonsApi/client';

export default function SupabaseTest() {
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const testConnection = async () => {
    setConnectionStatus('testing');
    setMessage('Testing PHP API connection...');

    try {
      const result = await layonsApi.getAll('companies');
      
      if (Array.isArray(result)) {
        setConnectionStatus('success');
        setMessage(`✅ PHP API is connected and working. Found ${result.length} companies.`);
      } else {
        setConnectionStatus('error');
        setMessage('❌ Unexpected response format from API');
      }
    } catch (error: any) {
      setConnectionStatus('error');
      setMessage(`❌ Connection failed: ${error.message}`);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">PHP API Connection Test</h1>
        <p className="text-muted-foreground">
          Verify that your application is connected to the PHP API backend
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Connection Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            {connectionStatus === 'idle' && (
              <Button onClick={testConnection} className="w-full">
                Test PHP API Connection
              </Button>
            )}
            {connectionStatus === 'testing' && (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
                <span>Testing connection...</span>
              </div>
            )}
            {(connectionStatus === 'success' || connectionStatus === 'error') && (
              <div>
                <Alert className={connectionStatus === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                  {connectionStatus === 'success' ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                  )}
                  <AlertDescription className={connectionStatus === 'success' ? 'text-green-800' : 'text-red-800'}>
                    {message}
                  </AlertDescription>
                </Alert>
                <Button onClick={testConnection} variant="outline" className="w-full mt-4">
                  Test Again
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Alert>
        <Database className="h-4 w-4" />
        <AlertDescription>
          This page verifies connectivity to your PHP API backend with MySQLi database. All application features rely on this connection working properly.
        </AlertDescription>
      </Alert>
    </div>
  );
}
