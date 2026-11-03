-- Sign-in moves to the club IdP (OpenID Connect). Run once on existing databases;
-- schema.sql already contains these changes for new installs.

-- Local users are linked to club accounts by `sub`. Existing rows are linked automatically
-- on their first SSO sign-in by e-mail, so markers and view history are kept.
ALTER TABLE users
  ADD COLUMN `sub` VARCHAR(64) NULL COMMENT 'subject (user id) from the club IdP' AFTER `id`,
  ADD UNIQUE KEY `unique_user_sub` (`sub`),
  DROP COLUMN `password`;

-- Players get their team from the IdP role `player@<slug>`; this maps the slug to a category.
ALTER TABLE team_categories
  ADD COLUMN `slug` VARCHAR(50) NULL COMMENT 'team slug in the club IdP, e.g. u11' AFTER `id`,
  ADD UNIQUE KEY `unique_team_category_slug` (`slug`);

-- Fill in the slugs to match the teams in the IdP admin, e.g.:
-- UPDATE team_categories SET slug = 'a-tym' WHERE name = 'A-tým';
-- UPDATE team_categories SET slug = 'u19'   WHERE name = 'U19';
