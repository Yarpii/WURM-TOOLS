-- ============================================
-- RECIPES DATABASE SCHEMA
-- Converts infobox JSON data to relational tables
-- ============================================

-- Items table - craftable items with their properties
CREATE TABLE IF NOT EXISTS items (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  page_id BIGINT UNSIGNED UNIQUE,            -- Link to pages table (no FK constraint for flexibility)
  slug VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  skill VARCHAR(100),                        -- e.g., "fine carpentry", "blacksmithing"
  difficulty INT,                            -- 1-100
  base_time_seconds INT,                     -- Crafting time in seconds
  image_url VARCHAR(500),
  is_base_material BOOLEAN DEFAULT FALSE,   -- Raw materials like planks, nails
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_items_skill (skill),
  INDEX idx_items_difficulty (difficulty),
  INDEX idx_items_base (is_base_material),
  INDEX idx_items_page (page_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Recipe materials - what materials are needed to craft an item
CREATE TABLE IF NOT EXISTS recipe_materials (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  item_id BIGINT UNSIGNED NOT NULL,          -- The item being crafted
  material_id BIGINT UNSIGNED,               -- Link to items table (if material exists)
  material_name VARCHAR(255) NOT NULL,       -- Name as fallback
  material_slug VARCHAR(255),                -- Slug for linking
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit VARCHAR(20) DEFAULT 'piece',          -- 'piece', 'kg'
  sort_order INT DEFAULT 0,

  INDEX idx_recipe_item (item_id),
  INDEX idx_recipe_material (material_id),
  INDEX idx_recipe_material_slug (material_slug),
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
  FOREIGN KEY (material_id) REFERENCES items(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Recipe tools - what tools are needed to craft an item
CREATE TABLE IF NOT EXISTS recipe_tools (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  item_id BIGINT UNSIGNED NOT NULL,          -- The item being crafted
  tool_id BIGINT UNSIGNED,                   -- Link to items table (if tool exists)
  tool_name VARCHAR(255) NOT NULL,           -- Name as fallback
  tool_slug VARCHAR(255),                    -- Slug for linking
  is_workstation BOOLEAN DEFAULT FALSE,      -- anvil, forge, loom, etc.

  INDEX idx_tool_item (item_id),
  INDEX idx_tool_tool (tool_id),
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
  FOREIGN KEY (tool_id) REFERENCES items(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Item categories for filtering
CREATE TABLE IF NOT EXISTS item_categories (
  item_id BIGINT UNSIGNED NOT NULL,
  category VARCHAR(100) NOT NULL,

  PRIMARY KEY (item_id, category),
  INDEX idx_category (category),
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Recipe steps - Creation instructions (Activate, Right-click, submenu)
CREATE TABLE IF NOT EXISTS recipe_steps (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  item_id BIGINT UNSIGNED NOT NULL,          -- The item being crafted
  step_order INT NOT NULL,                    -- Order of the step (1, 2, 3...)
  action VARCHAR(50) NOT NULL,                -- 'activate', 'right-click', 'submenu'
  target_name VARCHAR(255) NOT NULL,          -- What to activate/click (e.g., "glowing metal lump")
  target_slug VARCHAR(255),                   -- Slug for linking
  target_quantity DECIMAL(10,2),              -- e.g., 1.00 kg
  target_unit VARCHAR(20),                    -- 'kg', 'piece'
  submenu_path VARCHAR(255),                  -- For submenu: "Create > Weapon heads"
  raw_text TEXT,                              -- Original text for reference

  INDEX idx_step_item (item_id),
  INDEX idx_step_order (item_id, step_order),
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- USEFUL VIEWS
-- ============================================

-- View: Items with material count
CREATE OR REPLACE VIEW v_items_summary AS
SELECT
  i.id,
  i.slug,
  i.name,
  i.skill,
  i.difficulty,
  i.is_base_material,
  COUNT(DISTINCT rm.id) as material_count,
  COUNT(DISTINCT rt.id) as tool_count
FROM items i
LEFT JOIN recipe_materials rm ON rm.item_id = i.id
LEFT JOIN recipe_tools rt ON rt.item_id = i.id
GROUP BY i.id;

-- View: Full recipe with materials
CREATE OR REPLACE VIEW v_recipes AS
SELECT
  i.id as item_id,
  i.slug as item_slug,
  i.name as item_name,
  i.skill,
  i.difficulty,
  rm.material_name,
  rm.material_slug,
  rm.quantity,
  rm.unit,
  COALESCE(mi.is_base_material, TRUE) as material_is_base
FROM items i
JOIN recipe_materials rm ON rm.item_id = i.id
LEFT JOIN items mi ON mi.slug = rm.material_slug;

-- View: What can I craft with this material?
CREATE OR REPLACE VIEW v_material_uses AS
SELECT
  rm.material_slug,
  rm.material_name,
  i.id as craftable_item_id,
  i.slug as craftable_slug,
  i.name as craftable_name,
  rm.quantity as quantity_needed,
  rm.unit
FROM recipe_materials rm
JOIN items i ON i.id = rm.item_id;
