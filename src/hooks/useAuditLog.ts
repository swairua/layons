import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type AuditAction = 'delete' | 'create' | 'update' | 'restore';

export interface AuditLogEntry {
  action: AuditAction;
  entityType: string;
  entityId: string;
  entityName?: string;
  entityNumber?: string;
  details?: Record<string, any>;
  deletedData?: Record<string, any>;
}

export function useAuditLog() {
  const { profile } = useAuth();

  const logAction = useCallback(
    async (companyId: string, entry: AuditLogEntry) => {
      if (!profile?.id) {
        console.warn('Cannot log audit action without authenticated user');
        return null;
      }

      try {
        const { data, error } = await supabase
          .from('audit_logs')
          .insert({
            company_id: companyId,
            user_id: profile.id,
            action: entry.action,
            entity_type: entry.entityType,
            entity_id: entry.entityId,
            entity_name: entry.entityName,
            entity_number: entry.entityNumber,
            details: entry.details || {},
            deleted_data: entry.deletedData || null,
            ip_address: await getClientIp(),
            user_agent: typeof window !== 'undefined' ? window.navigator.userAgent : null,
          })
          .select()
          .single();

        if (error) {
          console.error('Failed to log audit action:', error);
          return null;
        }

        return data;
      } catch (err) {
        console.error('Error logging audit action:', err);
        return null;
      }
    },
    [profile?.id]
  );

  const logDelete = useCallback(
    async (
      companyId: string,
      entityType: string,
      entityId: string,
      entityName?: string,
      entityNumber?: string,
      deletedData?: Record<string, any>
    ) => {
      return logAction(companyId, {
        action: 'delete',
        entityType,
        entityId,
        entityName,
        entityNumber,
        details: {
          deletedAt: new Date().toISOString(),
          deletedBy: profile?.full_name || profile?.email || 'Unknown',
        },
        deletedData,
      });
    },
    [logAction, profile?.email, profile?.full_name]
  );

  return {
    logAction,
    logDelete,
  };
}

async function getClientIp(): Promise<string | null> {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch {
    return null;
  }
}
