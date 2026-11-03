-- Minimal starter data. Accounts come from the club IdP on first sign-in; team slugs must match its teams.
SET NAMES utf8mb4;

INSERT INTO team_categories (id, slug, name, description) VALUES
  (1, 'a-tym', 'A-tým', 'Muži'), (2, 'u19', 'U19', 'Dorost'), (3, 'u15', 'U15', 'Starší žáci'), (4, 'zeny', 'Ženy', NULL);

INSERT INTO rules (code, area, title, body) VALUES
  ('#1', 'Rozehrávka', 'Rozehrávka od brankáře', 'Stopeři se rozestoupí k vápnu, šestka si naběhne mezi ně.'),
  ('#3', 'Presink', 'Presink při špatném prvním doteku', 'Nejbližší hráč napadá okamžitě, druhý zavírá přihrávku do středu.');
