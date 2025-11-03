/**
 * Local authentication helper for mysqli backend
 * Replaces Supabase auth with simple localStorage-based auth
 */

export interface LocalUser {
  id: string;
  email: string;
  role?: string;
}

export function getLocalUser(): LocalUser | null {
  try {
    const stored = localStorage.getItem('local_auth_user');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function setLocalUser(user: LocalUser): void {
  localStorage.setItem('local_auth_user', JSON.stringify(user));
}

export function clearLocalUser(): void {
  localStorage.removeItem('local_auth_user');
}

export function getCurrentUserId(): string | null {
  return getLocalUser()?.id || null;
}

export function getCurrentUserEmail(): string | null {
  return getLocalUser()?.email || null;
}
