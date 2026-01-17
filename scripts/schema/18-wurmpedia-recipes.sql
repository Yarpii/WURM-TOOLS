-- WURM-TOOLS MySQL Schema - Part 18: Wurmpedia Recipes Import
-- Run: mysql -u root -p wurmtools < 18-wurmpedia-recipes.sql
-- Depends on: 01-core.sql

-- ========== WURMPEDIA RECIPES ==========
-- Stores full recipe data imported from Wurmpedia JSON exports

CREATE TABLE IF NOT EXISTS wurmpedia_recipes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    wurmpedia_id INT UNIQUE,                    -- Original ID from Wurmpedia
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(200),                          -- URL-friendly name
    image_url VARCHAR(500),                     -- Wurmpedia image URL

    -- Categories (stored as JSON array)
    categories JSON,

    -- Creation info
    creation_tools JSON,                        -- Array of tool names
    creation_target VARCHAR(200),               -- Target item name
    creation_target_quantity DECIMAL(10, 4),    -- Target quantity needed
    creation_menu VARCHAR(200),                 -- Menu path (e.g., "Make fishing float")
    creation_steps JSON,                        -- Array of step strings

    -- Materials (for complex recipes with multiple ingredients)
    materials JSON,                             -- Array of { name, quantity, ... }

    -- Result info
    result_name VARCHAR(200),
    result_weight DECIMAL(10, 4),
    result_quantity INT DEFAULT 1,

    -- Skill info
    skill VARCHAR(100),
    difficulty INT,

    -- Improvement info
    can_improve BOOLEAN DEFAULT FALSE,
    improve_with VARCHAR(200),

    -- Additional metadata
    properties JSON,                            -- Array of property strings
    notes JSON,                                 -- Array of note strings

    -- Flags
    is_cooking BOOLEAN DEFAULT FALSE,
    has_materials BOOLEAN DEFAULT FALSE,
    recipe_type VARCHAR(50) DEFAULT 'misc',     -- misc, cooking, smithing, etc.

    -- Tracking
    imported_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_wurmpedia_name (name),
    INDEX idx_wurmpedia_skill (skill),
    INDEX idx_wurmpedia_type (recipe_type),
    INDEX idx_wurmpedia_cooking (is_cooking),
    FULLTEXT INDEX ft_wurmpedia_search (name, result_name, skill)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Track import batches
CREATE TABLE IF NOT EXISTS wurmpedia_import_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    imported_by INT,
    recipes_added INT DEFAULT 0,
    recipes_updated INT DEFAULT 0,
    recipes_failed INT DEFAULT 0,
    error_details JSON,                         -- Array of error messages
    imported_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_wurmpedia_import_user FOREIGN KEY (imported_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
