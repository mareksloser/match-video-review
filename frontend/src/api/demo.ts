import type { ApiClient } from './client';
import { ApiError } from './client';
import { createSeed, type DemoDb } from './demoSeed';
import type { Marker, User, UserInput } from '@/lib/types';

const STORAGE_KEY = 'mvr-demo-v3';

export interface DemoStorage {
  load(): DemoDb | null;
  save(db: DemoDb): void;
}

export const browserDemoStorage: DemoStorage = {
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as DemoDb) : null;
    } catch {
      return null;
    }
  },
  save(db) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch {
      /* storage full or unavailable — demo still works in memory */
    }
  },
};

/**
 * In-browser implementation of the API. Applies the same access rules as the PHP backend:
 * anonymous → public matches without markers; player → own category + public; admin → all.
 */
export class DemoApiClient implements ApiClient {
  private db: DemoDb;
  private userId: number | null = null;

  constructor(private readonly storage: DemoStorage = browserDemoStorage) {
    this.db = storage.load() ?? createSeed();
    try {
      // First visit opens as the coach so the review screen is usable right away.
      const id = sessionStorage.getItem('mvr-demo-user');
      this.userId = id === null ? 1 : Number(id) || null;
    } catch {
      this.userId = 1;
    }
  }

  private persist() {
    this.storage.save(this.db);
  }
  private get user(): User | null {
    const u = this.db.users.find((x) => x.id === this.userId);
    if (!u) return null;
    const { password: _password, ...rest } = u;
    return rest;
  }
  private requireAdmin() {
    if (this.user?.role !== 'admin') throw new ApiError('Tuto akci může provést jen trenér.', 403);
  }
  private canSeeMatch(m: DemoDb['matches'][number]) {
    const u = this.user;
    if (!u) return m.isPublic;
    if (u.role === 'admin' || u.role === 'viewer') return true;
    return m.isPublic || m.teamCategoryId === u.teamCategoryId;
  }
  private canSeeMarkers(m: DemoDb['matches'][number]) {
    const u = this.user;
    return !!u && (u.role === 'admin' || u.role === 'viewer' || m.teamCategoryId === u.teamCategoryId);
  }
  private nextId() {
    return ++this.db.seq;
  }
  private findMarker(id: number) {
    const m = this.db.markers.find((x) => x.id === id);
    if (!m) throw new ApiError('Marker neexistuje.', 404);
    return m;
  }
  private toMarker(m: DemoDb['markers'][number]): Marker {
    return { ...m, viewedByMe: this.db.views.some((v) => v.markerId === m.id && v.userId === this.userId) };
  }
  private setUser(id: number | null) {
    this.userId = id;
    try {
      sessionStorage.setItem('mvr-demo-user', String(id ?? 0));
    } catch {
      /* ignore */
    }
  }

  async login(email: string, password: string) {
    const u = this.db.users.find((x) => x.email === email.trim().toLowerCase() && x.password === password);
    if (!u) throw new ApiError('Nesprávný e-mail nebo heslo.', 401);
    this.setUser(u.id);
    return { user: this.user!, token: `demo-${u.id}` };
  }
  async logout() {
    this.setUser(null);
  }
  async me() {
    return this.user;
  }

  async categories() {
    return this.db.categories;
  }

  async matches(filter?: { categoryId?: number | null }) {
    return this.db.matches
      .filter((m) => this.canSeeMatch(m))
      .filter((m) => !filter?.categoryId || m.teamCategoryId === filter.categoryId)
      .sort((a, b) => b.matchDate.localeCompare(a.matchDate))
      .map((m) => {
        const markers = this.canSeeMarkers(m) ? this.db.markers.filter((x) => x.matchId === m.id) : [];
        return {
          ...m,
          markerCount: markers.length,
          reviewedCount: markers.filter((x) => x.reviewed).length,
          viewedCount: this.userId
            ? markers.filter((x) => this.db.views.some((v) => v.markerId === x.id && v.userId === this.userId)).length
            : undefined,
        };
      });
  }

  async match(id: number) {
    const list = await this.matches();
    const m = list.find((x) => x.id === id);
    if (!m) throw new ApiError('Zápas neexistuje nebo k němu nemáte přístup.', 404);
    return m;
  }

  async createMatch(input: Parameters<ApiClient['createMatch']>[0]) {
    this.requireAdmin();
    const m = { ...input, id: this.nextId() };
    this.db.matches.push(m);
    this.persist();
    return { ...m, markerCount: 0, reviewedCount: 0 };
  }

  async updateMatch(id: number, input: Parameters<ApiClient['updateMatch']>[1]) {
    this.requireAdmin();
    const m = this.db.matches.find((x) => x.id === id);
    if (!m) throw new ApiError('Zápas neexistuje.', 404);
    Object.assign(m, input);
    this.persist();
    return this.match(id);
  }

  async deleteMatch(id: number) {
    this.requireAdmin();
    this.db.matches = this.db.matches.filter((m) => m.id !== id);
    this.db.markers = this.db.markers.filter((m) => m.matchId !== id);
    this.persist();
  }

  async markers(matchId: number) {
    const match = this.db.matches.find((m) => m.id === matchId);
    if (!match || !this.canSeeMarkers(match)) return [];
    return this.db.markers
      .filter((m) => m.matchId === matchId)
      .sort((a, b) => a.timestampSeconds - b.timestampSeconds)
      .map((m) => this.toMarker(m));
  }

  async createMarker(matchId: number, input: Parameters<ApiClient['createMarker']>[1]) {
    this.requireAdmin();
    const m = { ...input, id: this.nextId(), matchId, reviewed: false, reviewedAt: null, drawing: null };
    this.db.markers.push(m);
    this.persist();
    return this.toMarker(m);
  }

  async updateMarker(id: number, input: Parameters<ApiClient['updateMarker']>[1]) {
    this.requireAdmin();
    const m = this.findMarker(id);
    Object.assign(m, input);
    this.persist();
    return this.toMarker(m);
  }

  async deleteMarker(id: number) {
    this.requireAdmin();
    this.db.markers = this.db.markers.filter((m) => m.id !== id);
    this.persist();
  }

  async saveDrawing(markerId: number, drawing: Parameters<ApiClient['saveDrawing']>[1]) {
    this.requireAdmin();
    this.findMarker(markerId).drawing = drawing.shapes.length ? drawing : null;
    this.persist();
  }

  async setReviewed(markerId: number, reviewed: boolean) {
    this.requireAdmin();
    const m = this.findMarker(markerId);
    m.reviewed = reviewed;
    m.reviewedAt = reviewed ? new Date().toISOString() : null;
    this.persist();
  }

  async markViewed(markerId: number) {
    if (!this.userId) return;
    if (this.db.views.some((v) => v.markerId === markerId && v.userId === this.userId)) return;
    this.db.views.push({ markerId, userId: this.userId, viewedAt: new Date().toISOString() });
    this.persist();
  }

  async rules() {
    if (!this.user) throw new ApiError('Playbook je dostupný po přihlášení.', 401);
    return this.db.rules;
  }

  async createRule(input: Parameters<ApiClient['createRule']>[0]) {
    this.requireAdmin();
    const r = { ...input, id: this.nextId() };
    this.db.rules.push(r);
    this.persist();
    return r;
  }

  async updateRule(id: number, input: Parameters<ApiClient['updateRule']>[1]) {
    this.requireAdmin();
    const r = this.db.rules.find((x) => x.id === id);
    if (!r) throw new ApiError('Zásada neexistuje.', 404);
    Object.assign(r, input);
    this.persist();
    return r;
  }

  async deleteRule(id: number) {
    this.requireAdmin();
    this.db.rules = this.db.rules.filter((r) => r.id !== id);
    // Same as the database FK (ON DELETE SET NULL): markers stay, the link disappears.
    this.db.markers.forEach((m) => {
      if (m.ruleId === id) m.ruleId = null;
    });
    this.persist();
  }

  async analytics(matchId: number) {
    this.requireAdmin();
    const match = this.db.matches.find((m) => m.id === matchId);
    if (!match) throw new ApiError('Zápas neexistuje.', 404);
    const markers = this.db.markers
      .filter((m) => m.matchId === matchId)
      .sort((a, b) => a.timestampSeconds - b.timestampSeconds)
      .map(({ id, title, timestampSeconds }) => ({ id, title, timestampSeconds }));
    const ids = new Set(markers.map((m) => m.id));
    const players = this.db.users
      .filter((u) => u.role === 'player' && u.teamCategoryId === match.teamCategoryId)
      .map((u) => ({
        id: u.id,
        name: u.name,
        viewedMarkerIds: this.db.views.filter((v) => v.userId === u.id && ids.has(v.markerId)).map((v) => v.markerId),
      }));
    return { markers, players };
  }

  async uploadVideo(file: File) {
    this.requireAdmin();
    // Nothing leaves the browser in the demo: the file plays from memory until the page is closed.
    return { url: URL.createObjectURL(file) };
  }

  async users() {
    this.requireAdmin();
    return this.db.users
      .map(({ password: _p, ...u }) => u)
      .sort((a, b) => a.name.localeCompare(b.name, 'cs'));
  }

  /** Same rules as backend UserData + UserService. */
  private validateUser(input: UserInput, exceptId: number | null, passwordRequired: boolean) {
    const fields: Record<string, string> = {};
    const email = input.email.trim().toLowerCase();
    if (!input.name.trim()) fields.name = 'Vyplňte jméno (max. 100 znaků).';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fields.email = 'Zadejte platný e-mail.';
    else if (this.db.users.some((u) => u.email === email && u.id !== exceptId)) fields.email = 'Tento e-mail už používá jiný účet.';
    if (input.role === 'player' && !input.teamCategoryId) fields.teamCategoryId = 'Hráč musí mít tým, jinak uvidí jen veřejná videa.';
    if ((passwordRequired || input.password) && input.password.length < 8) fields.password = 'Heslo musí mít alespoň 8 znaků.';
    if (Object.keys(fields).length) throw new ApiError('Formulář obsahuje chyby.', 422, fields);
    return { name: input.name.trim(), email, role: input.role, teamCategoryId: input.role === 'player' ? input.teamCategoryId : null };
  }

  async createUser(input: UserInput) {
    this.requireAdmin();
    const user = { ...this.validateUser(input, null, true), id: this.nextId(), password: input.password };
    this.db.users.push(user);
    this.persist();
    const { password: _p, ...rest } = user;
    return rest;
  }

  async updateUser(id: number, input: UserInput) {
    this.requireAdmin();
    const user = this.db.users.find((u) => u.id === id);
    if (!user) throw new ApiError('Uživatel neexistuje.', 404);
    const data = this.validateUser(input, id, false);
    if (user.role === 'admin' && data.role !== 'admin') {
      if (id === this.userId) throw new ApiError('Formulář obsahuje chyby.', 422, { role: 'Sami sobě roli trenéra odebrat nemůžete.' });
      if (this.db.users.filter((u) => u.role === 'admin').length <= 1) throw new ApiError('Formulář obsahuje chyby.', 422, { role: 'Musí zůstat alespoň jeden trenér.' });
    }
    Object.assign(user, data, input.password ? { password: input.password } : {});
    this.persist();
    const { password: _p, ...rest } = user;
    return rest;
  }

  async deleteUser(id: number) {
    this.requireAdmin();
    const user = this.db.users.find((u) => u.id === id);
    if (!user) throw new ApiError('Uživatel neexistuje.', 404);
    if (id === this.userId) throw new ApiError('Vlastní účet smazat nemůžete.', 403);
    if (user.role === 'admin' && this.db.users.filter((u) => u.role === 'admin').length <= 1) throw new ApiError('Musí zůstat alespoň jeden trenér.', 403);
    this.db.users = this.db.users.filter((u) => u.id !== id);
    this.db.views = this.db.views.filter((v) => v.userId !== id);
    this.persist();
  }

  /** Demo only: restore the seed data. */
  reset() {
    this.db = createSeed();
    this.persist();
  }
}
