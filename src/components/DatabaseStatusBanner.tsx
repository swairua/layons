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
        let isCompleteLocal = false;
        let missingTables: string[] = [];
        let missingColumns: Array<{ table: string; column: string }> = [];
        let summaryLocal = '';

        // First attempt: comprehensive verification via information_schema
        try {
          const verification = await verifyDatabaseComplete();
          isCompleteLocal = verification.isComplete;
          missingTables = verification.missingTables;
          missingColumns = verification.missingColumns;
          summaryLocal = verification.summary;
        } catch {
          // ignore; we'll use fallback
        }

        // Fallback probe: attempt selects against expected tables to infer existence
        if (!isCompleteLocal && (!summaryLocal || summaryLocal.includes('Verification failed'))) {
          const expectedTables = [
            'profiles','companies','customers','products','quotations','quotation_items',
            'invoices','invoice_items','payments','lpos','lpo_items','delivery_notes',
            'delivery_note_items','proforma_invoices','proforma_items','remittance_advice','remittance_advice_items'
          ];
          const missing: string[] = [];
          await Promise.all(expectedTables.map(async (t) => {
            try {
              const { error } = await supabase.from(t as any).select('id').limit(1);
              if (error) missing.push(t);
            } catch {
              missing.push(t);
            }
          }));
          missingTables = missing;
          isCompleteLocal = missing.length === 0;
          summaryLocal = isCompleteLocal
            ? 'All expected tables responded successfully.'
            : `Missing or inaccessible tables: ${missing.slice(0, 6).join(', ')}${missing.length > 6 ? '…' : ''}`;
        }

        const coreCounts = await getCoreCounts();
        if (!mounted) return;
        setIsComplete(isCompleteLocal);
        setMissing({ tables: missingTables, columns: missingColumns });
        setCounts(coreCounts);
        setSummary(summaryLocal);
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
