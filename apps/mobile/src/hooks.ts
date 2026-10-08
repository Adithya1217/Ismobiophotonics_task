import { useCallback, useEffect, useState } from 'react';
import { ApiError } from './api';

export function useApi<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(() => fn().then(setData).then(() => setError(null)).catch((e) => setError(e)), deps);
  useEffect(() => { setLoading(true); load().finally(() => setLoading(false)); }, [load]);
  const refresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };
  return { data, error, loading, refreshing, refresh, reload: load };
}

export function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}
