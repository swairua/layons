import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Database } from 'lucide-react';

// Note: Authentication is now handled through the MySQL API at api.php
// Supabase auth has been removed entirely.

export function AutoAdminSetup() {
  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Database className="h-5 w-5" />
          MySQL Database API
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Alert className="bg-blue-100 border-blue-300">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Database Configuration</strong><br />
            This application now uses MySQL database via the API at:<br />
            <code className="text-sm bg-white px-2 py-1 rounded mt-1 block">
              https://erp.layonsconstruction.com/api.php
            </code>
            <p className="text-xs mt-2">
              Authentication is managed through your MySQL user table. 
              Log in using your application credentials.
            </p>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
