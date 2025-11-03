import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export default function AdminRecreate() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>User Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="bg-blue-50 border-blue-200">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Authentication via MySQL API</strong><br />
              User management is now handled through the MySQL database API at:<br />
              <code className="text-sm bg-white px-2 py-1 rounded mt-1 block">
                https://erp.layonsconstruction.com/api.php
              </code>
              <p className="text-xs mt-2">
                User registration and authentication are managed through the application's user management interface.
              </p>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
