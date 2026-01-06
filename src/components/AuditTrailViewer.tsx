import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye } from 'lucide-react';

export function AuditTrailViewer() {
  return (
    <div className="space-y-4">
      <Alert className="border-blue-200 bg-blue-50">
        <Eye className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-900">
          Audit Trail Viewer - Complete history of all system activities coming soon
        </AlertDescription>
      </Alert>

      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            Load detailed audit trail logs with search and filtering capabilities
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
