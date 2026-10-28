export type Role = 'admin' | 'player' | 'viewer';

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  teamCategoryId: number | null;
}

export type AuthLogEvent =
  | 'login_success'
  | 'login_failed'
  | 'login_blocked'
  | 'user_created'
  | 'user_updated'
  | 'password_changed'
  | 'user_deleted';

export type AuthLogFilter = '' | 'logins' | 'failed' | 'blocked' | 'accounts';

export interface AuthLogEntry {
  id: number;
  event: AuthLogEvent;
  createdAt: string;
  userId: number | null;
  userName: string | null;
  email: string | null;
  actorName: string | null;
  detail: string | null;
  ip: string | null;
  userAgent: string | null;
}

export interface AuthLogPage {
  items: AuthLogEntry[];
  nextBefore: number | null;
  summary: { success24h: number; failed24h: number; blocked24h: number; failedIps24h: number };
}

/** User as listed for the coach (with the last successful login). */
export type ManagedUser = User & { lastLoginAt?: string | null };

export interface UserInput {
  name: string;
  email: string;
  role: Role;
  teamCategoryId: number | null;
  /** Required when creating; empty when editing keeps the current password. */
  password: string;
}

export interface TeamCategory {
  id: number;
  name: string;
  description: string | null;
}

/** Open string union: new adapters (vimeo, hudl…) only need a registered engine. */
export type VideoType = 'veo' | 'ftp' | 'youtube' | 'demo' | (string & {});

export interface Match {
  id: number;
  title: string;
  matchDate: string; // YYYY-MM-DD
  teamCategoryId: number;
  videoType: VideoType;
  videoUrl: string;
  isPublic: boolean;
  markerCount: number;
  reviewedCount: number;
  viewedCount?: number | null; // only for players (their views are recorded)
}

export type MarkerKind =
  | 'praise'
  | 'mistake'
  | 'improvement'
  | 'tactic'
  | 'goal'
  | 'chance'
  | 'set_piece'
  | 'foul'
  | 'substitution';

export interface Marker {
  id: number;
  matchId: number;
  timestampSeconds: number;
  kind: MarkerKind;
  title: string;
  description: string | null;
  ruleId: number | null;
  ruleLink: string | null;
  reviewed: boolean;
  reviewedAt: string | null;
  viewedByMe: boolean;
  drawing: Drawing | null;
}

export interface Rule {
  id: number;
  code: string; // e.g. "#3"
  title: string;
  body: string;
  area: string; // e.g. "Presink", "Standardky"
}

export interface Session {
  user: User;
  token: string;
}

/* ---- Drawing model (normalized 0..1 coordinates, resolution independent) ---- */

export interface Point {
  x: number;
  y: number;
}

export type ShapeColor = 'yellow' | 'blue' | 'red' | 'white';

export type Shape =
  | { id: string; type: 'arrow'; from: Point; to: Point; color: ShapeColor; dashed: boolean }
  | { id: string; type: 'line'; from: Point; to: Point; color: ShapeColor }
  | { id: string; type: 'zone'; center: Point; rx: number; ry: number; color: ShapeColor }
  | { id: string; type: 'player'; at: Point; team: 'own' | 'opponent'; label: string }
  | { id: string; type: 'text'; at: Point; text: string; color: ShapeColor };

export type ShapeType = Shape['type'];

export interface Drawing {
  version: 1;
  shapes: Shape[];
}

export interface MarkerInput {
  timestampSeconds: number;
  kind: MarkerKind;
  title: string;
  description: string | null;
  ruleId: number | null;
  ruleLink: string | null;
}

export interface MatchInput {
  title: string;
  matchDate: string;
  teamCategoryId: number;
  videoType: VideoType;
  videoUrl: string;
  isPublic: boolean;
}

export interface MatchAnalytics {
  markers: Pick<Marker, 'id' | 'title' | 'timestampSeconds'>[];
  players: { id: number; name: string; viewedMarkerIds: number[] }[];
}
