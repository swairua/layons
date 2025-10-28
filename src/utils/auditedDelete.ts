import { supabase } from '@/integrations/supabase/client';

export interface AuditedDeleteOptions {
  companyId: string;
  userId: string;
  userFullName?: string;
  userEmail?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface DeleteTarget {
  entityType: string;
  entityId: string;
  entityName?: string;
  entityNumber?: string;
  deletedData?: Record<string, any>;
}

/**
 * Performs a delete operation with automatic audit logging
 * This is the centralized function that ALL delete operations should use
 */
export async function performAuditedDelete(
  tableName: string,
  whereKey: string,
  whereValue: string,
  target: DeleteTarget,
  options: AuditedDeleteOptions
): Promise<{ success: boolean; error?: Error }> {
  try {
    // Fetch the full record before deletion for audit purposes
    const { data: recordToDelete, error: fetchError } = await supabase
      .from(tableName)
      .select('*')
      .eq(whereKey, whereValue)
      .single();

    if (fetchError) {
      console.warn(`Warning: Could not fetch ${tableName} record for audit:`, fetchError);
    }

    // Perform the deletion
    const { error: deleteError } = await supabase
      .from(tableName)
      .delete()
      .eq(whereKey, whereValue);

    if (deleteError) {
      console.error(`Delete failed for ${tableName}:`, deleteError);
      return { success: false, error: deleteError as Error };
    }

    // Log the deletion to audit_logs
    const auditData = {
      company_id: options.companyId,
      user_id: options.userId,
      action: 'delete',
      entity_type: target.entityType,
      entity_id: target.entityId,
      entity_name: target.entityName,
      entity_number: target.entityNumber,
      details: {
        deletedAt: new Date().toISOString(),
        deletedBy: options.userFullName || options.userEmail || 'Unknown',
        tableName,
        whereKey,
        whereValue,
      },
      deleted_data: target.deletedData || recordToDelete || null,
      ip_address: options.ipAddress || null,
      user_agent: options.userAgent || null,
    };

    const { error: auditError } = await supabase
      .from('audit_logs')
      .insert([auditData]);

    if (auditError) {
      console.error('Failed to log deletion to audit_logs:', auditError);
      // Don't fail the delete if audit logging fails - the deletion already succeeded
    }

    return { success: true };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error('Error in performAuditedDelete:', error);
    return { success: false, error };
  }
}

/**
 * Performs a delete operation for related records (e.g., deleting all items for a parent record)
 * Useful for cascade deletes
 */
export async function performAuditedDeleteMultiple(
  tableName: string,
  whereKey: string,
  whereValue: string,
  target: Omit<DeleteTarget, 'entityId'> & { entityIds: string[] },
  options: AuditedDeleteOptions
): Promise<{ success: boolean; deletedCount?: number; error?: Error }> {
  try {
    // Fetch the full records before deletion for audit purposes
    const { data: recordsToDelete, error: fetchError } = await supabase
      .from(tableName)
      .select('*')
      .eq(whereKey, whereValue);

    if (fetchError) {
      console.warn(`Warning: Could not fetch ${tableName} records for audit:`, fetchError);
    }

    // Perform the deletion
    const { error: deleteError } = await supabase
      .from(tableName)
      .delete()
      .eq(whereKey, whereValue);

    if (deleteError) {
      console.error(`Delete failed for ${tableName}:`, deleteError);
      return { success: false, error: deleteError as Error };
    }

    // Log each deletion to audit_logs
    const auditEntries = target.entityIds.map((entityId) => ({
      company_id: options.companyId,
      user_id: options.userId,
      action: 'delete',
      entity_type: target.entityType,
      entity_id: entityId,
      entity_name: target.entityName,
      entity_number: target.entityNumber,
      details: {
        deletedAt: new Date().toISOString(),
        deletedBy: options.userFullName || options.userEmail || 'Unknown',
        tableName,
        whereKey,
        whereValue,
        cascadeDelete: true,
      },
      deleted_data: null,
      ip_address: options.ipAddress || null,
      user_agent: options.userAgent || null,
    }));

    if (auditEntries.length > 0) {
      const { error: auditError } = await supabase
        .from('audit_logs')
        .insert(auditEntries);

      if (auditError) {
        console.error('Failed to log deletion to audit_logs:', auditError);
        // Don't fail the delete if audit logging fails - the deletion already succeeded
      }
    }

    return { success: true, deletedCount: recordsToDelete?.length || 0 };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error('Error in performAuditedDeleteMultiple:', error);
    return { success: false, error };
  }
}

/**
 * Helper function to get client IP
 */
export async function getClientIp(): Promise<string | null> {
  try {
    const response = await fetch('https://api.ipify.org?format=json', {
      signal: AbortSignal.timeout(3000),
    });
    const data = await response.json();
    return data.ip;
  } catch {
    return null;
  }
}

/**
 * Helper function to get user agent
 */
export function getUserAgent(): string | null {
  if (typeof window !== 'undefined') {
    return window.navigator.userAgent;
  }
  return null;
}
