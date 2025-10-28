-- Migration: Add Delete Triggers for Automatic Audit Logging
-- This migration creates triggers on critical tables to automatically log deletions
-- at the database level, providing a safety net for audit compliance

-- Function to automatically log deletions for critical tables
CREATE OR REPLACE FUNCTION log_delete_trigger()
RETURNS TRIGGER AS $$
DECLARE
  v_company_id UUID;
  v_entity_type VARCHAR;
  v_entity_name VARCHAR;
  v_entity_number VARCHAR;
BEGIN
  -- Determine entity type and company ID based on table
  v_entity_type := TG_TABLE_NAME;
  v_company_id := COALESCE(OLD.company_id, (SELECT company_id FROM companies LIMIT 1));

  -- Extract relevant fields for audit logging
  CASE TG_TABLE_NAME
    WHEN 'customers' THEN
      v_entity_name := OLD.name;
      v_entity_number := OLD.customer_code;
    WHEN 'invoices' THEN
      v_entity_name := OLD.invoice_number;
      v_entity_number := OLD.invoice_number;
    WHEN 'quotations' THEN
      v_entity_name := OLD.quotation_number;
      v_entity_number := OLD.quotation_number;
    WHEN 'credit_notes' THEN
      v_entity_name := OLD.credit_note_number;
      v_entity_number := OLD.credit_note_number;
    WHEN 'proforma_invoices' THEN
      v_entity_name := OLD.proforma_number;
      v_entity_number := OLD.proforma_number;
    WHEN 'lpos' THEN
      v_entity_name := OLD.lpo_number;
      v_entity_number := OLD.lpo_number;
    WHEN 'boqs' THEN
      v_entity_name := OLD.name;
    WHEN 'tax_settings' THEN
      v_entity_name := OLD.name;
  END CASE;

  -- Insert audit log entry
  INSERT INTO audit_logs (
    company_id,
    user_id,
    action,
    entity_type,
    entity_id,
    entity_name,
    entity_number,
    details,
    deleted_data,
    timestamp,
    ip_address,
    user_agent
  ) VALUES (
    v_company_id,
    auth.uid(),
    'delete',
    v_entity_type,
    OLD.id,
    v_entity_name,
    v_entity_number,
    jsonb_build_object(
      'deletedAt', NOW(),
      'databaseTrigger', true,
      'deletedBy', COALESCE((SELECT full_name FROM profiles WHERE id = auth.uid()), 
                           (SELECT email FROM auth.users WHERE id = auth.uid()),
                           'System')
    ),
    to_jsonb(OLD),
    NOW(),
    NULL,
    NULL
  );

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION log_delete_trigger() TO authenticated;

-- Create triggers on critical tables

-- Trigger for customers
CREATE TRIGGER customers_audit_delete
BEFORE DELETE ON customers
FOR EACH ROW
EXECUTE FUNCTION log_delete_trigger();

-- Trigger for invoices
CREATE TRIGGER invoices_audit_delete
BEFORE DELETE ON invoices
FOR EACH ROW
EXECUTE FUNCTION log_delete_trigger();

-- Trigger for quotations
CREATE TRIGGER quotations_audit_delete
BEFORE DELETE ON quotations
FOR EACH ROW
EXECUTE FUNCTION log_delete_trigger();

-- Trigger for credit_notes
CREATE TRIGGER credit_notes_audit_delete
BEFORE DELETE ON credit_notes
FOR EACH ROW
EXECUTE FUNCTION log_delete_trigger();

-- Trigger for proforma_invoices
CREATE TRIGGER proforma_invoices_audit_delete
BEFORE DELETE ON proforma_invoices
FOR EACH ROW
EXECUTE FUNCTION log_delete_trigger();

-- Trigger for lpos
CREATE TRIGGER lpos_audit_delete
BEFORE DELETE ON lpos
FOR EACH ROW
EXECUTE FUNCTION log_delete_trigger();

-- Trigger for boqs
CREATE TRIGGER boqs_audit_delete
BEFORE DELETE ON boqs
FOR EACH ROW
EXECUTE FUNCTION log_delete_trigger();

-- Trigger for tax_settings
CREATE TRIGGER tax_settings_audit_delete
BEFORE DELETE ON tax_settings
FOR EACH ROW
EXECUTE FUNCTION log_delete_trigger();

-- Optional: Triggers for item tables (cascade deletes)

-- Trigger for credit_note_items
CREATE TRIGGER credit_note_items_audit_delete
BEFORE DELETE ON credit_note_items
FOR EACH ROW
EXECUTE FUNCTION log_delete_trigger();

-- Trigger for lpo_items
CREATE TRIGGER lpo_items_audit_delete
BEFORE DELETE ON lpo_items
FOR EACH ROW
EXECUTE FUNCTION log_delete_trigger();

-- Trigger for proforma_items
CREATE TRIGGER proforma_items_audit_delete
BEFORE DELETE ON proforma_items
FOR EACH ROW
EXECUTE FUNCTION log_delete_trigger();

-- Add comment to document the triggers
COMMENT ON FUNCTION log_delete_trigger() IS 'Automatically logs all deletions to audit_logs table for compliance and recovery purposes. Created by database trigger system.';
COMMENT ON TRIGGER customers_audit_delete ON customers IS 'Automatic delete audit logging for customer records';
COMMENT ON TRIGGER invoices_audit_delete ON invoices IS 'Automatic delete audit logging for invoice records';
COMMENT ON TRIGGER quotations_audit_delete ON quotations IS 'Automatic delete audit logging for quotation records';
COMMENT ON TRIGGER credit_notes_audit_delete ON credit_notes IS 'Automatic delete audit logging for credit note records';
COMMENT ON TRIGGER proforma_invoices_audit_delete ON proforma_invoices IS 'Automatic delete audit logging for proforma invoice records';
COMMENT ON TRIGGER lpos_audit_delete ON lpos IS 'Automatic delete audit logging for LPO records';
COMMENT ON TRIGGER boqs_audit_delete ON boqs IS 'Automatic delete audit logging for BOQ records';
COMMENT ON TRIGGER tax_settings_audit_delete ON tax_settings IS 'Automatic delete audit logging for tax setting records';
