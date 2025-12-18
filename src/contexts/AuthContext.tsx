import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/utils/safeToast';
import { initializeAuth, clearAuthTokens, safeAuthOperation } from '@/utils/authHelpers';
import { logError, getUserFriendlyErrorMessage, isErrorType } from '@/utils/errorLogger';

// Helper function to safely format error for display
const formatErrorForDisplay = (error: unknown): string => {
  if (!error) return 'Unknown error occurred';

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (typeof error === 'object') {
    const errorObj = error as any;
    if (errorObj.message && typeof errorObj.message === 'string') {
      return errorObj.message;
    }
    if (errorObj.error_description && typeof errorObj.error_description === 'string') {
      return errorObj.error_description;
    }
    if (errorObj.details && typeof errorObj.details === 'string') {
      return errorObj.details;
    }
  }

  return 'An unexpected error occurred';
};

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
  created_at: string;
  updated_at: string;
}

export interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: Error | null }>;
  isAuthenticated: boolean;
  isAdmin: boolean;
  refreshProfile: () => Promise<void>;
  clearTokens: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  // Use refs to prevent stale closures and unnecessary re-renders
  const mountedRef = useRef(true);
  const initializingRef = useRef(false);
  const forceCompletedRef = useRef(false);

  // Toast spam prevention
  const lastNetworkErrorToast = useRef<number>(0);
  const lastPermissionErrorToast = useRef<number>(0);
  const lastGeneralErrorToast = useRef<number>(0);
  const TOAST_COOLDOWN = 10000; // 10 seconds between similar error toasts

  // Fetch user profile from database with error handling and retry logic
  const fetchProfile = useCallback(async (userId: string, showErrorToast: boolean = false): Promise<UserProfile | null> => {
    const maxRetries = 3;
    let lastError: any = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('id, email, full_name, avatar_url, phone, company_id, department, position, role, status, last_login, created_at, updated_at')
          .eq('id', userId)
          .maybeSingle(); // Use maybeSingle to handle 0 results gracefully

        if (error) {
          throw error;
        }

        if (!profileData) {
          console.warn(`No profile data found for user ${userId} - this is expected if profile hasn't been created yet`);
          return null;
        }

        return profileData;
      } catch (fetchError) {
        lastError = fetchError;

        // Check if it's a network error
        const errorMsg = (fetchError instanceof Error) ? fetchError.message : String(fetchError);
        const isNetworkError = errorMsg.includes('Failed to fetch') ||
                              errorMsg.includes('Network') ||
                              errorMsg.includes('timeout') ||
                              errorMsg.includes('ECONNREFUSED') ||
                              errorMsg.includes('ENOTFOUND') ||
                              errorMsg.includes('NetworkError') ||
                              errorMsg.includes('CORS') ||
                              errorMsg.includes('fetch');

        if (isNetworkError && attempt < maxRetries - 1) {
          // Wait before retrying (exponential backoff: 500ms, 1s, 2s)
          const delayMs = 500 * Math.pow(2, attempt);
          console.warn(`Profile fetch network error (attempt ${attempt + 1}/${maxRetries}). Retrying in ${delayMs}ms... Error: ${errorMsg}`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
          continue;
        }

        // Format error message properly to avoid [object Object]
        let errorMessage = 'Unknown error';
        let errorDetails = '';
        if (fetchError instanceof Error) {
          errorMessage = fetchError.message;
          errorDetails = fetchError.stack ? ` Stack: ${fetchError.stack.substring(0, 100)}` : '';
        } else if (typeof fetchError === 'string') {
          errorMessage = fetchError;
        } else if (fetchError && typeof fetchError === 'object') {
          const errObj = fetchError as any;
          errorMessage = errObj.message || errObj.error_description || errObj.details || String(fetchError);
          errorDetails = errObj.hint ? ` Hint: ${errObj.hint}` : '';
        }

        // Log comprehensive error info for debugging (but suppress from user by default)
        console.warn(`Profile fetch error for user ${userId}: ${errorMessage}${errorDetails} (attempt ${attempt + 1}/${maxRetries}). App will continue without full profile.`);

        // Handle specific error types using the error type checker
        if (isErrorType(fetchError, 'auth')) {
          console.warn('Profile fetch failed due to expired token - user may need to re-authenticate');
          return null; // Don't show error toast for auth issues
        }

        if (isErrorType(fetchError, 'network')) {
          console.warn('Profile fetch failed due to network issue - app will continue without full profile');
          // Don't show toast for network errors on profile fetch - it's not critical
          // The app can work with just the auth user info
          return null;
        }

        if (isErrorType(fetchError, 'permission')) {
          console.warn('Profile fetch failed due to permissions');

          // Only show permission error if explicitly requested
          if (showErrorToast) {
            const now = Date.now();
            if (now - lastPermissionErrorToast.current > TOAST_COOLDOWN) {
              lastPermissionErrorToast.current = now;
              setTimeout(() => toast.error(
                'Permission error accessing profile. Please sign in again.',
                { duration: 4000 }
              ), 0);
            }
          }
          return null;
        }

        // Only show general error if explicitly requested (profile fetch is non-critical for app operation)
        if (showErrorToast) {
          const friendlyMessage = getUserFriendlyErrorMessage(fetchError);
          const now = Date.now();
          if (now - lastGeneralErrorToast.current > TOAST_COOLDOWN) {
            lastGeneralErrorToast.current = now;
            setTimeout(() => toast.error(
              `Failed to load user profile: ${friendlyMessage}`,
              { duration: 4000 }
            ), 0);
          }
        }

        return null;
      }
    }

    return null;
  }, []);

  // Update last login timestamp silently
  const updateLastLogin = useCallback(async (userId: string) => {
    try {
      await supabase
        .from('profiles')
        .update({ last_login: new Date().toISOString() })
        .eq('id', userId);
    } catch (error) {
      logError('Error updating last login:', error, { userId, context: 'updateLastLogin' });
    }
  }, []);

  // Handle auth state changes with improved error handling
  const handleAuthStateChange = useCallback(async (event: string, newSession: Session | null) => {
    if (!mountedRef.current || initializingRef.current) return;

    
    try {
      // Batch state updates to prevent multiple renders
      if (newSession?.user) {
        const userProfile = await fetchProfile(newSession.user.id);
        
        if (mountedRef.current) {
          setSession(newSession);
          setUser(newSession.user);
          setProfile(userProfile);
          
          // Update last login for sign-in events, but don't await to prevent blocking
          if (event === 'SIGNED_IN' && userProfile) {
            updateLastLogin(newSession.user.id).catch(err =>
              logError('Sign-in last login update failed:', err, {
                userId: newSession.user.id,
                context: 'handleAuthStateChange'
              })
            );
          }
        }
      } else {
        if (mountedRef.current) {
          setSession(null);
          setUser(null);
          setProfile(null);
        }
      }
    } catch (error) {
      logError('Error in auth state change:', error, {
        event,
        hasSession: !!newSession,
        context: 'handleAuthStateChange'
      });

      // If we get invalid token errors, clear tokens
      if (isErrorType(error, 'auth')) {
        const errorMessage = getUserFriendlyErrorMessage(error);
        if (errorMessage.includes('Invalid Refresh Token') ||
            errorMessage.includes('Refresh Token Not Found')) {
          clearAuthTokens();
        }
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [fetchProfile, updateLastLogin]);

  // Initialize auth state with ultra-fast approach and background retry
  useEffect(() => {
    if (initializingRef.current) return;

    initializingRef.current = true;
    mountedRef.current = true;

    const initializeAuthState = async () => {
      console.log('🚀 Starting fast auth initialization...');

      // Skip health check - it can hang if Supabase is unreachable
      console.log('⏭️  Skipping health check to avoid startup delays');
      // try {
      //   const { checkSupabaseHealth } = await import('@/utils/supabaseHealthCheck');
      //   const health = await checkSupabaseHealth();
      //   if (!health.isHealthy) {
      //     console.warn('⚠️ Supabase health check detected issues:', health.issues);
      //   } else {
      //     console.log('✅ Supabase connectivity OK');
      //   }
      // } catch (healthCheckError) {
      //   console.warn('⚠️ Could not perform Supabase health check:', healthCheckError);
      // }

      // Start app after initial session check completes (max 2 seconds)
      let appStarted = false;
      const startAppAfterCheck = () => {
        if (mountedRef.current && !appStarted) {
          appStarted = true;
          setLoading(false);
          setInitialized(true);
          console.log('🏁 App started after initial session check');
        }
      };

      // Give session check 1 second before forcing app start
      const sessionCheckTimer = setTimeout(startAppAfterCheck, 1000);

      try {
        // Very fast auth check with 3-second timeout
        console.log('🔍 Quick auth check (3s timeout)...');

        const quickAuthPromise = new Promise<any>(async (resolve, reject) => {
          try {
            // Quick session check with aggressive timeout
            const sessionTimeoutPromise = new Promise((_, rejectTimeout) => {
              setTimeout(() => rejectTimeout(new Error('Session check timeout')), 1500);
            });

            const sessionCheckPromise = supabase.auth.getSession();
            const { data: sessionData, error } = await Promise.race([sessionCheckPromise, sessionTimeoutPromise]) as any;

            if (error) {
              console.warn('⚠️ Quick session check error:', error.message);
              resolve({ session: null, error });
              return;
            }

            console.log('✅ Quick session check completed');
            resolve({ session: sessionData?.session, error: null });
          } catch (fetchError) {
            const fetchErrorMsg = fetchError instanceof Error ? fetchError.message : String(fetchError);
            console.warn('⚠️ Quick session fetch error:', fetchErrorMsg);
            resolve({ session: null, error: fetchError });
          }
        });

        // 2-second timeout for quick check
        const quickTimeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Quick auth timeout after 2000ms')), 2000);
        });

        // Race quick auth against timeout
        const result = await Promise.race([quickAuthPromise, quickTimeoutPromise]);
        const { session: quickSession, error } = result as any;

        if (quickSession?.user && mountedRef.current) {
          console.log('✅ Quick auth success - user authenticated');

          // Clear the session check timer and start app immediately
          clearTimeout(sessionCheckTimer);
          appStarted = true;

          // Set auth state immediately
          setSession(quickSession);
          setUser(quickSession.user);
          setInitialized(true);
          initializingRef.current = false;

          // Fetch profile - CRITICAL for admin checks, don't background
          fetchProfile(quickSession.user.id)
            .then(userProfile => {
              if (mountedRef.current) {
                // Set the actual profile - this is crucial for admin/role checks
                if (userProfile) {
                  setProfile(userProfile);
                  console.log('✅ Profile loaded successfully');

                  // Update last login silently
                  updateLastLogin(quickSession.user.id).catch(err =>
                    logError('Update last login failed:', err, {
                      userId: quickSession.user.id,
                      context: 'quickAuth'
                    })
                  );
                } else {
                  // If fetch returned null, create minimal profile to allow app to work
                  console.warn('⚠️ Profile fetch returned null, creating minimal profile');
                  setProfile({
                    id: quickSession.user.id,
                    email: quickSession.user.email || '',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  } as UserProfile);
                }
              }
            })
            .catch(profileError => {
              logError('⚠️ Profile fetch failed:', profileError, {
                userId: quickSession.user.id,
                context: 'profileFetch'
              });

              // Create minimal profile to allow app to work
              if (mountedRef.current) {
                setProfile({
                  id: quickSession.user.id,
                  email: quickSession.user.email || '',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                } as UserProfile);
              }
            })
            .finally(() => {
              // Now that we've attempted to fetch the profile, we can stop loading
              if (mountedRef.current) {
                setLoading(false);
                console.log('🎉 Fast auth initialization completed');
              }
            });

          return;
        }

        // If quick auth didn't work, continue with background retry
        console.log('ℹ️ Quick auth did not find session, starting background retry...');

        // Don't block app startup - let immediate timer complete
        // But start background retry for better user experience
        setTimeout(() => {
          if (mountedRef.current && !user) {
            console.log('🔄 Starting background auth retry...');

            // More patient background retry (10 seconds)
            const backgroundAuthCheck = async () => {
              try {
                const bgResult = await initializeAuth();
                const { session: bgSession } = bgResult;

                if (bgSession?.user && mountedRef.current && !user) {
                  console.log('✅ Background auth retry succeeded');
                  setSession(bgSession);
                  setUser(bgSession.user);

                  // Fetch profile (non-critical if it fails)
                  const userProfile = await fetchProfile(bgSession.user.id);
                  if (mountedRef.current) {
                    setProfile(userProfile || {
                      id: bgSession.user.id,
                      email: bgSession.user.email || '',
                      created_at: new Date().toISOString(),
                      updated_at: new Date().toISOString()
                    } as UserProfile);
                    if (userProfile) {
                      updateLastLogin(bgSession.user.id).catch(err =>
                        logError('Background retry update last login failed:', err, {
                          userId: bgSession.user.id,
                          context: 'backgroundAuthRetry'
                        })
                      );
                    }
                  }
                }
              } catch (bgError) {
                const bgErrorMsg = bgError instanceof Error ? bgError.message : String(bgError);
                console.warn('⚠️ Background auth retry failed:', bgErrorMsg);
                // Silent failure - app is already running
              }
            };

            backgroundAuthCheck();
          }
        }, 2000); // Start background retry after 2 seconds

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.warn('⚠️ Quick auth check failed:', errorMsg);

        // Handle specific error types silently
        if (error instanceof Error) {
          if (error.message.includes('Invalid Refresh Token') ||
              error.message.includes('invalid_token')) {
            console.warn('🧹 Clearing invalid tokens (silent)');
            clearAuthTokens();
          }
        }

        // Don't show errors - app will start anyway
      }

      // Ensure we always complete initialization even if immediate timer didn't fire
      setTimeout(() => {
        if (mountedRef.current && !initialized) {
          console.log('🏁 Ensuring auth initialization completes');
          setLoading(false);
          setInitialized(true);
          initializingRef.current = false;
        }
      }, 1500);

      // Aggressive fallback - never stay in loading state more than 2 seconds
      setTimeout(() => {
        if (mountedRef.current && loading) {
          console.log('⚡ Aggressive fallback: forcing loading to false after 2s');
          setLoading(false);
          setInitialized(true);
          initializingRef.current = false;
        }
      }, 2000);
    };

    initializeAuthState();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange);

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile, updateLastLogin, handleAuthStateChange, user, initialized]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await safeAuthOperation(async () => {
      setLoading(true);
      return await supabase.auth.signInWithPassword({
        email,
        password,
      });
    }, 'signIn');

    if (error) {
      setLoading(false);
      // Ensure error is a proper Error object with a message property
      let formattedError: Error;
      if (error instanceof Error) {
        formattedError = error;
      } else if (error && typeof error === 'object') {
        const errObj = error as any;
        const message = errObj.message || errObj.error_description || errObj.details || 'Authentication failed';
        formattedError = new Error(typeof message === 'string' ? message : JSON.stringify(message));
      } else {
        formattedError = new Error(String(error) || 'Authentication failed');
      }
      return { error: formattedError as AuthError };
    }

    if (data?.error) {
      setLoading(false);
      // Ensure error is a proper Error object with a message property
      let formattedError: Error;
      if (data.error instanceof Error) {
        formattedError = data.error;
      } else if (data.error && typeof data.error === 'object') {
        const errObj = data.error as any;
        const message = errObj.message || errObj.error_description || errObj.details || 'Authentication failed';
        formattedError = new Error(typeof message === 'string' ? message : JSON.stringify(message));
      } else {
        formattedError = new Error(String(data.error) || 'Authentication failed');
      }
      return { error: formattedError as AuthError };
    }

    // Immediately update auth state to avoid UI waiting for onAuthStateChange
    try {
      const session = (data as any)?.data?.session;
      const signedInUser = session?.user;
      if (signedInUser) {
        setSession(session);
        setUser(signedInUser);
        // Fetch profile in background (non-critical if it fails)
        fetchProfile(signedInUser.id).then(userProfile => {
          setProfile(userProfile || {
            id: signedInUser.id,
            email: signedInUser.email || '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          } as UserProfile);
        }).catch(() => {
          // Create minimal profile if fetch fails
          setProfile({
            id: signedInUser.id,
            email: signedInUser.email || '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          } as UserProfile);
        });
      }
    } catch {}

    setLoading(false);
    setTimeout(() => toast.success('Signed in successfully'), 0);
    return { error: null };
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName?: string) => {
    const { data, error } = await safeAuthOperation(async () => {
      setLoading(true);
      return await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });
    }, 'signUp');

    if (error) {
      setLoading(false);
      // Ensure error is a proper Error object with a message property
      let formattedError: Error;
      if (error instanceof Error) {
        formattedError = error;
      } else if (error && typeof error === 'object') {
        const errObj = error as any;
        const message = errObj.message || errObj.error_description || errObj.details || 'Sign up failed';
        formattedError = new Error(typeof message === 'string' ? message : JSON.stringify(message));
      } else {
        formattedError = new Error(String(error) || 'Sign up failed');
      }
      return { error: formattedError as AuthError };
    }

    if (data?.error) {
      setLoading(false);
      // Ensure error is a proper Error object with a message property
      let formattedError: Error;
      if (data.error instanceof Error) {
        formattedError = data.error;
      } else if (data.error && typeof data.error === 'object') {
        const errObj = data.error as any;
        const message = errObj.message || errObj.error_description || errObj.details || 'Sign up failed';
        formattedError = new Error(typeof message === 'string' ? message : JSON.stringify(message));
      } else {
        formattedError = new Error(String(data.error) || 'Sign up failed');
      }
      return { error: formattedError as AuthError };
    }

    setTimeout(() => toast.success('Account created successfully'), 0);
    setLoading(false);
    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    try {
      console.log('���� Starting sign out process...');
      setLoading(true);

      const { error } = await supabase.auth.signOut();

      if (error) {
        logError('❌ Sign out error:', error, { context: 'signOut' });
        setTimeout(() => toast.error('Error signing out'), 0);
      } else {
        console.log('✅ Supabase sign out successful');

        // Clear state immediately
        setUser(null);
        setProfile(null);
        setSession(null);

        // Clear local storage
        clearAuthTokens();

        setTimeout(() => toast.success('Signed out successfully'), 0);
        console.log('🎉 Sign out complete!');
      }
    } catch (error) {
      logError('❌ Sign out exception:', error, { context: 'signOut' });
      setTimeout(() => toast.error('Error signing out'), 0);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const { data, error } = await safeAuthOperation(async () => {
      return await supabase.auth.resetPasswordForEmail(email);
    }, 'resetPassword');

    if (error) {
      // Ensure error is a proper Error object with a message property
      let formattedError: Error;
      if (error instanceof Error) {
        formattedError = error;
      } else if (error && typeof error === 'object') {
        const errObj = error as any;
        const message = errObj.message || errObj.error_description || errObj.details || 'Password reset failed';
        formattedError = new Error(typeof message === 'string' ? message : JSON.stringify(message));
      } else {
        formattedError = new Error(String(error) || 'Password reset failed');
      }
      return { error: formattedError as AuthError };
    }

    if (data?.error) {
      // Ensure error is a proper Error object with a message property
      let formattedError: Error;
      if (data.error instanceof Error) {
        formattedError = data.error;
      } else if (data.error && typeof data.error === 'object') {
        const errObj = data.error as any;
        const message = errObj.message || errObj.error_description || errObj.details || 'Password reset failed';
        formattedError = new Error(typeof message === 'string' ? message : JSON.stringify(message));
      } else {
        formattedError = new Error(String(data.error) || 'Password reset failed');
      }
      return { error: formattedError as AuthError };
    }

    setTimeout(() => toast.success('Password reset email sent'), 0);
    return { error: null };
  }, []);

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    if (!user) {
      return { error: new Error('No user logged in') };
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) {
        logError('Error updating profile:', error, { context: 'updateProfile', userId: user.id });
        setTimeout(() => toast.error('Failed to update profile'), 0);
        return { error: new Error(error.message) };
      }

      // Refresh profile data
      await refreshProfile();
      setTimeout(() => toast.success('Profile updated successfully'), 0);
      return { error: null };
    } catch (error) {
      logError('Error updating profile exception:', error, { context: 'updateProfile', userId: user.id });
      setTimeout(() => toast.error('Failed to update profile'), 0);
      return { error: error as Error };
    }
  }, [user]);

  const refreshProfile = useCallback(async () => {
    if (!user) return;

    const userProfile = await fetchProfile(user.id);
    if (userProfile && mountedRef.current) {
      setProfile(userProfile);
    }
  }, [user, fetchProfile]);

  // Add function to manually clear tokens
  const clearTokens = useCallback(() => {
    clearAuthTokens();
    setUser(null);
    setProfile(null);
    setSession(null);
    toast.info('Authentication tokens cleared. Please sign in again.');
  }, []);

  // Compute derived state
  const isAuthenticated = !!user;
  const isAdmin = profile?.role === 'admin';

  const value: AuthContextType = {
    user,
    profile,
    session,
    loading: loading && !forceCompletedRef.current,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updateProfile,
    isAuthenticated,
    isAdmin,
    refreshProfile,
    clearTokens,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
