import { useEffect, useState } from 'react';
import { buildAdminUser, isAdminCredentials } from '../utils/adminAuth.js';

const AUTH_KEY = 'webisafe_auth';
const USERS_KEY = 'webisafe_users';
const AUTH_EVENT = 'webisafe-auth-change';

/**
 * État global partagé entre toutes les instances de useAuth().
 * Sans ça, chaque composant qui appelle useAuth() garde son propre user,
 * ce qui provoque le bug : compte créé mais autre composant encore "déconnecté".
 */
let authUser = null;
let authLoaded = false;
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
    if (authUser) {
      localStorage.setItem(AUTH_KEY, JSON.stringify(authUser));
    } else {
      localStorage.removeItem(AUTH_KEY);
    }
  }

  notifyAuthChanged();
}

const DEFAULT_USERS = [
  {
    id: 'client_user',
    name: 'Client Test',
    email: 'client@test.com',
    password: '123client123',
    createdAt: new Date().toISOString(),
    plan: 'free',
    scansToday: 0,
    lastScanDate: null,
  },
];

function seedDefaultUsers() {
  if (!isBrowser()) return;
  const users = getUsers();
  let changed = false;
  for (const defaultUser of DEFAULT_USERS) {
    if (!users.some((u) => normalizeEmail(u.email) === normalizeEmail(defaultUser.email))) {
      users.push(defaultUser);
      changed = true;
    }
  }
  if (changed) saveUsers(users);
}

function getUsers() {
  if (!isBrowser()) return [];
  return safeParse(localStorage.getItem(USERS_KEY) || '[]', []);
}

function saveUsers(users) {
  if (!isBrowser()) return;
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function removePassword(user) {
  if (!user) return null;
  const { password: _password, ...safeUser } = user;
  return safeUser;
}

export function useAuth() {
  seedDefaultUsers();
  ensureAuthLoaded();

  const [user, setUser] = useState(authUser);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    ensureAuthLoaded();
    setUser(authUser);
    setLoading(false);

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

    if (isBrowser()) {
      window.addEventListener(AUTH_EVENT, handleCustomAuthChange);
      window.addEventListener('storage', handleStorageChange);
    }

    return () => {
      listeners.delete(listener);

      if (isBrowser()) {
        window.removeEventListener(AUTH_EVENT, handleCustomAuthChange);
        window.removeEventListener('storage', handleStorageChange);
      }
    };
  }, []);

  const signup = (name, email, phone, password, phoneCountry) => {
    const cleanEmail = normalizeEmail(email);

    if (!name || !String(name).trim()) {
      return { success: false, error: 'Le nom est requis' };
    }

    if (!cleanEmail) {
      return { success: false, error: 'L’email est requis' };
    }

    if (!password || String(password).length < 4) {
      return { success: false, error: 'Le mot de passe doit contenir au moins 4 caractères' };
    }

    const users = getUsers();

    const emailAlreadyUsed = users.some(
      (existingUser) => normalizeEmail(existingUser.email) === cleanEmail
    );

    if (emailAlreadyUsed) {
      return { success: false, error: 'Cet email est déjà utilisé' };
    }

    const newUser = {
      id: `user_${Date.now()}`,
      name: String(name).trim(),
      email: cleanEmail,
      phone,
      phoneCountry,
      password,
      createdAt: new Date().toISOString(),
      plan: 'free',
      scansToday: 0,
      lastScanDate: null,
    };

    users.push(newUser);
    saveUsers(users);

    const safeUser = removePassword(newUser);

    /**
     * Important :
     * On connecte immédiatement l’utilisateur ET on synchronise toutes les instances du hook.
     */
    setGlobalUser(safeUser);

    return { success: true, user: safeUser };
  };

  const login = (email, password) => {
    const cleanEmail = normalizeEmail(email);

    if (isAdminCredentials(cleanEmail, password)) {
      const adminUser = buildAdminUser();

      setGlobalUser(adminUser);

      return {
        success: true,
        user: adminUser,
        redirectTo: '/admin',
      };
    }

    const users = getUsers();

    const found = users.find(
      (existingUser) =>
        normalizeEmail(existingUser.email) === cleanEmail &&
        existingUser.password === password
    );

    if (!found) {
      return { success: false, error: 'Email ou mot de passe incorrect' };
    }

    const safeUser = removePassword(found);

    /**
     * Important :
     * Connexion globale partagée dans toute l’application.
     */
    setGlobalUser(safeUser);

    return { success: true, user: safeUser };
  };

  const logout = () => {
    setGlobalUser(null);
  };

  const updateUser = (updates) => {
    ensureAuthLoaded();

    if (!authUser) return;

    const updatedUser = {
      ...authUser,
      ...updates,
    };

    setGlobalUser(updatedUser);

    const users = getUsers();
    const index = users.findIndex((existingUser) => existingUser.id === updatedUser.id);

    if (index !== -1) {
      users[index] = {
        ...users[index],
        ...updates,
      };

      saveUsers(users);
    }
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
    canScan,
    recordScan,
    isAuthenticated: !!user,
  };
}