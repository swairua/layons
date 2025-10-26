import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentCompany } from '@/contexts/CompanyContext';
import { Download, Database, PlusCircle, Upload } from 'lucide-react';
import { generatePDF } from '@/utils/pdfGenerator';
import { executeSQL, formatSQLForManualExecution } from '@/utils/execSQL';
import { parseErrorMessage } from '@/utils/errorHelpers';

interface FixedBOQItem {
  id: string;
  company_id: string | null;
  section: string | null;
  item_code: string | null; // A, B, C etc
  description: string;
  unit: string | null;
  default_qty: number | null;
  default_rate: number | null;
  sort_order: number | null;
}

// Simple helpers
const parseNumber = (s: string | null | undefined) => {
  if (!s) return 0;
  const n = Number(String(s).replace(/[,\s]/g, ''));
  return isFinite(n) ? n : 0;
};

export default function FixedBOQ() {
  const { currentCompany } = useCurrentCompany();
  const companyId = currentCompany?.id || null;

  const [items, setItems] = useState<FixedBOQItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importText, setImportText] = useState('');
  const [qty, setQty] = useState<Record<string, number>>({});
  const [rate, setRate] = useState<Record<string, number>>({});
  const [amount, setAmount] = useState<Record<string, number>>({});

  const fetchItems = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('fixed_boq_items')
        .select('*')
        .eq('company_id', companyId)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      setItems((data as FixedBOQItem[]) || []);
      if ((data || []).length === 0) {
        toast.info('No Fixed BOQ items found for this company');
      }
    } catch (err) {
      console.warn('Failed to load fixed_boq_items:', err);
      toast.error('Failed to load Fixed BOQ items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  // Group items by section for UI and PDF
  const grouped = useMemo(() => {
    const map = new Map<string, FixedBOQItem[]>();
    (items || []).forEach((it) => {
      const key = (it.section || 'General').trim();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(it);
    });
    return Array.from(map.entries());
  }, [items]);

  // Extract preliminaries (first section) separately
  const preliminaries = useMemo(() => {
    return grouped.length > 0 ? grouped[0] : null;
  }, [grouped]);

  // Main sections (all except first)
  const mainSections = useMemo(() => {
    return grouped.length > 1 ? grouped.slice(1) : [];
  }, [grouped]);

  const preliminariesTotal = useMemo(() => {
    if (!preliminaries) return 0;
    const [, arr] = preliminaries;
    return arr.reduce((sum, it) => {
      const a = amount[it.id] ?? (it.default_rate ?? 0);
      return sum + (Number(a) || 0);
    }, 0);
  }, [preliminaries, amount]);

  const sectionTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    mainSections.forEach(([section, arr]) => {
      totals[section] = arr.reduce((sum, it) => {
        const q = qty[it.id] ?? (it.default_qty ?? 0);
        const r = rate[it.id] ?? (it.default_rate ?? 0);
        return sum + (Number(q) || 0) * (Number(r) || 0);
      }, 0);
    });
    return totals;
  }, [mainSections, qty, rate]);

  const totalAmount = useMemo(() => {
    const mainTotal = Object.values(sectionTotals).reduce((a, b) => a + b, 0);
    return preliminariesTotal + mainTotal;
  }, [sectionTotals, preliminariesTotal]);

  const totalQuantity = useMemo(() => {
    return items.reduce((sum, it) => sum + (qty[it.id] ?? (it.default_qty ?? 0)), 0);
  }, [items, qty]);

  const ensureSchemaAndSeed = async () => {
    if (!companyId) { toast.error('No company selected'); return; }
    setSeeding(true);
    try {
      const sql = `
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS fixed_boq_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  section TEXT,
  item_code TEXT,
  description TEXT NOT NULL,
  unit TEXT DEFAULT 'Item',
  default_qty NUMERIC,
  default_rate NUMERIC,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Backfill new columns if table already existed
DO $$ BEGIN
  ALTER TABLE fixed_boq_items ADD COLUMN IF NOT EXISTS section TEXT;
  ALTER TABLE fixed_boq_items ADD COLUMN IF NOT EXISTS item_code TEXT;
  ALTER TABLE fixed_boq_items ADD COLUMN IF NOT EXISTS default_qty NUMERIC;
  ALTER TABLE fixed_boq_items ADD COLUMN IF NOT EXISTS default_rate NUMERIC;
  ALTER TABLE fixed_boq_items ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
EXCEPTION WHEN others THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_fixed_boq_items_company ON fixed_boq_items(company_id);
`;

      const result = await executeSQL(sql);
      if (result.error) {
        const message = parseErrorMessage(result.error);
        console.error('Schema setup failed:', result.error);
        toast.error(`Schema setup failed: ${message}`);
        throw result.error;
      }
      // If manual execution required, instruct user with formatted SQL
      if ((result as any).manual_execution_required) {
        console.warn('Manual SQL execution required for some statements.');
        const formatted = formatSQLForManualExecution(sql);
        console.log('SQL to run manually in Supabase SQL Editor:\n', formatted);
        toast.info('Some statements require manual execution in Supabase SQL Editor. SQL copied to console.');
      } else {
        toast.success('Fixed BOQ table is ready');
      }
      await fetchItems();
    } catch (err) {
      const msg = parseErrorMessage(err);
      console.error('Schema setup via RPC failed:', err);
      toast.error(`Automatic SQL execution failed: ${msg}`);
    } finally {
      setSeeding(false);
    }
  };

  const handleImport = async () => {
    if (!companyId) { toast.error('No company selected'); return; }
    if (!importText.trim()) { toast.error('Paste the BOQ text to import'); return; }

    try {
      // Parse the pasted text into structured items
      const lines = importText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
      let currentSection = '';
      let order = items.length + 1;
      const letterLine = /^[A-Z]$/;
      const sectionLine = /^(SECTION NO\.|BILL NO\.)/i;

      const parsed: Omit<FixedBOQItem, 'id'>[] = [] as any;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (sectionLine.test(line)) {
          currentSection = line;
          continue;
        }
        if (letterLine.test(line)) {
          const item_code = line;
          const descParts: string[] = [];
          let j = i + 1;

          while (j < lines.length && !letterLine.test(lines[j]) && !sectionLine.test(lines[j])) {
            const l = lines[j];
            // Remove trailing currency amounts and any trailing text (like "TOTAL", "Kshs", etc)
            // Matches patterns like: "5,026.00", "40,000.00 (Kshs)", "10,000.00 TOTAL", etc
            const cleanedLine = l.replace(/\s+\d+[\d,]*(?:\.\d+)?(?:\s+[A-Za-z()]+)*$/i, '').trim();
            if (cleanedLine) {
              descParts.push(cleanedLine);
            }
            j++;
          }

          const description = descParts.join(' ').replace(/\s+/g, ' ').trim();
          parsed.push({
            company_id: companyId,
            section: currentSection || 'General',
            item_code,
            description,
            unit: null,
            default_qty: null,
            default_rate: null,
            sort_order: order++,
          } as any);

          i = j - 1; // advance
        }
      }

      if (parsed.length === 0) {
        toast.error('Could not detect any items. Ensure the text is unformatted plain text.');
        return;
      }

      // Insert in chunks to avoid payload limits
      const chunkSize = 200;
      for (let k = 0; k < parsed.length; k += chunkSize) {
        const chunk = parsed.slice(k, k + chunkSize).map(p => ({
          company_id: p.company_id,
          section: p.section,
          item_code: p.item_code,
          description: p.description,
          unit: p.unit,
          default_qty: p.default_qty,
          default_rate: p.default_rate,
          sort_order: p.sort_order,
        }));
        const { error } = await supabase.from('fixed_boq_items').insert(chunk);
        if (error) throw error;
      }

      toast.success(`Imported ${parsed.length} items`);
      setImporting(false);
      setImportText('');
      await fetchItems();
    } catch (err) {
      console.error('Import failed:', err);
      toast.error('Import failed. You can try smaller sections or verify formatting.');
    }
  };

  const cleanupDescriptions = async () => {
    if (!companyId) { toast.error('No company selected'); return; }
    if (!items.length) { toast.error('No items to clean'); return; }

    try {
      setSeeding(true);
      let cleanedCount = 0;
      const updates: { id: string; description: string }[] = [];

      for (const item of items) {
        // Remove trailing figures and text like " 5,000.00", " 40,000.00 (Kshs)", " 10,000.00 TOTAL"
        const cleaned = item.description.replace(/\s+\d+[\d,]*(?:\.\d+)?(?:\s+[A-Za-z()]+)*$/i, '').trim();
        if (cleaned !== item.description) {
          updates.push({ id: item.id, description: cleaned });
          cleanedCount++;
        }
      }

      if (cleanedCount === 0) {
        toast.info('No descriptions to clean');
        setSeeding(false);
        return;
      }

      // Update in batches
      const batchSize = 50;
      for (let i = 0; i < updates.length; i += batchSize) {
        const batch = updates.slice(i, i + batchSize);
        for (const update of batch) {
          const { error } = await supabase
            .from('fixed_boq_items')
            .update({ description: update.description })
            .eq('id', update.id);
          if (error) throw error;
        }
      }

      toast.success(`Cleaned ${cleanedCount} descriptions`);
      await fetchItems();
    } catch (err) {
      console.error('Cleanup failed:', err);
      toast.error('Failed to clean descriptions');
    } finally {
      setSeeding(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!currentCompany) { toast.error('Company not loaded'); return; }

    // Build BOQ-style items including section marker rows for section totals in PDF
    const pdfItems: Array<{ description: string; quantity: number; unit_price: number; line_total: number; unit_of_measure?: string } & { unit_abbreviation?: string }> = [];
    grouped.forEach(([section, arr], idx) => {
      pdfItems.push({ description: `➤ ${section}`, quantity: 0, unit_price: 0, line_total: 0 });
      if (idx === 0) {
        arr.forEach((it) => {
          const a = amount[it.id] ?? (it.default_rate ?? 0);
          const val = Number(a) || 0;
          pdfItems.push({
            description: `${it.item_code ? `${it.item_code} ` : ''}${it.description}`,
            quantity: 1,
            unit_price: val,
            line_total: val,
            unit_of_measure: 'Item',
          });
        });
      } else {
        arr.forEach((it) => {
          const q = qty[it.id] ?? (it.default_qty ?? 0);
          const r = rate[it.id] ?? (it.default_rate ?? 0);
          const line = (Number(q) || 0) * (Number(r) || 0);
          pdfItems.push({
            description: it.description,
            quantity: q,
            unit_price: r,
            line_total: line,
            unit_of_measure: it.unit || 'Item',
          });
        });
      }
    });

    try {
      await generatePDF({
        type: 'boq',
        number: `FBOQ-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${String(Math.floor(Math.random()*900)+100)}`,
        date: new Date().toISOString(),
        customer: { name: currentCompany.name },
        company: {
          name: currentCompany.name,
          address: currentCompany.address || '',
          city: currentCompany.city || '',
          country: currentCompany.country || '',
          phone: currentCompany.phone || '',
          email: currentCompany.email || '',
          logo_url: currentCompany.logo_url || undefined,
        },
        items: pdfItems,
        subtotal: totalAmount,
        total_amount: totalAmount,
        notes: 'Fixed BOQ generated from predefined item list.'
      });
      toast.success('Fixed BOQ PDF opened for printing');
    } catch (err) {
      console.error('PDF generation failed', err);
      toast.error('Failed to generate PDF');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Fixed BOQ</h1>
          <p className="text-muted-foreground">Paste your BOQ text to import, then enter quantities and unit costs; totals are calculated automatically.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleDownloadPDF} variant="default">
            <Download className="h-4 w-4 mr-2" /> Download PDF
          </Button>
          <Button onClick={ensureSchemaAndSeed} variant="outline" disabled={seeding || !companyId} title={!companyId ? 'Select/initialize a company first' : 'Create/upgrade table schema'}>
            {seeding ? (
              <>
                <Database className="h-4 w-4 mr-2 animate-spin" /> Preparing...
              </>
            ) : (
              <>
                <PlusCircle className="h-4 w-4 mr-2" /> Prepare Table
              </>
            )}
          </Button>
          <Button onClick={() => setImporting(true)} variant="secondary" disabled={!companyId}>
            <Upload className="h-4 w-4 mr-2" /> Import from Text
          </Button>
          <Button onClick={cleanupDescriptions} variant="outline" disabled={seeding || !items.length} title="Remove trailing figures from descriptions">
            {seeding ? (
              <>
                <Database className="h-4 w-4 mr-2 animate-spin" /> Cleaning...
              </>
            ) : (
              <>Clean Descriptions</>
            )}
          </Button>
        </div>
      </div>

      {importing && (
        <Card className="border-yellow-300 bg-yellow-50">
          <CardHeader>
            <CardTitle>Import BOQ Items (Paste text)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Paste the plain text from your PDF (as you provided) and click Import. We detect sections like "BILL NO." or "SECTION NO." and items labeled A, B, C...</p>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              rows={10}
              className="w-full rounded border p-2 font-mono text-xs"
              placeholder="Paste BOQ text here"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setImporting(false); setImportText(''); }}>Cancel</Button>
              <Button onClick={handleImport}>Import</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading ? (
            <div>Loading...</div>
          ) : grouped.length === 0 ? (
            <div>No items yet. Click "Prepare Table" then "Import from Text".</div>
          ) : (
            grouped.map(([section, arr], idx) => {
              const sectionTotal = sectionTotals[section] || 0;
              const isFirst = idx === 0;
              return (
                <div key={section} className="space-y-2">
                  <div className="font-semibold text-sm bg-muted/40 px-3 py-2 rounded">{section}</div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead style={{ width: isFirst ? '10%' : '50%' }}>{isFirst ? 'Item' : 'Description'}</TableHead>
                        <TableHead style={{ width: isFirst ? '70%' : '10%' }}>{isFirst ? 'Description' : 'Code'}</TableHead>
                        {isFirst ? (
                          <TableHead style={{ width: '20%', textAlign: 'right' }}>Amount (KSHS)</TableHead>
                        ) : (
                          <>
                            <TableHead style={{ width: '10%', textAlign: 'right' }}>Qty</TableHead>
                            <TableHead style={{ width: '15%', textAlign: 'right' }}>Unit</TableHead>
                            <TableHead style={{ width: '15%', textAlign: 'right' }}>Unit Cost</TableHead>
                            <TableHead style={{ width: '15%', textAlign: 'right' }}>Line Total</TableHead>
                          </>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {arr.map((it) => {
                        if (isFirst) {
                          const amt = amount[it.id] ?? (it.default_rate ?? 0);
                          return (
                            <TableRow key={it.id}>
                              <TableCell>{it.item_code || ''}</TableCell>
                              <TableCell>{it.description}</TableCell>
                              <TableCell className="text-right">
                                <Input
                                  type="number"
                                  value={amt}
                                  onChange={(e) => setAmount((prev) => ({ ...prev, [it.id]: Number(e.target.value) }))}
                                  className="w-32 ml-auto text-right"
                                  min={0}
                                  step={0.01}
                                />
                              </TableCell>
                            </TableRow>
                          );
                        }
                        const q = qty[it.id] ?? (it.default_qty ?? 0);
                        const r = rate[it.id] ?? (it.default_rate ?? 0);
                        const line = (Number(q) || 0) * (Number(r) || 0);
                        return (
                          <TableRow key={it.id}>
                            <TableCell>{it.description}</TableCell>
                            <TableCell>{it.item_code || ''}</TableCell>
                            <TableCell className="text-right">
                              <Input
                                type="number"
                                value={q}
                                onChange={(e) => setQty((prev) => ({ ...prev, [it.id]: Number(e.target.value) }))}
                                className="w-24 ml-auto text-right"
                                min={0}
                                step={0.01}
                              />
                            </TableCell>
                            <TableCell className="text-right">{it.unit || 'Item'}</TableCell>
                            <TableCell className="text-right">
                              <Input
                                type="number"
                                value={r}
                                onChange={(e) => setRate((prev) => ({ ...prev, [it.id]: Number(e.target.value) }))}
                                className="w-28 ml-auto text-right"
                                min={0}
                                step={0.01}
                              />
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {new Intl.NumberFormat('en-KE', { style: 'currency', currency: currentCompany?.currency || 'KES' }).format(line || 0)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      <TableRow>
                        <TableCell className="text-right font-semibold" colSpan={isFirst ? 2 : 5}>SECTION TOTAL</TableCell>
                        <TableCell className="text-right font-semibold">
                          {new Intl.NumberFormat('en-KE', { style: 'currency', currency: currentCompany?.currency || 'KES' }).format(sectionTotal || 0)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              );
            })
          )}

          {grouped.length > 0 && (
            <div className="flex justify-end border-t pt-3 text-sm font-semibold">
              <div className="space-x-6">
                <span>Total Qty: {totalQuantity.toLocaleString()}</span>
                <span>
                  Total Amount: {new Intl.NumberFormat('en-KE', { style: 'currency', currency: currentCompany?.currency || 'KES' }).format(totalAmount || 0)}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
