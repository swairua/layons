import { useState, useEffect } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Plus,
  Trash2,
  Search,
  Calculator,
  Receipt,
  Loader2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useCustomers, useGenerateDocumentNumber, useTaxSettings, useCompanies, useProducts } from '@/hooks/useDatabase';
import { useCreateInvoiceWithItems } from '@/hooks/useQuotationItems';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface InvoiceItem {
  id: string;
  product_id: string;
  product_name: string;
  description: string;
  quantity: number;
  unit_price: number;
  discount_percentage: number;
  tax_percentage: number;
  tax_amount: number;
  tax_inclusive: boolean;
  line_total: number;
}

interface InvoiceSection {
  id: string;
  name: string;
  items: InvoiceItem[];
  labor_cost: number;
  expanded: boolean;
}

interface CreateInvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  preSelectedCustomer?: any;
}

export function CreateInvoiceModal({ open, onOpenChange, onSuccess, preSelectedCustomer }: CreateInvoiceModalProps) {
  const [selectedCustomerId, setSelectedCustomerId] = useState(preSelectedCustomer?.id || '');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [lpoNumber, setLpoNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [termsAndConditions, setTermsAndConditions] = useState('Payment due within 30 days of invoice date.');
  
  const [sections, setSections] = useState<InvoiceSection[]>([]);
  const [searchProduct, setSearchProduct] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');

  // Get current user and company from context
  const { profile, loading: authLoading } = useAuth();
  const { data: companies } = useCompanies();
  const currentCompany = companies?.[0];
  const { data: customers, isLoading: loadingCustomers } = useCustomers(currentCompany?.id);
  const { data: products, isLoading: loadingProducts } = useProducts(currentCompany?.id);
  const { data: taxSettings } = useTaxSettings(currentCompany?.id);
  const createInvoiceWithItems = useCreateInvoiceWithItems();
  const generateDocNumber = useGenerateDocumentNumber();

  // Get default tax rate
  const defaultTax = taxSettings?.find(tax => tax.is_default && tax.is_active);
  const defaultTaxRate = defaultTax?.rate || 16;

  // Handle pre-selected customer
  useEffect(() => {
    if (preSelectedCustomer && open) {
      setSelectedCustomerId(preSelectedCustomer.id);
    }
  }, [preSelectedCustomer, open]);

  const filteredProducts = products?.filter(product =>
    product.name.toLowerCase().includes(searchProduct.toLowerCase()) ||
    product.product_code.toLowerCase().includes(searchProduct.toLowerCase())
  ) || [];

  const calculateItemTotal = (quantity: number, unitPrice: number, discountPercentage: number, taxPercentage: number, taxInclusive: boolean) => {
    const baseAmount = quantity * unitPrice;
    const discountAmount = baseAmount * (discountPercentage / 100);
    const afterDiscount = baseAmount - discountAmount;

    if (taxPercentage === 0 || !taxInclusive) {
      return afterDiscount;
    }

    const taxAmount = afterDiscount * (taxPercentage / 100);
    return afterDiscount + taxAmount;
  };

  const calculateTaxAmount = (item: InvoiceItem) => {
    const baseAmount = item.quantity * item.unit_price;
    const discountAmount = baseAmount * (item.discount_percentage / 100);
    const afterDiscount = baseAmount - discountAmount;

    if (item.tax_percentage === 0 || !item.tax_inclusive) {
      return 0;
    }

    return afterDiscount * (item.tax_percentage / 100);
  };

  const addSection = () => {
    if (!newSectionName.trim()) {
      toast.error('Please enter a section name');
      return;
    }

    const newSection: InvoiceSection = {
      id: `section-${Date.now()}`,
      name: newSectionName,
      items: [],
      labor_cost: 0,
      expanded: true
    };

    setSections([...sections, newSection]);
    setNewSectionName('');
  };

  const removeSection = (sectionId: string) => {
    setSections(sections.filter(s => s.id !== sectionId));
  };

  const updateSectionName = (sectionId: string, name: string) => {
    setSections(sections.map(s =>
      s.id === sectionId ? { ...s, name } : s
    ));
  };

  const updateSectionLaborCost = (sectionId: string, laborCost: number) => {
    setSections(sections.map(s =>
      s.id === sectionId ? { ...s, labor_cost: laborCost } : s
    ));
  };

  const toggleSectionExpanded = (sectionId: string) => {
    setSections(sections.map(s =>
      s.id === sectionId ? { ...s, expanded: !s.expanded } : s
    ));
  };

  const addItemToSection = (sectionId: string, product: any) => {
    setSections(sections.map(section => {
      if (section.id !== sectionId) return section;

      const existingItem = section.items.find(item => item.product_id === product.id);

      if (existingItem) {
        return {
          ...section,
          items: section.items.map(item =>
            item.id === existingItem.id
              ? {
                  ...item,
                  quantity: item.quantity + 1,
                  line_total: calculateItemTotal(item.quantity + 1, item.unit_price, item.discount_percentage, item.tax_percentage, item.tax_inclusive),
                  tax_amount: calculateTaxAmount({ ...item, quantity: item.quantity + 1 })
                }
              : item
          )
        };
      }

      const price = Number(product.selling_price || product.unit_price || 0);
      const newItem: InvoiceItem = {
        id: `temp-${Date.now()}`,
        product_id: product.id,
        product_name: product.name,
        description: product.description || product.name,
        quantity: 1,
        unit_price: price,
        discount_percentage: 0,
        tax_percentage: defaultTaxRate,
        tax_amount: 0,
        tax_inclusive: true,
        line_total: calculateItemTotal(1, price, 0, defaultTaxRate, true)
      };

      newItem.tax_amount = calculateTaxAmount(newItem);

      return {
        ...section,
        items: [...section.items, newItem]
      };
    }));

    setSearchProduct('');
  };

  const updateItemQuantity = (sectionId: string, itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(sectionId, itemId);
      return;
    }

    setSections(sections.map(section => {
      if (section.id !== sectionId) return section;

      return {
        ...section,
        items: section.items.map(item => {
          if (item.id === itemId) {
            const lineTotal = calculateItemTotal(quantity, item.unit_price, item.discount_percentage, item.tax_percentage, item.tax_inclusive);
            const taxAmount = calculateTaxAmount({ ...item, quantity });
            return { ...item, quantity, line_total: lineTotal, tax_amount: taxAmount };
          }
          return item;
        })
      };
    }));
  };

  const updateItemPrice = (sectionId: string, itemId: string, unitPrice: number) => {
    setSections(sections.map(section => {
      if (section.id !== sectionId) return section;

      return {
        ...section,
        items: section.items.map(item => {
          if (item.id === itemId) {
            const lineTotal = calculateItemTotal(item.quantity, unitPrice, item.discount_percentage, item.tax_percentage, item.tax_inclusive);
            const taxAmount = calculateTaxAmount({ ...item, unit_price: unitPrice });
            return { ...item, unit_price: unitPrice, line_total: lineTotal, tax_amount: taxAmount };
          }
          return item;
        })
      };
    }));
  };

  const updateItemDiscount = (sectionId: string, itemId: string, discountPercentage: number) => {
    setSections(sections.map(section => {
      if (section.id !== sectionId) return section;

      return {
        ...section,
        items: section.items.map(item => {
          if (item.id === itemId) {
            const lineTotal = calculateItemTotal(item.quantity, item.unit_price, discountPercentage, item.tax_percentage, item.tax_inclusive);
            const taxAmount = calculateTaxAmount({ ...item, discount_percentage: discountPercentage });
            return { ...item, discount_percentage: discountPercentage, line_total: lineTotal, tax_amount: taxAmount };
          }
          return item;
        })
      };
    }));
  };

  const updateItemTax = (sectionId: string, itemId: string, taxPercentage: number) => {
    setSections(sections.map(section => {
      if (section.id !== sectionId) return section;

      return {
        ...section,
        items: section.items.map(item => {
          if (item.id === itemId) {
            const lineTotal = calculateItemTotal(item.quantity, item.unit_price, item.discount_percentage, taxPercentage, item.tax_inclusive);
            const taxAmount = calculateTaxAmount({ ...item, tax_percentage: taxPercentage });
            return { ...item, tax_percentage: taxPercentage, line_total: lineTotal, tax_amount: taxAmount };
          }
          return item;
        })
      };
    }));
  };

  const updateItemTaxInclusive = (sectionId: string, itemId: string, taxInclusive: boolean) => {
    setSections(sections.map(section => {
      if (section.id !== sectionId) return section;

      return {
        ...section,
        items: section.items.map(item => {
          if (item.id === itemId) {
            let newTaxPercentage = item.tax_percentage;
            if (taxInclusive && item.tax_percentage === 0) {
              newTaxPercentage = defaultTaxRate;
            }
            if (!taxInclusive) {
              newTaxPercentage = 0;
            }

            const lineTotal = calculateItemTotal(item.quantity, item.unit_price, item.discount_percentage, newTaxPercentage, taxInclusive);
            const taxAmount = calculateTaxAmount({ ...item, tax_inclusive: taxInclusive, tax_percentage: newTaxPercentage });
            return { ...item, tax_inclusive: taxInclusive, tax_percentage: newTaxPercentage, line_total: lineTotal, tax_amount: taxAmount };
          }
          return item;
        })
      };
    }));
  };

  const removeItem = (sectionId: string, itemId: string) => {
    setSections(sections.map(section => {
      if (section.id !== sectionId) return section;

      return {
        ...section,
        items: section.items.filter(item => item.id !== itemId)
      };
    }));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const calculateSectionMaterialsTotal = (section: InvoiceSection) => {
    return section.items.reduce((sum, item) => sum + item.line_total, 0);
  };

  const calculateSectionTotalWithLabor = (section: InvoiceSection) => {
    return calculateSectionMaterialsTotal(section) + section.labor_cost;
  };

  const calculateGrandTotal = () => {
    return sections.reduce((sum, section) => sum + calculateSectionTotalWithLabor(section), 0);
  };

  const calculateTotalMaterials = () => {
    return sections.reduce((sum, section) => sum + calculateSectionMaterialsTotal(section), 0);
  };

  const calculateTotalLabor = () => {
    return sections.reduce((sum, section) => sum + section.labor_cost, 0);
  };

  const getTotalTax = () => {
    return sections.reduce((sum, section) => {
      const sectionTax = section.items.reduce((itemSum, item) => itemSum + calculateTaxAmount(item), 0);
      return sum + sectionTax;
    }, 0);
  };

  const handleSubmit = async () => {
    if (!selectedCustomerId) {
      toast.error('Please select a customer');
      return;
    }

    if (sections.length === 0 || sections.every(s => s.items.length === 0)) {
      toast.error('Please add at least one item to a section');
      return;
    }

    if (!invoiceDate) {
      toast.error('Please select an invoice date');
      return;
    }

    if (!dueDate) {
      toast.error('Please select a due date');
      return;
    }

    setIsSubmitting(true);
    try {
      const invoiceNumber = await generateDocNumber.mutateAsync({
        companyId: currentCompany?.id || 'default-company-id',
        type: 'invoice'
      });

      if (!currentCompany?.id) {
        toast.error('No company selected. Please ensure you are associated with a company.');
        return;
      }

      if (authLoading) {
        toast.info('Please wait, authenticating user...');
        return;
      }

      if (!profile?.id) {
        toast.error('User not authenticated. Please sign in and try again.');
        return;
      }

      const totalMaterials = calculateTotalMaterials();
      const totalLabor = calculateTotalLabor();
      const totalTax = getTotalTax();
      const grandTotal = calculateGrandTotal();

      const invoiceData = {
        company_id: currentCompany.id,
        customer_id: selectedCustomerId,
        invoice_number: invoiceNumber,
        invoice_date: invoiceDate,
        due_date: dueDate,
        lpo_number: lpoNumber || null,
        status: 'draft',
        subtotal: totalMaterials,
        tax_amount: totalTax,
        total_amount: grandTotal,
        paid_amount: 0,
        balance_due: grandTotal,
        terms_and_conditions: termsAndConditions,
        notes: notes,
        created_by: profile.id
      };

      const invoiceItems = sections.flatMap((section, sectionIndex) =>
        section.items.map(item => {
          if (!item.description || item.description.trim() === '') {
            throw new Error(`Item "${item.product_name}" is missing a description`);
          }
          if (item.quantity <= 0) {
            throw new Error(`Item "${item.product_name}" must have a quantity greater than 0`);
          }
          if (item.unit_price < 0) {
            throw new Error(`Item "${item.product_name}" cannot have a negative unit price`);
          }

          return {
            product_id: item.product_id,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            discount_percentage: item.discount_percentage || 0,
            tax_percentage: item.tax_percentage || 0,
            tax_amount: calculateTaxAmount(item),
            tax_inclusive: item.tax_inclusive || false,
            line_total: item.line_total,
            section_name: section.name,
            section_labor_cost: section.labor_cost,
            sort_order: sectionIndex
          };
        })
      );

      if (!invoiceData.customer_id) {
        throw new Error('Customer is required');
      }
      if (!invoiceData.invoice_date) {
        throw new Error('Invoice date is required');
      }
      if (!invoiceData.invoice_number) {
        throw new Error('Failed to generate invoice number');
      }

      await createInvoiceWithItems.mutateAsync({
        invoice: invoiceData,
        items: invoiceItems
      });

      toast.success(`Invoice ${invoiceNumber} created successfully!`);
      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Error creating invoice:', error);
      let errorMessage = 'Unknown error occurred';

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === 'object') {
        const supabaseError = error as any;
        if (supabaseError.message) {
          errorMessage = supabaseError.message;
        } else if (supabaseError.details) {
          errorMessage = supabaseError.details;
        }
      }

      toast.error(`Failed to create invoice: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedCustomerId(preSelectedCustomer?.id || '');
    setInvoiceDate(new Date().toISOString().split('T')[0]);
    setDueDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    setLpoNumber('');
    setNotes('');
    setTermsAndConditions('Payment due within 30 days of invoice date.');
    setSections([]);
    setSearchProduct('');
    setNewSectionName('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Receipt className="h-5 w-5 text-primary" />
            <span>Create New Invoice</span>
          </DialogTitle>
          <DialogDescription>
            Create a detailed invoice with sections and items for your customer
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Invoice Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="customer">Customer *</Label>
                  <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {loadingCustomers ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">Loading customers...</div>
                      ) : (
                        customers?.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.name} ({customer.customer_code})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="invoice_date">Invoice Date *</Label>
                    <Input
                      id="invoice_date"
                      type="date"
                      value={invoiceDate}
                      onChange={(e) => setInvoiceDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="due_date">Due Date *</Label>
                    <Input
                      id="due_date"
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lpo_number">LPO Number (Optional)</Label>
                  <Input
                    id="lpo_number"
                    type="text"
                    value={lpoNumber}
                    onChange={(e) => setLpoNumber(e.target.value)}
                    placeholder="Enter LPO reference number"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Additional notes for this invoice..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="terms">Terms and Conditions</Label>
                  <Textarea
                    id="terms"
                    value={termsAndConditions}
                    onChange={(e) => setTermsAndConditions(e.target.value)}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Add Products</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search products by name or code..."
                      value={searchProduct}
                      onChange={(e) => setSearchProduct(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  <div className="max-h-64 overflow-y-auto border rounded-lg">
                    {loadingProducts ? (
                      <div className="p-4 text-center text-muted-foreground">Loading products...</div>
                    ) : (filteredProducts && filteredProducts.length === 0) ? (
                      <div className="p-4 text-center text-muted-foreground">
                        {searchProduct ? 'No products found' : 'No products available'}
                      </div>
                    ) : (
                      (filteredProducts || []).map((product) => (
                        <div
                          key={product.id}
                          className="p-3 hover:bg-muted/50 cursor-pointer border-b last:border-b-0"
                          onClick={() => {
                            if (sections.length === 0) {
                              toast.info('Please create a section first');
                            }
                          }}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-medium">{product.name}</div>
                              <div className="text-sm text-muted-foreground">{product.product_code}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold">{formatCurrency(product.unit_price)}</div>
                              <div className="text-xs text-muted-foreground">Stock: {product.stock_quantity}</div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Invoice Sections</span>
              <Badge variant="outline">{sections.length} sections</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="New section name (e.g., Materials, Installation)"
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addSection()}
              />
              <Button onClick={addSection} size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Section
              </Button>
            </div>

            {sections.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No sections added yet. Create a section to start adding items.
              </div>
            ) : (
              <div className="space-y-4">
                {sections.map((section) => (
                  <Card key={section.id} className="border">
                    <CardHeader className="pb-3 cursor-pointer" onClick={() => toggleSectionExpanded(section.id)}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {section.expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          <CardTitle className="text-base">{section.name}</CardTitle>
                          <Badge variant="outline">{section.items.length} items</Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeSection(section.id);
                          }}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>

                    {section.expanded && (
                      <CardContent className="space-y-4 pt-0">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Section Name</Label>
                            <Input
                              value={section.name}
                              onChange={(e) => updateSectionName(section.id, e.target.value)}
                              placeholder="Section name"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Labor Cost</Label>
                            <Input
                              type="number"
                              value={section.labor_cost}
                              onChange={(e) => updateSectionLaborCost(section.id, parseFloat(e.target.value) || 0)}
                              placeholder="0.00"
                              step="0.01"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm">Add Products to Section</Label>
                          <div className="max-h-48 overflow-y-auto border rounded-lg">
                            {(filteredProducts || []).map((product) => (
                              <div
                                key={product.id}
                                className="p-2 hover:bg-muted/50 cursor-pointer border-b last:border-b-0 text-sm"
                                onClick={() => addItemToSection(section.id, product)}
                              >
                                <div className="flex justify-between">
                                  <span className="font-medium">{product.name}</span>
                                  <span>{formatCurrency(product.unit_price)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {section.items.length > 0 && (
                          <div className="overflow-x-auto">
                            <Table className="text-sm">
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Product</TableHead>
                                  <TableHead className="w-20">Qty</TableHead>
                                  <TableHead className="w-24">Unit Price</TableHead>
                                  <TableHead className="w-20">Disc. %</TableHead>
                                  <TableHead className="w-16">Tax %</TableHead>
                                  <TableHead className="w-16">Inc. Tax</TableHead>
                                  <TableHead className="text-right">Total</TableHead>
                                  <TableHead className="w-8"></TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {section.items.map((item) => (
                                  <TableRow key={item.id}>
                                    <TableCell className="text-xs">
                                      <div className="font-medium">{item.product_name}</div>
                                    </TableCell>
                                    <TableCell>
                                      <Input
                                        type="number"
                                        value={item.quantity}
                                        onChange={(e) => updateItemQuantity(section.id, item.id, parseInt(e.target.value) || 0)}
                                        className="w-16 h-8"
                                        min="1"
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <Input
                                        type="number"
                                        value={item.unit_price}
                                        onChange={(e) => updateItemPrice(section.id, item.id, parseFloat(e.target.value) || 0)}
                                        className="w-20 h-8"
                                        step="0.01"
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <Input
                                        type="number"
                                        value={item.discount_percentage || 0}
                                        onChange={(e) => updateItemDiscount(section.id, item.id, parseFloat(e.target.value) || 0)}
                                        className="w-16 h-8"
                                        step="0.01"
                                        placeholder="0"
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <Input
                                        type="number"
                                        value={item.tax_percentage}
                                        onChange={(e) => updateItemTax(section.id, item.id, parseFloat(e.target.value) || 0)}
                                        className="w-14 h-8"
                                        min="0"
                                        max="100"
                                        step="0.1"
                                        disabled={item.tax_inclusive}
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <Checkbox
                                        checked={item.tax_inclusive}
                                        onCheckedChange={(checked) => updateItemTaxInclusive(section.id, item.id, !!checked)}
                                      />
                                    </TableCell>
                                    <TableCell className="text-right font-semibold text-sm">
                                      {formatCurrency(item.line_total)}
                                    </TableCell>
                                    <TableCell>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeItem(section.id, item.id)}
                                        className="text-destructive hover:text-destructive h-8 w-8"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>

                            <div className="mt-4 border-t pt-3 space-y-1 text-sm">
                              <div className="flex justify-end pr-4">
                                <div className="w-60 space-y-1">
                                  <div className="flex justify-between">
                                    <span>Materials:</span>
                                    <span className="font-semibold">{formatCurrency(calculateSectionMaterialsTotal(section))}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Labor Cost:</span>
                                    <span className="font-semibold">{formatCurrency(section.labor_cost)}</span>
                                  </div>
                                  <div className="flex justify-between border-t pt-1 font-bold">
                                    <span>Section Total:</span>
                                    <span>{formatCurrency(calculateSectionTotalWithLabor(section))}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {sections.length > 0 && (
          <Card className="bg-slate-50">
            <CardContent className="pt-6">
              <div className="flex justify-end">
                <div className="w-80 space-y-2">
                  <div className="flex justify-between">
                    <span>Total Materials:</span>
                    <span className="font-semibold">{formatCurrency(calculateTotalMaterials())}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Labor:</span>
                    <span className="font-semibold">{formatCurrency(calculateTotalLabor())}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Tax:</span>
                    <span className="font-semibold">{formatCurrency(getTotalTax())}</span>
                  </div>
                  <div className="flex justify-between text-lg border-t pt-2 font-bold">
                    <span>Grand Total:</span>
                    <span className="text-primary">{formatCurrency(calculateGrandTotal())}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedCustomerId || sections.every(s => s.items.length === 0)}
            className="min-w-32"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Receipt className="mr-2 h-4 w-4" />
                Create Invoice
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
