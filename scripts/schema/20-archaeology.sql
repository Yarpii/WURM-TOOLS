-- WURM-TOOLS MySQL Schema - Part 20: Archaeology Pinpoints
-- Run: mysql -u root -p wurmtools < 20-archaeology.sql
-- Depends on: 01-core.sql

-- ========== ARCHAEOLOGY PINPOINTS ==========

-- Main archaeology pinpoints table - tracks old deed locations and archaeological sites
CREATE TABLE IF NOT EXISTS archaeology_pinpoints (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    server VARCHAR(50) NOT NULL,

    -- Coordinates
    x INT NOT NULL,
    y INT NOT NULL,

    -- Archaeology-specific fields
    site_type VARCHAR(30) NOT NULL DEFAULT 'unknown',
    deed_name VARCHAR(100),              -- Original deed name (if known)
    former_owner VARCHAR(100),           -- Previous owner name (if known)
    estimated_age VARCHAR(50),           -- When the deed was active (e.g., "2015-2018", "Early Wurm")

    -- Findings at the location
    findings TEXT,                       -- What was found (fragments, items, etc.)
    notable_items TEXT,                  -- Particularly interesting finds

    -- Visibility settings (default private!)
    is_public BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    verified_by INT,
    verified_at TIMESTAMP NULL,

    -- Community voting (for public pinpoints)
    upvotes INT DEFAULT 0,
    downvotes INT DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_archaeology_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_archaeology_verified FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT chk_archaeology_site_type CHECK (site_type IN ('old_deed', 'ruins', 'settlement', 'tower', 'guard_tower', 'mine', 'bridge', 'road', 'other', 'unknown'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_archaeology_user ON archaeology_pinpoints(user_id);
CREATE INDEX idx_archaeology_server ON archaeology_pinpoints(server);
CREATE INDEX idx_archaeology_public ON archaeology_pinpoints(is_public);
CREATE INDEX idx_archaeology_verified ON archaeology_pinpoints(is_verified);
CREATE INDEX idx_archaeology_coords ON archaeology_pinpoints(x, y);
CREATE INDEX idx_archaeology_site_type ON archaeology_pinpoints(site_type);

-- Votes on public archaeology pinpoints
CREATE TABLE IF NOT EXISTS archaeology_votes (
    user_id INT NOT NULL,
    pinpoint_id INT NOT NULL,
    vote_type VARCHAR(10) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (user_id, pinpoint_id),
    CONSTRAINT fk_archaeology_votes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_archaeology_votes_pinpoint FOREIGN KEY (pinpoint_id) REFERENCES archaeology_pinpoints(id) ON DELETE CASCADE,
    CONSTRAINT chk_archaeology_vote_type CHECK (vote_type IN ('up', 'down'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Comments on archaeology pinpoints (for community discussion)
CREATE TABLE IF NOT EXISTS archaeology_comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pinpoint_id INT NOT NULL,
    user_id INT NOT NULL,
    comment TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_archaeology_comments_pinpoint FOREIGN KEY (pinpoint_id) REFERENCES archaeology_pinpoints(id) ON DELETE CASCADE,
    CONSTRAINT fk_archaeology_comments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_archaeology_comments_pinpoint ON archaeology_comments(pinpoint_id);
CREATE INDEX idx_archaeology_comments_user ON archaeology_comments(user_id);
