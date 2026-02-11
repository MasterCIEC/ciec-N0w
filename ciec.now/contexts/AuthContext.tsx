
import React, { createContext, useState, useEffect, useContext, ReactNode, useRef, useCallback } from 'react';
import { AuthSession, User } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';
import { UserProfile } from '../types';

type AuthContextType = {
  session: AuthSession | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: (options?: { dueToInactivity?: boolean }) => Promise<void>;
  showInactivityModal: boolean;
  closeInactivityModal: () => void;
  awaitingPasswordReset: boolean;
  setAwaitingPasswordReset: React.Dispatch<React.SetStateAction<boolean>>;
  can: (action: string, subject: string) => boolean;
  refreshSessionData: () => Promise<void>;
  isSuperAdmin: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes

// Función auxiliar robusta para detectar SuperAdmin
const checkIsSuperAdmin = (profile: UserProfile | null): boolean => {
  if (!profile) return false;
  // Chequeo por ID (Comúnmente el ID 1 es SuperAdmin en la semilla inicial)
  if (profile.role_id === 1) return true;
  
  // Chequeo por Nombre (Normalizado)
  const roleName = profile.roles?.name;
  if (!roleName) return false;
  const normalized = roleName.toLowerCase().replace(/\s+/g, '');
  return normalized === 'superadmin' || normalized === 'masteradmin';
};

export const AuthProvider: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showInactivityModal, setShowInactivityModal] = useState(false);
  const [awaitingPasswordReset, setAwaitingPasswordReset] = useState(false);
  const inactivityTimer = useRef<number | null>(null);
  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const refreshSessionData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error("Error fetching session:", sessionError);
        setSession(null); setUser(null); setProfile(null); setPermissions(new Set()); setIsSuperAdmin(false);
        return;
      }

      setSession(currentSession);
      const currentUser = currentSession?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        const { data: userProfileData, error: profileError } = await supabase
          .from('userprofiles')
          .select('*')
          .eq('id', currentUser.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          console.error("Error fetching profile:", profileError);
          setProfile(null);
          setIsSuperAdmin(false);
        } else if (userProfileData) {
            let fullProfile: UserProfile = userProfileData;
            // Fetch rol name manually to ensure we have it for the check
            if (userProfileData.role_id) {
                 const { data: roleData } = await supabase
                    .from('roles')
                    .select('id, name')
                    .eq('id', userProfileData.role_id)
                    .single();
                if(roleData) {
                    fullProfile = { ...userProfileData, roles: roleData };
                }
            }
            setProfile(fullProfile);
            
            const adminStatus = checkIsSuperAdmin(fullProfile);
            setIsSuperAdmin(adminStatus);

            let loadedPermissions = new Set<string>();

            // Si es SuperAdmin, no necesitamos cargar permisos individuales, can() retornará true.
            // Pero si NO lo es, cargamos los permisos.
            if (!adminStatus) {
                try {
                    const { data: permissionsData, error: permissionsError } = await supabase.functions.invoke('get-user-permissions');

                    if (permissionsError) {
                        throw permissionsError;
                    }
                    loadedPermissions = new Set(permissionsData?.permissions || []);
                    setPermissions(loadedPermissions);
                } catch (err) {
                    console.warn("Error cargando permisos desde Edge Function, intentando fallback local...", err);
                    // Fallback local
                    if (fullProfile.role_id) {
                        const { data: rolePerms } = await supabase
                          .from('rolepermissions')
                          .select('permission_id')
                          .eq('role_id', fullProfile.role_id);
                        
                        if (rolePerms && rolePerms.length > 0) {
                           const pIds = rolePerms.map(rp => rp.permission_id);
                           const { data: perms } = await supabase
                             .from('permissions')
                             .select('action, subject')
                             .in('id', pIds);
                           
                           if (perms) {
                             perms.forEach(p => loadedPermissions.add(`${p.action}:${p.subject}`));
                           }
                        }
                    }
                    setPermissions(loadedPermissions);
                }
            } else {
                setPermissions(new Set()); // Limpiar para SuperAdmin (usa override)
            }
        } else {
            setProfile(null);
            setPermissions(new Set());
            setIsSuperAdmin(false);
        }
      } else {
        setProfile(null);
        setPermissions(new Set());
        setIsSuperAdmin(false);
      }
    } catch (error) {
      console.error("A critical error occurred during session refresh:", error);
      setSession(null); setUser(null); setProfile(null); setPermissions(new Set()); setIsSuperAdmin(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSessionData();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event) => {
      if (_event === 'SIGNED_IN' || _event === 'SIGNED_OUT') {
        refreshSessionData();
      }
    });
    return () => {
      subscription?.unsubscribe();
    };
  }, [refreshSessionData]);
  
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshSessionData();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshSessionData]);

  const signOut = useCallback(async (options?: { dueToInactivity?: boolean }) => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    await supabase.auth.signOut();
    if (options?.dueToInactivity) setShowInactivityModal(true);
  }, []);

  const handleInactivity = useCallback(() => {
    signOut({ dueToInactivity: true });
  }, [signOut]);

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    inactivityTimer.current = window.setTimeout(handleInactivity, INACTIVITY_TIMEOUT);
  }, [handleInactivity]);

  useEffect(() => {
    if (session) {
        const events: (keyof WindowEventMap)[] = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
        events.forEach(event => window.addEventListener(event, resetInactivityTimer, { passive: true }));
        resetInactivityTimer();
        return () => {
            events.forEach(event => window.removeEventListener(event, resetInactivityTimer));
            if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
        };
    } else {
        if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    }
  }, [session, resetInactivityTimer]);

  const closeInactivityModal = () => setShowInactivityModal(false);

  const can = useCallback((action: string, subject: string): boolean => {
    // Si isSuperAdmin es true (calculado en refreshSessionData), acceso total.
    if (isSuperAdmin) {
      return true;
    }
    // Fallback por si isSuperAdmin no se actualizó pero el perfil sí (edge case)
    if (checkIsSuperAdmin(profile)) {
        return true;
    }
    return permissions.has(`${action}:${subject}`);
  }, [profile, permissions, isSuperAdmin]);

  const value = {
    session,
    user,
    profile,
    loading,
    signOut,
    showInactivityModal,
    closeInactivityModal,
    awaitingPasswordReset,
    setAwaitingPasswordReset,
    can,
    refreshSessionData,
    isSuperAdmin
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
