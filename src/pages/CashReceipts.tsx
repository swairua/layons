import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Plus,
  Search,
  Eye,
  Download,
  Trash2,
  Loader2
} from 'lucide-react';
import { useCompanies } from '@/hooks/useDatabase';
import { useAuditLog } from '@/hooks/useAuditLog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { CreateCashReceiptModal } from '@/components/cash-receipts/CreateCashReceiptModal';
import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import { downloadCashReceiptPDF } from '@/utils/pdfGenerator';

interface CashReceipt {
  id: string;
  receipt_number: string;
  customers?: {
    name: string;
    email?: string;
  };
  receipt_date: string;
  total_amount: number;
  payment_method: string;
  value_tendered: number;
  change: number;
  notes?: string;
  created_at?: string;
}

export default function CashReceipts() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; receipt?: CashReceipt }>({ open: false });
  const [isLoading, setIsLoading] = useState(true);
  const [receipts, setReceipts] = useState<CashReceipt[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: companies } = useCompanies();
  const currentCompany = companies?.[0];
  const { logDelete } = useAuditLog();

  // Fetch cash receipts
  const fetchReceipts = async () => {
    if (!currentCompany?.id) return;
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('cash_receipts')
        .select(`
          id,
          receipt_number,
          customer_id,
          receipt_date,
          total_amount,
          payment_method,
          value_tendered,
          change,
          notes,
          created_at,
          customers (
            id,
            name,
            email
          )
        `)
        .eq('company_id', currentCompany.id)
        .order('receipt_date', { ascending: false });

      if (error) throw error;
      setReceipts(data || []);
    } catch (err) {
      console.error('Error fetching receipts:', err);
      toast.error('Failed to load cash receipts');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReceipts();
  }, [currentCompany?.id]);

  const handleDeleteClick = (receipt: CashReceipt) => {
    setDeleteDialog({ open: true, receipt });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.receipt || !currentCompany?.id) return;
    try {
      setIsDeleting(true);
      const { error } = await supabase
        .from('cash_receipts')
        .delete()
        .eq('id', deleteDialog.receipt.id);

      if (error) throw error;

      await logDelete(
        currentCompany.id,
        'cash_receipt',
        deleteDialog.receipt.id,
        deleteDialog.receipt.receipt_number,
        deleteDialog.receipt.receipt_number,
        {
          customerName: deleteDialog.receipt.customers?.name,
          totalAmount: deleteDialog.receipt.total_amount,
          deletedAt: new Date().toISOString(),
        }
      );

      toast.success('Cash receipt deleted successfully');
      fetchReceipts();
      setDeleteDialog({ open: false });
    } catch (err) {
      console.error('Delete failed', err);
      toast.error('Failed to delete cash receipt');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredReceipts = receipts.filter(receipt => {
    const matchesSearch =
      receipt.receipt_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      receipt.customers?.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

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
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const handleDownloadReceipt = async (receipt: CashReceipt) => {
    try {
      const enrichedReceipt = {
        ...receipt,
        company: {
          name: currentCompany?.name || 'Company',
          email: currentCompany?.email,
          phone: currentCompany?.phone,
          address: currentCompany?.address,
          city: currentCompany?.city,
          country: currentCompany?.country,
          logo_url: currentCompany?.logo_url,
        }
      };
      await downloadCashReceiptPDF(enrichedReceipt);
      toast.success('Receipt downloaded successfully');
    } catch (err) {
      console.error('Error downloading receipt:', err);
      toast.error('Failed to download receipt');
    }
  };

  const handleCreateSuccess = () => {
    fetchReceipts();
    toast.success('Cash receipt created successfully!');
  };

  return (
    <div className="flex-1 space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Cash Receipts</h1>
          <p className="text-gray-600 mt-2">Manage and track cash payment receipts</p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-primary hover:bg-primary/90"
        >
          <Plus className="h-5 w-5 mr-2" />
          New Cash Receipt
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="h-5 w-5" />
            <span>Search</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Search by receipt number or customer name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Receipt Number</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Value Tendered</TableHead>
                    <TableHead>Change</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReceipts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                        No cash receipts found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredReceipts.map((receipt) => (
                      <TableRow key={receipt.id}>
                        <TableCell className="font-medium">{receipt.receipt_number}</TableCell>
                        <TableCell>{receipt.customers?.name || 'Unknown'}</TableCell>
                        <TableCell>
                          {new Date(receipt.receipt_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{formatCurrency(receipt.total_amount)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{receipt.payment_method}</Badge>
                        </TableCell>
                        <TableCell>{formatCurrency(receipt.value_tendered)}</TableCell>
                        <TableCell>{formatCurrency(receipt.change)}</TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDownloadReceipt(receipt)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(receipt)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateCashReceiptModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSuccess={handleCreateSuccess}
      />

      <ConfirmationDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
        title="Delete Cash Receipt"
        description={`Are you sure you want to delete receipt ${deleteDialog.receipt?.receipt_number}? This action cannot be undone.`}
        onConfirm={handleDeleteConfirm}
        isDestructive={true}
        isLoading={isDeleting}
      />
    </div>
  );
}
