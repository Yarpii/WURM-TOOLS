-- WURM-TOOLS MySQL Schema - Part 15: Recipes
-- Run: mysql -u root -p wurmtools < 15-recipes.sql
-- Depends on: 03-crafting.sql, 13-seed-data.sql

-- ========== SEED DATA: RECIPES ==========
-- Uses a procedure to safely insert recipes by looking up item IDs

DELIMITER //

CREATE PROCEDURE IF NOT EXISTS insert_recipes()
BEGIN
    -- Insert recipes by looking up item IDs
    INSERT IGNORE INTO recipes (result_item_id, ingredient_item_id, quantity)
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
    JOIN items r ON r.name = data.result_name
    JOIN items i ON i.name = data.ingredient_name;
END //

DELIMITER ;

-- Run the procedure to insert recipes
CALL insert_recipes();

-- Drop the procedure after use (keeps DB clean)
DROP PROCEDURE IF EXISTS insert_recipes;
