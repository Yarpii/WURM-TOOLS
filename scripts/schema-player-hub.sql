-- WURM-TOOLS Player Hub Schema Extension (MySQL/MariaDB)
-- Run this after schema-mysql.sql to add skill tracking, timers, and events
-- Dit bestand is compatibel met MySQL/MariaDB en kan veilig opnieuw worden gedraaid

SET default_storage_engine=InnoDB;
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- ========== HELPER PROCEDURE FOR SAFE INDEX CREATION ==========
-- MySQL has no CREATE INDEX IF NOT EXISTS, so we use a procedure

DROP PROCEDURE IF EXISTS create_index_if_not_exists;

DELIMITER //
CREATE PROCEDURE create_index_if_not_exists(
    IN p_table_name VARCHAR(64),
    IN p_index_name VARCHAR(64),
    IN p_index_columns VARCHAR(255)
)
BEGIN
    DECLARE index_exists INT DEFAULT 0;

    SELECT COUNT(*) INTO index_exists
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = p_table_name
      AND index_name = p_index_name;

    IF index_exists = 0 THEN
        SET @sql = CONCAT('CREATE INDEX ', p_index_name, ' ON ', p_table_name, '(', p_index_columns, ')');
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END //
DELIMITER ;

-- ========== SKILL TRACKING ==========

CREATE TABLE IF NOT EXISTS user_skills (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    skill_name VARCHAR(100) NOT NULL,
    current_level DECIMAL(10, 4) NOT NULL DEFAULT 1.0,
    target_level DECIMAL(10, 4),
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uk_user_skill (user_id, skill_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add foreign key only if it doesn't exist
SET @fk_exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'user_skills'
    AND CONSTRAINT_NAME = 'fk_user_skills_user' AND CONSTRAINT_TYPE = 'FOREIGN KEY');
SET @sql = IF(@fk_exists = 0,
    'ALTER TABLE user_skills ADD CONSTRAINT fk_user_skills_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CALL create_index_if_not_exists('user_skills', 'idx_user_skills_user', 'user_id');
CALL create_index_if_not_exists('user_skills', 'idx_user_skills_name', 'skill_name');

-- Skill history for tracking progress over time
CREATE TABLE IF NOT EXISTS skill_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_skill_id INT NOT NULL,
    old_level DECIMAL(10, 4) NOT NULL,
    new_level DECIMAL(10, 4) NOT NULL,
    recorded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @fk_exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'skill_history'
    AND CONSTRAINT_NAME = 'fk_skill_history_skill' AND CONSTRAINT_TYPE = 'FOREIGN KEY');
SET @sql = IF(@fk_exists = 0,
    'ALTER TABLE skill_history ADD CONSTRAINT fk_skill_history_skill FOREIGN KEY (user_skill_id) REFERENCES user_skills(id) ON DELETE CASCADE',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CALL create_index_if_not_exists('skill_history', 'idx_skill_history_skill', 'user_skill_id');
CALL create_index_if_not_exists('skill_history', 'idx_skill_history_date', 'recorded_at');

-- ========== TIMERS ==========

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

    CONSTRAINT chk_user_timers_type CHECK (timer_type IN (
        'sleep_bonus', 'fatigue', 'crop', 'animal', 'sermon',
        'meditation', 'custom', 'cooldown', 'bulk'
    ))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @fk_exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'user_timers'
    AND CONSTRAINT_NAME = 'fk_user_timers_user' AND CONSTRAINT_TYPE = 'FOREIGN KEY');
SET @sql = IF(@fk_exists = 0,
    'ALTER TABLE user_timers ADD CONSTRAINT fk_user_timers_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CALL create_index_if_not_exists('user_timers', 'idx_user_timers_user', 'user_id');
CALL create_index_if_not_exists('user_timers', 'idx_user_timers_type', 'timer_type');
CALL create_index_if_not_exists('user_timers', 'idx_user_timers_end', 'end_time');
CALL create_index_if_not_exists('user_timers', 'idx_user_timers_active', 'is_active');

-- Timer presets for quick timer creation
CREATE TABLE IF NOT EXISTS timer_presets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    name VARCHAR(100) NOT NULL,
    timer_type VARCHAR(30) NOT NULL,
    duration_minutes INT NOT NULL,
    description TEXT,
    color VARCHAR(20) DEFAULT '#3b82f6',
    icon VARCHAR(50),
    is_public BOOLEAN DEFAULT FALSE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @fk_exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'timer_presets'
    AND CONSTRAINT_NAME = 'fk_timer_presets_user' AND CONSTRAINT_TYPE = 'FOREIGN KEY');
SET @sql = IF(@fk_exists = 0,
    'ALTER TABLE timer_presets ADD CONSTRAINT fk_timer_presets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CALL create_index_if_not_exists('timer_presets', 'idx_timer_presets_user', 'user_id');
CALL create_index_if_not_exists('timer_presets', 'idx_timer_presets_type', 'timer_type');

-- ========== EVENTS / CALENDAR ==========

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

    CONSTRAINT chk_events_type CHECK (event_type IN (
        'impalong', 'rift', 'unique', 'sermon_group', 'market',
        'pvp', 'community', 'personal', 'other'
    ))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @fk_exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'events'
    AND CONSTRAINT_NAME = 'fk_events_user' AND CONSTRAINT_TYPE = 'FOREIGN KEY');
SET @sql = IF(@fk_exists = 0,
    'ALTER TABLE events ADD CONSTRAINT fk_events_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CALL create_index_if_not_exists('events', 'idx_events_user', 'user_id');
CALL create_index_if_not_exists('events', 'idx_events_type', 'event_type');
CALL create_index_if_not_exists('events', 'idx_events_server', 'server');
CALL create_index_if_not_exists('events', 'idx_events_start', 'start_date');
CALL create_index_if_not_exists('events', 'idx_events_public', 'is_public');
CALL create_index_if_not_exists('events', 'idx_events_featured', 'is_featured');

-- Event attendance tracking
CREATE TABLE IF NOT EXISTS event_attendees (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    user_id INT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'interested',
    character_name VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_event_attendees_status CHECK (status IN ('interested', 'going', 'maybe', 'not_going')),
    UNIQUE KEY uk_event_attendee (event_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @fk_exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'event_attendees'
    AND CONSTRAINT_NAME = 'fk_event_attendees_event' AND CONSTRAINT_TYPE = 'FOREIGN KEY');
SET @sql = IF(@fk_exists = 0,
    'ALTER TABLE event_attendees ADD CONSTRAINT fk_event_attendees_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'event_attendees'
    AND CONSTRAINT_NAME = 'fk_event_attendees_user' AND CONSTRAINT_TYPE = 'FOREIGN KEY');
SET @sql = IF(@fk_exists = 0,
    'ALTER TABLE event_attendees ADD CONSTRAINT fk_event_attendees_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CALL create_index_if_not_exists('event_attendees', 'idx_event_attendees_event', 'event_id');
CALL create_index_if_not_exists('event_attendees', 'idx_event_attendees_user', 'user_id');
CALL create_index_if_not_exists('event_attendees', 'idx_event_attendees_status', 'status');

-- ========== DEFAULT TIMER PRESETS ==========

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

-- ========== WURM SKILL LIST ==========
-- Reference table for all Wurm skills (optional, for autocomplete)

CREATE TABLE IF NOT EXISTS wurm_skills (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(50) NOT NULL,
    parent_skill VARCHAR(100),
    max_level DECIMAL(5, 2) DEFAULT 100.00,
    description TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CALL create_index_if_not_exists('wurm_skills', 'idx_wurm_skills_category', 'category');
CALL create_index_if_not_exists('wurm_skills', 'idx_wurm_skills_parent', 'parent_skill');

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

-- ========== CLEANUP ==========
-- Remove helper procedure after use
DROP PROCEDURE IF EXISTS create_index_if_not_exists;
