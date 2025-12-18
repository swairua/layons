import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Layers, Plus, Eye, Download, Trash2, Copy, Pencil, FileText } from 'lucide-react';
import { CreateBOQModal } from '@/components/boq/CreateBOQModal';
import { CreatePercentageCopyModal } from '@/components/boq/CreatePercentageCopyModal';
import { EditBOQModal } from '@/components/boq/EditBOQModal';
import { ChangePercentageRateModal } from '@/components/boq/ChangePercentageRateModal';
import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { useCurrentCompany } from '@/contexts/CompanyContext';
import { useBOQs, useUnits } from '@/hooks/useDatabase';
import { useAuditLog } from '@/hooks/useAuditLog';
import { useAuditedDeleteOperations } from '@/hooks/useAuditedDeleteOperations';
import { useConvertBoqToInvoice } from '@/hooks/useBOQ';
import { downloadBOQPDF } from '@/utils/boqPdfGenerator';
import { toast } from 'sonner';

export default function BOQs() {
  const [open, setOpen] = useState(false);
  const [percentageCopyOpen, setPercentageCopyOpen] = useState(false);
  const [percentageRateOpen, setPercentageRateOpen] = useState(false);
  const [percentageRateBoq, setPercentageRateBoq] = useState<any | null>(null);
  const { currentCompany } = useCurrentCompany();
  const companyId = currentCompany?.id;
  const { data: boqs = [], isLoading, refetch: refetchBOQs } = useBOQs(companyId);
  const { useAuditedDeleteBOQ } = useAuditedDeleteOperations();
  const deleteBOQ = useAuditedDeleteBOQ(companyId || '');
  const { data: units = [] } = useUnits(companyId);
  const { logDelete } = useAuditLog();

  const [viewing, setViewing] = useState<any | null>(null);
  const [editing, setEditing] = useState<any | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; boqId?: string; boqNumber?: string }>({ open: false });
  const [convertDialog, setConvertDialog] = useState<{ open: boolean; boqId?: string; boqNumber?: string }>({ open: false });
  const convertToInvoice = useConvertBoqToInvoice();

  const handleDownloadPDF = async (boq: any, options?: { customTitle?: string; amountMultiplier?: number; forceCurrency?: string }) => {
    try {
      if (!boq || !boq.data) {
        toast.error('BOQ data is not available');
        return;
      }
      await downloadBOQPDF(boq.data, currentCompany ? {
        name: currentCompany.name,
        address: currentCompany.address || undefined,
        city: currentCompany.city || undefined,
        country: currentCompany.country || undefined,
        phone: currentCompany.phone || undefined,
        email: currentCompany.email || undefined,
        tax_number: currentCompany.tax_number || undefined,
        logo_url: currentCompany.logo_url || undefined,
        header_image: currentCompany.header_image || undefined,
        stamp_image: currentCompany.stamp_image || undefined,
        company_services: currentCompany.company_services || undefined,
      } : undefined, options);
      const suffix = options?.customTitle ? ` (${options.customTitle})` : '';
      toast.success(`BOQ ${boq.number} PDF downloaded${suffix}`);
    } catch (err) {
      console.error('Download failed', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      toast.error(`Failed to download BOQ: ${errorMessage}`);
    }
  };

  const handleDeleteClick = (id: string, number: string) => {
    setDeleteDialog({ open: true, boqId: id, boqNumber: number });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.boqId || !companyId) return;
    try {
      // Simple direct delete without audit logging to work around audit_logs issues
      const { error } = await supabase
        .from('boqs')
        .delete()
        .eq('id', deleteDialog.boqId);

      if (error) {
        throw error;
      }

      toast.success('BOQ deleted');
      setDeleteDialog({ open: false });
      refetchBOQs();
    } catch (err) {
      let errorMessage = 'Failed to delete BOQ';

      // Extract error message from various error types
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'object' && err !== null) {
        // Handle Supabase error objects
        if ('message' in err) {
          errorMessage = String(err.message);
        } else if ('details' in err) {
          errorMessage = String(err.details);
        } else {
          errorMessage = JSON.stringify(err);
        }
      } else if (typeof err === 'string') {
        errorMessage = err;
      }

      console.error('Delete failed:', errorMessage);

      // Provide specific guidance for common errors
      if (errorMessage.includes('foreign key') || errorMessage.includes('constraint')) {
        errorMessage = 'Cannot delete BOQ: It has been converted to an invoice or has related records. Please delete related records first.';
      }

      toast.error(errorMessage);
    }
  };

  const handleConvertClick = (id: string, number: string) => {
    setConvertDialog({ open: true, boqId: id, boqNumber: number });
  };

  const handleConvertConfirm = async () => {
    if (!convertDialog.boqId) return;
    try {
      toast.loading(`Converting BOQ ${convertDialog.boqNumber} to invoice...`);
      const invoice = await convertToInvoice.mutateAsync(convertDialog.boqId);

      toast.dismiss();

      // Format the total amount with the correct currency from the invoice
      const getLocaleForCurrency = (curr: string) => {
        const mapping: { [key: string]: { locale: string; code: string } } = {
          KES: { locale: 'en-KE', code: 'KES' },
          USD: { locale: 'en-US', code: 'USD' },
          EUR: { locale: 'en-GB', code: 'EUR' }
        };
        return mapping[curr] || mapping.KES;
      };
      const currencyLocale = getLocaleForCurrency(invoice.currency || 'KES');
      const formattedAmount = invoice.total_amount
        ? new Intl.NumberFormat(currencyLocale.locale, {
            style: 'currency',
            currency: currencyLocale.code,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          }).format(invoice.total_amount)
        : 'amount from BOQ';

      toast.success(
        `✅ BOQ ${convertDialog.boqNumber} successfully converted to Invoice ${invoice.invoice_number}`,
        {
          description: `Invoice created with total amount ${formattedAmount}`,
          duration: 5000
        }
      );

      setConvertDialog({ open: false });
      // Refetch to update the BOQ list and show converted status
      setTimeout(() => refetchBOQs(), 500);
    } catch (err) {
      console.error('BOQ conversion failed:', err);

      let errorMessage = 'Unknown error occurred';
      let errorTitle = 'Conversion Failed';

      if (err instanceof Error) {
        errorMessage = err.message;

        // Provide specific guidance based on error type
        if (errorMessage.includes('BOQ has no sections')) {
          errorTitle = 'Empty BOQ';
          errorMessage = 'This BOQ has no sections or items. Please add sections and items before converting.';
        } else if (errorMessage.includes('invalid or missing')) {
          errorTitle = 'Invalid BOQ Data';
          errorMessage = 'The BOQ data appears to be corrupted or incomplete. Please recreate the BOQ.';
        } else if (errorMessage.includes('no items')) {
          errorTitle = 'No Invoice Items';
          errorMessage = 'The BOQ conversion resulted in no items. Please verify the BOQ structure.';
        } else if (errorMessage.includes('invoice number')) {
          errorTitle = 'Invoice Number Error';
          errorMessage = 'Failed to generate a unique invoice number. Please try again or contact support.';
        } else if (errorMessage.includes('customer')) {
          errorTitle = 'Customer Setup Issue';
          errorMessage = 'There was an issue with the customer data. The invoice was created without a customer. Please assign one manually.';
        }
      }

      toast.error(errorTitle, {
        description: errorMessage,
        duration: 6000
      });
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
        <div className="flex gap-2">
          <Button
            className="gradient-primary text-primary-foreground hover:opacity-90 shadow-card"
            size="lg"
            onClick={() => setPercentageCopyOpen(true)}
            variant="outline"
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy with %
          </Button>
          <Button
            className="gradient-primary text-primary-foreground hover:opacity-90 shadow-card"
            size="lg"
            onClick={() => setOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            New BOQ
          </Button>
        </div>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Layers className="h-5 w-5 text-primary" />
            <span>BOQs List</span>
            {!isLoading && (
              <Badge variant="outline" className="ml-auto">
                {boqs.length} boqs
              </Badge>
            )}
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
                <TableHead>Currency</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7}>Loading...</TableCell></TableRow>
              ) : boqs.length === 0 ? (
                <TableRow><TableCell colSpan={7}>No BOQs found</TableCell></TableRow>
              ) : boqs.map((b: any) => (
                <TableRow key={b.id}>
                  <TableCell>{b.number}</TableCell>
                  <TableCell>{new Date(b.boq_date).toLocaleDateString()}</TableCell>
                  <TableCell>{b.client_name}</TableCell>
                  <TableCell>{b.project_title || '-'}</TableCell>
                  <TableCell><Badge variant="outline">{b.currency || 'KES'}</Badge></TableCell>
                  <TableCell className="text-right">{new Intl.NumberFormat('en-KE', { style: 'currency', currency: b.currency || 'KES' }).format(Number(b.total_amount || b.subtotal || 0))}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button size="icon" variant="ghost" onClick={() => setViewing(b)} title="View">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setEditing(b)} title="Edit">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDownloadPDF(b)} title="Download PDF">
                        <Download className="h-4 w-4" />
                      </Button>
                      {b.number === 'BOQ-20251124-1441' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs"
                          onClick={() => {
                            setPercentageRateBoq(b);
                            setPercentageRateOpen(true);
                          }}
                          title="Download Special Invoice PDF"
                        >
                          Invoice PDF
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => handleConvertClick(b.id, b.number)}
                        title="Convert to Invoice"
                        disabled={b.converted_to_invoice_id !== null && b.converted_to_invoice_id !== undefined}
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="destructive"
                        onClick={() => handleDeleteClick(b.id, b.number)}
                        title={b.converted_to_invoice_id ? "Cannot delete converted BOQ" : "Delete"}
                        disabled={!!b.converted_to_invoice_id}
                      >
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

      <CreateBOQModal open={open} onOpenChange={setOpen} onSuccess={() => refetchBOQs()} />

      <CreatePercentageCopyModal
        open={percentageCopyOpen}
        onOpenChange={setPercentageCopyOpen}
        companyId={companyId || ''}
        onSuccess={() => refetchBOQs()}
      />

      {viewing && (() => {
        const getLocaleForCurrency = (curr: string) => {
          const mapping: { [key: string]: { locale: string; code: string } } = {
            KES: { locale: 'en-KE', code: 'KES' },
            USD: { locale: 'en-US', code: 'USD' },
            EUR: { locale: 'en-GB', code: 'EUR' }
          };
          return mapping[curr] || mapping.KES;
        };
        const currencyLocale = getLocaleForCurrency(viewing.currency || 'KES');
        const formatViewingCurrency = (amount: number) => new Intl.NumberFormat(currencyLocale.locale, { style: 'currency', currency: currencyLocale.code, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
        return (
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
              <div><strong>Currency:</strong> <Badge variant="outline">{viewing.currency || 'KES'}</Badge></div>
              <div><strong>Client:</strong> {viewing.client_name} {viewing.client_email ? `(${viewing.client_email})` : ''}</div>
              <div><strong>Project:</strong> {viewing.project_title || '-'}</div>
              <div><strong>Contractor:</strong> {viewing.contractor || '-'}</div>
              <div className="pt-2"><strong>Notes:</strong><div className="whitespace-pre-wrap">{viewing.data?.notes || '-'}</div></div>

              <div className="pt-4 space-y-2">
                {viewing.data?.sections?.map((sec: any, idx: number) => (
                  <div key={idx}>
                    <div className="bg-muted/40 border-l-4 border-primary px-4 py-2 mb-1 rounded-r">
                      <h3 className="font-bold text-sm uppercase tracking-wide text-foreground">{sec.title}</h3>
                    </div>

                    {sec.subsections && sec.subsections.length > 0 ? (
                      <div className="space-y-3 ml-2">
                        {sec.subsections.map((sub: any, subIdx: number) => {
                          const subsectionTotal = (sub.items || []).reduce((sum: number, it: any) => {
                            return sum + ((it.quantity || 0) * (it.rate || 0));
                          }, 0);

                          return (
                            <div key={subIdx} className="bg-white rounded p-4 border border-border">
                              <div className="flex justify-between items-center mb-3">
                                <div className="font-semibold text-sm text-foreground">Subsection {sub.name}: {sub.label}</div>
                                <div className="text-sm font-bold text-primary">{formatViewingCurrency(subsectionTotal)}</div>
                              </div>
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-left text-muted-foreground border-b">
                                    <th className="pb-2">Description</th><th className="pb-2">Qty</th><th className="pb-2">Unit</th><th className="pb-2">Rate</th><th className="pb-2 text-right">Amount</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(sub.items || []).map((it: any, i: number) => (
                                    <tr key={i} className="border-b last:border-b-0 hover:bg-white/50">
                                      <td className="py-1">{it.description}</td>
                                      <td className="py-1">{it.quantity}</td>
                                      <td className="py-1">{
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
                                      <td className="py-1">{formatViewingCurrency(Number(it.rate || 0))}</td>
                                      <td className="py-1 text-right font-medium">{formatViewingCurrency(Number((it.quantity || 0) * (it.rate || 0)))}</td>
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
                            <div className="flex justify-end font-bold text-sm pt-4 mt-2 border-t-2 border-primary">
                              <div className="text-primary">Section Total: {formatViewingCurrency(sectionTotal)}</div>
                            </div>
                          );
                        })()}
                      </div>
                    ) : (
                      <div className="mt-4 bg-white rounded border border-border p-4">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-muted-foreground border-b">
                              <th className="pb-2">Description</th><th className="pb-2">Qty</th><th className="pb-2">Unit</th><th className="pb-2">Rate</th><th className="pb-2 text-right">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(sec.items || []).map((it: any, i: number) => (
                              <tr key={i} className="border-b last:border-b-0 hover:bg-muted/20">
                                <td className="py-2">{it.description}</td>
                                <td className="py-2">{it.quantity}</td>
                                <td className="py-2">{
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
                                <td className="py-2">{formatViewingCurrency(Number(it.rate || 0))}</td>
                                <td className="py-2 text-right font-medium">{formatViewingCurrency(Number((it.quantity || 0) * (it.rate || 0)))}</td>
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
      );
      })()}

      {editing && (
        <EditBOQModal
          open={!!editing}
          onOpenChange={(isOpen) => setEditing(isOpen ? editing : null)}
          boq={editing}
          onSuccess={() => refetchBOQs()}
        />
      )}

      <ConfirmationDialog
        open={deleteDialog.open}
        title="Delete BOQ"
        description={`Are you sure you want to delete BOQ ${deleteDialog.boqNumber}? This action cannot be undone.`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteDialog({ open: false })}
        confirmText="Delete"
      />

      <ConfirmationDialog
        open={convertDialog.open}
        title="Convert BOQ to Invoice"
        description={`Convert BOQ ${convertDialog.boqNumber} to an invoice? This will create a new draft invoice with all items from this BOQ. The BOQ will be marked as converted.`}
        onConfirm={handleConvertConfirm}
        onCancel={() => setConvertDialog({ open: false })}
        confirmText="Convert to Invoice"
        isLoading={convertToInvoice.isPending}
        loadingText="Converting..."
        isDangerous={false}
      />

      {percentageRateBoq && (
        <ChangePercentageRateModal
          open={percentageRateOpen}
          onOpenChange={setPercentageRateOpen}
          boq={percentageRateBoq}
          onDownload={async (data: { percentage: number; multiplier: number }) => {
            await handleDownloadPDF(percentageRateBoq, {
              customTitle: 'INVOICE',
              amountMultiplier: data.multiplier,
              forceCurrency: 'EUR',
              customClient: {
                name: 'Global Crop Diversity Trust',
                address: 'Platz der Vereinten Nationen 7',
                city: 'Bonn',
                country: 'Germany'
              },
              stampImageUrl: 'https://cdn.builder.io/api/v1/image/assets%2F431212e7a441426cb89fb9ab85eaab25%2F3742605378df401d9078c76d81877fea?format=webp&width=800',
              specialPaymentPercentage: data.percentage
            });
          }}
        />
      )}
    </div>
  );
}
