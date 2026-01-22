-- WURM-TOOLS MySQL Schema - Part 15: Legacy Recipe Seed Data
-- Run: mysql -u root -p wurmtools < 15-recipes.sql
-- Depends on: 03-crafting.sql, 13-seed-data.sql

-- ========== SEED DATA: LEGACY RECIPES ==========
-- This seeds the legacy_items and legacy_recipes tables for backwards compatibility
-- The new recipe system uses the items/recipe_materials/recipe_tools/recipe_steps tables

DELIMITER //

CREATE PROCEDURE IF NOT EXISTS insert_legacy_recipes()
BEGIN
    -- Insert base items first
    INSERT IGNORE INTO legacy_items (name, category, is_base_material) VALUES
    ('Log', 'materials', TRUE),
    ('Iron Ore', 'materials', TRUE),
    ('Cotton', 'materials', TRUE),
    ('Clay', 'materials', TRUE),
    ('Rock Shards', 'materials', TRUE);

    -- Insert crafted items
    INSERT IGNORE INTO legacy_items (name, category, is_base_material, skill_type) VALUES
    ('Plank', 'materials', FALSE, 'carpentry'),
    ('Shaft', 'materials', FALSE, 'carpentry'),
    ('Iron Lump', 'materials', FALSE, 'smelting'),
    ('Small Nail', 'materials', FALSE, 'blacksmithing'),
    ('Large Nail', 'materials', FALSE, 'blacksmithing'),
    ('Rope', 'materials', FALSE, 'ropemaking'),
    ('Spindle', 'tools', FALSE, 'carpentry'),
    ('Mallet', 'tools', FALSE, 'carpentry'),
    ('Hammer', 'tools', FALSE, 'blacksmithing'),
    ('Saw', 'tools', FALSE, 'blacksmithing'),
    ('Wheel Axle', 'components', FALSE, 'carpentry'),
    ('Wheel', 'components', FALSE, 'carpentry'),
    ('Cart', 'vehicles', FALSE, 'carpentry'),
    ('Large Cart', 'vehicles', FALSE, 'carpentry'),
    ('Brick', 'materials', FALSE, 'masonry'),
    ('Mortar', 'materials', FALSE, 'masonry');

    -- Insert recipes by looking up item IDs
    INSERT IGNORE INTO legacy_recipes (result_item_id, ingredient_item_id, quantity)
    SELECT r.id, i.id, data.qty
    FROM (
        SELECT 'Plank' AS result_name, 'Log' AS ingredient_name, 1 AS qty UNION ALL
        SELECT 'Shaft', 'Log', 1 UNION ALL
        SELECT 'Iron Lump', 'Iron Ore', 1 UNION ALL
        SELECT 'Small Nail', 'Iron Lump', 0.1 UNION ALL
        SELECT 'Large Nail', 'Iron Lump', 0.2 UNION ALL
        SELECT 'Rope', 'Cotton', 2 UNION ALL
        SELECT 'Spindle', 'Shaft', 1 UNION ALL
        SELECT 'Mallet', 'Shaft', 1 UNION ALL
        SELECT 'Mallet', 'Plank', 1 UNION ALL
        SELECT 'Hammer', 'Shaft', 1 UNION ALL
        SELECT 'Hammer', 'Iron Lump', 1 UNION ALL
        SELECT 'Saw', 'Shaft', 1 UNION ALL
        SELECT 'Saw', 'Iron Lump', 2 UNION ALL
        SELECT 'Wheel Axle', 'Shaft', 1 UNION ALL
        SELECT 'Wheel Axle', 'Small Nail', 2 UNION ALL
        SELECT 'Wheel', 'Plank', 3 UNION ALL
        SELECT 'Wheel', 'Shaft', 1 UNION ALL
        SELECT 'Wheel', 'Small Nail', 4 UNION ALL
        SELECT 'Cart', 'Wheel', 2 UNION ALL
        SELECT 'Cart', 'Wheel Axle', 1 UNION ALL
        SELECT 'Cart', 'Plank', 10 UNION ALL
        SELECT 'Cart', 'Shaft', 2 UNION ALL
        SELECT 'Cart', 'Rope', 1 UNION ALL
        SELECT 'Cart', 'Large Nail', 10 UNION ALL
        SELECT 'Large Cart', 'Wheel', 4 UNION ALL
        SELECT 'Large Cart', 'Wheel Axle', 2 UNION ALL
        SELECT 'Large Cart', 'Plank', 20 UNION ALL
        SELECT 'Large Cart', 'Shaft', 4 UNION ALL
        SELECT 'Large Cart', 'Rope', 2 UNION ALL
        SELECT 'Large Cart', 'Large Nail', 20 UNION ALL
        SELECT 'Brick', 'Clay', 1 UNION ALL
        SELECT 'Mortar', 'Clay', 1 UNION ALL
        SELECT 'Mortar', 'Rock Shards', 1
    ) AS data
    JOIN legacy_items r ON r.name = data.result_name
    JOIN legacy_items i ON i.name = data.ingredient_name;
END //

DELIMITER ;

-- Run the procedure to insert legacy recipes
CALL insert_legacy_recipes();

-- Drop the procedure after use (keeps DB clean)
DROP PROCEDURE IF EXISTS insert_legacy_recipes;
