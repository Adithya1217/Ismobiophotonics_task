import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import type { User } from '@taskflow/shared';
import { api, setUnauthorizedHandler } from './api';

interface Ctx { user: User | null; ready: boolean; setUser: (u: User | null) => void; logout: () => Promise<void>; expired: boolean }
const AuthCtx = createContext<Ctx>(null!);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    setUnauthorizedHandler(() => { setUser((u) => { if (u) setExpired(true); return null; }); });
    api<{ user: User }>('/auth/me').then((r) => setUser(r.user)).catch(() => {}).finally(() => setReady(true));
  }, []);

  const logout = async () => { await api('/auth/logout', { method: 'POST' }).catch(() => {}); setUser(null); setExpired(false); };
  return <AuthCtx.Provider value={{ user, ready, setUser: (u) => { setUser(u); setExpired(false); }, logout, expired }}>{children}</AuthCtx.Provider>;
}
