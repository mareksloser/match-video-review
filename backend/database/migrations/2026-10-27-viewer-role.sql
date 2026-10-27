-- Adds the read-only "viewer" role (sees every team's matches and markers, cannot change anything).
-- Run once on existing databases; schema.sql already contains it for new installs.
ALTER TABLE users MODIFY `role` ENUM('admin', 'player', 'viewer') NOT NULL DEFAULT 'player';
