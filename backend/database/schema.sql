-- Match Video Review — MySQL 8 schema
-- Based on the project brief, with these deliberate changes (marked ▲):
--   ▲ matches.video_type is VARCHAR instead of ENUM, so a new video adapter (vimeo, hudl…) needs no migration
--   ▲ matches.is_public drives the anonymous gallery
--   ▲ rules table = playbook; markers.rule_id references it (rule_link stays for external links)
--   ▲ markers.kind for the timeline icons (taktika / gól / šance / faul / střídání)
--   ▲ marker_reviews.marker_id is UNIQUE (one review flag per marker, enables upsert)

SET NAMES utf8mb4;

CREATE TABLE `team_categories` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL COMMENT 'Např. A-tým, U19, Ženy',
  `description` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `users` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(150) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `role` ENUM('admin', 'player', 'viewer') NOT NULL DEFAULT 'player' COMMENT '▲ viewer = read-only, all teams',
  `team_category_id` BIGINT UNSIGNED NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`team_category_id`) REFERENCES `team_categories`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `matches` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL COMMENT 'Např. FK Sparta vs SK Slavia',
  `match_date` DATE NOT NULL,
  `team_category_id` BIGINT UNSIGNED NOT NULL,
  `video_type` VARCHAR(20) NOT NULL DEFAULT 'veo' COMMENT '▲ veo | ftp | youtube | … (registered VideoSource)',
  `video_url` TEXT NOT NULL COMMENT 'URL odkaz nebo cesta k MP4 souboru na FTP',
  `is_public` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '▲ 1 = ve veřejné galerii',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_matches_category_date` (`team_category_id`, `match_date`),
  FOREIGN KEY (`team_category_id`) REFERENCES `team_categories`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ▲ Playbook / klubové zásady
CREATE TABLE `rules` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(20) NOT NULL COMMENT 'Např. #3',
  `area` VARCHAR(100) NOT NULL COMMENT 'Např. Presink, Standardky',
  `title` VARCHAR(255) NOT NULL,
  `body` TEXT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `markers` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `match_id` BIGINT UNSIGNED NOT NULL,
  `timestamp_seconds` INT UNSIGNED NOT NULL COMMENT 'Čas ve vteřinách od začátku videa',
  `kind` VARCHAR(20) NOT NULL DEFAULT 'tactic' COMMENT '▲ praise | mistake | improvement | tactic | goal | chance | set_piece | foul | substitution',
  `title` VARCHAR(255) NOT NULL COMMENT 'Krátký název situace',
  `description` TEXT NULL COMMENT 'Detailní rozbor / doporučení od trenéra',
  `rule_id` BIGINT UNSIGNED NULL COMMENT '▲ Odkaz do playbooku',
  `rule_link` VARCHAR(500) NULL COMMENT 'Externí odkaz na pravidla',
  `created_by` BIGINT UNSIGNED NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_markers_match_time` (`match_id`, `timestamp_seconds`),
  FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`rule_id`) REFERENCES `rules`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `marker_drawings` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `marker_id` BIGINT UNSIGNED NOT NULL UNIQUE,
  `drawing_data` JSON NOT NULL COMMENT '{version:1, shapes:[…]} souřadnice 0..1',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`marker_id`) REFERENCES `markers`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `marker_reviews` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `marker_id` BIGINT UNSIGNED NOT NULL UNIQUE COMMENT '▲ UNIQUE',
  `reviewed_by_admin` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = Probráno s týmem na rozboru',
  `reviewed_at` TIMESTAMP NULL DEFAULT NULL,
  FOREIGN KEY (`marker_id`) REFERENCES `markers`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `player_marker_views` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `marker_id` BIGINT UNSIGNED NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `viewed_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_user_marker` (`marker_id`, `user_id`),
  FOREIGN KEY (`marker_id`) REFERENCES `markers`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ▲ Login and account-change log (also drives login throttling)
CREATE TABLE `auth_log` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `event` VARCHAR(30) NOT NULL COMMENT 'login_success | login_failed | login_blocked | user_created | user_updated | password_changed | user_deleted',
  `user_id` BIGINT UNSIGNED NULL COMMENT 'account concerned (NULL for unknown e-mails)',
  `email` VARCHAR(150) NULL COMMENT 'e-mail as entered / of the account',
  `actor_id` BIGINT UNSIGNED NULL COMMENT 'coach who made an account change',
  `detail` VARCHAR(255) NULL,
  `ip` VARCHAR(45) NULL,
  `user_agent` VARCHAR(255) NULL,
  `created_at` DATETIME NOT NULL COMMENT 'UTC',
  KEY `idx_auth_log_created` (`created_at`),
  KEY `idx_auth_log_ip` (`ip`, `event`, `created_at`),
  KEY `idx_auth_log_user` (`user_id`, `event`, `created_at`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ▲ Site settings (only values changed from the defaults in code are stored)
CREATE TABLE `settings` (
  `key` VARCHAR(64) NOT NULL PRIMARY KEY COMMENT 'see Mvr\\Settings\\SettingsRegistry',
  `value` JSON NOT NULL,
  `updated_at` DATETIME NOT NULL COMMENT 'UTC',
  `updated_by` BIGINT UNSIGNED NULL,
  FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
