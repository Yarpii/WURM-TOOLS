-- WURM-TOOLS MySQL Schema - Part 3: Crafting System
-- Run: mysql -u root -p wurmtools < 03-crafting.sql
-- Depends on: 01-core.sql

-- ========== CRAFTING SYSTEM ==========

CREATE TABLE IF NOT EXISTS items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(50) DEFAULT 'misc',
    is_base_material BOOLEAN DEFAULT FALSE,
    description TEXT,
    difficulty INT,
    skill_type VARCHAR(50),
    base_time INT,
    tool_type VARCHAR(50)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS recipes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    result_item_id INT NOT NULL,
    ingredient_item_id INT NOT NULL,
    quantity DECIMAL(10, 4) NOT NULL DEFAULT 1,

    CONSTRAINT fk_recipes_result FOREIGN KEY (result_item_id) REFERENCES items(id) ON DELETE CASCADE,
    CONSTRAINT fk_recipes_ingredient FOREIGN KEY (ingredient_item_id) REFERENCES items(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_recipes_result ON recipes(result_item_id);
CREATE INDEX idx_recipes_ingredient ON recipes(ingredient_item_id);
