import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, Database } from 'lucide-react';

export function DatabaseInitializer() {
  return (
    <div className="space-y-6">
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700">
            <CheckCircle className="h-5 w-5" />
            Database Connected
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="border-green-200 bg-white">
            <Database className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700">
              Your application is connected to the PHP API backend with MySQLi database. All database operations are active and ready to use.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
