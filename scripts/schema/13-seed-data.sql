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

-- ========== SEED DATA: TIMER PRESETS ==========
-- NOTE: Items/recipes are imported from game content database, not seeded here

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
