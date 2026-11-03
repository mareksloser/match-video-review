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
cp .env.example .env            # fill in DB_*, APP_SECRET (min. 16 characters)
php bin/create-user.php "Petr Hájek" trener@banik.cz heslo admin
php bin/create-user.php "Jakub Svoboda" hrac@banik.cz heslo player 1   # 1 = id of the A-tým category
php bin/create-user.php "Náhled" view@banik.cz heslo viewer            # sees all teams, changes nothing
```

The first coach has to be created with the script. Further accounts are managed by a coach in the app
(profile menu → **Uživatelé**): add, edit, change password and delete. The app won't let you
delete or demote your own account and always keeps at least one coach.
After a password change the user is signed out on all devices (the token is bound to the password).

```bash
php -S localhost:8080 -t public

# 3) frontend (second terminal) — Vite proxies /api to :8080
cd frontend
npm install
npm run dev
```

Demo without a backend and without video: `npm run dev:demo` (data in the browser, simulated recording).
`npm run build:demo` produces a single file `dist-demo/index.html`.

## Deployment

1. `cd frontend && npm run build` and copy the contents of `frontend/dist/` into `backend/public/`.
2. Point the web root at `backend/public/`. An `.htaccess` is included for Apache
   (rewrite to `index.php` and passing the `Authorization` header). For nginx:
   `try_files $uri /index.php?$query_string;`
3. PHP extensions: `pdo_mysql`, `mbstring`, `fileinfo`, and `ftp` for FTP storage.
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

All responses are JSON. Login returns a bearer token (HMAC-signed, no session table).

| Method | Path | Who |
|---|---|---|
| POST | `/api/auth/login` | anyone |
| GET | `/api/auth/me` | signed in |
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
  (with injectable `fetch` and token storage) and `DemoApiClient` (in-memory, same access rules).

## Schema changes compared to the brief

Marked `▲` in `backend/database/schema.sql`:
- `matches.video_type` is `VARCHAR` instead of `ENUM` → a new video source without a migration.
- `matches.is_public` → public gallery.
- `rules` table (playbook) + `markers.rule_id`; `rule_link` stays for external links.
- `markers.kind` → icons on the timeline (tactic, goal, chance, foul, substitution).
- `marker_reviews.marker_id` is `UNIQUE` → one flag per marker, enables upsert.

## Not done yet (suggestions from the brief, section 7)

PDF export, player comments under a marker, side-by-side comparison of two videos.
The data model and architecture account for them; they are separate next steps.
