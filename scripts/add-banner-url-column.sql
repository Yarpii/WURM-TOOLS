-- Migration: Add banner_url column to users table
-- Run this in Railway MySQL Query tab

ALTER TABLE users
ADD COLUMN banner_url VARCHAR(500) AFTER avatar_url;
