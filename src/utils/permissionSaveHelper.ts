import { supabase } from '@/integrations/supabase/client';
import { getAllowedFeatures } from '@/utils/rolePermissions';
import type { UserRole, FeatureKey } from '@/utils/rolePermissions';

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

/**
 * Compute the overrides that actually differ from the role defaults.
 * Entries that match the role default are dropped so only meaningful
 * overrides are persisted.
 */
function computeEffectiveOverrides(
  overrides: Record<string, boolean>,
  userRole: UserRole
): { permission_name: string; granted: boolean }[] {
  const defaults = new Set<string>(getAllowedFeatures(userRole));
  return Object.entries(overrides)
    .filter(([permissionName, granted]) => granted !== defaults.has(permissionName as FeatureKey))
    .map(([permission_name, granted]) => ({ permission_name, granted }));
}

export async function saveUserPermissions(
  userId: string,
  overrides: Record<string, boolean>,
  userRole: UserRole
): Promise<PermissionSaveResult> {
  const edgeResult = await invokeEdgeFunction(userId, overrides);

  if (edgeResult.success) return edgeResult;

  // If the edge function is unavailable (not deployed / unreachable),
  // fall back to direct database writes which are allowed by the
  // "Admins can manage permissions in their company" RLS policy.
  if (edgeResult.error?.code === 'SAVE_SERVICE_UNAVAILABLE') {
    return saveViaDirectDb(userId, overrides, userRole);
  }

  return edgeResult;
}

async function invokeEdgeFunction(
  userId: string,
  overrides: Record<string, boolean>
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

async function saveViaDirectDb(
  userId: string,
  overrides: Record<string, boolean>,
  userRole: UserRole
): Promise<PermissionSaveResult> {
  try {
    const effective = computeEffectiveOverrides(overrides, userRole);

    const { error: deleteError } = await supabase
      .from('user_permissions')
      .delete()
      .eq('user_id', userId);

    if (deleteError) throw deleteError;

    let rowsInserted = 0;
    if (effective.length > 0) {
      const { data: inserted, error: insertError } = await supabase
        .from('user_permissions')
        .insert(effective.map(p => ({ user_id: userId, permission_name: p.permission_name, granted: p.granted })))
        .select('id');

      if (insertError) throw insertError;
      rowsInserted = (inserted || []).length;
    }

    return {
      success: true,
      rowsDeleted: 0,
      rowsInserted,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: {
        code: 'SAVE_FAILED',
        message,
        details: message,
      },
    };
  }
}
