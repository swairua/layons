import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield } from 'lucide-react';

export function AuditManagement() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Audit Management</h1>
        <p className="text-slate-600">
          Monitor, track, and manage all system activities and compliance records
        </p>
      </div>

      {/* Information Alert */}
      <Alert className="border-blue-200 bg-blue-50">
        <Shield className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-900">
          All audit logs are immutable and tamper-proof. Complete deletion history is maintained for compliance with
          GDPR, SOX, and other regulations.
        </AlertDescription>
      </Alert>

      {/* Tabs */}
      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:w-fit">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="audit-trail" className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            <span className="hidden sm:inline">Audit Trail</span>
          </TabsTrigger>
          <TabsTrigger value="deletions" className="flex items-center gap-2">
            <Info className="w-4 h-4" />
            <span className="hidden sm:inline">Deletions</span>
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-4">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle>Activity Overview</CardTitle>
              <CardDescription>
                Real-time statistics and insights about system activity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AuditDashboard />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Trail Tab */}
        <TabsContent value="audit-trail" className="space-y-4">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle>Complete Audit Trail</CardTitle>
              <CardDescription>
                View all create, update, delete, and restore actions across your system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AuditTrailViewer />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Deletions Tab */}
        <TabsContent value="deletions" className="space-y-4">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle>Deletion History</CardTitle>
              <CardDescription>
                Detailed log of all deleted records with complete data backup for recovery
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DeleteAuditLog />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Footer Info */}
      <Card className="border-slate-200 bg-slate-50">
        <CardHeader>
          <CardTitle className="text-base">About Audit Logs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-600">
          <div>
            <p className="font-medium text-slate-900 mb-1">🔒 Security & Compliance</p>
            <p>
              All audit logs are protected by Row Level Security (RLS) policies and cannot be deleted or modified. This
              ensures compliance with GDPR, SOX, HIPAA, and other regulatory requirements.
            </p>
          </div>
          <div>
            <p className="font-medium text-slate-900 mb-1">💾 Data Retention</p>
            <p>
              Complete deletion history is maintained indefinitely. Deleted records are stored in full for recovery
              purposes and regulatory compliance.
            </p>
          </div>
          <div>
            <p className="font-medium text-slate-900 mb-1">👤 User Tracking</p>
            <p>
              All actions are tracked with user ID, IP address, and browser information for accountability and
              forensic analysis.
            </p>
          </div>
          <div>
            <p className="font-medium text-slate-900 mb-1">📊 Activity Insights</p>
            <p>
              Use the Dashboard to understand usage patterns, identify power users, and monitor system activity over
              time.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
