// Direct PHP API client (replaces Supabase)
// Routes all database calls through Layons PHP API via queryBuilder

import { phpDb } from '@/integrations/phpApi/queryBuilder';

// Re-export phpDb as supabase for backward compatibility during refactoring
export const supabase = phpDb;

// Utility for local auth storage
export function getLocalUser() {
  try {
    const raw = localStorage.getItem('local_auth_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
