ALTER TABLE public.user_permissions
  ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE public.user_permissions
  DROP CONSTRAINT IF EXISTS user_permissions_user_id_permission_name_key;

ALTER TABLE public.user_permissions
  ADD CONSTRAINT user_permissions_user_id_permission_name_key UNIQUE (user_id, permission_name);

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own permissions" ON public.user_permissions;
DROP POLICY IF EXISTS "Admins can manage permissions in their company" ON public.user_permissions;

CREATE POLICY "Users can view their own permissions"
  ON public.user_permissions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage permissions in their company"
  ON public.user_permissions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles admin_profile
      JOIN public.profiles user_profile ON user_profile.id = user_permissions.user_id
      WHERE admin_profile.id = auth.uid()
        AND admin_profile.role = 'admin'
        AND admin_profile.company_id = user_profile.company_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles admin_profile
      JOIN public.profiles user_profile ON user_profile.id = user_permissions.user_id
      WHERE admin_profile.id = auth.uid()
        AND admin_profile.role = 'admin'
        AND admin_profile.company_id = user_profile.company_id
    )
  );

CREATE OR REPLACE FUNCTION public.replace_user_permission_overrides(
  p_target_user_id uuid,
  p_requester_id uuid,
  p_overrides jsonb
)
RETURNS TABLE(rows_deleted integer, rows_inserted integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requester_company_id uuid;
  target_company_id uuid;
  requester_role text;
  deleted_count integer;
  inserted_count integer;
BEGIN
  SELECT company_id, role::text
  INTO requester_company_id, requester_role
  FROM profiles
  WHERE id = p_requester_id;

  SELECT company_id
  INTO target_company_id
  FROM profiles
  WHERE id = p_target_user_id;

  IF requester_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Only admins can modify permissions';
  END IF;

  IF requester_company_id IS NULL OR requester_company_id IS DISTINCT FROM target_company_id THEN
    RAISE EXCEPTION 'Cannot modify permissions for users in other companies';
  END IF;

  DELETE FROM user_permissions
  WHERE user_id = p_target_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  INSERT INTO user_permissions (user_id, permission_name, granted, granted_by, granted_at)
  SELECT p_target_user_id, permission_name, granted, p_requester_id, now()
  FROM jsonb_to_recordset(p_overrides) AS override_row(permission_name text, granted boolean);
  GET DIAGNOSTICS inserted_count = ROW_COUNT;

  RETURN QUERY SELECT deleted_count, inserted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.replace_user_permission_overrides(uuid, uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.replace_user_permission_overrides(uuid, uuid, jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.replace_user_permission_overrides(uuid, uuid, jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.replace_user_permission_overrides(uuid, uuid, jsonb) TO service_role;
