// Minimal auth + tenant context.
// WHY: holds the logged-in user, their role, and their tenant's branding/feature
// flags, and applies the branding colors to CSS variables so the whole UI
// re-skins per client without touching component code.

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);

  // Apply tenant colors as CSS variables (see styles.css for how they're used).
  const applyBranding = useCallback((t) => {
    if (!t) return;
    const root = document.documentElement;
    if (t.primary_color) root.style.setProperty('--color-primary', t.primary_color);
    if (t.secondary_color) root.style.setProperty('--color-secondary', t.secondary_color);
    document.title = t.name ? `${t.name} — Gym Manager` : 'Gym Manager';
  }, []);

  // On load (or after login) fetch the current user + tenant settings.
  const loadSession = useCallback(async () => {
    if (!localStorage.getItem('token')) {
      setLoading(false);
      return;
    }
    try {
      const [me, tenantRes] = await Promise.all([
        api.get('/auth/me'),
        api.get('/tenant'),
      ]);
      setUser(me.data);
      setTenant(tenantRes.data);
      applyBranding(tenantRes.data);
    } catch {
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  }, [applyBranding]);

  useEffect(() => { loadSession(); }, [loadSession]);

  async function login(tenantSlug, email, password) {
    const res = await api.post('/auth/login', { tenantSlug, email, password });
    localStorage.setItem('token', res.data.token);
    await loadSession();
  }

  function logout() {
    localStorage.removeItem('token');
    setUser(null);
    setTenant(null);
  }

  // Helper so components can check feature toggles: features('retail_pos')
  function features(flag) {
    return Boolean(tenant?.feature_flags?.[flag]);
  }

  return (
    <AuthContext.Provider value={{ user, tenant, loading, login, logout, features, reload: loadSession }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
