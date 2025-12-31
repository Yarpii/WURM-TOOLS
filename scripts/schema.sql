-- WURM-TOOLS PostgreSQL Schema
-- Run this to initialize the database on your VPS

-- Enable UUID extension (optional, for future use)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========== USERS & AUTHENTICATION ==========

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    salt VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    display_name VARCHAR(100),
    bio TEXT,
    avatar_url VARCHAR(500),
    location VARCHAR(100),
    wurm_server VARCHAR(50),
    show_in_members_list BOOLEAN DEFAULT true,
    show_email BOOLEAN DEFAULT false,
    show_location BOOLEAN DEFAULT true,
    is_banned BOOLEAN DEFAULT false,
    ban_reason TEXT,
    banned_at TIMESTAMP,
    banned_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
    id VARCHAR(255) PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- ========== CRAFTING SYSTEM ==========

CREATE TABLE IF NOT EXISTS items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(50) DEFAULT 'misc',
    is_base_material BOOLEAN DEFAULT false,
    description TEXT,
    difficulty INTEGER,
    skill_type VARCHAR(50),
    base_time INTEGER,
    tool_type VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS recipes (
    id SERIAL PRIMARY KEY,
    result_item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    ingredient_item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    quantity DECIMAL(10, 4) NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_recipes_result ON recipes(result_item_id);
CREATE INDEX IF NOT EXISTS idx_recipes_ingredient ON recipes(ingredient_item_id);

-- ========== MARKET SYSTEM ==========

CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_type VARCHAR(10) NOT NULL CHECK (order_type IN ('buy', 'sell', 'trade')),
    item_name VARCHAR(100) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    quality INTEGER,
    price DECIMAL(15, 4),
    currency VARCHAR(20) DEFAULT 'silver',
    trade_for TEXT,
    location VARCHAR(200),
    notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled', 'expired')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_type ON orders(order_type);
CREATE INDEX IF NOT EXISTS idx_orders_item ON orders(item_name);

-- ========== MERCHANTS ==========

CREATE TABLE IF NOT EXISTS merchants (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    location VARCHAR(200) NOT NULL,
    server VARCHAR(50) NOT NULL,
    coordinates VARCHAR(50),
    category VARCHAR(50) NOT NULL DEFAULT 'misc',
    stock_list TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_merchants_user ON merchants(user_id);
CREATE INDEX IF NOT EXISTS idx_merchants_active ON merchants(is_active);
CREATE INDEX IF NOT EXISTS idx_merchants_category ON merchants(category);
CREATE INDEX IF NOT EXISTS idx_merchants_server ON merchants(server);

-- ========== ALLIANCES ==========

CREATE TABLE IF NOT EXISTS alliances (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    tag VARCHAR(10),
    leader_id INTEGER NOT NULL REFERENCES users(id),
    is_public BOOLEAN DEFAULT true,
    max_members INTEGER DEFAULT 50,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alliance_members (
    id SERIAL PRIMARY KEY,
    alliance_id INTEGER NOT NULL REFERENCES alliances(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('leader', 'officer', 'member')),
    joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
    invited_by INTEGER REFERENCES users(id),
    UNIQUE(alliance_id, user_id)
);

CREATE TABLE IF NOT EXISTS alliance_invites (
    id SERIAL PRIMARY KEY,
    alliance_id INTEGER NOT NULL REFERENCES alliances(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invited_by INTEGER NOT NULL REFERENCES users(id),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_alliances_leader ON alliances(leader_id);
CREATE INDEX IF NOT EXISTS idx_alliance_members_alliance ON alliance_members(alliance_id);
CREATE INDEX IF NOT EXISTS idx_alliance_members_user ON alliance_members(user_id);
CREATE INDEX IF NOT EXISTS idx_alliance_invites_alliance ON alliance_invites(alliance_id);
CREATE INDEX IF NOT EXISTS idx_alliance_invites_user ON alliance_invites(user_id);
CREATE INDEX IF NOT EXISTS idx_alliance_invites_status ON alliance_invites(status);

-- ========== PRICE TRACKING ==========

CREATE TABLE IF NOT EXISTS price_history (
    id SERIAL PRIMARY KEY,
    item_name VARCHAR(100) NOT NULL,
    price DECIMAL(15, 4) NOT NULL,
    quality INTEGER DEFAULT 50,
    order_type VARCHAR(10) NOT NULL CHECK (order_type IN ('buy', 'sell')),
    currency VARCHAR(20) DEFAULT 'silver',
    recorded_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS price_alerts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_name VARCHAR(100) NOT NULL,
    target_price DECIMAL(15, 4) NOT NULL,
    condition VARCHAR(10) NOT NULL CHECK (condition IN ('above', 'below')),
    is_active BOOLEAN DEFAULT true,
    triggered_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_history_item ON price_history(item_name);
CREATE INDEX IF NOT EXISTS idx_price_history_date ON price_history(recorded_at);
CREATE INDEX IF NOT EXISTS idx_price_alerts_user ON price_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_price_alerts_item ON price_alerts(item_name);

-- ========== PROJECTS ==========

CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'in_progress', 'completed', 'archived')),
    is_shared BOOLEAN DEFAULT false,
    alliance_id INTEGER REFERENCES alliances(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_items (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    item_id INTEGER NOT NULL REFERENCES items(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    completed_quantity INTEGER DEFAULT 0,
    notes TEXT,
    priority INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_alliance ON projects(alliance_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_project_items_project ON project_items(project_id);

-- ========== TRADE MATCHING ==========

CREATE TABLE IF NOT EXISTS trade_matches (
    id SERIAL PRIMARY KEY,
    buy_order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    sell_order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    buyer_id INTEGER NOT NULL REFERENCES users(id),
    seller_id INTEGER NOT NULL REFERENCES users(id),
    item_name VARCHAR(100) NOT NULL,
    quantity INTEGER NOT NULL,
    buy_price DECIMAL(15, 4),
    sell_price DECIMAL(15, 4),
    match_score INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'completed', 'declined', 'expired')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    contacted_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_ratings (
    id SERIAL PRIMARY KEY,
    rater_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rated_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    trade_match_id INTEGER REFERENCES trade_matches(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trade_matches_buyer ON trade_matches(buyer_id);
CREATE INDEX IF NOT EXISTS idx_trade_matches_seller ON trade_matches(seller_id);
CREATE INDEX IF NOT EXISTS idx_trade_matches_status ON trade_matches(status);
CREATE INDEX IF NOT EXISTS idx_trade_matches_item ON trade_matches(item_name);
CREATE INDEX IF NOT EXISTS idx_user_ratings_rater ON user_ratings(rater_id);
CREATE INDEX IF NOT EXISTS idx_user_ratings_rated ON user_ratings(rated_user_id);

-- ========== MAP LOCATIONS ==========

CREATE TABLE IF NOT EXISTS map_locations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    location_type VARCHAR(20) NOT NULL CHECK (location_type IN ('deed', 'merchant', 'landmark', 'resource', 'spawn', 'other')),
    server VARCHAR(50) NOT NULL,
    x INTEGER NOT NULL,
    y INTEGER NOT NULL,
    is_public BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    alliance_id INTEGER REFERENCES alliances(id) ON DELETE SET NULL,
    merchant_id INTEGER REFERENCES merchants(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_map_locations_server ON map_locations(server);
CREATE INDEX IF NOT EXISTS idx_map_locations_type ON map_locations(location_type);
CREATE INDEX IF NOT EXISTS idx_map_locations_user ON map_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_map_locations_coords ON map_locations(x, y);

-- ========== GAMIFICATION ==========

CREATE TABLE IF NOT EXISTS user_xp (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    total_xp INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS user_achievements (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id VARCHAR(50) NOT NULL,
    progress INTEGER NOT NULL DEFAULT 0,
    completed BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_completed ON user_achievements(completed);

-- ========== DISCORD WEBHOOKS ==========

CREATE TABLE IF NOT EXISTS discord_webhooks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    webhook_url VARCHAR(500) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    notify_trades BOOLEAN DEFAULT true,
    notify_matches BOOLEAN DEFAULT true,
    notify_price_alerts BOOLEAN DEFAULT true,
    notify_alliance BOOLEAN DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_discord_webhooks_user ON discord_webhooks(user_id);
CREATE INDEX IF NOT EXISTS idx_discord_webhooks_active ON discord_webhooks(is_active);

-- ========== PROSPECT MANAGEMENT ==========

CREATE TABLE IF NOT EXISTS prospect_pages (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(20) DEFAULT '#3b82f6',
    icon VARCHAR(50) DEFAULT 'folder',
    is_default BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prospects (
    id SERIAL PRIMARY KEY,
    page_id INTEGER NOT NULL REFERENCES prospect_pages(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    character_name VARCHAR(100),
    server VARCHAR(50),
    location VARCHAR(200),
    status VARCHAR(20) NOT NULL DEFAULT 'potential' CHECK (status IN ('potential', 'contacted', 'interested', 'recruited', 'declined', 'inactive')),
    priority VARCHAR(10) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    quality_rating INTEGER DEFAULT 3 CHECK (quality_rating >= 1 AND quality_rating <= 5),
    skills TEXT,
    notes TEXT,
    contact_info TEXT,
    last_contact TIMESTAMP,
    source VARCHAR(100),
    tags TEXT,
    custom_fields TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prospect_pages_user ON prospect_pages(user_id);
CREATE INDEX IF NOT EXISTS idx_prospect_pages_sort ON prospect_pages(sort_order);
CREATE INDEX IF NOT EXISTS idx_prospects_page ON prospects(page_id);
CREATE INDEX IF NOT EXISTS idx_prospects_user ON prospects(user_id);
CREATE INDEX IF NOT EXISTS idx_prospects_status ON prospects(status);
CREATE INDEX IF NOT EXISTS idx_prospects_priority ON prospects(priority);
CREATE INDEX IF NOT EXISTS idx_prospects_quality ON prospects(quality_rating);

-- ========== HELPER FUNCTIONS ==========

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_merchants_updated_at BEFORE UPDATE ON merchants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alliances_updated_at BEFORE UPDATE ON alliances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_map_locations_updated_at BEFORE UPDATE ON map_locations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prospect_pages_updated_at BEFORE UPDATE ON prospect_pages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prospects_updated_at BEFORE UPDATE ON prospects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========== SEED DATA ==========

-- Insert base materials
INSERT INTO items (name, category, is_base_material, description) VALUES
    ('Log', 'wood', true, 'Harvested from trees'),
    ('Iron Ore', 'ore', true, 'Mined from rock'),
    ('Clay', 'material', true, 'Dug from clay tiles'),
    ('Cotton', 'material', true, 'Harvested from cotton plants'),
    ('Water', 'material', true, 'Collected from wells or tiles'),
    ('Rock Shards', 'material', true, 'Mined from rock'),
    ('Pelt', 'material', true, 'From killed animals'),
    ('Leather', 'material', true, 'Processed from hides')
ON CONFLICT (name) DO NOTHING;

-- Insert crafted items
INSERT INTO items (name, category, is_base_material, description) VALUES
    ('Plank', 'wood', false, 'Sawn from logs'),
    ('Shaft', 'wood', false, 'Carved from logs'),
    ('Small Nail', 'metal', false, 'Made from iron lumps'),
    ('Large Nail', 'metal', false, 'Made from iron lumps'),
    ('Iron Lump', 'metal', false, 'Smelted from iron ore'),
    ('Wheel', 'vehicle', false, 'Used in carts and wagons'),
    ('Wheel Axle', 'vehicle', false, 'Connects wheels'),
    ('Cart', 'vehicle', false, 'Small transport vehicle'),
    ('Large Cart', 'vehicle', false, 'Larger transport vehicle'),
    ('Rope', 'material', false, 'Made from cotton'),
    ('Brick', 'building', false, 'Made from clay'),
    ('Mortar', 'building', false, 'Made from clay and sand'),
    ('Mallet', 'tool', false, 'Wooden hammer'),
    ('Hammer', 'tool', false, 'Metal hammer'),
    ('Saw', 'tool', false, 'For cutting planks'),
    ('Spindle', 'tool', false, 'For making rope')
ON CONFLICT (name) DO NOTHING;

-- Insert recipes (after items exist)
INSERT INTO recipes (result_item_id, ingredient_item_id, quantity)
SELECT r.id, i.id, data.qty
FROM (VALUES
    ('Plank', 'Log', 1),
    ('Shaft', 'Log', 1),
    ('Iron Lump', 'Iron Ore', 1),
    ('Small Nail', 'Iron Lump', 0.1),
    ('Large Nail', 'Iron Lump', 0.2),
    ('Rope', 'Cotton', 2),
    ('Spindle', 'Shaft', 1),
    ('Mallet', 'Shaft', 1),
    ('Mallet', 'Plank', 1),
    ('Hammer', 'Shaft', 1),
    ('Hammer', 'Iron Lump', 1),
    ('Saw', 'Shaft', 1),
    ('Saw', 'Iron Lump', 2),
    ('Wheel Axle', 'Shaft', 1),
    ('Wheel Axle', 'Small Nail', 2),
    ('Wheel', 'Plank', 3),
    ('Wheel', 'Shaft', 1),
    ('Wheel', 'Small Nail', 4),
    ('Cart', 'Wheel', 2),
    ('Cart', 'Wheel Axle', 1),
    ('Cart', 'Plank', 10),
    ('Cart', 'Shaft', 2),
    ('Cart', 'Rope', 1),
    ('Cart', 'Large Nail', 10),
    ('Large Cart', 'Wheel', 4),
    ('Large Cart', 'Wheel Axle', 2),
    ('Large Cart', 'Plank', 20),
    ('Large Cart', 'Shaft', 4),
    ('Large Cart', 'Rope', 2),
    ('Large Cart', 'Large Nail', 20),
    ('Brick', 'Clay', 1),
    ('Mortar', 'Clay', 1),
    ('Mortar', 'Rock Shards', 1)
) AS data(result_name, ingredient_name, qty)
JOIN items r ON r.name = data.result_name
JOIN items i ON i.name = data.ingredient_name
ON CONFLICT DO NOTHING;

-- Grant all privileges to the app user
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO wurmtools;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO wurmtools;
