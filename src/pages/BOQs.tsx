import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Layers, Plus, Eye, Download, Trash2 } from 'lucide-react';
import { CreateBOQModal } from '@/components/boq/CreateBOQModal';
import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { useCurrentCompany } from '@/contexts/CompanyContext';
import { useBOQs, useDeleteBOQ, useUnits } from '@/hooks/useDatabase';
import { useAuditLog } from '@/hooks/useAuditLog';
import { downloadBOQPDF } from '@/utils/boqPdfGenerator';
import { toast } from 'sonner';

export default function BOQs() {
  const [open, setOpen] = useState(false);
  const { currentCompany } = useCurrentCompany();
  const companyId = currentCompany?.id;
  const { data: boqs = [], isLoading } = useBOQs(companyId);
  const deleteBOQ = useDeleteBOQ();
  const { data: units = [] } = useUnits(companyId);
  const { logDelete } = useAuditLog();

  const [viewing, setViewing] = useState<any | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; boqId?: string; boqNumber?: string }>({ open: false });

  const handleDownloadPDF = async (boq: any) => {
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

  const handleDeleteClick = (id: string, number: string) => {
    setDeleteDialog({ open: true, boqId: id, boqNumber: number });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.boqId || !companyId) return;
    try {
      await deleteBOQ.mutateAsync(deleteDialog.boqId);

      // Log the delete action
      await logDelete(
        companyId,
        'boq',
        deleteDialog.boqId,
        deleteDialog.boqNumber,
        deleteDialog.boqNumber,
        { deletedAt: new Date().toISOString() }
      );

      toast.success('BOQ deleted');
      setDeleteDialog({ open: false });
    } catch (err) {
      console.error('Delete failed', err);
      toast.error('Failed to delete BOQ');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">BOQs</h1>
          <p className="text-muted-foreground">
            Create and manage bill of quantities
          </p>
        </div>
        <Button
          className="gradient-primary text-primary-foreground hover:opacity-90 shadow-card"
          size="lg"
          onClick={() => setOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          New BOQ
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
                      <Button size="icon" variant="ghost" onClick={() => handleDownloadPDF(b)} title="Download PDF">
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="destructive" onClick={() => handleDeleteClick(b.id, b.number)} title="Delete">
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
                <Button onClick={() => handleDownloadPDF(viewing)}>
                  <Download className="h-4 w-4 mr-2" /> Download PDF
                </Button>
              </div>
            </div>

            <div className="mt-4 space-y-2 text-sm">
              <div><strong>Date:</strong> {new Date(viewing.boq_date).toLocaleDateString()}</div>
              <div><strong>Client:</strong> {viewing.client_name} {viewing.client_email ? `(${viewing.client_email})` : ''}</div>
              <div><strong>Project:</strong> {viewing.project_title || '-'}</div>
              <div><strong>Contractor:</strong> {viewing.contractor || '-'}</div>
              <div className="pt-2"><strong>Notes:</strong><div className="whitespace-pre-wrap">{viewing.data?.notes || '-'}</div></div>

              <div className="pt-4 space-y-4">
                {viewing.data?.sections?.map((sec: any, idx: number) => (
                  <div key={idx} className="border border-border rounded-lg p-4">
                    <div className="font-medium text-lg mb-3">{sec.title}</div>

                    {sec.subsections && sec.subsections.length > 0 ? (
                      <div className="space-y-3">
                        {sec.subsections.map((sub: any, subIdx: number) => {
                          const subsectionTotal = (sub.items || []).reduce((sum: number, it: any) => {
                            return sum + ((it.quantity || 0) * (it.rate || 0));
                          }, 0);

                          return (
                            <div key={subIdx} className="bg-muted/30 rounded p-3 border border-border/50">
                              <div className="flex justify-between items-center mb-2">
                                <div className="font-semibold text-sm">Subsection {sub.name}: {sub.label}</div>
                                <div className="text-sm font-semibold">{new Intl.NumberFormat('en-KE', { style: 'currency', currency: viewing.currency || 'KES' }).format(subsectionTotal)}</div>
                              </div>
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-left text-muted-foreground border-b">
                                    <th>Description</th><th>Qty</th><th>Unit</th><th>Rate</th><th className="text-right">Amount</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(sub.items || []).map((it: any, i: number) => (
                                    <tr key={i}>
                                      <td>{it.description}</td>
                                      <td>{it.quantity}</td>
                                      <td>{
                                        (() => {
                                          if (it.unit_id && units) {
                                            const u = units.find((x: any) => x.id === it.unit_id);
                                            if (u) return u.abbreviation || u.name;
                                          }
                                          if (it.unit_name) return it.unit_name;
                                          if (it.unit) return it.unit;
                                          return '-';
                                        })()
                                      }</td>
                                      <td>{new Intl.NumberFormat('en-KE', { style: 'currency', currency: viewing.currency || 'KES' }).format(Number(it.rate || 0))}</td>
                                      <td className="text-right">{new Intl.NumberFormat('en-KE', { style: 'currency', currency: viewing.currency || 'KES' }).format(Number((it.quantity || 0) * (it.rate || 0)))}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          );
                        })}

                        {(() => {
                          const sectionTotal = (sec.subsections || []).reduce((sum: number, sub: any) => {
                            return sum + (sub.items || []).reduce((subSum: number, it: any) => {
                              return subSum + ((it.quantity || 0) * (it.rate || 0));
                            }, 0);
                          }, 0);
                          return (
                            <div className="flex justify-end font-semibold text-sm pt-2 border-t border-border">
                              <div>Section Total: {new Intl.NumberFormat('en-KE', { style: 'currency', currency: viewing.currency || 'KES' }).format(sectionTotal)}</div>
                            </div>
                          );
                        })()}
                      </div>
                    ) : (
                      <div className="mt-2">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-muted-foreground border-b">
                              <th>Description</th><th>Qty</th><th>Unit</th><th>Rate</th><th>Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(sec.items || []).map((it: any, i: number) => (
                              <tr key={i}>
                                <td>{it.description}</td>
                                <td>{it.quantity}</td>
                                <td>{
                                  (() => {
                                    if (it.unit_id && units) {
                                      const u = units.find((x: any) => x.id === it.unit_id);
                                      if (u) return u.abbreviation || u.name;
                                    }
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
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmationDialog
        open={deleteDialog.open}
        title="Delete BOQ"
        description={`Are you sure you want to delete BOQ ${deleteDialog.boqNumber}? This action cannot be undone.`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteDialog({ open: false })}
        confirmText="Delete"
      />
    </div>
  );
}
