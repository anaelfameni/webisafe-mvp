import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient.js';
import { getPostLoginPath } from '../utils/agencyAccess.js';

const AUTH_KEY = 'webisafe_auth';
const AUTH_EVENT = 'webisafe-auth-change';
const SHOULD_PERSIST_AUTH = !import.meta.env.DEV;

let authUser = null;
let authLoaded = false;
let logoutInProgress = false;
const listeners = new Set();

function isBrowser() {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function safeParse(json, fallback) {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function readStoredAuth() {
  if (!isBrowser()) return null;
  if (!SHOULD_PERSIST_AUTH) {
    clearBrowserAuthStorage();
    return null;
  }

  const stored = localStorage.getItem(AUTH_KEY);
  if (!stored) return null;

  const parsed = safeParse(stored, null);

  if (!parsed || typeof parsed !== 'object') {
    localStorage.removeItem(AUTH_KEY);
    return null;
  }

  return parsed;
}

function ensureAuthLoaded() {
  if (authLoaded) return;
  authUser = readStoredAuth();
  authLoaded = true;
}

function notifyAuthChanged() {
  listeners.forEach((listener) => {
    try {
      listener(authUser);
    } catch {
      // ignore
    }
  });

  if (isBrowser()) {
    window.dispatchEvent(
      new CustomEvent(AUTH_EVENT, {
        detail: authUser,
      })
    );
  }
}

function setGlobalUser(user) {
  authUser = user || null;
  authLoaded = true;

  if (isBrowser()) {
    if (authUser && SHOULD_PERSIST_AUTH) {
      localStorage.setItem(AUTH_KEY, JSON.stringify(authUser));
    } else {
      localStorage.removeItem(AUTH_KEY);
    }
  }

  notifyAuthChanged();
}

function clearBrowserAuthStorage() {
  if (!isBrowser()) return;

  localStorage.removeItem(AUTH_KEY);

  for (const key of Object.keys(localStorage)) {
    const lowerKey = key.toLowerCase();
    if (
      key.startsWith('sb-') ||
      lowerKey.includes('supabase') ||
      lowerKey.includes('gotrue')
    ) {
      localStorage.removeItem(key);
    }
  }

  if (typeof sessionStorage !== 'undefined') {
    for (const key of Object.keys(sessionStorage)) {
      const lowerKey = key.toLowerCase();
      if (
        key.startsWith('sb-') ||
        lowerKey.includes('supabase') ||
        lowerKey.includes('gotrue')
      ) {
        sessionStorage.removeItem(key);
      }
    }
  }
}

function buildSafeUserFromAuthUser(user, profile = null) {
  if (!user) return null;

  const metadata = user.user_metadata || {};
  const email = normalizeEmail(user.email);
  const fallbackRole = email === 'admin@test.com' ? 'admin' : email === 'agence@test.com' ? 'agence' : 'user';

  return {
    id: user.id,
    name: profile?.name || metadata.name || metadata.full_name || user.email,
    email,
    phone: profile?.phone || metadata.phone || '',
    phoneCountry: profile?.phone_country || metadata.phoneCountry || metadata.phone_country || '',
    createdAt: user.created_at,
    plan: profile?.plan || 'free',
    scansToday: profile?.scans_today || 0,
    lastScanDate: profile?.last_scan_date || null,
    role: profile?.role || fallbackRole,
  };
}

async function getProfile(sessionToken = null) {
  try {
    let token = sessionToken;
    if (!token) {
      const { data } = await supabase.auth.getSession();
      token = data?.session?.access_token;
    }
    const response = await fetch('/api/profile', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.profile || null;
  } catch (error) {
    console.error('[auth] profile fetch error:', error);
    return null;
  }
}

async function syncPublicUser(user, values = {}) {
  try {
    await getProfile();
  } catch (error) {
    console.error('[auth] public user sync error:', error);
  }
}

async function loadSupabaseSession() {
  const { data, error } = await supabase.auth.getSession();

  if (logoutInProgress || error || !data?.session?.user) {
    if (error) console.error('[auth] session error:', error);
    setGlobalUser(null);
    return null;
  }

  const profile = await getProfile(data?.session?.access_token);
  const safeUser = buildSafeUserFromAuthUser(data.session.user, profile);
  setGlobalUser(safeUser);
  return safeUser;
}

export function useAuth() {
  ensureAuthLoaded();

  const [user, setUser] = useState(authUser);
  const [loading, setLoading] = useState(!authLoaded);

  useEffect(() => {
    ensureAuthLoaded();
    setUser(authUser);
    setLoading(true);

    loadSupabaseSession().finally(() => setLoading(false));

    const listener = (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    };

    listeners.add(listener);

    const handleCustomAuthChange = (event) => {
      setUser(event.detail || null);
      setLoading(false);
    };

    const handleStorageChange = (event) => {
      if (event.key === AUTH_KEY) {
        authUser = readStoredAuth();
        notifyAuthChanged();
      }
    };

    const { data: subscriptionData } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const profile = await getProfile(session.access_token);
        setGlobalUser(buildSafeUserFromAuthUser(session.user, profile));
      } else {
        setGlobalUser(null);
      }
    });

    if (isBrowser()) {
      window.addEventListener(AUTH_EVENT, handleCustomAuthChange);
      window.addEventListener('storage', handleStorageChange);
    }

    return () => {
      listeners.delete(listener);
      subscriptionData?.subscription?.unsubscribe();

      if (isBrowser()) {
        window.removeEventListener(AUTH_EVENT, handleCustomAuthChange);
        window.removeEventListener('storage', handleStorageChange);
      }
    };
  }, []);

  const signup = async (name, email, phone, password, phoneCountry) => {
    logoutInProgress = false;
    const cleanEmail = normalizeEmail(email);

    if (!name || !String(name).trim()) {
      return { success: false, error: 'Le nom est requis' };
    }

    if (!cleanEmail) {
      return { success: false, error: 'L’email est requis' };
    }

    if (!password || String(password).length < 8) {
      return { success: false, error: 'Le mot de passe doit contenir au moins 8 caractères' };
    }

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          name: String(name).trim(),
          phone,
          phoneCountry,
          plan: 'free',
        },
      },
    });

    if (error) {
      return { success: false, error: error.message || 'Impossible de créer le compte.' };
    }

    const authUserData = data?.user;

    if (!authUserData) {
      return { success: false, error: 'Impossible de créer le compte.' };
    }

    await syncPublicUser(authUserData, { name: String(name).trim(), phone, phoneCountry });

    const safeUser = buildSafeUserFromAuthUser(authUserData, {
      name: String(name).trim(),
      phone,
      phone_country: phoneCountry,
      plan: 'free',
    });

    setGlobalUser(safeUser);

    return { success: true, user: safeUser };
  };

  const login = async (email, password) => {
    logoutInProgress = false;
    const cleanEmail = normalizeEmail(email);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (error || !data?.user) {
      return { success: false, error: 'Email ou mot de passe incorrect' };
    }

    const profile = await getProfile(data?.session?.access_token);
    const safeUser = buildSafeUserFromAuthUser(data.user, profile);
    setGlobalUser(safeUser);

    return {
      success: true,
      user: safeUser,
      redirectTo: getPostLoginPath(safeUser),
    };
  };

  const logout = async () => {
    logoutInProgress = true;
    clearBrowserAuthStorage();
    setGlobalUser(null);

    try {
      void supabase.auth.signOut({ scope: 'local' }).catch(() => {}).finally(clearBrowserAuthStorage);
    } catch {}
  };

  const changePassword = async (oldPassword, newPassword) => {
    ensureAuthLoaded();

    if (!authUser) {
      return { success: false, error: 'Non connecté' };
    }

    if (!newPassword || String(newPassword).length < 8) {
      return { success: false, error: 'Le nouveau mot de passe doit contenir au moins 8 caractères' };
    }

    if (!oldPassword) {
      return { success: false, error: 'Ancien mot de passe requis' };
    }

    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: authUser.email,
      password: oldPassword,
    });

    if (verifyError) {
      return { success: false, error: 'Ancien mot de passe incorrect' };
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      return { success: false, error: error.message || 'Erreur lors du changement de mot de passe.' };
    }

    return { success: true };
  };

  const resetPasswordByCode = async (code, newPassword) => {
    if (!code) {
      return { success: false, error: 'Lien de réinitialisation invalide ou expiré.' };
    }

    if (!newPassword || String(newPassword).length < 8) {
      return { success: false, error: 'Le mot de passe doit contenir au moins 8 caractères' };
    }

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      return { success: false, error: 'Lien invalide ou expiré.' };
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });

    if (updateError) {
      return { success: false, error: updateError.message || 'Erreur lors de la réinitialisation.' };
    }

    await supabase.auth.signOut();
    setGlobalUser(null);

    return { success: true };
  };

  const updateUser = (updates) => {
    ensureAuthLoaded();

    if (!authUser) return;

    const updatedUser = {
      ...authUser,
      ...updates,
    };

    setGlobalUser(updatedUser);
  };

  const canScan = () => {
    ensureAuthLoaded();

    if (!authUser) return true;

    const today = new Date().toDateString();

    if (authUser.lastScanDate !== today) return true;

    return (authUser.scansToday || 0) < 3;
  };

  const recordScan = () => {
    ensureAuthLoaded();

    if (!authUser) return;

    const today = new Date().toDateString();

    const scansToday =
      authUser.lastScanDate === today ? (authUser.scansToday || 0) + 1 : 1;

    updateUser({
      scansToday,
      lastScanDate: today,
    });
  };

  return {
    user,
    loading,
    signup,
    login,
    logout,
    updateUser,
    changePassword,
    resetPasswordByCode,
    resetPasswordByToken: resetPasswordByCode,
    canScan,
    recordScan,
    isAuthenticated: !!user,
  };
}
