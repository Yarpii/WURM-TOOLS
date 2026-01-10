-- Migration: Add Discord integration support
-- Run: mysql -u root -p wurmtools < add-discord-id.sql

-- Add discord_id column to users table for Discord account linking
ALTER TABLE users
ADD COLUMN discord_id VARCHAR(20) UNIQUE AFTER avatar_url;

-- Add index for faster Discord ID lookups
CREATE INDEX idx_users_discord ON users(discord_id);

-- Add notify_timers column to webhooks if it doesn't exist
-- This allows timer notifications to be sent via webhooks
ALTER TABLE discord_webhooks
ADD COLUMN notify_timers BOOLEAN DEFAULT FALSE AFTER notify_alliance;

-- Add notified_at column to track when timer notifications were sent
ALTER TABLE user_timers
ADD COLUMN notified_at TIMESTAMP NULL AFTER is_active;

-- Create table for Discord account linking verification codes
CREATE TABLE IF NOT EXISTS discord_link_codes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    verification_code VARCHAR(8) NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP NULL,

    CONSTRAINT fk_discord_link_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_discord_link_code (verification_code),
    INDEX idx_discord_link_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
