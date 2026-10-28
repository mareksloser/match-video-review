-- Login log + account changes. Run once on existing databases.
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
