import type { ApiClient } from './client';
import { DemoApiClient } from './demo';
import { HttpApiClient } from './http';

export const isDemo = import.meta.env.VITE_API_MODE === 'demo';

export function createApiClient(): ApiClient {
  return isDemo ? new DemoApiClient() : new HttpApiClient(import.meta.env.VITE_API_BASE ?? '/api');
}

export type { ApiClient } from './client';
