-- WURM-TOOLS MySQL/MariaDB Schema
-- Volledige database schema voor MySQL/MariaDB
-- Draai dit om de database te initialiseren op je VPS

-- Gebruik InnoDB voor foreign key support en transactions
SET default_storage_engine=InnoDB;
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- ========== USERS & AUTHENTICATION ==========

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    salt VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    display_name VARCHAR(100),
    bio TEXT,
    avatar_url VARCHAR(500),
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

CREATE TABLE IF NOT EXISTS sessions (
    id VARCHAR(255) PRIMARY KEY,
    user_id INT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

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

-- ========== CRAFTING SYSTEM ==========

CREATE TABLE IF NOT EXISTS items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(50) DEFAULT 'misc',
    is_base_material BOOLEAN DEFAULT FALSE,
    description TEXT,
    difficulty INT,
    skill_type VARCHAR(50),
    base_time INT,
    tool_type VARCHAR(50)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS recipes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    result_item_id INT NOT NULL,
    ingredient_item_id INT NOT NULL,
    quantity DECIMAL(10, 4) NOT NULL DEFAULT 1,

    CONSTRAINT fk_recipes_result FOREIGN KEY (result_item_id) REFERENCES items(id) ON DELETE CASCADE,
    CONSTRAINT fk_recipes_ingredient FOREIGN KEY (ingredient_item_id) REFERENCES items(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_recipes_result ON recipes(result_item_id);
CREATE INDEX idx_recipes_ingredient ON recipes(ingredient_item_id);

-- ========== MARKET SYSTEM ==========

CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    character_id INT,
    order_type VARCHAR(10) NOT NULL,
    item_name VARCHAR(100) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    quality INT,
    price DECIMAL(15, 4),
    currency VARCHAR(20) DEFAULT 'silver',
    trade_for TEXT,
    location VARCHAR(200),
    notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,

    CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_orders_character FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE SET NULL,
    CONSTRAINT chk_orders_type CHECK (order_type IN ('buy', 'sell', 'trade')),
    CONSTRAINT chk_orders_status CHECK (status IN ('active', 'completed', 'cancelled', 'expired'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_type ON orders(order_type);
CREATE INDEX idx_orders_item ON orders(item_name);

-- ========== MERCHANTS ==========

CREATE TABLE IF NOT EXISTS merchants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    character_id INT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    location VARCHAR(200) NOT NULL,
    server VARCHAR(50) NOT NULL,
    coordinates VARCHAR(50),
    category VARCHAR(50) NOT NULL DEFAULT 'misc',
    stock_list TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_merchants_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_merchants_character FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_merchants_user ON merchants(user_id);
CREATE INDEX idx_merchants_active ON merchants(is_active);
CREATE INDEX idx_merchants_category ON merchants(category);
CREATE INDEX idx_merchants_server ON merchants(server);

-- ========== ALLIANCES ==========

CREATE TABLE IF NOT EXISTS alliances (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    tag VARCHAR(10),
    leader_id INT NOT NULL,
    is_public BOOLEAN DEFAULT TRUE,
    max_members INT DEFAULT 50,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_alliances_leader FOREIGN KEY (leader_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS alliance_members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    alliance_id INT NOT NULL,
    user_id INT NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'member',
    joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    invited_by INT,

    CONSTRAINT fk_alliance_members_alliance FOREIGN KEY (alliance_id) REFERENCES alliances(id) ON DELETE CASCADE,
    CONSTRAINT fk_alliance_members_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_alliance_members_invited FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT chk_alliance_members_role CHECK (role IN ('leader', 'officer', 'member')),
    UNIQUE KEY uk_alliance_user (alliance_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS alliance_invites (
    id INT AUTO_INCREMENT PRIMARY KEY,
    alliance_id INT NOT NULL,
    user_id INT NOT NULL,
    invited_by INT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,

    CONSTRAINT fk_alliance_invites_alliance FOREIGN KEY (alliance_id) REFERENCES alliances(id) ON DELETE CASCADE,
    CONSTRAINT fk_alliance_invites_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_alliance_invites_invited_by FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT chk_alliance_invites_status CHECK (status IN ('pending', 'accepted', 'declined', 'expired'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_alliances_leader ON alliances(leader_id);
CREATE INDEX idx_alliance_members_alliance ON alliance_members(alliance_id);
CREATE INDEX idx_alliance_members_user ON alliance_members(user_id);
CREATE INDEX idx_alliance_invites_alliance ON alliance_invites(alliance_id);
CREATE INDEX idx_alliance_invites_user ON alliance_invites(user_id);
CREATE INDEX idx_alliance_invites_status ON alliance_invites(status);

-- ========== PRICE TRACKING ==========

CREATE TABLE IF NOT EXISTS price_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    item_name VARCHAR(100) NOT NULL,
    price DECIMAL(15, 4) NOT NULL,
    quality INT DEFAULT 50,
    order_type VARCHAR(10) NOT NULL,
    currency VARCHAR(20) DEFAULT 'silver',
    server VARCHAR(50),
    user_id INT,
    recorded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_price_history_type CHECK (order_type IN ('buy', 'sell')),
    CONSTRAINT fk_price_history_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS price_alerts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    item_name VARCHAR(100) NOT NULL,
    target_price DECIMAL(15, 4) NOT NULL,
    `condition` VARCHAR(10) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    triggered_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_price_alerts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT chk_price_alerts_condition CHECK (`condition` IN ('above', 'below'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_price_history_item ON price_history(item_name);
CREATE INDEX idx_price_history_date ON price_history(recorded_at);
CREATE INDEX idx_price_history_server ON price_history(server);
CREATE INDEX idx_price_alerts_user ON price_alerts(user_id);
CREATE INDEX idx_price_alerts_item ON price_alerts(item_name);

-- ========== PROJECTS ==========

CREATE TABLE IF NOT EXISTS projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    character_id INT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'planning',
    is_shared BOOLEAN DEFAULT FALSE,
    alliance_id INT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_projects_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_projects_character FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE SET NULL,
    CONSTRAINT fk_projects_alliance FOREIGN KEY (alliance_id) REFERENCES alliances(id) ON DELETE SET NULL,
    CONSTRAINT chk_projects_status CHECK (status IN ('planning', 'in_progress', 'completed', 'archived'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS project_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    item_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    completed_quantity INT DEFAULT 0,
    notes TEXT,
    priority INT DEFAULT 0,

    CONSTRAINT fk_project_items_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    CONSTRAINT fk_project_items_item FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_projects_user ON projects(user_id);
CREATE INDEX idx_projects_alliance ON projects(alliance_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_project_items_project ON project_items(project_id);

-- ========== TRADE MATCHING ==========

CREATE TABLE IF NOT EXISTS trade_matches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    buy_order_id INT NOT NULL,
    sell_order_id INT NOT NULL,
    buyer_id INT NOT NULL,
    seller_id INT NOT NULL,
    item_name VARCHAR(100) NOT NULL,
    quantity INT NOT NULL,
    buy_price DECIMAL(15, 4),
    sell_price DECIMAL(15, 4),
    match_score INT NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    contacted_at TIMESTAMP NULL,

    CONSTRAINT fk_trade_matches_buy FOREIGN KEY (buy_order_id) REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_trade_matches_sell FOREIGN KEY (sell_order_id) REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_trade_matches_buyer FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_trade_matches_seller FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT chk_trade_matches_status CHECK (status IN ('pending', 'contacted', 'completed', 'declined', 'expired'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_ratings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rater_id INT NOT NULL,
    rated_user_id INT NOT NULL,
    rating INT NOT NULL,
    comment TEXT,
    trade_match_id INT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_user_ratings_rater FOREIGN KEY (rater_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_ratings_rated FOREIGN KEY (rated_user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_ratings_trade FOREIGN KEY (trade_match_id) REFERENCES trade_matches(id) ON DELETE SET NULL,
    CONSTRAINT chk_user_ratings_rating CHECK (rating >= 1 AND rating <= 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_trade_matches_buyer ON trade_matches(buyer_id);
CREATE INDEX idx_trade_matches_seller ON trade_matches(seller_id);
CREATE INDEX idx_trade_matches_status ON trade_matches(status);
CREATE INDEX idx_trade_matches_item ON trade_matches(item_name);
CREATE INDEX idx_user_ratings_rater ON user_ratings(rater_id);
CREATE INDEX idx_user_ratings_rated ON user_ratings(rated_user_id);

-- ========== MAP LOCATIONS ==========

CREATE TABLE IF NOT EXISTS map_locations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    location_type VARCHAR(20) NOT NULL,
    server VARCHAR(50) NOT NULL,
    x INT NOT NULL,
    y INT NOT NULL,
    is_public BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    alliance_id INT,
    merchant_id INT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_map_locations_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_map_locations_alliance FOREIGN KEY (alliance_id) REFERENCES alliances(id) ON DELETE SET NULL,
    CONSTRAINT fk_map_locations_merchant FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE SET NULL,
    CONSTRAINT chk_map_locations_type CHECK (location_type IN ('deed', 'merchant', 'landmark', 'resource', 'spawn', 'other'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_map_locations_server ON map_locations(server);
CREATE INDEX idx_map_locations_type ON map_locations(location_type);
CREATE INDEX idx_map_locations_user ON map_locations(user_id);
CREATE INDEX idx_map_locations_coords ON map_locations(x, y);

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
    icon VARCHAR(50) NOT NULL DEFAULT '🏆',
    xp_reward INT NOT NULL DEFAULT 0,
    requirement_type VARCHAR(50) NOT NULL,
    requirement_value INT NOT NULL DEFAULT 1,
    is_hidden BOOLEAN NOT NULL DEFAULT FALSE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_achievements_category ON achievements(category);

-- Default achievements
INSERT IGNORE INTO achievements (id, name, description, category, icon, xp_reward, requirement_type, requirement_value, is_hidden) VALUES
('first_trade', 'First Trade', 'Complete your first trade', 'trading', '🤝', 100, 'trades_completed', 1, FALSE),
('trader_10', 'Active Trader', 'Complete 10 trades', 'trading', '📦', 250, 'trades_completed', 10, FALSE),
('trader_50', 'Master Trader', 'Complete 50 trades', 'trading', '💰', 500, 'trades_completed', 50, FALSE),
('first_order', 'Market Debut', 'Create your first market order', 'trading', '📝', 50, 'orders_created', 1, FALSE),
('crafter_items', 'Crafter', 'Add 10 items to your crafting projects', 'crafting', '🔨', 150, 'items_crafted', 10, FALSE),
('community_member', 'Community Member', 'Join your first alliance', 'community', '👥', 200, 'alliances_joined', 1, FALSE),
('explorer', 'Explorer', 'Add 5 map locations', 'exploration', '🗺️', 150, 'locations_added', 5, FALSE),
('merchant_owner', 'Merchant Owner', 'Register your first merchant', 'trading', '🏪', 100, 'merchants_created', 1, FALSE),
('helpful', 'Helpful', 'Receive 5 positive ratings', 'community', '⭐', 300, 'positive_ratings', 5, FALSE),
('veteran', 'Veteran', 'Be a member for 30 days', 'special', '🎖️', 500, 'days_member', 30, TRUE);

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

-- ========== DISCORD WEBHOOKS ==========

CREATE TABLE IF NOT EXISTS discord_webhooks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    webhook_url VARCHAR(500) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    notify_trades BOOLEAN DEFAULT TRUE,
    notify_matches BOOLEAN DEFAULT TRUE,
    notify_price_alerts BOOLEAN DEFAULT TRUE,
    notify_alliance BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_discord_webhooks_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_discord_webhooks_user ON discord_webhooks(user_id);
CREATE INDEX idx_discord_webhooks_active ON discord_webhooks(is_active);

-- ========== PROSPECT MANAGEMENT ==========

CREATE TABLE IF NOT EXISTS prospect_pages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(20) DEFAULT '#3b82f6',
    icon VARCHAR(50) DEFAULT 'folder',
    is_default BOOLEAN DEFAULT FALSE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_prospect_pages_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS prospects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    page_id INT NOT NULL,
    user_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    character_name VARCHAR(100),
    server VARCHAR(50),
    location VARCHAR(200),
    status VARCHAR(20) NOT NULL DEFAULT 'potential',
    priority VARCHAR(10) NOT NULL DEFAULT 'medium',
    quality_rating INT DEFAULT 3,
    skills TEXT,
    notes TEXT,
    contact_info TEXT,
    last_contact TIMESTAMP NULL,
    source VARCHAR(100),
    tags TEXT,
    custom_fields TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_prospects_page FOREIGN KEY (page_id) REFERENCES prospect_pages(id) ON DELETE CASCADE,
    CONSTRAINT fk_prospects_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT chk_prospects_status CHECK (status IN ('potential', 'contacted', 'interested', 'recruited', 'declined', 'inactive')),
    CONSTRAINT chk_prospects_priority CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    CONSTRAINT chk_prospects_quality CHECK (quality_rating >= 1 AND quality_rating <= 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_prospect_pages_user ON prospect_pages(user_id);
CREATE INDEX idx_prospect_pages_sort ON prospect_pages(sort_order);
CREATE INDEX idx_prospects_page ON prospects(page_id);
CREATE INDEX idx_prospects_user ON prospects(user_id);
CREATE INDEX idx_prospects_status ON prospects(status);
CREATE INDEX idx_prospects_priority ON prospects(priority);
CREATE INDEX idx_prospects_quality ON prospects(quality_rating);

-- ========== PLAYER HUB: SKILL TRACKING ==========

CREATE TABLE IF NOT EXISTS user_skills (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    character_id INT,
    skill_name VARCHAR(100) NOT NULL,
    current_level DECIMAL(10, 4) NOT NULL DEFAULT 1.0,
    target_level DECIMAL(10, 4),
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_user_skills_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_skills_character FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE SET NULL,
    UNIQUE KEY uk_user_skill_char (user_id, character_id, skill_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_user_skills_user ON user_skills(user_id);
CREATE INDEX idx_user_skills_name ON user_skills(skill_name);

CREATE TABLE IF NOT EXISTS skill_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_skill_id INT NOT NULL,
    old_level DECIMAL(10, 4) NOT NULL,
    new_level DECIMAL(10, 4) NOT NULL,
    recorded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_skill_history_skill FOREIGN KEY (user_skill_id) REFERENCES user_skills(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_skill_history_skill ON skill_history(user_skill_id);
CREATE INDEX idx_skill_history_date ON skill_history(recorded_at);

-- ========== PLAYER HUB: TIMERS ==========

CREATE TABLE IF NOT EXISTS user_timers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    timer_type VARCHAR(30) NOT NULL,
    duration_minutes INT NOT NULL,
    start_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP NOT NULL,
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_interval INT,
    notify_discord BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    color VARCHAR(20) DEFAULT '#3b82f6',
    icon VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_user_timers_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT chk_user_timers_type CHECK (timer_type IN (
        'sleep_bonus', 'fatigue', 'crop', 'animal', 'sermon',
        'meditation', 'custom', 'cooldown', 'bulk'
    ))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_user_timers_user ON user_timers(user_id);
CREATE INDEX idx_user_timers_type ON user_timers(timer_type);
CREATE INDEX idx_user_timers_end ON user_timers(end_time);
CREATE INDEX idx_user_timers_active ON user_timers(is_active);

CREATE TABLE IF NOT EXISTS timer_presets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    name VARCHAR(100) NOT NULL,
    timer_type VARCHAR(30) NOT NULL,
    duration_minutes INT NOT NULL,
    description TEXT,
    color VARCHAR(20) DEFAULT '#3b82f6',
    icon VARCHAR(50),
    is_public BOOLEAN DEFAULT FALSE,

    CONSTRAINT fk_timer_presets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_timer_presets_user ON timer_presets(user_id);
CREATE INDEX idx_timer_presets_type ON timer_presets(timer_type);

-- ========== PLAYER HUB: EVENTS / CALENDAR ==========

CREATE TABLE IF NOT EXISTS events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    event_type VARCHAR(30) NOT NULL,
    server VARCHAR(50),
    location VARCHAR(200),
    coordinates VARCHAR(50),
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NULL,
    is_all_day BOOLEAN DEFAULT FALSE,
    is_public BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    max_attendees INT,
    contact_info TEXT,
    external_link VARCHAR(500),
    image_url VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_events_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT chk_events_type CHECK (event_type IN (
        'impalong', 'rift', 'unique', 'sermon_group', 'market',
        'pvp', 'community', 'personal', 'other'
    ))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_events_user ON events(user_id);
CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_server ON events(server);
CREATE INDEX idx_events_start ON events(start_date);
CREATE INDEX idx_events_public ON events(is_public);
CREATE INDEX idx_events_featured ON events(is_featured);

CREATE TABLE IF NOT EXISTS event_attendees (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    user_id INT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'interested',
    character_name VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_event_attendees_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    CONSTRAINT fk_event_attendees_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT chk_event_attendees_status CHECK (status IN ('interested', 'going', 'maybe', 'not_going')),
    UNIQUE KEY uk_event_attendee (event_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_event_attendees_event ON event_attendees(event_id);
CREATE INDEX idx_event_attendees_user ON event_attendees(user_id);
CREATE INDEX idx_event_attendees_status ON event_attendees(status);

-- ========== WURM SKILL REFERENCE ==========

CREATE TABLE IF NOT EXISTS wurm_skills (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(50) NOT NULL,
    parent_skill VARCHAR(100),
    max_level DECIMAL(5, 2) DEFAULT 100.00,
    description TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_wurm_skills_category ON wurm_skills(category);
CREATE INDEX idx_wurm_skills_parent ON wurm_skills(parent_skill);

-- ========== RECIPE SUBMISSIONS ==========

CREATE TABLE IF NOT EXISTS recipe_submissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    item_name VARCHAR(100) NOT NULL,
    ingredients TEXT NOT NULL,
    source_url VARCHAR(500),
    notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    admin_notes TEXT,
    reviewed_by INT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP NULL,

    CONSTRAINT fk_recipe_submissions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_recipe_submissions_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT chk_recipe_submissions_status CHECK (status IN ('pending', 'approved', 'rejected'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_recipe_submissions_user ON recipe_submissions(user_id);
CREATE INDEX idx_recipe_submissions_status ON recipe_submissions(status);
CREATE INDEX idx_recipe_submissions_created ON recipe_submissions(created_at);

-- ========== SEED DATA: BASE MATERIALS ==========

INSERT IGNORE INTO items (name, category, is_base_material, description) VALUES
    ('Log', 'wood', TRUE, 'Harvested from trees'),
    ('Iron Ore', 'ore', TRUE, 'Mined from rock'),
    ('Clay', 'material', TRUE, 'Dug from clay tiles'),
    ('Cotton', 'material', TRUE, 'Harvested from cotton plants'),
    ('Water', 'material', TRUE, 'Collected from wells or tiles'),
    ('Rock Shards', 'material', TRUE, 'Mined from rock'),
    ('Pelt', 'material', TRUE, 'From killed animals'),
    ('Leather', 'material', TRUE, 'Processed from hides');

-- ========== SEED DATA: CRAFTED ITEMS ==========

INSERT IGNORE INTO items (name, category, is_base_material, description) VALUES
    ('Plank', 'wood', FALSE, 'Sawn from logs'),
    ('Shaft', 'wood', FALSE, 'Carved from logs'),
    ('Small Nail', 'metal', FALSE, 'Made from iron lumps'),
    ('Large Nail', 'metal', FALSE, 'Made from iron lumps'),
    ('Iron Lump', 'metal', FALSE, 'Smelted from iron ore'),
    ('Wheel', 'vehicle', FALSE, 'Used in carts and wagons'),
    ('Wheel Axle', 'vehicle', FALSE, 'Connects wheels'),
    ('Cart', 'vehicle', FALSE, 'Small transport vehicle'),
    ('Large Cart', 'vehicle', FALSE, 'Larger transport vehicle'),
    ('Rope', 'material', FALSE, 'Made from cotton'),
    ('Brick', 'building', FALSE, 'Made from clay'),
    ('Mortar', 'building', FALSE, 'Made from clay and sand'),
    ('Mallet', 'tool', FALSE, 'Wooden hammer'),
    ('Hammer', 'tool', FALSE, 'Metal hammer'),
    ('Saw', 'tool', FALSE, 'For cutting planks'),
    ('Spindle', 'tool', FALSE, 'For making rope');

-- ========== SEED DATA: RECIPES ==========
-- Note: We'll insert recipes in a separate query after items exist

-- ========== SEED DATA: TIMER PRESETS ==========

INSERT IGNORE INTO timer_presets (user_id, name, timer_type, duration_minutes, description, color, icon, is_public) VALUES
    (NULL, 'Sleep Bonus (5h)', 'sleep_bonus', 300, 'Standard sleep bonus duration', '#22c55e', 'moon', TRUE),
    (NULL, 'Fatigue Reset', 'fatigue', 1440, 'Daily fatigue reset (24h)', '#3b82f6', 'battery', TRUE),
    (NULL, 'Wheat Growth', 'crop', 1440, 'Wheat crop growth cycle', '#eab308', 'wheat', TRUE),
    (NULL, 'Corn Growth', 'crop', 2160, 'Corn crop growth cycle (36h)', '#eab308', 'corn', TRUE),
    (NULL, 'Horse Grooming', 'animal', 60, 'Horse grooming cooldown', '#a855f7', 'horse', TRUE),
    (NULL, 'Breeding Cooldown', 'animal', 2880, 'Animal breeding cooldown (48h)', '#a855f7', 'heart', TRUE),
    (NULL, 'Sermon Cooldown', 'sermon', 180, 'Sermon cooldown (3h)', '#ef4444', 'book', TRUE),
    (NULL, 'Meditation Tick', 'meditation', 30, 'Meditation path tick', '#6366f1', 'brain', TRUE),
    (NULL, 'Foraging/Botanizing', 'cooldown', 60, 'Tile foraging cooldown', '#14b8a6', 'leaf', TRUE);

-- ========== SEED DATA: WURM SKILLS ==========

INSERT IGNORE INTO wurm_skills (name, category, parent_skill, description) VALUES
    -- Main skills
    ('Body', 'characteristics', NULL, 'Physical body strength'),
    ('Body Strength', 'characteristics', 'Body', 'Raw physical strength'),
    ('Body Stamina', 'characteristics', 'Body', 'Physical endurance'),
    ('Body Control', 'characteristics', 'Body', 'Physical coordination'),
    ('Mind', 'characteristics', NULL, 'Mental capabilities'),
    ('Mind Logic', 'characteristics', 'Mind', 'Logical thinking'),
    ('Mind Speed', 'characteristics', 'Mind', 'Mental quickness'),
    ('Soul', 'characteristics', NULL, 'Spiritual strength'),
    ('Soul Depth', 'characteristics', 'Soul', 'Spiritual depth'),
    ('Soul Strength', 'characteristics', 'Soul', 'Spiritual strength'),

    -- Combat
    ('Fighting', 'combat', NULL, 'General combat skill'),
    ('Defensive Fighting', 'combat', 'Fighting', 'Defensive combat stance'),
    ('Aggressive Fighting', 'combat', 'Fighting', 'Aggressive combat stance'),
    ('Normal Fighting', 'combat', 'Fighting', 'Normal combat stance'),
    ('Archery', 'combat', NULL, 'Bow and arrow combat'),
    ('Shield Bashing', 'combat', NULL, 'Shield attacks'),

    -- Weapons
    ('Swords', 'weapons', NULL, 'Sword combat'),
    ('Longsword', 'weapons', 'Swords', 'Longsword combat'),
    ('Shortsword', 'weapons', 'Swords', 'Shortsword combat'),
    ('Two Handed Sword', 'weapons', 'Swords', 'Two-handed sword combat'),
    ('Axes', 'weapons', NULL, 'Axe combat'),
    ('Hatchet', 'weapons', 'Axes', 'Hatchet combat'),
    ('Small Axe', 'weapons', 'Axes', 'Small axe combat'),
    ('Huge Axe', 'weapons', 'Axes', 'Huge axe combat'),
    ('Mauls', 'weapons', NULL, 'Maul combat'),
    ('Small Maul', 'weapons', 'Mauls', 'Small maul combat'),
    ('Medium Maul', 'weapons', 'Mauls', 'Medium maul combat'),
    ('Large Maul', 'weapons', 'Mauls', 'Large maul combat'),
    ('Knives', 'weapons', NULL, 'Knife combat'),
    ('Carving Knife', 'weapons', 'Knives', 'Carving knife combat'),
    ('Butchering Knife', 'weapons', 'Knives', 'Butchering knife combat'),
    ('Polearms', 'weapons', NULL, 'Polearm combat'),
    ('Staff', 'weapons', 'Polearms', 'Staff combat'),
    ('Long Spear', 'weapons', 'Polearms', 'Long spear combat'),
    ('Halberd', 'weapons', 'Polearms', 'Halberd combat'),

    -- Smithing
    ('Smithing', 'crafting', NULL, 'General metalworking'),
    ('Blacksmithing', 'crafting', 'Smithing', 'Creating metal tools and items'),
    ('Weapon Smithing', 'crafting', 'Smithing', 'Creating weapons'),
    ('Armour Smithing', 'crafting', 'Smithing', 'Creating armor'),
    ('Jewelry Smithing', 'crafting', 'Smithing', 'Creating jewelry'),
    ('Locksmithing', 'crafting', 'Smithing', 'Creating locks and keys'),
    ('Shield Smithing', 'crafting', 'Smithing', 'Creating shields'),
    ('Chain Armour Smithing', 'crafting', 'Armour Smithing', 'Creating chain armor'),
    ('Plate Armour Smithing', 'crafting', 'Armour Smithing', 'Creating plate armor'),

    -- Woodworking
    ('Carpentry', 'crafting', NULL, 'General woodworking'),
    ('Fine Carpentry', 'crafting', 'Carpentry', 'Detailed woodworking'),
    ('Ship Building', 'crafting', 'Carpentry', 'Building ships and boats'),
    ('Bowyery', 'crafting', 'Carpentry', 'Making bows'),
    ('Fletching', 'crafting', 'Carpentry', 'Making arrows'),
    ('Toy Making', 'crafting', 'Fine Carpentry', 'Making toys'),

    -- Other crafting
    ('Masonry', 'crafting', NULL, 'Stone and brick work'),
    ('Stone Cutting', 'crafting', 'Masonry', 'Cutting stone'),
    ('Pottery', 'crafting', NULL, 'Clay work'),
    ('Tailoring', 'crafting', NULL, 'Cloth work'),
    ('Cloth Tailoring', 'crafting', 'Tailoring', 'Making cloth items'),
    ('Leatherworking', 'crafting', 'Tailoring', 'Working with leather'),
    ('Ropemaking', 'crafting', NULL, 'Making ropes'),
    ('Thatching', 'crafting', NULL, 'Making thatch roofs'),
    ('Paving', 'crafting', NULL, 'Creating roads and paths'),

    -- Gathering
    ('Mining', 'gathering', NULL, 'Extracting ore and rock'),
    ('Digging', 'gathering', NULL, 'Moving dirt and clay'),
    ('Woodcutting', 'gathering', NULL, 'Cutting trees'),
    ('Foraging', 'gathering', NULL, 'Finding plants'),
    ('Botanizing', 'gathering', NULL, 'Finding herbs'),
    ('Fishing', 'gathering', NULL, 'Catching fish'),
    ('Farming', 'gathering', NULL, 'Growing crops'),

    -- Nature
    ('Nature', 'nature', NULL, 'Nature skills'),
    ('Animal Husbandry', 'nature', 'Nature', 'Breeding animals'),
    ('Animal Taming', 'nature', 'Nature', 'Taming wild animals'),
    ('Gardening', 'nature', 'Nature', 'Tending gardens'),
    ('Meditating', 'nature', NULL, 'Meditation paths'),
    ('Forestry', 'nature', 'Nature', 'Managing forests'),
    ('Milking', 'nature', 'Animal Husbandry', 'Milking animals'),
    ('Papyrusmaking', 'nature', NULL, 'Making papyrus'),

    -- Religion
    ('Faith', 'religion', NULL, 'Religious devotion'),
    ('Favor', 'religion', NULL, 'Divine favor'),
    ('Prayer', 'religion', 'Faith', 'Praying to gods'),
    ('Channeling', 'religion', NULL, 'Casting spells'),
    ('Preaching', 'religion', 'Faith', 'Preaching to others'),
    ('Exorcism', 'religion', 'Faith', 'Removing curses'),

    -- Cooking
    ('Cooking', 'cooking', NULL, 'Preparing food'),
    ('Hot Food Cooking', 'cooking', 'Cooking', 'Cooking hot meals'),
    ('Baking', 'cooking', 'Cooking', 'Baking bread and pastries'),
    ('Beverages', 'cooking', 'Cooking', 'Making drinks'),
    ('Butchering', 'cooking', NULL, 'Processing meat'),
    ('Dairy Food Making', 'cooking', 'Cooking', 'Making dairy products'),

    -- Misc
    ('Healing', 'misc', NULL, 'Healing wounds'),
    ('First Aid', 'misc', 'Healing', 'Basic wound treatment'),
    ('Alchemy', 'misc', NULL, 'Creating potions'),
    ('Natural Substances', 'misc', 'Alchemy', 'Creating natural remedies'),
    ('Tracking', 'misc', NULL, 'Tracking animals'),
    ('Trapping', 'misc', NULL, 'Setting traps'),
    ('Climbing', 'misc', NULL, 'Climbing surfaces'),
    ('Stealing', 'misc', NULL, 'Theft skill'),
    ('Lock Picking', 'misc', 'Stealing', 'Opening locks');

-- ========== PROCEDURE FOR INSERTING RECIPES ==========
-- This needs to be run after items are inserted

DELIMITER //

CREATE PROCEDURE IF NOT EXISTS insert_recipes()
BEGIN
    -- Insert recipes by looking up item IDs
    INSERT IGNORE INTO recipes (result_item_id, ingredient_item_id, quantity)
    SELECT r.id, i.id, data.qty
    FROM (
        SELECT 'Plank' AS result_name, 'Log' AS ingredient_name, 1 AS qty UNION ALL
        SELECT 'Shaft', 'Log', 1 UNION ALL
        SELECT 'Iron Lump', 'Iron Ore', 1 UNION ALL
        SELECT 'Small Nail', 'Iron Lump', 0.1 UNION ALL
        SELECT 'Large Nail', 'Iron Lump', 0.2 UNION ALL
        SELECT 'Rope', 'Cotton', 2 UNION ALL
        SELECT 'Spindle', 'Shaft', 1 UNION ALL
        SELECT 'Mallet', 'Shaft', 1 UNION ALL
        SELECT 'Mallet', 'Plank', 1 UNION ALL
        SELECT 'Hammer', 'Shaft', 1 UNION ALL
        SELECT 'Hammer', 'Iron Lump', 1 UNION ALL
        SELECT 'Saw', 'Shaft', 1 UNION ALL
        SELECT 'Saw', 'Iron Lump', 2 UNION ALL
        SELECT 'Wheel Axle', 'Shaft', 1 UNION ALL
        SELECT 'Wheel Axle', 'Small Nail', 2 UNION ALL
        SELECT 'Wheel', 'Plank', 3 UNION ALL
        SELECT 'Wheel', 'Shaft', 1 UNION ALL
        SELECT 'Wheel', 'Small Nail', 4 UNION ALL
        SELECT 'Cart', 'Wheel', 2 UNION ALL
        SELECT 'Cart', 'Wheel Axle', 1 UNION ALL
        SELECT 'Cart', 'Plank', 10 UNION ALL
        SELECT 'Cart', 'Shaft', 2 UNION ALL
        SELECT 'Cart', 'Rope', 1 UNION ALL
        SELECT 'Cart', 'Large Nail', 10 UNION ALL
        SELECT 'Large Cart', 'Wheel', 4 UNION ALL
        SELECT 'Large Cart', 'Wheel Axle', 2 UNION ALL
        SELECT 'Large Cart', 'Plank', 20 UNION ALL
        SELECT 'Large Cart', 'Shaft', 4 UNION ALL
        SELECT 'Large Cart', 'Rope', 2 UNION ALL
        SELECT 'Large Cart', 'Large Nail', 20 UNION ALL
        SELECT 'Brick', 'Clay', 1 UNION ALL
        SELECT 'Mortar', 'Clay', 1 UNION ALL
        SELECT 'Mortar', 'Rock Shards', 1
    ) AS data
    JOIN items r ON r.name = data.result_name
    JOIN items i ON i.name = data.ingredient_name;
END //

DELIMITER ;

-- Run the procedure to insert recipes
CALL insert_recipes();

-- Drop the procedure after use (optional, keeps DB clean)
DROP PROCEDURE IF EXISTS insert_recipes;
