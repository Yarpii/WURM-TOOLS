-- WURM-TOOLS MySQL Schema - Part 1: Core (Users & Sessions)
-- Run: mysql -u root -p wurmtools < 01-core.sql

SET default_storage_engine=InnoDB;
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- ========== USERS & AUTHENTICATION ==========

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    password_hash VARCHAR(255) NOT NULL,
    salt VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    display_name VARCHAR(100),
    bio TEXT,
    avatar_url VARCHAR(500),
    discord_id VARCHAR(20) UNIQUE,
    banner_url VARCHAR(500),
    location VARCHAR(100),
    wurm_server VARCHAR(50),
    show_in_members_list BOOLEAN DEFAULT TRUE,
    show_email BOOLEAN DEFAULT FALSE,
    show_location BOOLEAN DEFAULT TRUE,
    is_banned BOOLEAN DEFAULT FALSE,
    ban_reason TEXT,
    banned_at TIMESTAMP NULL,
    banned_by INT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_users_banned_by FOREIGN KEY (banned_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT chk_users_role CHECK (role IN ('admin', 'user'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_users_discord ON users(discord_id);

CREATE TABLE IF NOT EXISTS sessions (
    id VARCHAR(255) PRIMARY KEY,
    user_id INT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    device_name VARCHAR(100) NULL,
    last_active_at TIMESTAMP NULL,
    is_current BOOLEAN DEFAULT FALSE,
    remember_me BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);
CREATE INDEX idx_sessions_last_active ON sessions(last_active_at);

-- ========== PASSWORD RESET TOKENS ==========

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_password_reset_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_password_reset_token ON password_reset_tokens(token);
CREATE INDEX idx_password_reset_expires ON password_reset_tokens(expires_at);
CREATE INDEX idx_password_reset_user ON password_reset_tokens(user_id);

-- ========== LOGIN ATTEMPTS (Rate Limiting & Lockout) ==========

CREATE TABLE IF NOT EXISTS login_attempts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    identifier VARCHAR(255) NOT NULL,  -- email, username, or IP
    identifier_type ENUM('email', 'username', 'ip') NOT NULL,
    success BOOLEAN NOT NULL DEFAULT FALSE,
    ip_address VARCHAR(45),  -- IPv6 compatible
    user_agent TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_login_attempts_identifier ON login_attempts(identifier, identifier_type);
CREATE INDEX idx_login_attempts_created ON login_attempts(created_at);
CREATE INDEX idx_login_attempts_ip ON login_attempts(ip_address);

-- ========== ACCOUNT LOCKOUT TRACKING ==========

CREATE TABLE IF NOT EXISTS account_lockouts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    locked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    locked_until TIMESTAMP NOT NULL,
    failed_attempts INT NOT NULL DEFAULT 0,
    reason VARCHAR(255),

    CONSTRAINT fk_account_lockout_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========== FORGOT PASSWORD RATE LIMITING ==========

CREATE TABLE IF NOT EXISTS forgot_password_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_forgot_password_email ON forgot_password_requests(email);
CREATE INDEX idx_forgot_password_ip ON forgot_password_requests(ip_address);
CREATE INDEX idx_forgot_password_created ON forgot_password_requests(created_at);

-- ========== SECURITY NOTIFICATIONS ==========

CREATE TABLE IF NOT EXISTS security_notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    notification_type ENUM('new_login', 'password_changed', 'password_reset_requested', 'account_locked') NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    details JSON,
    sent_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_security_notification_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_security_notifications_user ON security_notifications(user_id);
CREATE INDEX idx_security_notifications_type ON security_notifications(notification_type);
