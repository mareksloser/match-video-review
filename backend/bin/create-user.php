<?php

declare(strict_types=1);

// Usage: php bin/create-user.php "Jméno" email@example.cz heslo admin|player [team_category_id]

use Mvr\Support\Container;

require __DIR__ . '/../src/bootstrap.php';

[$_, $name, $email, $password, $role] = $argv + [null, null, null, null, 'player'];
if (!$name || !$email || !$password || !in_array($role, ['admin', 'player'], true)) {
    fwrite(STDERR, "Usage: php bin/create-user.php \"Jméno\" email heslo admin|player [team_category_id]\n");
    exit(1);
}
$c = new Container();
(require __DIR__ . '/../config/services.php')($c);
$pdo = $c->get(\PDO::class);
$pdo->prepare(
    'INSERT INTO users (name, email, password, role, team_category_id) VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE name = VALUES(name), password = VALUES(password), role = VALUES(role), team_category_id = VALUES(team_category_id)'
)->execute([$name, mb_strtolower($email), password_hash($password, PASSWORD_DEFAULT), $role, isset($argv[5]) ? (int) $argv[5] : null]);
echo "Uživatel $email uložen.\n";
