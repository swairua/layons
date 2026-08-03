import { supabase } from '@/integrations/supabase/client';
import { UserRole } from '@/utils/rolePermissions';

export interface PermissionSaveError {
  code: string;
  message: string;
  details?: string;
}

export interface PermissionSaveResult {
  success: boolean;
  error?: PermissionSaveError;
  rowsDeleted?: number;
  rowsInserted?: number;
}

export async function saveUserPermissions(
  userId: string,
  overrides: Record<string, boolean>,
  _userRole: UserRole
): Promise<PermissionSaveResult> {
  const { data, error } = await supabase.functions.invoke('save-user-permissions', {
    body: { userId, overrides },
  });

  if (error) {
    return {
      success: false,
      error: { code: 'SAVE_FAILED', message: error.message },
    };
  }

  if (!data?.success) {
    return {
      success: false,
      error: { code: 'SAVE_FAILED', message: data?.error || 'Permission save failed' },
    };
  }

  return {
    success: true,
    rowsDeleted: data.rowsDeleted,
    rowsInserted: data.rowsInserted,
  };
}
