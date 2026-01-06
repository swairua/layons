import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BarChart3 } from 'lucide-react';

export function AuditDashboard() {
  return (
    <div className="space-y-4">
      <Alert className="border-blue-200 bg-blue-50">
        <BarChart3 className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-900">
          Audit Dashboard - Detailed activity overview coming soon
        </AlertDescription>
      </Alert>
      
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Total Activities</p>
              <p className="text-3xl font-bold">-</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Deletions</p>
              <p className="text-3xl font-bold">-</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Creations</p>
              <p className="text-3xl font-bold">-</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Updates</p>
              <p className="text-3xl font-bold">-</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
