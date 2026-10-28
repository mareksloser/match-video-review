-- Site settings. Run once on existing databases.
CREATE TABLE `settings` (
  `key` VARCHAR(64) NOT NULL PRIMARY KEY COMMENT 'see Mvr\\Settings\\SettingsRegistry',
  `value` JSON NOT NULL,
  `updated_at` DATETIME NOT NULL COMMENT 'UTC',
  `updated_by` BIGINT UNSIGNED NULL,
  FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
