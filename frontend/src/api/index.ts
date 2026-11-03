import type { ApiClient } from './client';
import { DemoApiClient } from './demo';
import { HttpApiClient } from './http';
import { OidcAuthSession, type AuthConfig } from '@/auth/session';

export const isDemo = import.meta.env.VITE_API_MODE === 'demo';

export function createApiClient(): ApiClient {
  if (isDemo) return new DemoApiClient();
  const base = import.meta.env.VITE_API_BASE ?? '/api';
  return new HttpApiClient(base, new OidcAuthSession(() => fetchAuthConfig(base)));
}

async function fetchAuthConfig(base: string): Promise<AuthConfig> {
  const res = await fetch(`${base}/auth/config`, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Nepodařilo se načíst nastavení přihlášení (HTTP ${res.status}).`);
  return (await res.json()) as AuthConfig;
}

export type { ApiClient } from './client';
