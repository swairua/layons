import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { verifyDatabaseComplete } from '@/utils/verifyDatabaseComplete';
import { CheckCircle, AlertTriangle, Database } from 'lucide-react';

type Counts = Record<string, number | null>;

async function getTableCount(table: string): Promise<number | null> {
  try {
    const { count, error } = await supabase
      .from(table as any)
      .select('*', { count: 'exact', head: true });
    if (error) return null;
    return count ?? 0;
  } catch {
    return null;
  }
}

async function getCoreCounts(): Promise<Counts> {
  const tables = ['profiles', 'companies', 'customers', 'products', 'quotations', 'invoices'];
  const entries = await Promise.all(
    tables.map(async (t) => [t, await getTableCount(t)] as const)
  );
  return Object.fromEntries(entries);
}

export function DatabaseStatusBanner() {
  const [loading, setLoading] = React.useState(true);
  const [isComplete, setIsComplete] = React.useState<boolean | null>(null);
  const [missing, setMissing] = React.useState<{ tables: string[]; columns: Array<{ table: string; column: string }> }>({ tables: [], columns: [] });
  const [counts, setCounts] = React.useState<Counts>({});
  const [summary, setSummary] = React.useState<string>('');

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const verification = await verifyDatabaseComplete();
        const coreCounts = await getCoreCounts();
        if (!mounted) return;
        setIsComplete(verification.isComplete);
        setMissing({ tables: verification.missingTables, columns: verification.missingColumns });
        setCounts(coreCounts);
        setSummary(verification.summary);
      } catch (e) {
        setIsComplete(false);
        setSummary('Verification failed.');
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-3 flex items-center gap-2 text-muted-foreground">
          <Database className="h-4 w-4" />
          Checking database status...
        </CardContent>
      </Card>
    );
  }

  if (isComplete) {
    return (
      <Alert className="border-success bg-success-light/30">
        <CheckCircle className="h-4 w-4 text-success" />
        <AlertDescription>
          <div className="flex items-center gap-2">
            <span className="font-medium text-success">Database OK</span>
            <Badge variant="outline" className="text-success border-success">Complete</Badge>
          </div>
          <div className="mt-2 text-sm text-muted-foreground">{summary}</div>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            {Object.entries(counts).map(([t, c]) => (
              <Badge key={t} variant="secondary">{t}: {c ?? 'n/a'}</Badge>
            ))}
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription>
        <div className="flex items-center gap-2">
          <span className="font-medium">Database Incomplete</span>
          <Badge variant="outline" className="border-destructive text-destructive">Action required</Badge>
        </div>
        <div className="mt-2 text-sm">{summary || 'Some tables or columns are missing.'}</div>
        {missing.tables.length > 0 && (
          <div className="mt-2 text-xs">
            Missing tables: {missing.tables.slice(0, 6).join(', ')}{missing.tables.length > 6 ? '…' : ''}
          </div>
        )}
        {missing.columns.length > 0 && (
          <div className="mt-1 text-xs">
            Missing columns (sample): {missing.columns.slice(0, 6).map(m => `${m.table}.${m.column}`).join(', ')}{missing.columns.length > 6 ? '…' : ''}
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}

export default DatabaseStatusBanner;
