import type { ApiClient } from './client';
import { ApiError } from './client';
import type { AuthSession } from '@/auth/session';
import type { User } from '@/lib/types';

/** REST client for the PHP backend (see README for the endpoint list). Tokens come from the club IdP. */
export class HttpApiClient implements ApiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly auth: AuthSession,
    private readonly fetchImpl: typeof fetch = (...a) => fetch(...a),
  ) {}

  /** The backend rejected a token we sent: the session is over (e.g. signed out elsewhere). */
  private async sessionRejected(): Promise<void> {
    await this.auth.forget();
    this.endedListeners.forEach((listener) => listener());
  }

  private readonly endedListeners = new Set<() => void>();

  onSessionEnded(listener: () => void): () => void {
    this.endedListeners.add(listener);
    const unsubscribe = this.auth.onEnded(listener);
    return () => {
      this.endedListeners.delete(listener);
      unsubscribe();
    };
  }

  private async request<T>(method: string, path: string, body?: unknown, { endSessionOn401 = true } = {}): Promise<T> {
    const token = await this.auth.accessToken();
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
    if (res.status === 401 && token && endSessionOn401) await this.sessionRejected();
    if (!res.ok) throw new ApiError(data.error ?? `HTTP ${res.status}`, res.status, data.fields ?? {});
    return data as T;
  }

  async signIn({ returnTo }: { returnTo?: string; demoEmail?: string } = {}) {
    await this.auth.signIn(returnTo);
    return null; // the browser is on its way to the club login
  }
  async completeSignIn() {
    const returnTo = await this.auth.completeSignIn();
    try {
      // No session-ended redirect here: a config problem would bounce between the app and the IdP forever.
      const { user } = await this.request<{ user: User }>('POST', '/auth/login', undefined, { endSessionOn401: false });
      return { user, returnTo };
    } catch (e) {
      // 401 = the backend doesn't accept the token (wrong issuer/client config): don't keep it.
      // 403 = signed in to the club but without an MVR role: keep it, so the user can sign out properly.
      if (e instanceof ApiError && e.status === 401) await this.auth.forget();
      throw e;
    }
  }
  async logout() {
    await this.auth.signOut();
  }
  async me() {
    if (!(await this.auth.accessToken())) return null;
    try {
      return await this.request<User>('GET', '/auth/me');
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) return null; // request() already ended the session
      throw e; // 403 (no MVR role) is shown to the user
    }
  }
  async accountAdminUrl() {
    try {
      return `${(await this.auth.config()).issuer}/admin`;
    } catch {
      return null;
    }
  }

  categories: ApiClient['categories'] = () => this.request('GET', '/categories');
  matches: ApiClient['matches'] = (f) =>
    this.request('GET', `/matches${f?.categoryId ? `?category=${f.categoryId}` : ''}`);
  match: ApiClient['match'] = (id) => this.request('GET', `/matches/${id}`);
  createMatch: ApiClient['createMatch'] = (input) => this.request('POST', '/matches', input);
  updateMatch: ApiClient['updateMatch'] = (id, input) => this.request('PUT', `/matches/${id}`, input);
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
  updateRule: ApiClient['updateRule'] = (id, input) => this.request('PUT', `/rules/${id}`, input);
  deleteRule = (id: number) => this.request<void>('DELETE', `/rules/${id}`);

  async uploadVideo(file: File) {
    const token = await this.auth.accessToken();
    const body = new FormData();
    body.append('video', file);
    const res = await this.fetchImpl(`${this.baseUrl}/uploads`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body,
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && token) await this.sessionRejected();
    if (!res.ok) throw new ApiError(data.error ?? `HTTP ${res.status}`, res.status, data.fields ?? {});
    return data as { url: string };
  }

  users: ApiClient['users'] = () => this.request('GET', '/users');
  publicSettings: ApiClient['publicSettings'] = () => this.request('GET', '/settings/public');
  settings: ApiClient['settings'] = () => this.request('GET', '/settings');
  updateSettings: ApiClient['updateSettings'] = (values) => this.request('PUT', '/settings', { values });
  authLog: ApiClient['authLog'] = ({ type, q, before }) => {
    const params = new URLSearchParams();
    if (type) params.set('type', type);
    if (q.trim()) params.set('q', q.trim());
    if (before) params.set('before', String(before));
    const qs = params.toString();
    return this.request('GET', `/auth-log${qs ? `?${qs}` : ''}`);
  };

  analytics: ApiClient['analytics'] = (matchId) => this.request('GET', `/matches/${matchId}/analytics`);
}
