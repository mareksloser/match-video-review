-- Minimal starter data. Create accounts with:  php bin/create-user.php "Jméno" email heslo admin|player [category_id]
SET NAMES utf8mb4;

INSERT INTO team_categories (id, name, description) VALUES
  (1, 'A-tým', 'Muži'), (2, 'U19', 'Dorost'), (3, 'U15', 'Starší žáci'), (4, 'Ženy', NULL);

INSERT INTO rules (code, area, title, body) VALUES
  ('#1', 'Rozehrávka', 'Rozehrávka od brankáře', 'Stopeři se rozestoupí k vápnu, šestka si naběhne mezi ně.'),
  ('#3', 'Presink', 'Presink při špatném prvním doteku', 'Nejbližší hráč napadá okamžitě, druhý zavírá přihrávku do středu.');
