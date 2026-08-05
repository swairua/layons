ALTER TABLE public.cash_receipts
  ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES public.invoices(id);

CREATE INDEX IF NOT EXISTS cash_receipts_invoice_id_idx
  ON public.cash_receipts(invoice_id);
