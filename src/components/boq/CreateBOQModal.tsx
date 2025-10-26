import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Calculator, Layers } from 'lucide-react';
import { useCompanies, useCustomers, useUnits } from '@/hooks/useDatabase';
import { CreateUnitModal } from '@/components/units/CreateUnitModal';
import { toast } from 'sonner';
import { downloadBOQPDF, BoqDocument } from '@/utils/boqPdfGenerator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface CreateBOQModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface BOQItemRow {
  id: string;
  description: string;
  quantity: number;
  unit: string; // will store unit id
  rate: number;
}

interface BOQSubsectionRow {
  id: string;
  name: string; // "A", "B", "C", etc.
  label: string; // "Materials", "Labor", etc.
  items: BOQItemRow[];
}

interface BOQSectionRow {
  id: string;
  title: string;
  subsections: BOQSubsectionRow[];
}

const defaultItem = (): BOQItemRow => ({
  id: `item-${crypto.randomUUID()}`,
  description: '',
  quantity: 1,
  unit: '',
  rate: 0,
});

const defaultSubsection = (name: string, label: string): BOQSubsectionRow => ({
  id: `subsection-${crypto.randomUUID()}`,
  name,
  label,
  items: [defaultItem()],
});

const defaultSection = (): BOQSectionRow => ({
  id: `section-${crypto.randomUUID()}`,
  title: 'General',
  subsections: [
    defaultSubsection('A', 'Materials'),
    defaultSubsection('B', 'Labor'),
  ],
});

export function CreateBOQModal({ open, onOpenChange }: CreateBOQModalProps) {
  const { data: companies } = useCompanies();
  const currentCompany = companies?.[0];
  const { data: customers = [] } = useCustomers(currentCompany?.id);
  const { data: units = [] } = useUnits(currentCompany?.id);
  const { profile } = useAuth();

  const [unitModalOpen, setUnitModalOpen] = useState(false);
  const [pendingUnitTarget, setPendingUnitTarget] = useState<{ sectionId: string; itemId: string } | null>(null);

  const todayISO = new Date().toISOString().split('T')[0];
  const defaultNumber = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `BOQ-${y}${m}${day}-${hh}${mm}`;
  }, []);

  const [boqNumber, setBoqNumber] = useState(defaultNumber);
  const [boqDate, setBoqDate] = useState(todayISO);
  const [clientId, setClientId] = useState('');
  const [projectTitle, setProjectTitle] = useState('');
  const [contractor, setContractor] = useState('');
  const [notes, setNotes] = useState('');
  const [sections, setSections] = useState<BOQSectionRow[]>([defaultSection()]);
  const [submitting, setSubmitting] = useState(false);

  const selectedClient = useMemo(() => customers.find(c => c.id === clientId), [customers, clientId]);

  const addSection = () => {
    setSections(prev => [...prev, defaultSection()]);
  };

  const removeSection = (sectionId: string) => {
    setSections(prev => prev.filter(s => s.id !== sectionId));
  };

  const updateSectionTitle = (sectionId: string, title: string) => {
    setSections(prev => prev.map(s => s.id === sectionId ? { ...s, title } : s));
  };

  const addItem = (sectionId: string, subsectionId: string) => {
    setSections(prev => prev.map(s => s.id === sectionId ? {
      ...s,
      subsections: s.subsections.map(sub => sub.id === subsectionId ? { ...sub, items: [...sub.items, defaultItem()] } : sub)
    } : s));
  };

  const removeItem = (sectionId: string, subsectionId: string, itemId: string) => {
    setSections(prev => prev.map(s => s.id === sectionId ? {
      ...s,
      subsections: s.subsections.map(sub => sub.id === subsectionId ? { ...sub, items: sub.items.filter(i => i.id !== itemId) } : sub)
    } : s));
  };

  const updateItem = (sectionId: string, subsectionId: string, itemId: string, field: keyof BOQItemRow, value: string | number) => {
    setSections(prev => prev.map(s => {
      if (s.id !== sectionId) return s;
      return {
        ...s,
        subsections: s.subsections.map(sub => {
          if (sub.id !== subsectionId) return sub;
          return {
            ...sub,
            items: sub.items.map(i => i.id === itemId ? { ...i, [field]: field === 'description' || field === 'unit' ? String(value) : Number(value) } : i)
          };
        })
      };
    }));
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);

  const calculateSubsectionTotal = (subsection: BOQSubsectionRow): number => {
    return subsection.items.reduce((sum, item) => sum + ((item.quantity || 0) * (item.rate || 0)), 0);
  };

  const calculateSectionTotal = (section: BOQSectionRow): number => {
    return section.subsections.reduce((sum, sub) => sum + calculateSubsectionTotal(sub), 0);
  };

  const totals = useMemo(() => {
    let subtotal = 0;
    sections.forEach(sec => { subtotal += calculateSectionTotal(sec); });
    return { subtotal };
  }, [sections]);

  const validate = () => {
    if (!clientId) { toast.error('Please select a client'); return false; }
    if (!boqNumber || !boqDate) { toast.error('BOQ number and date are required'); return false; }
    const hasItems = sections.some(s => s.subsections.some(sub => sub.items.length > 0));
    if (!hasItems) { toast.error('Add at least one item'); return false; }
    const hasInvalid = sections.some(s => s.subsections.some(sub => sub.items.some(i => !i.description || i.quantity <= 0 || i.rate < 0)));
    if (hasInvalid) { toast.error('Each item needs description, quantity > 0, and non-negative rate'); return false; }
    return true;
  };

  const handleGenerate = async () => {
    if (!validate()) return;
    if (!selectedClient) { toast.error('Invalid client'); return; }

    setSubmitting(true);
    try {
      const doc: BoqDocument = {
        number: boqNumber,
        date: boqDate,
        client: {
          name: selectedClient.name,
          email: selectedClient.email || undefined,
          phone: selectedClient.phone || undefined,
          address: selectedClient.address || undefined,
          city: selectedClient.city || undefined,
          country: selectedClient.country || undefined,
        },
        contractor: contractor || undefined,
        project_title: projectTitle || undefined,
        sections: sections.map(s => ({
          title: s.title || undefined,
          items: s.items.map(i => {
            // lookup unit name from units list
            const unitObj = units.find((u: any) => u.id === i.unit);
            return {
              description: i.description,
              quantity: i.quantity,
              unit_id: i.unit || null,
              unit_name: unitObj ? unitObj.name : i.unit || null,
              rate: i.rate,
            };
          })
        })),
        notes: notes || undefined,
      };

      // Store BOQ in database
      const payload = {
        company_id: currentCompany?.id || null,
        number: boqNumber,
        boq_date: boqDate,
        client_name: selectedClient.name,
        client_email: selectedClient.email || null,
        client_phone: selectedClient.phone || null,
        client_address: selectedClient.address || null,
        client_city: selectedClient.city || null,
        client_country: selectedClient.country || null,
        contractor: contractor || null,
        project_title: projectTitle || null,
        currency: currentCompany?.currency || 'KES',
        subtotal: totals.subtotal,
        tax_amount: 0,
        total_amount: totals.subtotal,
        attachment_url: null,
        data: doc,
        created_by: profile?.id || null,
      };

      const { error: insertError } = await supabase.from('boqs').insert([payload]);
      if (insertError) {
        console.warn('Failed to store BOQ:', insertError);
        toast.error('BOQ generated but failed to save to database');
      }

      await downloadBOQPDF(doc, currentCompany ? {
        name: currentCompany.name,
        logo_url: currentCompany.logo_url || undefined,
        address: currentCompany.address || undefined,
        city: currentCompany.city || undefined,
        country: currentCompany.country || undefined,
        phone: currentCompany.phone || undefined,
        email: currentCompany.email || undefined,
      } : undefined);

      toast.success(`BOQ ${boqNumber} generated and saved`);
      onOpenChange(false);
    } catch (err) {
      console.error('Failed to generate BOQ PDF or save', err);
      toast.error('Failed to generate BOQ PDF or save to database');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Layers className="h-5 w-5 text-primary" />
            <span>Create Bill of Quantities</span>
          </DialogTitle>
          <DialogDescription>
            Build a detailed BOQ, save it to the database and download a branded PDF.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>BOQ Number</Label>
              <Input value={boqNumber} onChange={e => setBoqNumber(e.target.value)} />
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" value={boqDate} onChange={e => setBoqDate(e.target.value)} />
            </div>
            <div>
              <Label>Client</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Project Title</Label>
              <Input value={projectTitle} onChange={e => setProjectTitle(e.target.value)} />
            </div>
            <div>
              <Label>Contractor</Label>
              <Input value={contractor} onChange={e => setContractor(e.target.value)} />
            </div>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Sections & Items</CardTitle>
              <Button variant="outline" onClick={addSection}>
                <Plus className="h-4 w-4 mr-2" /> Add Section
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              {sections.map((section, sIdx) => (
                <div key={section.id} className="space-y-3 border border-border rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <Input value={section.title} onChange={e => updateSectionTitle(section.id, e.target.value)} placeholder="Section title" />
                    <Button variant="destructive" onClick={() => removeSection(section.id)} disabled={sections.length === 1}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <div className="ml-auto text-sm text-muted-foreground">Section {sIdx + 1}</div>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-1/2">Item Description</TableHead>
                        <TableHead className="w-24">Qty</TableHead>
                        <TableHead className="w-28">Unit</TableHead>
                        <TableHead className="w-32">Rate</TableHead>
                        <TableHead className="w-32 text-right">Amount</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {section.items.map(row => (
                        <TableRow key={row.id}>
                          <TableCell>
                            <Input value={row.description} onChange={e => updateItem(section.id, row.id, 'description', e.target.value)} placeholder="Describe item" />
                          </TableCell>
                          <TableCell>
                            <Input type="number" min={0} value={row.quantity} onChange={e => updateItem(section.id, row.id, 'quantity', Number(e.target.value))} />
                          </TableCell>
                          <TableCell>
                            <Select value={row.unit} onValueChange={(val) => {
                              if (val === '__add_unit') {
                                setPendingUnitTarget({ sectionId: section.id, itemId: row.id });
                                setUnitModalOpen(true);
                              } else {
                                updateItem(section.id, row.id, 'unit', val);
                              }
                            }}>
                              <SelectTrigger>
                                <SelectValue placeholder="Unit" />
                              </SelectTrigger>
                              <SelectContent>
                                {units.map((u: any) => (
                                  <SelectItem key={u.id} value={u.id}>{u.name}{u.abbreviation ? ` (${u.abbreviation})` : ''}</SelectItem>
                                ))}
                                <SelectItem value="__add_unit">+ Add unit...</SelectItem>
                              </SelectContent>
                            </Select>

                            {/* Unit creation modal */}
                            <CreateUnitModal open={unitModalOpen} onOpenChange={setUnitModalOpen} onCreated={(unitName) => {
                              // set the new unit on the pending target
                              if (pendingUnitTarget) {
                                updateItem(pendingUnitTarget.sectionId, pendingUnitTarget.itemId, 'unit', unitName);
                                setPendingUnitTarget(null);
                              }
                            }} />
                          </TableCell>
                          <TableCell>
                            <Input type="number" min={0} value={row.rate} onChange={e => updateItem(section.id, row.id, 'rate', Number(e.target.value))} />
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency((row.quantity || 0) * (row.rate || 0))}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => removeItem(section.id, row.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell colSpan={6}>
                          <Button variant="outline" onClick={() => addItem(section.id)}>
                            <Plus className="h-4 w-4 mr-2" /> Add Item
                          </Button>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              ))}

              <div className="flex items-center justify-end gap-6 pt-4">
                <div className="text-lg font-semibold">Subtotal: {formatCurrency(totals.subtotal)}</div>
              </div>
            </CardContent>
          </Card>

          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4} placeholder="Any special notes or terms" />
          </div>
        </div>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleGenerate} disabled={submitting}>
            <Calculator className="h-4 w-4 mr-2" />
            {submitting ? 'Generating...' : 'Download BOQ PDF'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
