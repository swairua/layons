import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { toast } from '@/utils/safeToast';

// Minimal local user/session types
export interface LocalUser {
  id: string;
  email: string;
}

export interface LocalSession {
  user: LocalUser | null;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  phone?: string;
  company_id?: string;
  department?: string;
  position?: string;
  role?: string;
  status?: string;
  last_login?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AuthContextType {
  user: LocalUser | null;
  profile: UserProfile | null;
  session: LocalSession | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: Error | null }>;
  isAuthenticated: boolean;
  isAdmin: boolean;
  refreshProfile: () => Promise<void>;
  clearTokens: () => void;
}

const STORAGE_KEY = 'local_auth_user';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

interface AuthProviderProps { children: React.ReactNode }

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<LocalSession | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: LocalUser = JSON.parse(raw);
        setUser(parsed);
        setSession({ user: parsed });
        setProfile({ id: parsed.id, email: parsed.email, role: 'admin', status: 'active' });
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  const signIn = useCallback(async (email: string, _password: string) => {
    try {
      const newUser: LocalUser = { id: email, email };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
      setUser(newUser);
      setSession({ user: newUser });
      setProfile({ id: email, email, role: 'admin', status: 'active', last_login: new Date().toISOString() });
      toast.success('Signed in');
      return { error: null };
    } catch (e) {
      const err = e instanceof Error ? e : new Error('Failed to sign in');
      toast.error(err.message);
      return { error: err };
    }
  }, []);

  const signUp = useCallback(async (email: string, _password: string, _fullName?: string) => {
    // Open system: treat sign-up same as sign-in
    return signIn(email, _password);
  }, [signIn]);

  const signOut = useCallback(async () => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
    setSession(null);
    setProfile(null);
    toast.success('Signed out');
  }, []);

  const resetPassword = useCallback(async (_email: string) => {
    // No-op in open mode
    return { error: null };
  }, []);

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    if (!profile) return { error: new Error('No profile') };
    const next = { ...profile, ...updates };
    setProfile(next);
    return { error: null };
  }, [profile]);

  const refreshProfile = useCallback(async () => {
    // No server profile in open mode; keep local state
    return;
  }, []);

  const clearTokens = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const value: AuthContextType = {
    user,
    profile,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updateProfile,
    isAuthenticated: !!user,
    isAdmin: true,
    refreshProfile,
    clearTokens,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
