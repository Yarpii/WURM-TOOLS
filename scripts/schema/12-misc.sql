-- WURM-TOOLS MySQL Schema - Part 12: Miscellaneous (Webhooks, Prospects, Submissions)
-- Run: mysql -u root -p wurmtools < 12-misc.sql
-- Depends on: 01-core.sql

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
