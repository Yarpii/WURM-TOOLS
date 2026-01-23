-- WURM-TOOLS MySQL Schema - Part 6: Projects
-- Run: mysql -u root -p wurmtools < 06-projects.sql
-- Depends on: 01-core.sql, 02-characters.sql, 03-crafting.sql, 05-alliances.sql

-- ========== PROJECTS ==========

CREATE TABLE IF NOT EXISTS projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    character_id INT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'planning',
    is_shared BOOLEAN DEFAULT FALSE,
    alliance_id INT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_projects_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_projects_character FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE SET NULL,
    CONSTRAINT fk_projects_alliance FOREIGN KEY (alliance_id) REFERENCES alliances(id) ON DELETE SET NULL,
    CONSTRAINT chk_projects_status CHECK (status IN ('planning', 'in_progress', 'completed', 'archived'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS project_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    item_id BIGINT UNSIGNED NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    completed_quantity INT DEFAULT 0,
    is_complete BOOLEAN GENERATED ALWAYS AS (completed_quantity >= quantity) STORED,
    notes TEXT,
    priority INT DEFAULT 0,

    CONSTRAINT fk_project_items_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    CONSTRAINT fk_project_items_item FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_projects_user ON projects(user_id);
CREATE INDEX idx_projects_alliance ON projects(alliance_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_project_items_project ON project_items(project_id);
CREATE INDEX idx_project_items_complete ON project_items(is_complete);
