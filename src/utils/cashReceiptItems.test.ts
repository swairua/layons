import { mapCashReceiptItems } from './pdfGenerator';

const receiptItem = {
  description: 'Payment received',
  quantity: 1,
  unit_price: 80000,
  tax_percentage: 0,
  tax_amount: 0,
  line_total: 80000,
};

const linkedItems = mapCashReceiptItems({
  invoices: { invoice_number: 'INV-179' },
  cash_receipt_items: [receiptItem],
});
assert.equal(linkedItems[0].invoice_number, 'INV-179');

const historicalItems = mapCashReceiptItems({
  cash_receipt_items: [receiptItem],
});
assert.equal(historicalItems[0].invoice_number, undefined);
