-- Migration: Add Email 2FA and Verification System
-- Run: mysql -u root -p wurmtools < scripts/migrations/add-email-2fa.sql

-- ========== EMAIL VERIFICATION CODES ==========
-- Used for: email verification, 2FA login codes, password reset

CREATE TABLE IF NOT EXISTS email_verification_codes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    email VARCHAR(255) NOT NULL,
    code VARCHAR(6) NOT NULL,
    code_type ENUM('email_verify', '2fa_login', 'password_reset') NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_email_codes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_email_codes_user (user_id),
    INDEX idx_email_codes_code (code),
    INDEX idx_email_codes_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========== UPDATE USERS TABLE ==========
-- Add 2FA settings columns if they don't exist

-- Check if email_verified column exists, if not add it
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'email_verified');
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE users ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT FALSE AFTER email',
    'SELECT "email_verified column already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check if two_factor_enabled column exists, if not add it
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'two_factor_enabled');
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE users ADD COLUMN two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE AFTER email_verified',
    'SELECT "two_factor_enabled column already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ========== EMAIL ALERT PREFERENCES ==========

CREATE TABLE IF NOT EXISTS email_alert_preferences (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,

    -- Alert types
    alert_treasure_shared BOOLEAN NOT NULL DEFAULT TRUE,
    alert_hunt_completed BOOLEAN NOT NULL DEFAULT FALSE,
    alert_price_alert BOOLEAN NOT NULL DEFAULT TRUE,
    alert_security BOOLEAN NOT NULL DEFAULT TRUE,
    alert_newsletter BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_alert_prefs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========== PENDING 2FA SESSIONS ==========
-- Temporary storage for sessions awaiting 2FA verification

CREATE TABLE IF NOT EXISTS pending_2fa_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    session_token VARCHAR(64) NOT NULL UNIQUE,
    code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    remember_me BOOLEAN NOT NULL DEFAULT FALSE,
    ip_address VARCHAR(45) NULL,
    user_agent VARCHAR(500) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_pending_2fa_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_pending_2fa_token (session_token),
    INDEX idx_pending_2fa_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add columns to existing table if they don't exist
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pending_2fa_sessions' AND COLUMN_NAME = 'remember_me');
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE pending_2fa_sessions ADD COLUMN remember_me BOOLEAN NOT NULL DEFAULT FALSE AFTER expires_at',
    'SELECT "remember_me column already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pending_2fa_sessions' AND COLUMN_NAME = 'ip_address');
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE pending_2fa_sessions ADD COLUMN ip_address VARCHAR(45) NULL AFTER remember_me',
    'SELECT "ip_address column already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pending_2fa_sessions' AND COLUMN_NAME = 'user_agent');
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE pending_2fa_sessions ADD COLUMN user_agent VARCHAR(500) NULL AFTER ip_address',
    'SELECT "user_agent column already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ========== CLEANUP OLD CODES (Event) ==========
-- Auto-cleanup expired verification codes every hour

DELIMITER //

CREATE EVENT IF NOT EXISTS cleanup_expired_verification_codes
ON SCHEDULE EVERY 1 HOUR
DO
BEGIN
    -- Delete expired verification codes
    DELETE FROM email_verification_codes WHERE expires_at < NOW();

    -- Delete expired pending 2FA sessions
    DELETE FROM pending_2fa_sessions WHERE expires_at < NOW();
END //

DELIMITER ;

-- Enable event scheduler if not already enabled
SET GLOBAL event_scheduler = ON;
