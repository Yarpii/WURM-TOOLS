-- WURM-TOOLS MySQL Schema - Part 4: Market System
-- Run: mysql -u root -p wurmtools < 04-market.sql
-- Depends on: 01-core.sql, 02-characters.sql

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
