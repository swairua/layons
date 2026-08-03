import { supabase } from '@/integrations/supabase/client';
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
    const message = error.message || '';
    const isUnavailable = error.name === 'FunctionsFetchError' || message.toLowerCase().includes('failed to send a request');

    return {
      success: false,
      error: {
        code: isUnavailable ? 'SAVE_SERVICE_UNAVAILABLE' : 'SAVE_FAILED',
        message: isUnavailable
          ? 'Permission service is unavailable. Ask an administrator to deploy the save-user-permissions function.'
          : message || 'Permission save failed',
        details: message || undefined,
      },
    };
  }

  if (!data?.success) {
    const message = data?.error || 'Permission save failed';
    const isAuthorizationError = /only admins|other companies|unauthorized/i.test(message);

    return {
      success: false,
      error: {
        code: isAuthorizationError ? 'SAVE_NOT_AUTHORIZED' : 'SAVE_FAILED',
        message: isAuthorizationError ? 'You are not authorized to change permissions for this user.' : message,
        details: message,
      },
    };
  }

  return {
    success: true,
    rowsDeleted: data.rowsDeleted,
    rowsInserted: data.rowsInserted,
  };
}
