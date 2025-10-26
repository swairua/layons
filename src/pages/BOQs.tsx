import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Layers, Plus, Eye, Download, Trash2, Print } from 'lucide-react';
import { CreateBOQModal } from '@/components/boq/CreateBOQModal';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { useCurrentCompany } from '@/contexts/CompanyContext';
import { useBOQs, useDeleteBOQ, useUnits } from '@/hooks/useDatabase';
import { downloadBOQPDF } from '@/utils/boqPdfGenerator';
import { toast } from 'sonner';

export default function BOQs() {
  const [open, setOpen] = useState(false);
  const { currentCompany } = useCurrentCompany();
  const companyId = currentCompany?.id;
  const { data: boqs = [], isLoading } = useBOQs(companyId);
  const deleteBOQ = useDeleteBOQ();
  const { data: units = [] } = useUnits(companyId);

  const [viewing, setViewing] = useState<any | null>(null);

  const handleDownload = async (boq: any) => {
    try {
      await downloadBOQPDF(boq.data, currentCompany ? {
        name: currentCompany.name,
        logo_url: currentCompany.logo_url || undefined,
        address: currentCompany.address || undefined,
        city: currentCompany.city || undefined,
        country: currentCompany.country || undefined,
        phone: currentCompany.phone || undefined,
        email: currentCompany.email || undefined,
      } : undefined);
      toast.success('BOQ downloaded');
    } catch (err) {
      console.error('Download failed', err);
      toast.error('Failed to download BOQ');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this BOQ? This action cannot be undone.')) return;
    try {
      await deleteBOQ.mutateAsync(id);
      toast.success('BOQ deleted');
    } catch (err) {
      console.error('Delete failed', err);
      toast.error('Failed to delete BOQ');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Bill of Quantities</h1>
          <p className="text-muted-foreground">Create, store and download BOQs as branded PDFs.</p>
        </div>
        <Button variant="default" size="lg" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> New BOQ
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            BOQ Records
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Number</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Project</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6}>Loading...</TableCell></TableRow>
              ) : boqs.length === 0 ? (
                <TableRow><TableCell colSpan={6}>No BOQs found</TableCell></TableRow>
              ) : boqs.map((b: any) => (
                <TableRow key={b.id}>
                  <TableCell>{b.number}</TableCell>
                  <TableCell>{new Date(b.boq_date).toLocaleDateString()}</TableCell>
                  <TableCell>{b.client_name}</TableCell>
                  <TableCell>{b.project_title || '-'}</TableCell>
                  <TableCell className="text-right">{new Intl.NumberFormat('en-KE', { style: 'currency', currency: b.currency || 'KES' }).format(Number(b.total_amount || b.subtotal || 0))}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button size="icon" variant="ghost" onClick={() => setViewing(b)} title="View">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDownload(b)} title="Download">
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="destructive" onClick={() => handleDelete(b.id)} title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <CreateBOQModal open={open} onOpenChange={setOpen} />

      {viewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg max-w-3xl w-full p-6">
            <div className="flex items-start justify-between">
              <h2 className="text-xl font-semibold">BOQ {viewing.number}</h2>
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={() => { setViewing(null); }}>Close</Button>
                <Button onClick={() => handleDownload(viewing)}>
                  <Download className="h-4 w-4 mr-2" /> Download
                </Button>
              </div>
            </div>

            <div className="mt-4 space-y-2 text-sm">
              <div><strong>Date:</strong> {new Date(viewing.boq_date).toLocaleDateString()}</div>
              <div><strong>Client:</strong> {viewing.client_name} {viewing.client_email ? `(${viewing.client_email})` : ''}</div>
              <div><strong>Project:</strong> {viewing.project_title || '-'}</div>
              <div><strong>Contractor:</strong> {viewing.contractor || '-'}</div>
              <div className="pt-2"><strong>Notes:</strong><div className="whitespace-pre-wrap">{viewing.data?.notes || '-'}</div></div>

              <div className="pt-4">
                {viewing.data?.sections?.map((sec: any, idx: number) => (
                  <div key={idx} className="mb-4">
                    <div className="font-medium">{sec.title}</div>
                    <div className="mt-2">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-muted-foreground border-b">
                            <th>Description</th><th>Qty</th><th>Unit</th><th>Rate</th><th>Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sec.items.map((it: any, i: number) => (
                            <tr key={i}>
                              <td>{it.description}</td>
                              <td>{it.quantity}</td>
                              <td>{
                                // Prefer unit abbreviation from units table when unit_id is present
                                (() => {
                                  if (it.unit_id && units) {
                                    const u = units.find((x: any) => x.id === it.unit_id);
                                    if (u) return u.abbreviation || u.name;
                                  }
                                  // legacy fields
                                  if (it.unit_name) return it.unit_name;
                                  if (it.unit) return it.unit;
                                  return '-';
                                })()
                              }</td>
                              <td>{new Intl.NumberFormat('en-KE', { style: 'currency', currency: viewing.currency || 'KES' }).format(Number(it.rate || 0))}</td>
                              <td>{new Intl.NumberFormat('en-KE', { style: 'currency', currency: viewing.currency || 'KES' }).format(Number((it.quantity || 0) * (it.rate || 0)))}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
