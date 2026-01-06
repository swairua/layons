import React from 'react';
import { Card, CardContent, CardDescription } from '@/components/ui/card';

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

const COLORS = {
  delete: '#ef4444',
  create: '#22c55e',
  update: '#3b82f6',
  restore: '#8b5cf6',
};

export function AuditDashboard() {
  const { currentCompany } = useCurrentCompany();
  const [timeRange, setTimeRange] = useState<'7' | '30' | '90'>('30');

  const { data: auditLogs } = useQuery({
    queryKey: ['audit_logs', currentCompany?.id, timeRange],
    queryFn: async () => {
      if (!currentCompany?.id) return [];

      const startDate = subDays(new Date(), parseInt(timeRange));

      let query = supabase
        .from('audit_logs')
        .select('*')
        .eq('company_id', currentCompany.id)
        .gte('timestamp', startDate.toISOString())
        .order('timestamp', { ascending: false });

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

  // Calculate statistics
  const stats = React.useMemo(() => {
    const logs = auditLogs || [];
    const total = logs.length;
    const deletes = logs.filter((l) => l.action === 'delete').length;
    const creates = logs.filter((l) => l.action === 'create').length;
    const updates = logs.filter((l) => l.action === 'update').length;
    const restores = logs.filter((l) => l.action === 'restore').length;

    const actionCounts = {
      delete: deletes,
      create: creates,
      update: updates,
      restore: restores,
    };

    const entityCounts: Record<string, number> = {};
    logs.forEach((log) => {
      entityCounts[log.entity_type] = (entityCounts[log.entity_type] || 0) + 1;
    });

    const userCounts: Record<string, number> = {};
    logs.forEach((log) => {
      const userName = users?.[log.user_id] || 'Unknown';
      userCounts[userName] = (userCounts[userName] || 0) + 1;
    });

    // Daily activity
    const dailyActivity: Record<string, Record<string, number>> = {};
    logs.forEach((log) => {
      const date = format(new Date(log.timestamp || log.created_at), 'MMM dd');
      if (!dailyActivity[date]) {
        dailyActivity[date] = {
          delete: 0,
          create: 0,
          update: 0,
          restore: 0,
        };
      }
      dailyActivity[date][log.action]++;
    });

    const dailyData = Object.entries(dailyActivity)
      .reverse()
      .slice(0, 14)
      .map(([date, counts]) => ({
        date,
        ...counts,
      }));

    return {
      total,
      deletes,
      creates,
      updates,
      restores,
      actionCounts,
      entityCounts,
      userCounts,
      dailyData,
    };
  }, [auditLogs, users]);

  const actionChartData = Object.entries(stats.actionCounts).map(([action, count]) => ({
    name: action.charAt(0).toUpperCase() + action.slice(1),
    value: count,
    fill: COLORS[action as keyof typeof COLORS],
  }));

  const entityChartData = Object.entries(stats.entityCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([entity, count]) => ({
      name: entity,
      value: count,
    }));

  const userChartData = Object.entries(stats.userCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([user, count]) => ({
      name: user,
      value: count,
    }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Audit Dashboard</h2>
          <p className="text-slate-600">Track all actions and activity</p>
        </div>
        <Select value={timeRange} onValueChange={(v) => setTimeRange(v as '7' | '30' | '90')}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-slate-500">audit events</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-red-600">🗑️ Deletions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.deletes}</div>
            <p className="text-xs text-slate-500">
              {stats.total > 0 ? ((stats.deletes / stats.total) * 100).toFixed(0) : 0}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-green-600">✨ Creations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.creates}</div>
            <p className="text-xs text-slate-500">
              {stats.total > 0 ? ((stats.creates / stats.total) * 100).toFixed(0) : 0}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-blue-600">✏️ Updates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.updates}</div>
            <p className="text-xs text-slate-500">
              {stats.total > 0 ? ((stats.updates / stats.total) * 100).toFixed(0) : 0}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-purple-600">↩️ Restores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.restores}</div>
            <p className="text-xs text-slate-500">
              {stats.total > 0 ? ((stats.restores / stats.total) * 100).toFixed(0) : 0}% of total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Activity Over Time</CardTitle>
            <CardDescription>Actions per day</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="delete" stackId="a" fill={COLORS.delete} />
                <Bar dataKey="create" stackId="a" fill={COLORS.create} />
                <Bar dataKey="update" stackId="a" fill={COLORS.update} />
                <Bar dataKey="restore" stackId="a" fill={COLORS.restore} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Action Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Action Distribution</CardTitle>
            <CardDescription>Breakdown by action type</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={actionChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {actionChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Entity Types */}
        <Card>
          <CardHeader>
            <CardTitle>Most Active Entity Types</CardTitle>
            <CardDescription>Top 10 entities by action count</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={entityChartData}
                layout="vertical"
                margin={{ left: 100, right: 30, top: 5, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Users */}
        <Card>
          <CardHeader>
            <CardTitle>Most Active Users</CardTitle>
            <CardDescription>Top 10 users by action count</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={userChartData}
                layout="vertical"
                margin={{ left: 120, right: 30, top: 5, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={120} />
                <Tooltip />
                <Bar dataKey="value" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity Summary</CardTitle>
          <CardDescription>Latest actions in the system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(auditLogs || []).slice(0, 10).map((log) => (
              <div key={log.id} className="flex items-start justify-between border-b pb-4 last:border-0">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        log.action === 'delete'
                          ? 'destructive'
                          : log.action === 'create'
                          ? 'default'
                          : 'secondary'
                      }
                    >
                      {log.action}
                    </Badge>
                    <span className="font-medium">{log.entity_type}</span>
                    {log.entity_name && <span className="text-sm text-slate-600">{log.entity_name}</span>}
                  </div>
                  <p className="text-sm text-slate-600 mt-1">
                    by {users?.[log.user_id] || 'Unknown'} •{' '}
                    {format(new Date(log.timestamp || log.created_at), 'MMM dd, HH:mm')}
                  </p>
                </div>
                {log.ip_address && (
                  <div className="text-xs text-slate-500 text-right">
                    <p>{log.ip_address}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
