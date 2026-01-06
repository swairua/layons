import React from 'react';
import { AuditManagement } from '@/components/AuditManagement';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export function AuditLogs() {
  const { user, profile, loading, isAdmin } = useAuth();

  // Show loading state while profile is being fetched
  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  // Check if user is authenticated and is admin
  if (!user || !isAdmin) {
    return (
      <div className="space-y-6 p-6">
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-900">
            You don't have permission to access audit logs. Only administrators can view system audit trails.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>Audit Log Viewer</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600">
              Audit logs contain sensitive information about user activities and deletions. Access is restricted to
              system administrators and compliance officers.
            </p>
            <p className="text-slate-600 mt-4">
              If you believe you should have access, please contact your system administrator.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <AuditManagement />
    </div>
  );
}

export default AuditLogs;
