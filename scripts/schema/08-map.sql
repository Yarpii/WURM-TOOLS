-- WURM-TOOLS MySQL Schema - Part 8: Map Locations
-- Run: mysql -u root -p wurmtools < 08-map.sql
-- Depends on: 01-core.sql, 04-market.sql (merchants), 05-alliances.sql

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
