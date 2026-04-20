import { useState, useEffect } from 'react';

const AUTH_KEY = 'webisafe_auth';
const USERS_KEY = 'webisafe_users';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(AUTH_KEY);
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem(AUTH_KEY);
      }
    }
    setLoading(false);
  }, []);

  const signup = (name, email, phone, password, phoneCountry) => {
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');

    if (users.find((existingUser) => existingUser.email === email)) {
      return { success: false, error: 'Cet email est déjà utilisé' };
    }

    const newUser = {
      id: `user_${Date.now()}`,
      name,
      email,
      phone,
      phoneCountry,
      password,
      createdAt: new Date().toISOString(),
      plan: 'free',
      scansToday: 0,
      lastScanDate: null,
    };

    users.push(newUser);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));

    const { password: _password, ...safeUser } = newUser;
    localStorage.setItem(AUTH_KEY, JSON.stringify(safeUser));
    setUser(safeUser);

    return { success: true };
  };

  const login = (email, password) => {
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    const found = users.find(
      (existingUser) => existingUser.email === email && existingUser.password === password
    );

    if (!found) {
      return { success: false, error: 'Email ou mot de passe incorrect' };
    }

    const { password: _password, ...safeUser } = found;
    localStorage.setItem(AUTH_KEY, JSON.stringify(safeUser));
    setUser(safeUser);

    return { success: true };
  };

  const logout = () => {
    localStorage.removeItem(AUTH_KEY);
    setUser(null);
  };

  const updateUser = (updates) => {
    const updated = { ...user, ...updates };
    localStorage.setItem(AUTH_KEY, JSON.stringify(updated));
    setUser(updated);

    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    const index = users.findIndex((existingUser) => existingUser.id === updated.id);
    if (index !== -1) {
      users[index] = { ...users[index], ...updates };
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }
  };

  const canScan = () => {
    if (!user) return true;
    const today = new Date().toDateString();
    if (user.lastScanDate !== today) return true;
    return (user.scansToday || 0) < 3;
  };

  const recordScan = () => {
    if (!user) return;
    const today = new Date().toDateString();
    const scansToday = user.lastScanDate === today ? (user.scansToday || 0) + 1 : 1;
    updateUser({ scansToday, lastScanDate: today });
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
