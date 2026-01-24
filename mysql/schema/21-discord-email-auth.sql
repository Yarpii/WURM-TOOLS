-- WURM-TOOLS MySQL Schema - Part 21: Discord Integration & Email 2FA
-- Run: mysql -u root -p wurmtools < 21-discord-email-auth.sql
-- Depends on: 01-core.sql

-- ========== DISCORD ACCOUNT LINKING ==========
-- Verification codes for linking Discord accounts to WURM-TOOLS accounts

CREATE TABLE IF NOT EXISTS discord_link_codes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    verification_code VARCHAR(8) NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    used_at TIMESTAMP NULL,

    CONSTRAINT fk_discord_link_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_discord_link_code ON discord_link_codes(verification_code);
CREATE INDEX idx_discord_link_expires ON discord_link_codes(expires_at);
CREATE INDEX idx_discord_link_user ON discord_link_codes(user_id);

-- ========== EMAIL VERIFICATION & 2FA ==========
-- Used for: email verification, 2FA login codes, password reset codes

CREATE TABLE IF NOT EXISTS email_verification_codes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    email VARCHAR(255) NOT NULL,
    code VARCHAR(6) NOT NULL,
    code_type ENUM('email_verify', '2fa_login', 'password_reset') NOT NULL,
    expires_at DATETIME NOT NULL,
    used_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_email_codes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_email_codes_user ON email_verification_codes(user_id);
CREATE INDEX idx_email_codes_code ON email_verification_codes(code);
CREATE INDEX idx_email_codes_expires ON email_verification_codes(expires_at);

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
    expires_at DATETIME NOT NULL,
    remember_me BOOLEAN NOT NULL DEFAULT FALSE,
    ip_address VARCHAR(45) NULL,
    user_agent VARCHAR(500) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_pending_2fa_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_pending_2fa_token ON pending_2fa_sessions(session_token);
CREATE INDEX idx_pending_2fa_expires ON pending_2fa_sessions(expires_at);
CREATE INDEX idx_pending_2fa_user ON pending_2fa_sessions(user_id);
