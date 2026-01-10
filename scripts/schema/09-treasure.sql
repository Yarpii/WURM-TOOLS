-- WURM-TOOLS MySQL Schema - Part 9: Treasure Hunting
-- Run: mysql -u root -p wurmtools < 09-treasure.sql
-- Depends on: 01-core.sql, 02-characters.sql, 05-alliances.sql

-- ========== TREASURE HUNTING ==========

-- Main treasure hunts table - tracks player's treasure maps and hunts
CREATE TABLE IF NOT EXISTS treasure_hunts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    character_id INT,
    parent_hunt_id INT, -- For chained maps (map found in another chest)
    name VARCHAR(100) NOT NULL,
    description TEXT,
    server VARCHAR(50) NOT NULL,

    -- Map details
    map_quality INT CHECK (map_quality BETWEEN 1 AND 100),
    difficulty VARCHAR(20) NOT NULL DEFAULT 'easy',

    -- Location (nullable until found)
    x INT,
    y INT,

    -- Hunt status tracking
    status VARCHAR(20) NOT NULL DEFAULT 'new',

    -- Chest details
    chest_type VARCHAR(20),
    requires_key BOOLEAN DEFAULT FALSE,

    -- Sharing options
    is_public BOOLEAN DEFAULT FALSE,
    alliance_id INT,

    -- Screenshot
    screenshot_url VARCHAR(500),

    -- Timestamps
    found_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_treasure_hunts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_treasure_hunts_character FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE SET NULL,
    CONSTRAINT fk_treasure_hunts_alliance FOREIGN KEY (alliance_id) REFERENCES alliances(id) ON DELETE SET NULL,
    CONSTRAINT fk_treasure_hunts_parent FOREIGN KEY (parent_hunt_id) REFERENCES treasure_hunts(id) ON DELETE SET NULL,
    CONSTRAINT chk_treasure_difficulty CHECK (difficulty IN ('easy', 'challenging', 'difficult')),
    CONSTRAINT chk_treasure_status CHECK (status IN ('new', 'reading', 'searching', 'found', 'digging', 'completed', 'abandoned')),
    CONSTRAINT chk_treasure_chest_type CHECK (chest_type IS NULL OR chest_type IN ('open', 'locked', 'high_security'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_treasure_hunts_user ON treasure_hunts(user_id);
CREATE INDEX idx_treasure_hunts_server ON treasure_hunts(server);
CREATE INDEX idx_treasure_hunts_status ON treasure_hunts(status);
CREATE INDEX idx_treasure_hunts_difficulty ON treasure_hunts(difficulty);
CREATE INDEX idx_treasure_hunts_public ON treasure_hunts(is_public);
CREATE INDEX idx_treasure_hunts_coords ON treasure_hunts(x, y);
CREATE INDEX idx_treasure_hunts_parent ON treasure_hunts(parent_hunt_id);

-- Treasure loot tracking - what was found in chests
CREATE TABLE IF NOT EXISTS treasure_loot (
    id INT AUTO_INCREMENT PRIMARY KEY,
    treasure_hunt_id INT NOT NULL,
    item_name VARCHAR(100) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    quality INT CHECK (quality IS NULL OR quality BETWEEN 1 AND 100),
    rarity VARCHAR(20),
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_treasure_loot_hunt FOREIGN KEY (treasure_hunt_id) REFERENCES treasure_hunts(id) ON DELETE CASCADE,
    CONSTRAINT chk_treasure_loot_rarity CHECK (rarity IS NULL OR rarity IN ('rare', 'supreme', 'fantastic'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_treasure_loot_hunt ON treasure_loot(treasure_hunt_id);
CREATE INDEX idx_treasure_loot_item ON treasure_loot(item_name);

-- Shared treasure locations from community
CREATE TABLE IF NOT EXISTS shared_treasures (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    server VARCHAR(50) NOT NULL,
    x INT NOT NULL,
    y INT NOT NULL,
    treasure_type VARCHAR(30) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    is_verified BOOLEAN DEFAULT FALSE,
    verified_by INT,
    verified_at TIMESTAMP NULL,
    upvotes INT DEFAULT 0,
    downvotes INT DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_shared_treasures_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_shared_treasures_verified FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT chk_shared_treasure_type CHECK (treasure_type IN ('treasure_chest', 'rare_spawn', 'unique_item', 'hidden_cache', 'archaeology', 'other')),
    CONSTRAINT chk_shared_treasure_status CHECK (status IN ('active', 'claimed', 'expired', 'invalid'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_shared_treasures_server ON shared_treasures(server);
CREATE INDEX idx_shared_treasures_type ON shared_treasures(treasure_type);
CREATE INDEX idx_shared_treasures_status ON shared_treasures(status);
CREATE INDEX idx_shared_treasures_coords ON shared_treasures(x, y);
CREATE INDEX idx_shared_treasures_verified ON shared_treasures(is_verified);

-- Votes on shared treasures
CREATE TABLE IF NOT EXISTS shared_treasure_votes (
    user_id INT NOT NULL,
    treasure_id INT NOT NULL,
    vote_type VARCHAR(10) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (user_id, treasure_id),
    CONSTRAINT fk_treasure_votes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_treasure_votes_treasure FOREIGN KEY (treasure_id) REFERENCES shared_treasures(id) ON DELETE CASCADE,
    CONSTRAINT chk_treasure_vote_type CHECK (vote_type IN ('up', 'down'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Private treasure hunt shares (sharing with specific users/friends)
CREATE TABLE IF NOT EXISTS treasure_hunt_shares (
    id INT AUTO_INCREMENT PRIMARY KEY,
    treasure_hunt_id INT NOT NULL,
    shared_by_user_id INT NOT NULL,
    shared_with_user_id INT NOT NULL,
    message TEXT,
    can_edit BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_hunt_shares_hunt FOREIGN KEY (treasure_hunt_id) REFERENCES treasure_hunts(id) ON DELETE CASCADE,
    CONSTRAINT fk_hunt_shares_by FOREIGN KEY (shared_by_user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_hunt_shares_with FOREIGN KEY (shared_with_user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uk_hunt_share (treasure_hunt_id, shared_with_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_hunt_shares_hunt ON treasure_hunt_shares(treasure_hunt_id);
CREATE INDEX idx_hunt_shares_by ON treasure_hunt_shares(shared_by_user_id);
CREATE INDEX idx_hunt_shares_with ON treasure_hunt_shares(shared_with_user_id);
