-- WURM-TOOLS MySQL Schema - Part 10: Gamification (XP & Achievements)
-- Run: mysql -u root -p wurmtools < 10-gamification.sql
-- Depends on: 01-core.sql

-- ========== GAMIFICATION ==========

CREATE TABLE IF NOT EXISTS user_xp (
    user_id INT PRIMARY KEY,
    total_xp INT NOT NULL DEFAULT 0,

    CONSTRAINT fk_user_xp_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS achievements (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    category ENUM('trading', 'crafting', 'community', 'exploration', 'special') NOT NULL,
    icon VARCHAR(50) NOT NULL DEFAULT 'trophy',
    xp_reward INT NOT NULL DEFAULT 0,
    requirement_type VARCHAR(50) NOT NULL,
    requirement_value INT NOT NULL DEFAULT 1,
    is_hidden BOOLEAN NOT NULL DEFAULT FALSE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_achievements_category ON achievements(category);

CREATE TABLE IF NOT EXISTS user_achievements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    achievement_id VARCHAR(50) NOT NULL,
    progress INT NOT NULL DEFAULT 0,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_user_achievements_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uk_user_achievement (user_id, achievement_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX idx_user_achievements_completed ON user_achievements(completed);
