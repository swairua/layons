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
import { Loader2 } from 'lucide-react';
import { useCustomers, useCompanies } from '@/hooks/useDatabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const PAYMENT_METHODS = [
  'Cash',
  'Cheque',
  'Bank Transfer',
  'Mobile Money',
  'Card',
  'Other'
];

interface CreateCashReceiptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateCashReceiptModal({ open, onOpenChange, onSuccess }: CreateCashReceiptModalProps) {
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split('T')[0]);
  const [totalAmount, setTotalAmount] = useState('');
  const [valueTendered, setValueTendered] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { profile, loading: authLoading } = useAuth();
  const { data: companies } = useCompanies();
  const currentCompany = companies?.[0];
  const { data: customers, isLoading: loadingCustomers } = useCustomers(currentCompany?.id);

  // Calculate change automatically
  const change = valueTendered && totalAmount 
    ? Math.max(0, parseFloat(valueTendered) - parseFloat(totalAmount))
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCustomerId) {
      toast.error('Please select a customer');
      return;
    }

    if (!totalAmount || parseFloat(totalAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (!valueTendered || parseFloat(valueTendered) <= 0) {
      toast.error('Please enter value tendered');
      return;
    }

    if (parseFloat(valueTendered) < parseFloat(totalAmount)) {
      toast.error('Value tendered must be greater than or equal to total amount');
      return;
    }

    if (!paymentMethod) {
      toast.error('Please select a payment method');
      return;
    }

    try {
      setIsSubmitting(true);

      if (!currentCompany?.id || !profile?.id) {
        throw new Error('Missing company or user information');
      }

      // Generate receipt number based on the count of existing receipts
      let receiptNumber: string;
      try {
        const { data: existingReceipts, error: countError } = await supabase
          .from('cash_receipts')
          .select('id', { count: 'exact' })
          .eq('company_id', currentCompany.id);

        if (!countError && existingReceipts) {
          const count = (existingReceipts.length || 0) + 1;
          receiptNumber = `RCP-${String(count).padStart(3, '0')}`;
        } else {
          // Fallback if query fails
          receiptNumber = `RCP-${Date.now().toString().slice(-6)}`;
        }
      } catch (err) {
        // Fallback: generate receipt number using timestamp
        receiptNumber = `RCP-${Date.now().toString().slice(-6)}`;
      }

      // Create the cash receipt
      const { error } = await supabase
        .from('cash_receipts')
        .insert({
          company_id: currentCompany.id,
          customer_id: selectedCustomerId,
          receipt_number: receiptNumber,
          receipt_date: receiptDate,
          total_amount: parseFloat(totalAmount),
          value_tendered: parseFloat(valueTendered),
          change: change,
          payment_method: paymentMethod,
          notes: notes || null,
          created_by: profile.id,
        });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      toast.success('Cash receipt created successfully!');
      onSuccess();
      onOpenChange(false);

      // Reset form
      setSelectedCustomerId('');
      setReceiptDate(new Date().toISOString().split('T')[0]);
      setTotalAmount('');
      setValueTendered('');
      setPaymentMethod('Cash');
      setNotes('');
    } catch (err) {
      console.error('Error creating cash receipt:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create cash receipt';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isSubmitting) {
      onOpenChange(newOpen);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Cash Receipt</DialogTitle>
          <DialogDescription>
            Record a cash payment receipt from a customer
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Selection */}
          <div className="space-y-2">
            <Label htmlFor="customer">Customer *</Label>
            <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a customer" />
              </SelectTrigger>
              <SelectContent>
                {loadingCustomers ? (
                  <SelectItem disabled value="">Loading customers...</SelectItem>
                ) : customers && customers.length > 0 ? (
                  customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem disabled value="">No customers found</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Receipt Date */}
          <div className="space-y-2">
            <Label htmlFor="receiptDate">Receipt Date *</Label>
            <Input
              id="receiptDate"
              type="date"
              value={receiptDate}
              onChange={(e) => setReceiptDate(e.target.value)}
              required
            />
          </div>

          {/* Total Amount */}
          <div className="space-y-2">
            <Label htmlFor="totalAmount">Total Amount *</Label>
            <Input
              id="totalAmount"
              type="number"
              placeholder="0.00"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              step="0.01"
              min="0"
              required
            />
          </div>

          {/* Value Tendered */}
          <div className="space-y-2">
            <Label htmlFor="valueTendered">Value Tendered *</Label>
            <Input
              id="valueTendered"
              type="number"
              placeholder="0.00"
              value={valueTendered}
              onChange={(e) => setValueTendered(e.target.value)}
              step="0.01"
              min="0"
              required
            />
          </div>

          {/* Change (Read-only, calculated) */}
          <div className="space-y-2">
            <Label htmlFor="change">Change</Label>
            <Input
              id="change"
              type="number"
              value={change.toFixed(2)}
              disabled
              className="bg-gray-50"
            />
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Payment Method *</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((method) => (
                  <SelectItem key={method} value={method}>
                    {method}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || authLoading || loadingCustomers}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isSubmitting ? 'Creating...' : 'Create Receipt'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
