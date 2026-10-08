import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import type { User } from '@taskflow/shared';
import { api, clearToken, getToken, setToken, setUnauthorizedHandler } from './api';

interface Ctx {
  user: User | null; ready: boolean; notice: string;
  signIn: (mode: 'login' | 'register', body: object) => Promise<void>; logout: () => Promise<void>;
}
const AuthCtx = createContext<Ctx>(null!);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    setUnauthorizedHandler((expired) => {
      setUser(null);
      setNotice(expired ? 'Your session expired. Please log in again.' : 'Please log in to continue.');
    });
    (async () => {
      if (await getToken()) {
        try { setUser((await api<{ user: User }>('/auth/me')).user); } catch { /* handler already cleared */ }
      }
      setReady(true);
    })();
  }, []);

  const signIn: Ctx['signIn'] = async (mode, body) => {
    const r = await api<{ user: User; token: string }>(`/auth/${mode}`, { method: 'POST', body });
    await setToken(r.token); setNotice(''); setUser(r.user);
  };
  const logout = async () => { await clearToken(); setNotice(''); setUser(null); };
  return <AuthCtx.Provider value={{ user, ready, notice, signIn, logout }}>{children}</AuthCtx.Provider>;
}
