-- Performance indexes for dashboard queries
-- Run this in Railway MySQL Query tab

-- Orders table indexes
CREATE INDEX IF NOT EXISTS idx_orders_user_status ON orders(user_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_user_type ON orders(user_id, order_type);

-- Projects table indexes
CREATE INDEX IF NOT EXISTS idx_projects_user_status ON projects(user_id, status);
CREATE INDEX IF NOT EXISTS idx_project_items_project ON project_items(project_id);

-- Merchants table indexes
CREATE INDEX IF NOT EXISTS idx_merchants_user_active ON merchants(user_id, is_active);

-- Alliance indexes
CREATE INDEX IF NOT EXISTS idx_alliance_members_user ON alliance_members(user_id);

-- User timers indexes
CREATE INDEX IF NOT EXISTS idx_user_timers_user_active ON user_timers(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_user_timers_end_time ON user_timers(end_time);

-- Characters indexes
CREATE INDEX IF NOT EXISTS idx_characters_user ON characters(user_id);
CREATE INDEX IF NOT EXISTS idx_characters_user_main ON characters(user_id, is_main);

-- Skills indexes
CREATE INDEX IF NOT EXISTS idx_user_skills_user ON user_skills(user_id);

-- Events indexes
CREATE INDEX IF NOT EXISTS idx_events_start_date ON events(start_date);

-- Hunts indexes
CREATE INDEX IF NOT EXISTS idx_treasure_hunts_user ON treasure_hunts(user_id);
CREATE INDEX IF NOT EXISTS idx_treasure_hunts_status ON treasure_hunts(status);

-- User achievements indexes
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);

-- User XP indexes
CREATE INDEX IF NOT EXISTS idx_user_xp_user ON user_xp(user_id);
CREATE INDEX IF NOT EXISTS idx_user_xp_total ON user_xp(total_xp);

-- User ratings indexes
CREATE INDEX IF NOT EXISTS idx_user_ratings_rated_user ON user_ratings(rated_user_id);

SELECT 'Dashboard indexes created successfully!' as status;
