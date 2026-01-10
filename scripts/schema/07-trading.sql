-- WURM-TOOLS MySQL Schema - Part 7: Trading & Ratings
-- Run: mysql -u root -p wurmtools < 07-trading.sql
-- Depends on: 01-core.sql, 04-market.sql

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
