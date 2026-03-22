import type { AppState, AuthSession } from '../types';

const envApiBaseUrl = (process.env as Record<string, string | undefined>)
  .EXPO_PUBLIC_API_URL;
const isWeb =
  typeof window !== 'undefined' && typeof window.location?.origin === 'string';

const defaultApiBaseUrl = isWeb ? window.location.origin : 'http://localhost:4000';

const API_BASE_URL = (envApiBaseUrl ?? defaultApiBaseUrl).replace(
  /\/$/,
  '',
);

const request = async <T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(payload?.error ?? 'Request failed');
  }

  return payload as T;
};

export const apiBaseUrl = API_BASE_URL;

export const registerAccount = (input: {
  email: string;
  password: string;
  name: string;
}) =>
  request<{ session: AuthSession }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  });

export const loginAccount = (input: { email: string; password: string }) =>
  request<{ session: AuthSession }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  });

export const completeOAuthSession = (input: { handoff: string }) =>
  request<{ session: AuthSession }>('/auth/oauth/complete', {
    method: 'POST',
    body: JSON.stringify(input),
  });

export const fetchProfile = (token: string) =>
  request<{ user: { email: string; name: string } }>('/auth/me', {}, token);

export const pullRemoteState = (token: string) =>
  request<{ state: AppState | null; updatedAt: number | null }>('/sync/state', {}, token);

export const pushRemoteState = (token: string, state: AppState) =>
  request<{ updatedAt: number }>('/sync/state', {
    method: 'PUT',
    body: JSON.stringify({ state }),
  }, token);
