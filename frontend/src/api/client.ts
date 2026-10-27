import type {
  Drawing, Marker, MarkerInput, Match, MatchAnalytics, MatchInput, Rule, Session, TeamCategory, User,
} from '@/lib/types';

/**
 * The one boundary between UI and data. `HttpApiClient` talks to the PHP backend,
 * `DemoApiClient` keeps everything in memory — and tests can pass their own fake.
 */
export interface ApiClient {
  login(email: string, password: string): Promise<Session>;
  logout(): Promise<void>;
  me(): Promise<User | null>;

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
