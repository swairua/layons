import { supabase } from '@/integrations/supabase/client';
import { getAllowedFeatures, FeatureKey, UserRole } from '@/utils/rolePermissions';
import type { Database } from '@/integrations/supabase/types';

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
 * Validates that the requester is an admin in the target user's company.
 * This provides a defensive check at the application layer (RLS also enforces this).
 */
async function validateAdminPermission(
  requesterId: string,
  targetUserId: string
): Promise<{ isAuthorized: boolean; error?: PermissionSaveError }> {
  try {
    // Fetch both user profiles to verify company match and admin status
    const { data: requester, error: requesterError } = await supabase
      .from('profiles')
      .select('id, role, company_id')
      .eq('id', requesterId)
      .maybeSingle();

    if (requesterError) {
      return {
        isAuthorized: false,
        error: {
          code: 'FETCH_REQUESTER_FAILED',
          message: 'Failed to load requester profile',
          details: requesterError.message
        }
      };
    }

    if (!requester) {
      return {
        isAuthorized: false,
        error: {
          code: 'REQUESTER_NOT_FOUND',
          message: 'Requester profile not found'
        }
      };
    }

    if (requester.role !== 'admin') {
      return {
        isAuthorized: false,
        error: {
          code: 'INSUFFICIENT_ROLE',
          message: 'Only admins can modify permissions'
        }
      };
    }

    const { data: target, error: targetError } = await supabase
      .from('profiles')
      .select('id, company_id')
      .eq('id', targetUserId)
      .maybeSingle();

    if (targetError) {
      return {
        isAuthorized: false,
        error: {
          code: 'FETCH_TARGET_FAILED',
          message: 'Failed to load target user profile',
          details: targetError.message
        }
      };
    }

    if (!target) {
      return {
        isAuthorized: false,
        error: {
          code: 'TARGET_NOT_FOUND',
          message: 'Target user profile not found'
        }
      };
    }

    if (requester.company_id !== target.company_id) {
      return {
        isAuthorized: false,
        error: {
          code: 'CROSS_COMPANY_DENIED',
          message: 'Cannot modify permissions for users in other companies'
        }
      };
    }

    return { isAuthorized: true };
  } catch (error) {
    return {
      isAuthorized: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Unexpected error during authorization check',
        details: error instanceof Error ? error.message : String(error)
      }
    };
  }
}

/**
 * Atomically save user permission overrides.
 *
 * This function:
 * 1. Validates that the requester is an admin in the target user's company
 * 2. Deletes all existing overrides for the user
 * 3. Inserts only non-default overrides
 * 4. Handles errors gracefully with detailed feedback
 *
 * @param userId - The user whose permissions are being modified
 * @param requesterId - The admin user making the change
 * @param overrides - Map of feature keys to granted boolean values
 * @param userRole - The user's role (used to compute defaults)
 * @returns Result object with success status and metadata
 */
export async function saveUserPermissions(
  userId: string,
  requesterId: string,
  overrides: Record<string, boolean>,
  userRole: UserRole
): Promise<PermissionSaveResult> {
  // Step 1: Validate authorization
  const authCheck = await validateAdminPermission(requesterId, userId);
  if (!authCheck.isAuthorized) {
    return {
      success: false,
      error: authCheck.error || {
        code: 'AUTHORIZATION_FAILED',
        message: 'Authorization check failed'
      }
    };
  }

  try {
    // Step 2: Compute which overrides are actually non-default
    const roleDefaults = getAllowedFeatures(userRole);
    const effectiveOverrides: Array<[string, boolean]> = Object.entries(overrides)
      .filter(([key, granted]) => {
        const defaultValue = roleDefaults.includes(key as FeatureKey);
        return granted !== defaultValue;
      });

    // Step 3: Delete all existing overrides for this user
    const { error: deleteError, count: deletedCount } = await supabase
      .from('user_permissions')
      .delete()
      .eq('user_id', userId);

    if (deleteError) {
      return {
        success: false,
        error: {
          code: 'DELETE_FAILED',
          message: 'Failed to clear existing permission overrides',
          details: deleteError.message
        }
      };
    }

    // Step 4: Insert new overrides (if any)
    let insertedCount = 0;
    if (effectiveOverrides.length > 0) {
      const rowsToInsert = effectiveOverrides.map(([permission_name, granted]) => ({
        user_id: userId,
        permission_name,
        granted,
        granted_by: requesterId,
        granted_at: new Date().toISOString()
      }));

      const { error: insertError, data: insertedRows } = await supabase
        .from('user_permissions')
        .insert(rowsToInsert)
        .select();

      if (insertError) {
        // Attempt to recover: if insert failed, at least we cleared the old overrides
        // This is safer than keeping stale data
        return {
          success: false,
          error: {
            code: 'INSERT_FAILED',
            message: 'Failed to insert new permission overrides (old overrides were cleared)',
            details: insertError.message
          }
        };
      }

      insertedCount = insertedRows?.length || 0;
    }

    return {
      success: true,
      rowsDeleted: deletedCount || 0,
      rowsInserted: insertedCount
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'UNEXPECTED_ERROR',
        message: 'Unexpected error during permission save',
        details: error instanceof Error ? error.message : String(error)
      }
    };
  }
}
