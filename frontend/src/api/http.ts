import type { ApiClient } from './client';
import { ApiError } from './client';
import type { Session } from '@/lib/types';

export interface TokenStore {
  get(): string | null;
  set(token: string | null): void;
}

export const localTokenStore: TokenStore = {
  get: () => {
    try {
      return localStorage.getItem('mvr-token');
    } catch {
      return null;
    }
  },
  set: (token) => {
    try {
      if (token) localStorage.setItem('mvr-token', token);
      else localStorage.removeItem('mvr-token');
    } catch {
      /* storage unavailable */
    }
  },
};

/** REST client for the PHP backend (see backend/README.md for the endpoint list). */
export class HttpApiClient implements ApiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly tokens: TokenStore = localTokenStore,
    private readonly fetchImpl: typeof fetch = (...a) => fetch(...a),
  ) {}

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const token = this.tokens.get();
    const res = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (res.status === 204) return undefined as T;
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(data.error ?? `HTTP ${res.status}`, res.status, data.fields ?? {});
    return data as T;
  }

  async login(email: string, password: string) {
    const session = await this.request<Session>('POST', '/auth/login', { email, password });
    this.tokens.set(session.token);
    return session;
  }
  async logout() {
    this.tokens.set(null);
  }
  async me() {
    if (!this.tokens.get()) return null;
    try {
      return await this.request<Session['user']>('GET', '/auth/me');
    } catch {
      this.tokens.set(null);
      return null;
    }
  }

  categories: ApiClient['categories'] = () => this.request('GET', '/categories');
  matches: ApiClient['matches'] = (f) =>
    this.request('GET', `/matches${f?.categoryId ? `?category=${f.categoryId}` : ''}`);
  match: ApiClient['match'] = (id) => this.request('GET', `/matches/${id}`);
  createMatch: ApiClient['createMatch'] = (input) => this.request('POST', '/matches', input);
  deleteMatch = (id: number) => this.request<void>('DELETE', `/matches/${id}`);

  markers: ApiClient['markers'] = (matchId) => this.request('GET', `/matches/${matchId}/markers`);
  createMarker: ApiClient['createMarker'] = (matchId, input) => this.request('POST', `/matches/${matchId}/markers`, input);
  updateMarker: ApiClient['updateMarker'] = (id, input) => this.request('PUT', `/markers/${id}`, input);
  deleteMarker = (id: number) => this.request<void>('DELETE', `/markers/${id}`);
  saveDrawing: ApiClient['saveDrawing'] = (id, drawing) => this.request('PUT', `/markers/${id}/drawing`, drawing);
  setReviewed: ApiClient['setReviewed'] = (id, reviewed) => this.request('PUT', `/markers/${id}/review`, { reviewed });
  markViewed = (id: number) => this.request<void>('POST', `/markers/${id}/view`);

  rules: ApiClient['rules'] = () => this.request('GET', '/rules');
  createRule: ApiClient['createRule'] = (input) => this.request('POST', '/rules', input);

  async uploadVideo(file: File) {
    const token = this.tokens.get();
    const body = new FormData();
    body.append('video', file);
    const res = await this.fetchImpl(`${this.baseUrl}/uploads`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(data.error ?? `HTTP ${res.status}`, res.status, data.fields ?? {});
    return data as { url: string };
  }

  analytics: ApiClient['analytics'] = (matchId) => this.request('GET', `/matches/${matchId}/analytics`);
}
