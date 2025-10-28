import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { format } from 'date-fns';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface AuditLog {
  id: string;
  company_id: string;
  user_id: string;
  action: 'delete' | 'create' | 'update' | 'restore';
  entity_type: string;
  entity_id: string;
  entity_name?: string;
  entity_number?: string;
  details?: Record<string, any>;
  deleted_data?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  timestamp: string;
  created_at: string;
}

const ACTION_COLORS: Record<string, string> = {
  delete: 'destructive',
  create: 'success',
  update: 'secondary',
  restore: 'default',
};

const ACTION_LABELS: Record<string, string> = {
  delete: '🗑️ Deleted',
  create: '✨ Created',
  update: '✏️ Updated',
  restore: '↩️ Restored',
};

export function AuditTrailViewer() {
  const { currentCompany } = useCompany();
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string | undefined>();
  const [entityTypeFilter, setEntityTypeFilter] = useState<string | undefined>();
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const { data: auditLogs, isLoading, error } = useQuery({
    queryKey: ['audit_logs', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];

      let query = supabase
        .from('audit_logs')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('timestamp', { ascending: sortOrder === 'asc' })
        .limit(1000);

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as AuditLog[];
    },
    enabled: !!currentCompany?.id,
  });

  const { data: users } = useQuery({
    queryKey: ['profiles', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return {};

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('company_id', currentCompany.id);

      if (error) throw error;

      const userMap: Record<string, string> = {};
      data?.forEach((user) => {
        userMap[user.id] = user.full_name || user.email || 'Unknown';
      });
      return userMap;
    },
    enabled: !!currentCompany?.id,
  });

  const filteredLogs = (auditLogs || []).filter((log) => {
    const matchesSearch =
      !searchTerm ||
      log.entity_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entity_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entity_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      users?.[log.user_id]?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesAction = !actionFilter || log.action === actionFilter;
    const matchesEntityType = !entityTypeFilter || log.entity_type === entityTypeFilter;

    return matchesSearch && matchesAction && matchesEntityType;
  });

  const actions = ['delete', 'create', 'update', 'restore'];
  const entityTypes = Array.from(new Set((auditLogs || []).map((log) => log.entity_type))).sort();

  const getActionColor = (action: string): 'destructive' | 'success' | 'secondary' | 'default' => {
    const color = ACTION_COLORS[action];
    return (color as any) || 'default';
  };

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle>Error Loading Audit Trail</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">{error instanceof Error ? error.message : 'Unknown error'}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Complete Audit Trail</CardTitle>
          <CardDescription>
            All create, update, delete, and restore actions across your company
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <Input
              placeholder="Search by name, number, type, or user..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <Select value={actionFilter || ''} onValueChange={(v) => setActionFilter(v || undefined)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Actions</SelectItem>
                {actions.map((action) => (
                  <SelectItem key={action} value={action}>
                    {ACTION_LABELS[action]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={entityTypeFilter || ''} onValueChange={(v) => setEntityTypeFilter(v || undefined)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Types</SelectItem>
                {entityTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            >
              {sortOrder === 'desc' ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronUp className="w-4 h-4" />
              )}
            </Button>
          </div>

          {/* Table */}
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Action</TableHead>
                  <TableHead>Entity Type</TableHead>
                  <TableHead>Name / Number</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead className="text-right">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Loading audit trail...
                    </TableCell>
                  </TableRow>
                ) : filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                      {auditLogs?.length === 0 ? 'No audit events yet' : 'No matches found'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-slate-50">
                      <TableCell>
                        <Badge variant={getActionColor(log.action)}>
                          {ACTION_LABELS[log.action]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.entity_type}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {log.entity_name && <p className="font-medium">{log.entity_name}</p>}
                          {log.entity_number && <p className="text-xs text-slate-500">{log.entity_number}</p>}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {users?.[log.user_id] || 'Unknown'}
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {format(new Date(log.timestamp || log.created_at), 'MMM dd, HH:mm')}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {log.ip_address || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedLog(log);
                            setShowDetails(true);
                          }}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Summary */}
          {(auditLogs?.length || 0) > 0 && (
            <div className="text-sm text-slate-600">
              Showing {filteredLogs.length} of {auditLogs?.length} audit records
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Modal */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Audit Event Details</DialogTitle>
            <DialogDescription>
              Complete information about this action
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4">
              {/* Header Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Action</p>
                  <p className="font-medium">{ACTION_LABELS[selectedLog.action]}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Entity Type</p>
                  <p className="font-medium">{selectedLog.entity_type}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Entity ID</p>
                  <p className="font-mono text-sm">{selectedLog.entity_id}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Timestamp</p>
                  <p className="font-medium">
                    {format(new Date(selectedLog.timestamp || selectedLog.created_at), 'MMM dd, yyyy HH:mm:ss')}
                  </p>
                </div>
              </div>

              {selectedLog.entity_name && (
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Name</p>
                  <p className="font-medium">{selectedLog.entity_name}</p>
                </div>
              )}

              {selectedLog.entity_number && (
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Number</p>
                  <p className="font-medium">{selectedLog.entity_number}</p>
                </div>
              )}

              {/* User Info */}
              <div className="border-t pt-4">
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">User Information</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-600">User</p>
                    <p className="font-medium">{users?.[selectedLog.user_id] || 'Unknown'}</p>
                  </div>
                  {selectedLog.ip_address && (
                    <div>
                      <p className="text-slate-600">IP Address</p>
                      <p className="font-mono text-xs">{selectedLog.ip_address}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Details */}
              {selectedLog.details && (
                <div className="border-t pt-4">
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Action Details</p>
                  <div className="bg-slate-50 rounded p-3 text-xs font-mono overflow-x-auto">
                    <pre>{JSON.stringify(selectedLog.details, null, 2)}</pre>
                  </div>
                </div>
              )}

              {/* Deleted Data */}
              {selectedLog.deleted_data && (
                <div className="border-t pt-4">
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Deleted Record Data</p>
                  <div className="bg-slate-50 rounded p-3 text-xs font-mono overflow-x-auto">
                    <pre>{JSON.stringify(selectedLog.deleted_data, null, 2)}</pre>
                  </div>
                </div>
              )}

              {selectedLog.user_agent && (
                <div className="border-t pt-4">
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Browser Information</p>
                  <p className="text-xs text-slate-600 font-mono break-all">{selectedLog.user_agent}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
