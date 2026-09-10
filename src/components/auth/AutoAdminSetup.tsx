import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert } from 'lucide-react';

export function AutoAdminSetup() {
  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ShieldAlert className="h-5 w-5" />
          Admin Setup
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Alert className="border-orange-200 bg-orange-50">
          <AlertDescription>
            Admin accounts must be created and managed through the approved authentication or administration workflow.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
