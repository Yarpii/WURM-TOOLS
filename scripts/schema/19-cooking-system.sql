-- WURM-TOOLS MySQL Schema - Part 19: Cooking System
-- Run: mysql -u root -p wurmtools < 19-cooking-system.sql
-- Depends on: 01-core.sql

-- ========== COOKING COOKERS ==========
CREATE TABLE IF NOT EXISTS cooking_cookers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    affinity_value INT NOT NULL DEFAULT 0,
    description TEXT,
    icon_url VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========== COOKING CONTAINERS ==========
CREATE TABLE IF NOT EXISTS cooking_containers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    affinity_value INT NOT NULL DEFAULT 0,
    description TEXT,
    icon_url VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========== COOKING PREPARATIONS ==========
CREATE TABLE IF NOT EXISTS cooking_preparations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    affinity_modifier INT NOT NULL DEFAULT 0,
    applies_to JSON,  -- ['meat', 'veggie', etc.]
    description TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========== COOKING INGREDIENT CATEGORIES ==========
CREATE TABLE IF NOT EXISTS cooking_ingredient_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    display_order INT DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========== COOKING INGREDIENTS ==========
CREATE TABLE IF NOT EXISTS cooking_ingredients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    category_id INT NOT NULL,
    affinity_value INT NOT NULL DEFAULT 0,

    -- CCFP values (per kg)
    calories DECIMAL(10,2) DEFAULT 0,
    carbs DECIMAL(10,2) DEFAULT 0,
    fats DECIMAL(10,2) DEFAULT 0,
    proteins DECIMAL(10,2) DEFAULT 0,

    -- Additional info
    weight DECIMAL(10,4),
    difficulty_modifier INT DEFAULT 0,
    icon_url VARCHAR(255),
    notes TEXT,

    FOREIGN KEY (category_id) REFERENCES cooking_ingredient_categories(id),
    INDEX idx_category (category_id),
    INDEX idx_affinity (affinity_value),
    FULLTEXT INDEX ft_ingredient_search (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========== COOKING SKILLS (Affinity targets) ==========
CREATE TABLE IF NOT EXISTS cooking_skills (
    id INT PRIMARY KEY,  -- 0-137, fixed IDs
    name VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(50),  -- combat, crafting, nature, etc.

    INDEX idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========== COOKING RECIPES ==========
CREATE TABLE IF NOT EXISTS cooking_recipes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(200),

    -- Requirements
    cooker_id INT,
    container_id INT,
    skill_required VARCHAR(50) DEFAULT 'Hot Food Cooking',
    difficulty INT DEFAULT 1,

    -- Results
    result_name VARCHAR(200),
    ccfp_multiplier DECIMAL(5,2) DEFAULT 1.0,

    -- Flags
    is_verified BOOLEAN DEFAULT FALSE,
    fills_all_ccfp BOOLEAN DEFAULT FALSE,

    -- Metadata
    notes TEXT,
    source_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (cooker_id) REFERENCES cooking_cookers(id) ON DELETE SET NULL,
    FOREIGN KEY (container_id) REFERENCES cooking_containers(id) ON DELETE SET NULL,
    INDEX idx_name (name),
    INDEX idx_difficulty (difficulty),
    INDEX idx_skill (skill_required),
    FULLTEXT INDEX ft_recipe_search (name, result_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========== COOKING RECIPE INGREDIENTS ==========
CREATE TABLE IF NOT EXISTS cooking_recipe_ingredients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    recipe_id INT NOT NULL,
    ingredient_id INT NOT NULL,
    quantity DECIMAL(10,4) DEFAULT 1,
    is_mandatory BOOLEAN DEFAULT TRUE,
    preparation_id INT,
    notes TEXT,

    FOREIGN KEY (recipe_id) REFERENCES cooking_recipes(id) ON DELETE CASCADE,
    FOREIGN KEY (ingredient_id) REFERENCES cooking_ingredients(id) ON DELETE CASCADE,
    FOREIGN KEY (preparation_id) REFERENCES cooking_preparations(id) ON DELETE SET NULL,
    INDEX idx_recipe (recipe_id),
    INDEX idx_ingredient (ingredient_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========== USER PLAYER NUMBERS (for affinity calculation) ==========
CREATE TABLE IF NOT EXISTS user_player_numbers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    player_number INT NOT NULL CHECK (player_number >= 0 AND player_number <= 137),
    character_name VARCHAR(100),
    discovered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_char (user_id, character_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========== USER SAVED RECIPES ==========
CREATE TABLE IF NOT EXISTS user_saved_recipes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    recipe_name VARCHAR(200) NOT NULL,

    -- Recipe components (stored as JSON for flexibility)
    cooker_id INT,
    container_id INT,
    ingredients JSON NOT NULL,  -- [{ingredient_id, preparation_id, quantity, rarity}]

    -- Calculated values
    calculated_affinity_skill_id INT,
    calculated_ccfp JSON,  -- {calories, carbs, fats, proteins}

    -- Metadata
    notes TEXT,
    is_favorite BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (cooker_id) REFERENCES cooking_cookers(id) ON DELETE SET NULL,
    FOREIGN KEY (container_id) REFERENCES cooking_containers(id) ON DELETE SET NULL,
    FOREIGN KEY (calculated_affinity_skill_id) REFERENCES cooking_skills(id) ON DELETE SET NULL,
    INDEX idx_user (user_id),
    INDEX idx_favorite (user_id, is_favorite)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========== SEED DATA: COOKERS ==========
INSERT INTO cooking_cookers (name, affinity_value, description) VALUES
    ('None', 0, 'No cooker - raw preparation'),
    ('Campfire', 37, 'Basic outdoor cooking'),
    ('Oven', 40, 'Standard kitchen cooking'),
    ('Forge', 42, 'Higher difficulty cooking')
ON DUPLICATE KEY UPDATE affinity_value = VALUES(affinity_value);

-- ========== SEED DATA: CONTAINERS ==========
INSERT INTO cooking_containers (name, affinity_value, description) VALUES
    ('None', 0, 'No container'),
    ('Open Helm', 11, 'Emergency cooking container'),
    ('Pie Dish', 61, 'For baking pies'),
    ('Cake Tin', 62, 'For baking cakes'),
    ('Baking Stone', 63, 'Flat stone for baking'),
    ('Roasting Dish', 65, 'For roasting meats'),
    ('Plate', 69, 'Simple serving plate'),
    ('Sauce Pan', 74, 'For sauces and small dishes'),
    ('Frying Pan', 75, 'Most common cooking container'),
    ('Pottery Bowl', 77, 'Versatile mixing and cooking'),
    ('Mushroom Container', 119, 'Specialized for mushrooms'),
    ('Sausage Skin', 132, 'For making sausages')
ON DUPLICATE KEY UPDATE affinity_value = VALUES(affinity_value);

-- ========== SEED DATA: PREPARATIONS ==========
INSERT INTO cooking_preparations (name, affinity_modifier, applies_to, description) VALUES
    ('Whole', 0, '["meat", "veggie", "fruit", "fish"]', 'Unprocessed ingredient'),
    ('Fried', 1, '["meat", "veggie", "fish", "egg"]', 'Cooked in oil'),
    ('Roasted', 4, '["meat", "veggie", "nut"]', 'Dry heat cooking'),
    ('Steamed', 5, '["veggie", "fish"]', 'Cooked with steam'),
    ('Cooked', 7, '["meat", "veggie", "fish", "grain"]', 'Generally cooked'),
    ('Chopped', 16, '["veggie", "herb", "fruit", "mushroom"]', 'Cut into pieces'),
    ('Diced', 16, '["meat", "veggie", "fruit"]', 'Cut into small cubes'),
    ('Ground', 16, '["spice", "grain", "nut"]', 'Ground to powder'),
    ('Jam', 28, '["fruit", "berry"]', 'Made into jam'),
    ('Minced', 32, '["meat", "veggie", "herb"]', 'Finely chopped'),
    ('Mashed', 32, '["veggie", "fruit"]', 'Crushed to paste'),
    ('Sausage Veggie', 76, '["veggie"]', 'Prepared for sausage'),
    ('Fresh', 128, '["herb", "spice", "veggie"]', 'Freshly picked'),
    ('Sausage Meat', 132, '["meat"]', 'Prepared for sausage')
ON DUPLICATE KEY UPDATE affinity_modifier = VALUES(affinity_modifier);

-- ========== SEED DATA: INGREDIENT CATEGORIES ==========
INSERT INTO cooking_ingredient_categories (id, name, display_order) VALUES
    (1, 'Meat', 1),
    (2, 'Veggie', 2),
    (3, 'Fruit', 3),
    (4, 'Herb', 4),
    (5, 'Cheese', 5),
    (6, 'Spice', 6),
    (7, 'Mushroom', 7),
    (8, 'Fish', 8),
    (9, 'Misc', 9),
    (10, 'Nut', 10),
    (11, 'Grain', 11)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- ========== SEED DATA: SKILLS (138 total) ==========
INSERT INTO cooking_skills (id, name, category) VALUES
    (0, 'Mind', 'attributes'),
    (1, 'Body', 'attributes'),
    (2, 'Soul', 'attributes'),
    (3, 'Body Control', 'attributes'),
    (4, 'Body Stamina', 'attributes'),
    (5, 'Body Strength', 'attributes'),
    (6, 'Mind Logic', 'attributes'),
    (7, 'Mind Speed', 'attributes'),
    (8, 'Soul Depth', 'attributes'),
    (9, 'Soul Strength', 'attributes'),
    (10, 'Swords', 'combat'),
    (11, 'Axes', 'combat'),
    (12, 'Knives', 'combat'),
    (13, 'Mauls', 'combat'),
    (14, 'Clubs', 'combat'),
    (15, 'Hammers', 'combat'),
    (16, 'Archery', 'combat'),
    (17, 'Polearms', 'combat'),
    (18, 'Tailoring', 'crafting'),
    (19, 'Cooking', 'crafting'),
    (20, 'Smithing', 'crafting'),
    (21, 'Weaponsmithing', 'crafting'),
    (22, 'Armour Smithing', 'crafting'),
    (23, 'Misc Items', 'crafting'),
    (24, 'Shields', 'combat'),
    (25, 'Alchemy', 'crafting'),
    (26, 'Nature', 'nature'),
    (27, 'Toys', 'crafting'),
    (28, 'Fighting', 'combat'),
    (29, 'Healing', 'nature'),
    (30, 'Religion', 'religion'),
    (31, 'Thievery', 'misc'),
    (32, 'War Machines', 'combat'),
    (33, 'Farming', 'nature'),
    (34, 'Papyrus Making', 'crafting'),
    (35, 'Thatching', 'crafting'),
    (36, 'Gardening', 'nature'),
    (37, 'Animal Husbandry', 'nature'),
    (38, 'Forestry', 'nature'),
    (39, 'Rake', 'tools'),
    (40, 'Scythe', 'tools'),
    (41, 'Sickle', 'tools'),
    (42, 'Small Axe', 'tools'),
    (43, 'Mining', 'gathering'),
    (44, 'Digging', 'gathering'),
    (45, 'Pickaxe', 'tools'),
    (46, 'Shovel', 'tools'),
    (47, 'Pottery', 'crafting'),
    (48, 'Ropemaking', 'crafting'),
    (49, 'Religion', 'religion'),
    (50, 'Hatchet', 'tools'),
    (51, 'Leatherworking', 'crafting'),
    (52, 'Cloth Tailoring', 'crafting'),
    (53, 'Masonry', 'crafting'),
    (54, 'Blades Smithing', 'crafting'),
    (55, 'Weapon Heads Smithing', 'crafting'),
    (56, 'Chain Armour Smithing', 'crafting'),
    (57, 'Plate Armour Smithing', 'crafting'),
    (58, 'Shield Smithing', 'crafting'),
    (59, 'Blacksmithing', 'crafting'),
    (60, 'Dairy Food Making', 'cooking'),
    (61, 'Hot Food Cooking', 'cooking'),
    (62, 'Baking', 'cooking'),
    (63, 'Beverages', 'cooking'),
    (64, 'Longsword', 'weapons'),
    (65, 'Large Maul', 'weapons'),
    (66, 'Medium Maul', 'weapons'),
    (67, 'Small Maul', 'weapons'),
    (68, 'Warhammer', 'weapons'),
    (69, 'Long Spear', 'weapons'),
    (70, 'Halberd', 'weapons'),
    (71, 'Staff', 'weapons'),
    (72, 'Carving Knife', 'tools'),
    (73, 'Butchering Knife', 'tools'),
    (74, 'Stone Chisel', 'tools'),
    (75, 'Huge Club', 'weapons'),
    (76, 'Saw', 'tools'),
    (77, 'Butchering', 'crafting'),
    (78, 'Carpentry', 'crafting'),
    (79, 'Firemaking', 'misc'),
    (80, 'Tracking', 'nature'),
    (81, 'Small Wooden Shield', 'shields'),
    (82, 'Medium Wooden Shield', 'shields'),
    (83, 'Large Wooden Shield', 'shields'),
    (84, 'Small Metal Shield', 'shields'),
    (85, 'Large Metal Shield', 'shields'),
    (86, 'Medium Metal Shield', 'shields'),
    (87, 'Large Axe', 'weapons'),
    (88, 'Huge Axe', 'weapons'),
    (89, 'Shortsword', 'weapons'),
    (90, 'Two Handed Sword', 'weapons'),
    (91, 'Hammer', 'tools'),
    (92, 'Paving', 'crafting'),
    (93, 'Prospecting', 'gathering'),
    (94, 'Fishing', 'gathering'),
    (95, 'Locksmithing', 'crafting'),
    (96, 'Repairing', 'crafting'),
    (97, 'Coal-Making', 'crafting'),
    (98, 'Milling', 'crafting'),
    (99, 'Metallurgy', 'crafting'),
    (100, 'Natural Substances', 'crafting'),
    (101, 'Jewelry Smithing', 'crafting'),
    (102, 'Fine Carpentry', 'crafting'),
    (103, 'Bowyery', 'crafting'),
    (104, 'Fletching', 'crafting'),
    (105, 'Yoyo', 'misc'),
    (106, 'Puppeteering', 'misc'),
    (107, 'Toymaking', 'crafting'),
    (108, 'Weaponless Fighting', 'combat'),
    (109, 'Aggressive Fighting', 'combat'),
    (110, 'Defensive Fighting', 'combat'),
    (111, 'Normal Fighting', 'combat'),
    (112, 'First Aid', 'nature'),
    (113, 'Taunting', 'combat'),
    (114, 'Shield Bashing', 'combat'),
    (115, 'Milking', 'nature'),
    (116, 'Preaching', 'religion'),
    (117, 'Prayer', 'religion'),
    (118, 'Channeling', 'religion'),
    (119, 'Exorcism', 'religion'),
    (120, 'Artifacts', 'misc'),
    (121, 'Foraging', 'gathering'),
    (122, 'Botanizing', 'gathering'),
    (123, 'Climbing', 'misc'),
    (124, 'Stone Cutting', 'crafting'),
    (125, 'Lock Picking', 'thievery'),
    (126, 'Stealing', 'thievery'),
    (127, 'Traps', 'misc'),
    (128, 'Catapults', 'war_machines'),
    (129, 'Animal Taming', 'nature'),
    (130, 'Animal Husbandry', 'nature'),
    (131, 'Short Bow', 'archery'),
    (132, 'Long Bow', 'archery'),
    (133, 'Medium Bow', 'archery'),
    (134, 'Ship Building', 'crafting'),
    (135, 'Ballistae', 'war_machines'),
    (136, 'Trebuchets', 'war_machines'),
    (137, 'Turrets', 'war_machines')
ON DUPLICATE KEY UPDATE name = VALUES(name), category = VALUES(category);
