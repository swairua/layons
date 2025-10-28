-- Create audit_logs table for tracking all delete actions
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL CHECK (action IN ('delete', 'create', 'update', 'restore')),
  entity_type VARCHAR(100) NOT NULL,
  entity_id UUID NOT NULL,
  entity_name VARCHAR(255),
  entity_number VARCHAR(100),
  details JSONB,
  deleted_data JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_company_id ON audit_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- Add RLS policies
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view audit logs for their company
CREATE POLICY audit_logs_select_policy ON audit_logs
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access WHERE user_id = auth.uid()
    )
  );

-- Policy: Only authenticated users can insert audit logs (via function)
CREATE POLICY audit_logs_insert_policy ON audit_logs
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_company_access WHERE user_id = auth.uid()
    )
  );

-- Function to automatically log deletions
CREATE OR REPLACE FUNCTION log_audit_event(
  p_company_id UUID,
  p_user_id UUID,
  p_action VARCHAR,
  p_entity_type VARCHAR,
  p_entity_id UUID,
  p_entity_name VARCHAR,
  p_entity_number VARCHAR,
  p_details JSONB,
  p_deleted_data JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO audit_logs (
    company_id,
    user_id,
    action,
    entity_type,
    entity_id,
    entity_name,
    entity_number,
    details,
    deleted_data
  ) VALUES (
    p_company_id,
    p_user_id,
    p_action,
    p_entity_type,
    p_entity_id,
    p_entity_name,
    p_entity_number,
    p_details,
    p_deleted_data
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
