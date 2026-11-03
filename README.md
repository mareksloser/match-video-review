# Match Video Review (MVR)

Match video analysis for SK Baník Libušín: timed markers, tactical drawings directly on the video,
"discussed with the team" tracking and an overview of which players went through the review.

```
frontend/   React 18 + TypeScript, TanStack Router/Query, Tailwind, shadcn-style components
backend/    PHP 8.2+, no framework (PSR-4), PDO + MySQL 8 / MariaDB
```

## Quick start (local)

```bash
# 1) database
mysql -uroot -e "CREATE DATABASE mvr CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
mysql -uroot mvr < backend/database/schema.sql
mysql -uroot mvr < backend/database/seed.sql

# 2) backend
cd backend
cp .env.example .env            # fill in DB_*, OIDC_ISSUER, OIDC_CLIENT_ID
php -S localhost:8080 -t public

# 3) frontend (second terminal) — Vite proxies /api to :8080
cd frontend
npm install
npm run dev
```

Demo without a backend and without video: `npm run dev:demo` (data in the browser, simulated recording,
demo accounts instead of the club login). `npm run build:demo` produces a single file `dist-demo/index.html`.

## Sign-in (club account)

MVR has no passwords. Users sign in with their club account at the club IdP
([team-auth](https://github.com/mareksloser/team-auth), OpenID Connect); MVR only verifies the access tokens.

**In the IdP admin**

1. *Aplikace → Nová aplikace*: client_id `mvr-web`, **public** client, grants Authorization Code + Refresh Token,
   scopes `openid profile email roles teams offline_access`, redirect URIs
   `https://<mvr-host>/auth/callback` and `http://localhost:5173/auth/callback` for development.
2. Roles of `mvr-web`: `coach`, `player`, `viewer`.
3. Give users a role: `coach` → coach (sees and manages all teams), `viewer` → read-only, all teams,
   `player` limited to a team (`player@u11`) → player of that team. Global `superadmin` counts as coach.
4. Add the MVR origins to the IdP's `CORS_ALLOW_ORIGIN`.

**In MVR**

- `backend/.env`: `OIDC_ISSUER` (exactly the IdP's issuer, no trailing slash) and `OIDC_CLIENT_ID=mvr-web`.
  The frontend reads both from `GET /api/auth/config`, so builds don't depend on the environment.
- `team_categories.slug` must match the team slugs in the IdP, otherwise players end up without a team.

Local users are created on the first sign-in and updated on every later one (name, e-mail, role, team),
so roles are managed only in the IdP. Accounts that existed before SSO are linked by e-mail on their
first sign-in and keep their markers and view history. A club account without an MVR role gets a notice
instead of access.

## Deployment

1. `cd frontend && npm run build` and copy the contents of `frontend/dist/` into `backend/public/`.
2. Point the web root at `backend/public/`. An `.htaccess` is included for Apache
   (rewrite to `index.php` and passing the `Authorization` header). For nginx:
   `try_files $uri /index.php?$query_string;`
3. PHP extensions: `pdo_mysql`, `mbstring`, `fileinfo`, `openssl`, and `ftp` for FTP storage.
   PHP must be able to reach the IdP over HTTPS (`allow_url_fopen`) to download its public keys;
   they are cached in `backend/tmp/cache/` (needs write access).
4. Uploading large videos: raise `upload_max_filesize` and `post_max_size` (e.g. 4G)
   and `max_execution_time`. Full VEO matches are commonly several GB.

### Videos: things to watch out for

- **The server hosting videos must support HTTP Range** (Apache and nginx do out of the box).
  Without it the browser cannot seek and clicking a marker won't move the video.
  The built-in `php -S` doesn't support Range, so serve videos differently during local development
  (e.g. `npx http-server public/videos -p 8090 --cors` and `STORAGE_PUBLIC_URL=http://localhost:8090`).
- **Encoding:** MP4 with H.264 + AAC (widest support) or WebM/VP9.
  For smooth web playback use `-movflags +faststart`.
- **VEO** doesn't allow embedding its player in other sites. Matches linking to VEO
  work by a marker opening the recording on VEO at the exact time (`#t=mm:ss`). Drawing on the picture
  requires a file: download the recording from VEO and upload it via "Přidat zápas → Nahrát soubor"
  (or put it on FTP and enter the path).

## API

All responses are JSON. Requests are authorized with the club IdP's access token (`Authorization: Bearer …`).

| Method | Path | Who |
|---|---|---|
| GET | `/api/auth/config` | anyone (IdP issuer and client_id for the SPA) |
| POST | `/api/auth/login` | club account with an MVR role (records the sign-in) |
| GET | `/api/auth/me` | signed in (`401` no valid token, `403` no MVR role) |
| GET | `/api/categories` | anyone |
| GET | `/api/matches?category=ID` | anyone (anonymous sees public only) |
| GET | `/api/matches/{id}` | by visibility |
| POST / DELETE | `/api/matches`, `/api/matches/{id}` | coach |
| GET | `/api/matches/{id}/markers` | team player, coach (others get `[]`) |
| POST | `/api/matches/{id}/markers` | coach |
| PUT / DELETE | `/api/markers/{id}` | coach |
| PUT | `/api/markers/{id}/drawing` | coach |
| PUT | `/api/markers/{id}/review` | coach |
| POST | `/api/markers/{id}/view` | team player |
| GET | `/api/matches/{id}/analytics` | coach |
| GET / POST | `/api/rules` | signed in / coach |
| POST | `/api/uploads` (multipart, field `video`) | coach |
| GET | `/api/users`, `/api/auth-log` | coach (read-only) |

Validation errors: `422 {"error": "...", "fields": {"field": "message"}}`.
To load data on the club website set `CORS_ORIGINS`.

A marker time can be sent as seconds, `"14:20"` or directly as a VEO link `…/#t=14:20`.

## Architecture and testability

There are no tests yet (per the brief), but the code is prepared so they can be added without refactoring.

**Backend**
- `Controller/` only reads the request and calls a service. Logic lives in `Service/`, visibility rules
  in a single pure class `Auth/AccessPolicy`.
- Repositories have interfaces (`Repository/*Repository.php`) and PDO implementations — an in-memory
  replacement is enough in tests.
- All dependency wiring is in `config/services.php` (`Container::set` can be overridden in a test).
- Time goes through `Support/Clock`, so tokens and `reviewed_at` can be tested with a frozen clock.
- Sign-in: `Auth/Oidc/TokenVerifier` (RS256 signature via `JwksProvider`, issuer, audience, expiry),
  `Auth/ClaimsMapper` (pure: IdP roles → MVR role and team) and `Auth/UserProvisioner`
  (keeps local users in sync). The JWKS download is injectable, so all three are testable offline.
- Video sources = Strategy: `Video/VideoSource` + `VideoSourceRegistry`
  (`VeoSource`, `FileSource`, `YouTubeSource`). Vimeo/Hudl = a new class + one `register()`.
- Storage: `Storage/Storage` (`LocalStorage`, `FtpStorage`; S3 = two methods).
- Pure functions without I/O: `Video/TimeParser`, `Video/VeoUrlParser`, `Domain/DrawingValidator`.

**Frontend**
- `src/lib/time.ts` — pure functions (`parseTimeString`, `extractVeoTime`, `buildVeoUrl`…).
- `src/video/` — `VideoEngine` interface and adapters (`Html5Engine`, `VeoEngine`, `YouTubeEngine`,
  `DemoEngine`) + registry. The player UI doesn't know where the video comes from.
- `src/canvas/` — drawing: pure geometry (`geometry.ts`), stateless rendering (`render.ts`)
  and the editor state machine (`useDrawingEditor.ts`). Coordinates are 0–1, so a drawing fits any size.
- `src/api/` — the `ApiClient` interface, injected via React context. `HttpApiClient`
  (with injectable `fetch` and `AuthSession`) and `DemoApiClient` (in-memory, same access rules).
- `src/auth/session.ts` — `AuthSession` interface and its `oidc-client-ts` implementation
  (Authorization Code + PKCE, refresh token renewal).

## Schema changes compared to the brief

Marked `▲` in `backend/database/schema.sql`:
- `matches.video_type` is `VARCHAR` instead of `ENUM` → a new video source without a migration.
- `matches.is_public` → public gallery.
- `rules` table (playbook) + `markers.rule_id`; `rule_link` stays for external links.
- `markers.kind` → icons on the timeline (tactic, goal, chance, foul, substitution).
- `marker_reviews.marker_id` is `UNIQUE` → one flag per marker, enables upsert.
- `users.sub` instead of `users.password` (club sign-in), `team_categories.slug` for the IdP team mapping.

## Upgrading an existing installation to the club sign-in

1. Run `backend/database/migrations/2026-11-04-club-sso.sql` (adds `users.sub` and
   `team_categories.slug`, drops `users.password`).
2. Fill in `team_categories.slug` to match the IdP teams (examples at the end of the migration).
3. Set `OIDC_ISSUER` / `OIDC_CLIENT_ID` in `backend/.env`; `APP_SECRET`, `TOKEN_TTL` and
   `LOGIN_*` are no longer used.
4. Create the club accounts and roles in the IdP with the same e-mails as in MVR, so existing
   users get linked. Old MVR sign-ins stop working after the deploy.

## Not done yet (suggestions from the brief, section 7)

PDF export, player comments under a marker, side-by-side comparison of two videos.
The data model and architecture account for them; they are separate next steps.
