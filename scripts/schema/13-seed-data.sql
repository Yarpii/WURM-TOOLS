-- WURM-TOOLS MySQL Schema - Part 13: Seed Data
-- Run: mysql -u root -p wurmtools < 13-seed-data.sql
-- Depends on: All previous schema files

-- ========== SEED DATA: ACHIEVEMENTS ==========

INSERT IGNORE INTO achievements (id, name, description, category, icon, xp_reward, requirement_type, requirement_value, is_hidden) VALUES
('first_trade', 'First Trade', 'Complete your first trade', 'trading', 'handshake', 100, 'trades_completed', 1, FALSE),
('trader_10', 'Active Trader', 'Complete 10 trades', 'trading', 'package', 250, 'trades_completed', 10, FALSE),
('trader_50', 'Master Trader', 'Complete 50 trades', 'trading', 'coins', 500, 'trades_completed', 50, FALSE),
('first_order', 'Market Debut', 'Create your first market order', 'trading', 'file-text', 50, 'orders_created', 1, FALSE),
('crafter_items', 'Crafter', 'Add 10 items to your crafting projects', 'crafting', 'hammer', 150, 'items_crafted', 10, FALSE),
('community_member', 'Community Member', 'Join your first alliance', 'community', 'users', 200, 'alliances_joined', 1, FALSE),
('explorer', 'Explorer', 'Add 5 map locations', 'exploration', 'map', 150, 'locations_added', 5, FALSE),
('merchant_owner', 'Merchant Owner', 'Register your first merchant', 'trading', 'store', 100, 'merchants_created', 1, FALSE),
('helpful', 'Helpful', 'Receive 5 positive ratings', 'community', 'star', 300, 'positive_ratings', 5, FALSE),
('veteran', 'Veteran', 'Be a member for 30 days', 'special', 'award', 500, 'days_member', 30, TRUE);

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
