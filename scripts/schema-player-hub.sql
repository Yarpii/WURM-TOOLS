-- WURM-TOOLS Player Hub Schema Extension
-- Run this after schema.sql to add skill tracking, timers, and events

-- ========== SKILL TRACKING ==========

CREATE TABLE IF NOT EXISTS user_skills (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_name VARCHAR(100) NOT NULL,
    current_level DECIMAL(10, 4) NOT NULL DEFAULT 1.0,
    target_level DECIMAL(10, 4),
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, skill_name)
);

CREATE INDEX IF NOT EXISTS idx_user_skills_user ON user_skills(user_id);
CREATE INDEX IF NOT EXISTS idx_user_skills_name ON user_skills(skill_name);

-- Skill history for tracking progress over time
CREATE TABLE IF NOT EXISTS skill_history (
    id SERIAL PRIMARY KEY,
    user_skill_id INTEGER NOT NULL REFERENCES user_skills(id) ON DELETE CASCADE,
    old_level DECIMAL(10, 4) NOT NULL,
    new_level DECIMAL(10, 4) NOT NULL,
    recorded_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_skill_history_skill ON skill_history(user_skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_history_date ON skill_history(recorded_at);

-- ========== TIMERS ==========

CREATE TABLE IF NOT EXISTS user_timers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    timer_type VARCHAR(30) NOT NULL CHECK (timer_type IN (
        'sleep_bonus', 'fatigue', 'crop', 'animal', 'sermon',
        'meditation', 'custom', 'cooldown', 'bulk'
    )),
    duration_minutes INTEGER NOT NULL,
    start_time TIMESTAMP NOT NULL DEFAULT NOW(),
    end_time TIMESTAMP NOT NULL,
    is_recurring BOOLEAN DEFAULT false,
    recurrence_interval INTEGER, -- in minutes
    notify_discord BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    color VARCHAR(20) DEFAULT '#3b82f6',
    icon VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_timers_user ON user_timers(user_id);
CREATE INDEX IF NOT EXISTS idx_user_timers_type ON user_timers(timer_type);
CREATE INDEX IF NOT EXISTS idx_user_timers_end ON user_timers(end_time);
CREATE INDEX IF NOT EXISTS idx_user_timers_active ON user_timers(is_active);

-- Timer presets for quick timer creation
CREATE TABLE IF NOT EXISTS timer_presets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, -- NULL = global preset
    name VARCHAR(100) NOT NULL,
    timer_type VARCHAR(30) NOT NULL,
    duration_minutes INTEGER NOT NULL,
    description TEXT,
    color VARCHAR(20) DEFAULT '#3b82f6',
    icon VARCHAR(50),
    is_public BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_timer_presets_user ON timer_presets(user_id);
CREATE INDEX IF NOT EXISTS idx_timer_presets_type ON timer_presets(timer_type);

-- ========== EVENTS / CALENDAR ==========

CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    event_type VARCHAR(30) NOT NULL CHECK (event_type IN (
        'impalong', 'rift', 'unique', 'sermon_group', 'market',
        'pvp', 'community', 'personal', 'other'
    )),
    server VARCHAR(50),
    location VARCHAR(200),
    coordinates VARCHAR(50),
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP,
    is_all_day BOOLEAN DEFAULT false,
    is_public BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    max_attendees INTEGER,
    contact_info TEXT,
    external_link VARCHAR(500),
    image_url VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_user ON events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_server ON events(server);
CREATE INDEX IF NOT EXISTS idx_events_start ON events(start_date);
CREATE INDEX IF NOT EXISTS idx_events_public ON events(is_public);
CREATE INDEX IF NOT EXISTS idx_events_featured ON events(is_featured);

-- Event attendance tracking
CREATE TABLE IF NOT EXISTS event_attendees (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'interested' CHECK (status IN ('interested', 'going', 'maybe', 'not_going')),
    character_name VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_attendees_event ON event_attendees(event_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_user ON event_attendees(user_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_status ON event_attendees(status);

-- ========== TRIGGERS ==========

CREATE TRIGGER update_user_skills_updated_at BEFORE UPDATE ON user_skills
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========== DEFAULT TIMER PRESETS ==========

INSERT INTO timer_presets (user_id, name, timer_type, duration_minutes, description, color, icon, is_public) VALUES
    (NULL, 'Sleep Bonus (5h)', 'sleep_bonus', 300, 'Standard sleep bonus duration', '#22c55e', 'moon', true),
    (NULL, 'Fatigue Reset', 'fatigue', 1440, 'Daily fatigue reset (24h)', '#3b82f6', 'battery', true),
    (NULL, 'Wheat Growth', 'crop', 1440, 'Wheat crop growth cycle', '#eab308', 'wheat', true),
    (NULL, 'Corn Growth', 'crop', 2160, 'Corn crop growth cycle (36h)', '#eab308', 'corn', true),
    (NULL, 'Horse Grooming', 'animal', 60, 'Horse grooming cooldown', '#a855f7', 'horse', true),
    (NULL, 'Breeding Cooldown', 'animal', 2880, 'Animal breeding cooldown (48h)', '#a855f7', 'heart', true),
    (NULL, 'Sermon Cooldown', 'sermon', 180, 'Sermon cooldown (3h)', '#ef4444', 'book', true),
    (NULL, 'Meditation Tick', 'meditation', 30, 'Meditation path tick', '#6366f1', 'brain', true),
    (NULL, 'Foraging/Botanizing', 'cooldown', 60, 'Tile foraging cooldown', '#14b8a6', 'leaf', true)
ON CONFLICT DO NOTHING;

-- ========== WURM SKILL LIST ==========
-- Reference table for all Wurm skills (optional, for autocomplete)

CREATE TABLE IF NOT EXISTS wurm_skills (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(50) NOT NULL,
    parent_skill VARCHAR(100),
    max_level DECIMAL(5, 2) DEFAULT 100.00,
    description TEXT
);

INSERT INTO wurm_skills (name, category, parent_skill, description) VALUES
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
    ('Lock Picking', 'misc', 'Stealing', 'Opening locks')
ON CONFLICT (name) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_wurm_skills_category ON wurm_skills(category);
CREATE INDEX IF NOT EXISTS idx_wurm_skills_parent ON wurm_skills(parent_skill);
