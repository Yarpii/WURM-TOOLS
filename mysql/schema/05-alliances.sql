-- WURM-TOOLS MySQL Schema - Part 5: Alliances
-- Run: mysql -u root -p wurmtools < 05-alliances.sql
-- Depends on: 01-core.sql

-- ========== ALLIANCES ==========

CREATE TABLE IF NOT EXISTS alliances (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    tag VARCHAR(10),
    leader_id INT NOT NULL,
    is_public BOOLEAN DEFAULT TRUE,
    max_members INT DEFAULT 50,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_alliances_leader FOREIGN KEY (leader_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS alliance_members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    alliance_id INT NOT NULL,
    user_id INT NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'member',
    joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    invited_by INT,

    CONSTRAINT fk_alliance_members_alliance FOREIGN KEY (alliance_id) REFERENCES alliances(id) ON DELETE CASCADE,
    CONSTRAINT fk_alliance_members_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_alliance_members_invited FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT chk_alliance_members_role CHECK (role IN ('leader', 'officer', 'member')),
    UNIQUE KEY uk_alliance_user (alliance_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS alliance_invites (
    id INT AUTO_INCREMENT PRIMARY KEY,
    alliance_id INT NOT NULL,
    user_id INT NOT NULL,
    invited_by INT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,

    CONSTRAINT fk_alliance_invites_alliance FOREIGN KEY (alliance_id) REFERENCES alliances(id) ON DELETE CASCADE,
    CONSTRAINT fk_alliance_invites_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_alliance_invites_invited_by FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT chk_alliance_invites_status CHECK (status IN ('pending', 'accepted', 'declined', 'expired'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_alliances_leader ON alliances(leader_id);
CREATE INDEX idx_alliance_members_alliance ON alliance_members(alliance_id);
CREATE INDEX idx_alliance_members_user ON alliance_members(user_id);
CREATE INDEX idx_alliance_invites_alliance ON alliance_invites(alliance_id);
CREATE INDEX idx_alliance_invites_user ON alliance_invites(user_id);
CREATE INDEX idx_alliance_invites_status ON alliance_invites(status);
