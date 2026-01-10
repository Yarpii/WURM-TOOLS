-- WURM-TOOLS MySQL Schema - Part 2: Characters
-- Run: mysql -u root -p wurmtools < 02-characters.sql
-- Depends on: 01-core.sql

-- ========== CHARACTER SHOWCASE ==========

CREATE TABLE IF NOT EXISTS characters (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    server VARCHAR(50),
    religion VARCHAR(50),
    avatar_url VARCHAR(500),
    premium_until DATE,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    bio TEXT,
    deed_name VARCHAR(100),
    playstyle VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_characters_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT chk_characters_religion CHECK (religion IS NULL OR religion IN ('Fo', 'Vynora', 'Magranon', 'Libila', 'None')),
    CONSTRAINT chk_characters_playstyle CHECK (playstyle IS NULL OR playstyle IN ('pve', 'pvp', 'both', 'casual', 'hardcore'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_characters_user ON characters(user_id);
CREATE INDEX idx_characters_server ON characters(server);
CREATE INDEX idx_characters_primary ON characters(is_primary);
