import type {
  AdminSetting,
  AuthLogFilter,
  AuthLogPage,
  Drawing,
  ManagedUser,
  Marker,
  MarkerInput,
  Match,
  MatchAnalytics,
  MatchInput,
  PublicSettings,
  Rule,
  SettingKey,
  TeamCategory,
  User,
} from '@/lib/types';

/**
 * The one boundary between UI and data. `HttpApiClient` talks to the PHP backend,
 * `DemoApiClient` keeps everything in memory — and tests can pass their own fake.
 */
export interface ApiClient {
  /** HTTP: redirects to the club login and resolves with null. Demo: signs in as `demoEmail` right away. */
  signIn(options?: { returnTo?: string; demoEmail?: string }): Promise<User | null>;
  /** After the redirect back from the club login: records the sign-in, returns the user and where to continue. */
  completeSignIn(): Promise<{ user: User; returnTo: string | null }>;
  /** Signs out here and at the club login. */
  logout(): Promise<void>;
  /** null = anonymous. Throws ApiError 403 for a club account without an MVR role. */
  me(): Promise<User | null>;
  /** Where accounts, roles and teams are managed (club IdP admin); null in the demo. */
  accountAdminUrl(): Promise<string | null>;

  categories(): Promise<TeamCategory[]>;
  matches(filter?: { categoryId?: number | null }): Promise<Match[]>;
  match(id: number): Promise<Match>;
  createMatch(input: MatchInput): Promise<Match>;
  updateMatch(id: number, input: MatchInput): Promise<Match>;
  deleteMatch(id: number): Promise<void>;

  markers(matchId: number): Promise<Marker[]>;
  createMarker(matchId: number, input: MarkerInput): Promise<Marker>;
  updateMarker(id: number, input: MarkerInput): Promise<Marker>;
  deleteMarker(id: number): Promise<void>;
  saveDrawing(markerId: number, drawing: Drawing): Promise<void>;
  setReviewed(markerId: number, reviewed: boolean): Promise<void>;
  markViewed(markerId: number): Promise<void>;

  rules(): Promise<Rule[]>;
  createRule(input: Omit<Rule, 'id'>): Promise<Rule>;
  updateRule(id: number, input: Omit<Rule, 'id'>): Promise<Rule>;
  deleteRule(id: number): Promise<void>;

  analytics(matchId: number): Promise<MatchAnalytics>;

  users(): Promise<ManagedUser[]>;

  publicSettings(): Promise<PublicSettings>;
  settings(): Promise<AdminSetting[]>;
  /** null resets a key to its default. */
  updateSettings(values: Partial<Record<SettingKey, unknown>>): Promise<AdminSetting[]>;
  authLog(params: { type: AuthLogFilter; q: string; before: number | null }): Promise<AuthLogPage>;

  /** Stores a video file (local/FTP storage) and returns its playable URL. */
  uploadVideo(file: File): Promise<{ url: string }>;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly fields: Record<string, string> = {},
  ) {
    super(Object.keys(fields).length ? `${message} ${Object.values(fields).join(' ')}` : message);
  }
}
