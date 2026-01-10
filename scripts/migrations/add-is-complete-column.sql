-- Migration: Add is_complete column to project_items
-- Run: mysql -u root -p wurmtools < add-is-complete-column.sql
-- This adds a computed column that checks if completed_quantity >= quantity

-- Check if column exists before adding
SET @column_exists = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'project_items'
    AND COLUMN_NAME = 'is_complete'
);

SET @sql = IF(@column_exists = 0,
    'ALTER TABLE project_items ADD COLUMN is_complete BOOLEAN GENERATED ALWAYS AS (completed_quantity >= quantity) STORED',
    'SELECT "Column is_complete already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add index for the new column if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_project_items_complete ON project_items(is_complete);
