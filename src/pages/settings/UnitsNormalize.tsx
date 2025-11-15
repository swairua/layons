import React, { useEffect, useState } from 'react';
import { useCurrentCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { toast } from 'sonner';

export default function UnitsNormalize() {
  const { currentCompany } = useCurrentCompany();
  const [boqs, setBoqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentCompany) return;
    (async () => {
      setLoading(true);
      // find BOQs that have items lacking unit_abbreviation but have unit_id or unit_name
      const { data } = await supabase
        .from('boqs')
        .select('id, number, data')
        .eq('company_id', currentCompany.id);
      const needs = (data || []).filter((b: any) => {
        if (!b.data || !Array.isArray(b.data.sections)) return false;
        return b.data.sections.some((s: any) => s.items && s.items.some((it: any) => !it.unit_abbreviation && (it.unit_id || it.unit_name || it.unit)));
      });
      setBoqs(needs);
      setLoading(false);
    })();
  }, [currentCompany]);

  const handleNormalize = async () => {
    if (!currentCompany) return;
    if (!confirm('Normalize unit abbreviations for listed BOQs?')) return;
    setLoading(true);
    try {
      // load units for company
      const { data: units } = await supabase.from('units').select('*').eq('company_id', currentCompany.id);

      for (const b of boqs) {
        let changed = false;
        const data = b.data || {};
        for (const sec of data.sections || []) {
          for (const item of sec.items || []) {
            if (!item.unit_abbreviation) {
              // try unit_id
              if (item.unit_id) {
                const u = (units || []).find((x: any) => x.id === item.unit_id);
                if (u) { item.unit_abbreviation = u.abbreviation || u.name; item.unit_name = u.name; changed = true; }
              } else if (item.unit_name) {
                // lookup by name
                const u = (units || []).find((x: any) => x.name.toLowerCase() === item.unit_name.toLowerCase());
                if (u) { item.unit_id = u.id; item.unit_abbreviation = u.abbreviation || u.name; changed = true; }
              } else if (item.unit) {
                const u = (units || []).find((x: any) => x.name.toLowerCase() === item.unit.toLowerCase() || (x.abbreviation && x.abbreviation.toLowerCase() === item.unit.toLowerCase()));
                if (u) { item.unit_id = u.id; item.unit_abbreviation = u.abbreviation || u.name; item.unit_name = u.name; changed = true; }
              }
            }
          }
        }
        if (changed) {
          await supabase.from('boqs').update({ data }).eq('id', b.id);
        }
      }

      toast.success('Normalization complete');
      // refresh list
      const { data: newData } = await supabase
        .from('boqs')
        .select('id, number, data')
        .eq('company_id', currentCompany.id);
      const needs = (newData || []).filter((b: any) => {
        if (!b.data || !Array.isArray(b.data.sections)) return false;
        return b.data.sections.some((s: any) => s.items && s.items.some((it: any) => !it.unit_abbreviation && (it.unit_id || it.unit_name || it.unit)));
      });
      setBoqs(needs);
    } catch (err) {
      console.error(err);
      toast.error('Normalization failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Units Normalization</h1>
          <p className="text-muted-foreground">Review BOQs missing unit abbreviations and normalize them by mapping to existing units.</p>
        </div>
        <div>
          <Button onClick={handleNormalize} disabled={loading || boqs.length === 0}>{loading ? 'Processing...' : 'Normalize Now'}</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>BOQs needing normalization</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Number</TableHead>
                <TableHead>Issues</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {boqs.length === 0 ? (
                <TableRow><TableCell colSpan={2}>No BOQs found that need normalization.</TableCell></TableRow>
              ) : boqs.map((b: any) => (
                <TableRow key={b.id}>
                  <TableCell>{b.number}</TableCell>
                  <TableCell>
                    {b.data.sections.reduce((acc: string[], s: any) => {
                      const items = (s.items || []).filter((it: any) => !it.unit_abbreviation && (it.unit_id || it.unit_name || it.unit));
                      if (items.length > 0) acc.push(`${s.title || 'Section'}: ${items.length} items`);
                      return acc;
                    }, []).join('; ')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
