import * as SecureStore from 'expo-secure-store';
import type { ApiErrorBody } from '@taskflow/shared';
import { API_URL } from './config';

const KEY = 'tf_token';
export const getToken = () => SecureStore.getItemAsync(KEY);
export const setToken = (t: string) => SecureStore.setItemAsync(KEY, t);
export const clearToken = () => SecureStore.deleteItemAsync(KEY);

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: Record<string, string[]>) {
    super(message);
  }
}

let onUnauthorized: (expired: boolean) => void = () => {};
export const setUnauthorizedHandler = (fn: (expired: boolean) => void) => { onUnauthorized = fn; };

export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = await getToken();
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: init.method ?? 'GET',
      headers: { ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: init.body ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'NETWORK', 'No connection. Check your internet and try again.');
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = (data as ApiErrorBody | null)?.error;
    if (res.status === 401 && !path.startsWith('/auth/login') && !path.startsWith('/auth/register')) {
      await clearToken();
      onUnauthorized(err?.code === 'TOKEN_EXPIRED');
    }
    throw new ApiError(res.status, err?.code ?? 'UNKNOWN', err?.message ?? 'Something went wrong', err?.details);
  }
  return data as T;
}
