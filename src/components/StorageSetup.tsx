import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { HardDrive, Info } from 'lucide-react';

export default function StorageSetup() {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HardDrive className="h-5 w-5" />
          Storage Configuration
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Alert className="bg-blue-50 border-blue-200">
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Storage disabled - Using MySQL API</strong><br />
            This application now uses the MySQL database backend without integrated file storage.
            File uploads can be implemented through your server's file system or configured separately.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
