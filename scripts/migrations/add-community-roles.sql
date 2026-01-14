-- Migration: Add Community Roles & Permissions System
-- This migration adds the roles/permissions tables and migrates existing users
-- Run after: 17-community-roles.sql schema is applied

-- ========== MIGRATE EXISTING USERS TO NEW ROLE SYSTEM ==========

-- Assign 'admin' role to existing admins
INSERT INTO user_roles (user_id, role_id, assigned_by, assigned_at)
SELECT
    u.id as user_id,
    r.id as role_id,
    NULL as assigned_by,
    u.created_at as assigned_at
FROM users u
JOIN roles r ON r.name = 'admin'
WHERE u.role = 'admin'
ON DUPLICATE KEY UPDATE assigned_at = VALUES(assigned_at);

-- Assign 'member' role to all users (everyone gets the base member role)
INSERT INTO user_roles (user_id, role_id, assigned_by, assigned_at)
SELECT
    u.id as user_id,
    r.id as role_id,
    NULL as assigned_by,
    u.created_at as assigned_at
FROM users u
JOIN roles r ON r.name = 'member'
ON DUPLICATE KEY UPDATE assigned_at = VALUES(assigned_at);

-- Log the migration in audit log
INSERT INTO role_audit_log (user_id, role_id, action, performed_by, reason, created_at)
SELECT
    ur.user_id,
    ur.role_id,
    'assigned',
    NULL,
    'System migration from legacy role system',
    NOW()
FROM user_roles ur
WHERE NOT EXISTS (
    SELECT 1 FROM role_audit_log ral
    WHERE ral.user_id = ur.user_id
    AND ral.role_id = ur.role_id
    AND ral.reason = 'System migration from legacy role system'
);

-- Note: The legacy 'role' column in users table is kept for backwards compatibility
-- It will continue to work alongside the new system during transition
