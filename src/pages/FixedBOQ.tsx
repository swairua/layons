import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentCompany } from '@/contexts/CompanyContext';
import { Download, Database, PlusCircle } from 'lucide-react';
import { generatePDF } from '@/utils/pdfGenerator';

interface FixedBOQItem {
  id: string;
  company_id: string | null;
  description: string;
  unit: string | null;
  sort_order: number | null;
}

export default function FixedBOQ() {
  const { currentCompany } = useCurrentCompany();
  const companyId = currentCompany?.id || null;

  const [items, setItems] = useState<FixedBOQItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [rate, setRate] = useState<Record<string, number>>({});

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
      setItems(data || []);
      if ((data || []).length === 0) {
        toast.message('No Fixed BOQ items found for this company');
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

  const totalAmount = useMemo(() => {
    return items.reduce((sum, it) => {
      const q = qty[it.id] || 0;
      const r = rate[it.id] || 0;
      return sum + q * r;
    }, 0);
  }, [items, qty, rate]);

  const totalQuantity = useMemo(() => {
    return items.reduce((sum, it) => sum + (qty[it.id] || 0), 0);
  }, [items, qty]);

  const handleSeed = async () => {
    if (!companyId) { toast.error('No company selected'); return; }
    setSeeding(true);
    try {
      const sql = `
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS fixed_boq_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  unit TEXT DEFAULT 'Item',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fixed_boq_items_company ON fixed_boq_items(company_id);

INSERT INTO fixed_boq_items (company_id, description, unit, sort_order)
VALUES
  ('${companyId}', 'Mobilization and demobilization', 'Item', 1),
  ('${companyId}', 'Site establishment and preliminaries', 'Item', 2),
  ('${companyId}', 'Demolitions and cart away debris', 'Item', 3),
  ('${companyId}', 'Excavation and earthworks', 'm3', 4),
  ('${companyId}', 'Concrete works (blinding, slab, beams)', 'm3', 5),
  ('${companyId}', 'Masonry walls and partitions', 'm2', 6),
  ('${companyId}', 'Plastering and wall finishes', 'm2', 7),
  ('${companyId}', 'Painting and decorations', 'm2', 8),
  ('${companyId}', 'Electrical installations (points and fittings)', 'Item', 9),
  ('${companyId}', 'Plumbing and drainage installations', 'Item', 10),
  ('${companyId}', 'Roofing and rainwater goods', 'm2', 11),
  ('${companyId}', 'Windows, doors and ironmongery', 'Item', 12),
  ('${companyId}', 'Floor finishes (tiles/terrazzo/timber)', 'm2', 13),
  ('${companyId}', 'Ceilings and cornices', 'm2', 14),
  ('${companyId}', 'External works (paving, kerbs, drainage)', 'Item', 15),
  ('${companyId}', 'Contingencies and miscellaneous', 'Item', 16)
ON CONFLICT DO NOTHING;`;

      // Try to execute via RPC (requires exec_sql function in DB)
      const { error } = await supabase.rpc('exec_sql', { sql });
      if (error) {
        throw error;
      }
      toast.success('Fixed BOQ table created and seeded');
      await fetchItems();
    } catch (err) {
      console.error('Seeding via RPC failed:', err);
      toast.error('Automatic SQL execution failed. Please create the table manually in Supabase SQL editor.');
    } finally {
      setSeeding(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!currentCompany) { toast.error('Company not loaded'); return; }

    const docItems = items.map((it) => ({
      description: it.description,
      quantity: qty[it.id] || 0,
      unit_price: rate[it.id] || 0,
      line_total: (qty[it.id] || 0) * (rate[it.id] || 0),
      unit_of_measure: it.unit || 'Item',
    }));

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
        items: docItems,
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Fixed BOQ</h1>
          <p className="text-muted-foreground">Enter quantities and unit costs; totals are calculated automatically.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleDownloadPDF} variant="default">
            <Download className="h-4 w-4 mr-2" /> Download PDF
          </Button>
          <Button onClick={handleSeed} variant="outline" disabled={seeding || !companyId} title={!companyId ? 'Select/initialize a company first' : 'Create table and seed items'}>
            {seeding ? (
              <>
                <Database className="h-4 w-4 mr-2 animate-spin" /> Initializing...
              </>
            ) : (
              <>
                <PlusCircle className="h-4 w-4 mr-2" /> Create/Seed Items
              </>
            )}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead style={{ width: '56%' }}>Description</TableHead>
                <TableHead style={{ width: '12%', textAlign: 'right' }}>Qty</TableHead>
                <TableHead style={{ width: '16%', textAlign: 'right' }}>Unit Cost</TableHead>
                <TableHead style={{ width: '16%', textAlign: 'right' }}>Line Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={4}>Loading...</TableCell></TableRow>
              ) : items.length === 0 ? (
                <TableRow><TableCell colSpan={4}>No items yet. Click "Create/Seed Items" to initialize.</TableCell></TableRow>
              ) : (
                items.map((it) => {
                  const q = qty[it.id] ?? 0;
                  const r = rate[it.id] ?? 0;
                  const amount = q * r;
                  return (
                    <TableRow key={it.id}>
                      <TableCell>{it.description}</TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          value={q}
                          onChange={(e) => setQty((prev) => ({ ...prev, [it.id]: Number(e.target.value) }))}
                          className="w-28 ml-auto text-right"
                          min={0}
                          step={0.01}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          value={r}
                          onChange={(e) => setRate((prev) => ({ ...prev, [it.id]: Number(e.target.value) }))}
                          className="w-32 ml-auto text-right"
                          min={0}
                          step={0.01}
                        />
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {new Intl.NumberFormat('en-KE', { style: 'currency', currency: currentCompany?.currency || 'KES' }).format(amount || 0)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}

              {items.length > 0 && (
                <TableRow>
                  <TableCell className="text-right font-semibold">Totals</TableCell>
                  <TableCell className="text-right font-semibold">{totalQuantity.toLocaleString()}</TableCell>
                  <TableCell></TableCell>
                  <TableCell className="text-right font-semibold">
                    {new Intl.NumberFormat('en-KE', { style: 'currency', currency: currentCompany?.currency || 'KES' }).format(totalAmount || 0)}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
