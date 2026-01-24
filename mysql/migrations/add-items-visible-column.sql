-- Migration: Add visible column to items table
-- Run: mysql -u root -p wurmtools < migrations/add-items-visible-column.sql
--
-- This adds admin control over which items appear in the crafting calculator.
-- Default is FALSE so all items are hidden until manually enabled.

ALTER TABLE items
ADD COLUMN IF NOT EXISTS visible BOOLEAN DEFAULT FALSE
AFTER is_base_material;

-- Add index for faster filtering
CREATE INDEX IF NOT EXISTS idx_items_visible ON items(visible);

-- Optionally: Enable all items that have recipes (are actually craftable)
-- UPDATE items SET visible = TRUE WHERE id IN (
--   SELECT DISTINCT item_id FROM recipe_materials
--   UNION
--   SELECT DISTINCT item_id FROM recipe_steps
-- );
