-- Migration: Add Character Showcase System
-- Run this on existing databases to add character support

-- ========== CHARACTER SHOWCASE TABLE ==========

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

CREATE INDEX IF NOT EXISTS idx_characters_user ON characters(user_id);
CREATE INDEX IF NOT EXISTS idx_characters_server ON characters(server);
CREATE INDEX IF NOT EXISTS idx_characters_primary ON characters(is_primary);

-- ========== ADD character_id TO EXISTING TABLES ==========

-- Add character_id to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS character_id INT;
ALTER TABLE orders ADD CONSTRAINT fk_orders_character FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE SET NULL;

-- Add character_id to merchants table
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS character_id INT;
ALTER TABLE merchants ADD CONSTRAINT fk_merchants_character FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE SET NULL;

-- Add character_id to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS character_id INT;
ALTER TABLE projects ADD CONSTRAINT fk_projects_character FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE SET NULL;

-- Add character_id to user_skills table (need to drop old unique key first)
ALTER TABLE user_skills ADD COLUMN IF NOT EXISTS character_id INT;
ALTER TABLE user_skills ADD CONSTRAINT fk_user_skills_character FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE SET NULL;

-- Note: If you have the old unique key, you may need to run:
-- ALTER TABLE user_skills DROP INDEX uk_user_skill;
-- ALTER TABLE user_skills ADD UNIQUE KEY uk_user_skill_char (user_id, character_id, skill_name);

SELECT 'Migration completed: Character Showcase system added' AS status;
