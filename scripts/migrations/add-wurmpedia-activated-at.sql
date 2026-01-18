-- Migration: Add activated_at column to wurmpedia_recipes table
-- Run: mysql -u root -p wurmtools < add-wurmpedia-activated-at.sql

ALTER TABLE wurmpedia_recipes
ADD COLUMN IF NOT EXISTS activated_at TIMESTAMP NULL DEFAULT NULL
AFTER recipe_type;

-- If your MySQL version doesn't support IF NOT EXISTS, use this instead:
-- ALTER TABLE wurmpedia_recipes ADD COLUMN activated_at TIMESTAMP NULL DEFAULT NULL AFTER recipe_type;
