# Match Video Review (MVR)

Videorozbory zápasů pro SK Baník Libušín: markery v čase, taktické kresby přímo do videa,
evidence „probráno s týmem“ a přehled, kdo z hráčů si rozbor prošel.

```
frontend/   React 18 + TypeScript, TanStack Router/Query, Tailwind, komponenty ve stylu shadcn
backend/    PHP 8.2+, bez frameworku (PSR-4), PDO + MySQL 8 / MariaDB
```

## Rychlý start (lokálně)

```bash
# 1) databáze
mysql -uroot -e "CREATE DATABASE mvr CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
mysql -uroot mvr < backend/database/schema.sql
mysql -uroot mvr < backend/database/seed.sql

# 2) backend
cd backend
cp .env.example .env            # vyplňte DB_*, APP_SECRET (min. 16 znaků)
php bin/create-user.php "Petr Hájek" trener@banik.cz heslo admin
php bin/create-user.php "Jakub Svoboda" hrac@banik.cz heslo player 1   # 1 = id kategorie A-tým
php -S localhost:8080 -t public

# 3) frontend (druhý terminál) — Vite proxuje /api na :8080
cd frontend
npm install
npm run dev
```

Ukázka bez backendu a bez videa: `npm run dev:demo` (data v prohlížeči, simulovaný záznam).
`npm run build:demo` vyrobí jediný soubor `dist-demo/index.html`.

## Nasazení

1. `cd frontend && npm run build` a obsah `frontend/dist/` zkopírujte do `backend/public/`.
2. Webroot nasměrujte na `backend/public/`. Pro Apache je přiložen `.htaccess`
   (přepis na `index.php` a předání hlavičky `Authorization`). Pro nginx:
   `try_files $uri /index.php?$query_string;`
3. PHP rozšíření: `pdo_mysql`, `mbstring`, `fileinfo`, pro FTP úložiště `ftp`.
4. Upload velkých videí: zvyšte `upload_max_filesize` a `post_max_size` (např. 4G)
   a `max_execution_time`. Celé zápasy z VEO mají běžně jednotky GB.

### Videa: na co si dát pozor

- **Server s videi musí podporovat HTTP Range** (Apache i nginx ho mají v základu).
  Bez něj prohlížeč nemůže přetáčet a kliknutí na marker video nepřesune.
  Vestavěný `php -S` Range neumí, takže při lokálním vývoji servírujte videa jinak
  (např. `npx http-server public/videos -p 8090 --cors` a `STORAGE_PUBLIC_URL=http://localhost:8090`).
- **Kódování:** MP4 s H.264 + AAC (nejširší podpora) nebo WebM/VP9.
  Pro plynulé přehrávání z webu použijte `-movflags +faststart`.
- **VEO** nedovoluje vložit svůj přehrávač do cizí stránky. Zápasy s odkazem na VEO
  fungují tak, že marker otevře záznam na VEO přesně v čase (`#t=mm:ss`). Kreslení do obrazu
  vyžaduje soubor: stáhněte záznam z VEO a nahrajte ho přes „Přidat zápas → Nahrát soubor“
  (nebo ho dejte na FTP a zadejte cestu).

## API

Všechny odpovědi jsou JSON. Přihlášení vrací bearer token (HMAC podepsaný, bez tabulky session).

| Metoda | Cesta | Kdo |
|---|---|---|
| POST | `/api/auth/login` | kdokoli |
| GET | `/api/auth/me` | přihlášený |
| GET | `/api/categories` | kdokoli |
| GET | `/api/matches?category=ID` | kdokoli (anonym vidí jen veřejné) |
| GET | `/api/matches/{id}` | podle viditelnosti |
| POST / DELETE | `/api/matches`, `/api/matches/{id}` | trenér |
| GET | `/api/matches/{id}/markers` | hráč týmu, trenér (ostatní dostanou `[]`) |
| POST | `/api/matches/{id}/markers` | trenér |
| PUT / DELETE | `/api/markers/{id}` | trenér |
| PUT | `/api/markers/{id}/drawing` | trenér |
| PUT | `/api/markers/{id}/review` | trenér |
| POST | `/api/markers/{id}/view` | hráč týmu |
| GET | `/api/matches/{id}/analytics` | trenér |
| GET / POST | `/api/rules` | přihlášený / trenér |
| POST | `/api/uploads` (multipart, pole `video`) | trenér |

Chyby validace: `422 {"error": "...", "fields": {"pole": "zpráva"}}`.
Pro načítání dat na klubový web nastavte `CORS_ORIGINS`.

Čas markeru lze poslat jako sekundy, `"14:20"` nebo rovnou VEO odkaz `…/#t=14:20`.

## Architektura a testovatelnost

Testy zatím nejsou (dle zadání), kód je ale připravený tak, aby šly doplnit bez refaktoringu.

**Backend**
- `Controller/` jen čte request a volá službu. Logika je v `Service/`, pravidla viditelnosti
  v jediné čisté třídě `Auth/AccessPolicy`.
- Repozitáře mají rozhraní (`Repository/*Repository.php`) a PDO implementace — v testech
  stačí in-memory náhrada.
- Veškeré skládání závislostí je v `config/services.php` (`Container::set` lze v testu přepsat).
- Čas jde přes `Support/Clock`, takže tokeny a `reviewed_at` jdou testovat se zmrazeným časem.
- Zdroje videa = Strategy: `Video/VideoSource` + `VideoSourceRegistry`
  (`VeoSource`, `FileSource`, `YouTubeSource`). Vimeo/Hudl = nová třída + jeden `register()`.
- Úložiště: `Storage/Storage` (`LocalStorage`, `FtpStorage`; S3 = dvě metody).
- Čisté funkce bez I/O: `Video/TimeParser`, `Video/VeoUrlParser`, `Domain/DrawingValidator`.

**Frontend**
- `src/lib/time.ts` — čisté funkce (`parseTimeString`, `extractVeoTime`, `buildVeoUrl`…).
- `src/video/` — `VideoEngine` rozhraní a adaptéry (`Html5Engine`, `VeoEngine`, `YouTubeEngine`,
  `DemoEngine`) + registr. UI přehrávače neví, odkud video je.
- `src/canvas/` — kreslení: čistá geometrie (`geometry.ts`), bezstavové vykreslení (`render.ts`)
  a stavový automat editoru (`useDrawingEditor.ts`). Souřadnice jsou 0–1, kresba sedí na každé velikosti.
- `src/api/` — rozhraní `ApiClient`, injektované přes React context. `HttpApiClient`
  (s injektovatelným `fetch` a úložištěm tokenu) a `DemoApiClient` (in-memory, stejná pravidla přístupu).

## Změny schématu oproti zadání

Označené `▲` v `backend/database/schema.sql`:
- `matches.video_type` je `VARCHAR` místo `ENUM` → nový zdroj videa bez migrace.
- `matches.is_public` → veřejná galerie.
- Tabulka `rules` (playbook) + `markers.rule_id`; `rule_link` zůstává pro externí odkazy.
- `markers.kind` → ikony na časové ose (taktika, gól, šance, faul, střídání).
- `marker_reviews.marker_id` je `UNIQUE` → jeden příznak na marker, umožňuje upsert.

## Co zatím není (návrhy ze zadání, bod 7)

Export do PDF, komentáře hráčů pod markerem, srovnání dvou videí vedle sebe.
Datový model i architektura s nimi počítají; jsou to další samostatné kroky.
