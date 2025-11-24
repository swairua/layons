import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Receipt,
  Calendar,
  User,
  Mail,
  Phone,
  MapPin,
  FileText,
  Download,
  Send,
  DollarSign,
  Edit,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useState, useMemo } from 'react';

interface ViewInvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: any;
  onEdit: () => void;
  onDownload: () => void;
  onSend: () => void;
  onRecordPayment: () => void;
}

interface InvoiceSection {
  name: string;
  items: any[];
  labor_cost: number;
}

export function ViewInvoiceModal({ 
  open, 
  onOpenChange, 
  invoice, 
  onEdit, 
  onDownload, 
  onSend, 
  onRecordPayment 
}: ViewInvoiceModalProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  if (!invoice) return null;

  const formatCurrency = (amount: number, currency: string = 'KES') => {
    const localeMap: { [key: string]: string } = {
      'KES': 'en-KE',
      'USD': 'en-US',
      'EUR': 'en-GB',
      'GBP': 'en-GB',
      'JPY': 'ja-JP',
      'INR': 'en-IN',
    };

    return new Intl.NumberFormat(localeMap[currency] || 'en-KE', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-muted text-muted-foreground border-muted-foreground/20';
      case 'sent':
        return 'bg-warning-light text-warning border-warning/20';
      case 'paid':
        return 'bg-success-light text-success border-success/20';
      case 'partial':
        return 'bg-primary-light text-primary border-primary/20';
      case 'overdue':
        return 'bg-destructive-light text-destructive border-destructive/20';
      default:
        return 'bg-muted text-muted-foreground border-muted-foreground/20';
    }
  };

  // Group items by section
  const sections: InvoiceSection[] = useMemo(() => {
    const sectionMap = new Map<string, InvoiceSection>();
    
    (invoice.invoice_items || []).forEach((item: any) => {
      const sectionName = item.section_name || 'Items';
      
      if (!sectionMap.has(sectionName)) {
        sectionMap.set(sectionName, {
          name: sectionName,
          items: [],
          labor_cost: item.section_labor_cost || 0
        });
      }
      
      sectionMap.get(sectionName)!.items.push(item);
    });

    return Array.from(sectionMap.values());
  }, [invoice.invoice_items]);

  const hasSections = sections.length > 1 || (sections.length === 1 && sections[0].name !== 'Items');

  const toggleSection = (sectionName: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionName)) {
      newExpanded.delete(sectionName);
    } else {
      newExpanded.add(sectionName);
    }
    setExpandedSections(newExpanded);
  };

  const calculateSectionMaterials = (section: InvoiceSection) => {
    return section.items.reduce((sum, item) => sum + (item.line_total || 0), 0);
  };

  const calculateSectionTotal = (section: InvoiceSection) => {
    return calculateSectionMaterials(section) + section.labor_cost;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Receipt className="h-6 w-6 text-primary" />
              <div>
                <div className="flex items-center space-x-2">
                  <span>Invoice {invoice.invoice_number}</span>
                  <Badge variant="outline" className={getStatusColor(invoice.status)}>
                    {invoice.status?.charAt(0).toUpperCase() + invoice.status?.slice(1)}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground font-normal">
                  {formatCurrency(invoice.total_amount || 0, invoice.currency || 'KES')}
                </div>
              </div>
            </div>
            
            <div className="flex space-x-2">
              {invoice.status === 'draft' && (
                <Button variant="outline" size="sm" onClick={onEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={onDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              {invoice.customers?.email && invoice.status === 'draft' && (
                <Button variant="outline" size="sm" onClick={onSend}>
                  <Send className="h-4 w-4 mr-2" />
                  Send
                </Button>
              )}
              <Button size="sm" onClick={onRecordPayment}>
                <DollarSign className="h-4 w-4 mr-2" />
                {(invoice.balance_due || 0) > 0 ? 'Record Payment' : 'Payment Adjustment'}
              </Button>
            </div>
          </DialogTitle>
          <DialogDescription>
            Invoice details and line items
          </DialogDescription>
        </DialogHeader>

        {/* Traditional Invoice Layout */}
        <Card className="border-0 shadow-none">
          <CardContent className="p-0">
            <div className="grid grid-cols-3 gap-8 py-6">
              {/* Left Column: Client Details and Invoice Details */}
              <div className="col-span-2 space-y-6">
                {/* Client Details Section */}
                <div className="space-y-3 text-sm">
                  <div className="flex">
                    <span className="font-semibold w-24">Client:</span>
                    <span className="flex-1">{invoice.customers?.name || 'Unknown Customer'}</span>
                  </div>
                  {invoice.customers?.customer_code && (
                    <div className="flex">
                      <span className="font-semibold w-24">Code:</span>
                      <span className="flex-1">{invoice.customers.customer_code}</span>
                    </div>
                  )}
                  {invoice.customers?.address && (
                    <div className="flex">
                      <span className="font-semibold w-24">Address:</span>
                      <span className="flex-1">
                        {invoice.customers.address}
                        {invoice.customers.city && `, ${invoice.customers.city}`}
                        {invoice.customers.country && `, ${invoice.customers.country}`}
                      </span>
                    </div>
                  )}
                  {invoice.customers?.email && (
                    <div className="flex">
                      <span className="font-semibold w-24">Email:</span>
                      <span className="flex-1">{invoice.customers.email}</span>
                    </div>
                  )}
                  {invoice.customers?.phone && (
                    <div className="flex">
                      <span className="font-semibold w-24">Phone:</span>
                      <span className="flex-1">{invoice.customers.phone}</span>
                    </div>
                  )}
                </div>

                {/* Invoice Details Section */}
                <div className="space-y-3 text-sm">
                  <div className="flex">
                    <span className="font-semibold w-24">Invoice No:</span>
                    <span className="flex-1">{invoice.invoice_number}</span>
                  </div>
                  <div className="flex">
                    <span className="font-semibold w-24">Date:</span>
                    <span className="flex-1">{formatDate(invoice.invoice_date)}</span>
                  </div>
                  <div className="flex">
                    <span className="font-semibold w-24">Due Date:</span>
                    <span className="flex-1">{formatDate(invoice.due_date)}</span>
                  </div>
                  <div className="flex">
                    <span className="font-semibold w-24">Status:</span>
                    <span className="flex-1">
                      <Badge variant="outline" className={getStatusColor(invoice.status)}>
                        {invoice.status?.charAt(0).toUpperCase() + invoice.status?.slice(1)}
                      </Badge>
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column: Company Details */}
              <div className="space-y-3 text-sm text-right">
                <div className="font-bold text-base mb-4">{invoice.company?.name || 'Layons Construction Limited'}</div>
                {invoice.company?.address && (
                  <div>{invoice.company.address}</div>
                )}
                {invoice.company?.city && (
                  <div>{invoice.company.city}{invoice.company.country && `, ${invoice.company.country}`}</div>
                )}
                {invoice.company?.phone && (
                  <div>Telephone: {invoice.company.phone}</div>
                )}
                {invoice.company?.email && (
                  <div>{invoice.company.email}</div>
                )}
                {invoice.company?.tax_number && (
                  <div>Tax ID: {invoice.company.tax_number}</div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Invoice Items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Invoice Items</span>
              <Badge variant="outline">
                {invoice.invoice_items?.length || 0} items
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!invoice.invoice_items || invoice.invoice_items.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No items found for this invoice
              </div>
            ) : hasSections ? (
              <div className="space-y-4">
                {sections.map((section) => (
                  <div key={section.name} className="border rounded-lg">
                    <div
                      className="p-4 bg-slate-50 cursor-pointer hover:bg-slate-100 flex items-center justify-between"
                      onClick={() => toggleSection(section.name)}
                    >
                      <div className="flex items-center gap-2">
                        {expandedSections.has(section.name) ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                        <h3 className="font-semibold">{section.name}</h3>
                        <Badge variant="outline" className="text-xs">
                          {section.items.length} items
                        </Badge>
                      </div>
                      <div className="font-semibold">
                        {formatCurrency(calculateSectionTotal(section), invoice.currency || 'KES')}
                      </div>
                    </div>

                    {expandedSections.has(section.name) && (
                      <div className="p-4 space-y-4">
                        {/* Subsection A: Materials */}
                        <div className="mb-1 font-semibold">A. Materials</div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Product</TableHead>
                              <TableHead>Qty</TableHead>
                              <TableHead>Unit Price</TableHead>
                              <TableHead>Tax %</TableHead>
                              <TableHead className="text-right">Line Total</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {section.items.map((item: any, index: number) => (
                              <TableRow key={item.id || index}>
                                <TableCell>
                                  <div>
                                    <div className="font-medium">
                                      {item.products?.name || item.description || 'Unknown Product'}
                                    </div>
                                    {item.description && item.description !== item.products?.name && (
                                      <div className="text-sm text-muted-foreground">{item.description}</div>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>{item.quantity}</TableCell>
                                <TableCell>{formatCurrency(item.unit_price, invoice.currency || 'KES')}</TableCell>
                                <TableCell>{item.tax_percentage || 0}%</TableCell>
                                <TableCell className="text-right font-semibold">
                                  {formatCurrency(item.line_total, invoice.currency || 'KES')}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>

                        {/* Subsection B: Labour */}
                        {section.labor_cost > 0 && (
                          <div className="mt-4">
                            <div className="mb-2 font-semibold">B. Labour</div>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Description</TableHead>
                                  <TableHead className="text-right">Amount</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                <TableRow>
                                  <TableCell>Labour for {section.name}</TableCell>
                                  <TableCell className="text-right font-semibold">{formatCurrency(section.labor_cost, invoice.currency || 'KES')}</TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>
                          </div>
                        )}

                        {/* Section Totals */}
                        <div className="border-t pt-4">
                          <div className="flex justify-end">
                            <div className="w-80 space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span>Total {section.name} Materials:</span>
                                <span className="font-semibold">{formatCurrency(calculateSectionMaterials(section), invoice.currency || 'KES')}</span>
                              </div>
                              {section.labor_cost > 0 && (
                                <div className="flex justify-between">
                                  <span>{section.name} Labour:</span>
                                  <span className="font-semibold">{formatCurrency(section.labor_cost, invoice.currency || 'KES')}</span>
                                </div>
                              )}
                              <div className="flex justify-between border-t pt-1 font-semibold">
                                <span>Section Total:</span>
                                <span>{formatCurrency(calculateSectionTotal(section), invoice.currency || 'KES')}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead>Tax %</TableHead>
                    <TableHead className="text-right">Line Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.invoice_items.map((item: any, index: number) => (
                    <TableRow key={item.id || index}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {item.products?.name || item.description || 'Unknown Product'}
                          </div>
                          {item.description && item.description !== item.products?.name && (
                            <div className="text-sm text-muted-foreground">{item.description}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{formatCurrency(item.unit_price, invoice.currency || 'KES')}</TableCell>
                      <TableCell>{item.tax_percentage || 0}%</TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(item.line_total, invoice.currency || 'KES')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {/* Invoice Totals */}
            <div className="mt-6 border-t pt-4">
              <div className="flex justify-end">
                <div className="w-80 space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span className="font-semibold">{formatCurrency(invoice.subtotal || 0, invoice.currency || 'KES')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax:</span>
                    <span className="font-semibold">{formatCurrency(invoice.tax_amount || 0, invoice.currency || 'KES')}</span>
                  </div>
                  <div className="flex justify-between text-lg border-t pt-2">
                    <span className="font-bold">Total:</span>
                    <span className="font-bold text-primary">{formatCurrency(invoice.total_amount || 0, invoice.currency || 'KES')}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Paid:</span>
                    <span>{formatCurrency(invoice.paid_amount || 0, invoice.currency || 'KES')}</span>
                  </div>
                  <div className="flex justify-between text-lg border-t pt-2">
                    <span className="font-bold">Balance Due:</span>
                    <span className={`font-bold ${(invoice.balance_due || 0) > 0 ? 'text-destructive' : 'text-success'}`}>
                      {formatCurrency(invoice.balance_due || 0, invoice.currency || 'KES')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {invoice.terms_and_conditions && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Terms and Conditions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{invoice.terms_and_conditions}</p>
            </CardContent>
          </Card>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
