-- WURM-TOOLS MySQL Schema - Part 17: Community Roles & Permissions
-- Run: mysql -u root -p wurmtools < 17-community-roles.sql
-- Depends on: 01-core.sql

-- ========== COMMUNITY ROLES ==========

-- Predefined roles with permissions
CREATE TABLE IF NOT EXISTS roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7) NOT NULL DEFAULT '#6b7280',  -- Hex color for badges
    icon VARCHAR(50) DEFAULT 'user',               -- Icon name for display
    priority INT NOT NULL DEFAULT 0,               -- Higher = more important (for display order)
    is_system BOOLEAN NOT NULL DEFAULT FALSE,      -- System roles can't be deleted
    is_default BOOLEAN NOT NULL DEFAULT FALSE,     -- Auto-assigned to new users
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_roles_priority ON roles(priority DESC);
CREATE INDEX idx_roles_is_default ON roles(is_default);

-- Available permissions in the system
CREATE TABLE IF NOT EXISTS permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(150) NOT NULL,
    description TEXT,
    category ENUM('admin', 'moderation', 'content', 'community', 'trading') NOT NULL DEFAULT 'community',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_permissions_category ON permissions(category);

-- Role-Permission mapping (many-to-many)
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INT NOT NULL,
    permission_id INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (role_id, permission_id),
    CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    CONSTRAINT fk_role_permissions_permission FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User-Role mapping (users can have multiple roles)
CREATE TABLE IF NOT EXISTS user_roles (
    user_id INT NOT NULL,
    role_id INT NOT NULL,
    assigned_by INT NULL,
    assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (user_id, role_id),
    CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_roles_assigned_by FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role_id);

-- Role change audit log
CREATE TABLE IF NOT EXISTS role_audit_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    role_id INT NOT NULL,
    action ENUM('assigned', 'removed') NOT NULL,
    performed_by INT NULL,
    reason TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_role_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_role_audit_performed_by FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_role_audit_user ON role_audit_log(user_id);
CREATE INDEX idx_role_audit_role ON role_audit_log(role_id);
CREATE INDEX idx_role_audit_created ON role_audit_log(created_at DESC);

-- ========== SEED DATA: DEFAULT ROLES ==========

INSERT INTO roles (name, display_name, description, color, icon, priority, is_system, is_default) VALUES
    ('admin', 'Administrator', 'Full system access and management', '#dc2626', 'shield-check', 100, TRUE, FALSE),
    ('moderator', 'Moderator', 'Community moderation and content management', '#ea580c', 'shield', 80, TRUE, FALSE),
    ('helper', 'Helper', 'Community helper - assists new members', '#16a34a', 'hand-helping', 60, TRUE, FALSE),
    ('content_creator', 'Content Creator', 'Creates guides, tutorials, and community content', '#8b5cf6', 'pencil', 50, TRUE, FALSE),
    ('trusted_trader', 'Trusted Trader', 'Verified trusted community trader', '#0891b2', 'badge-check', 40, TRUE, FALSE),
    ('contributor', 'Contributor', 'Active community contributor', '#2563eb', 'star', 30, TRUE, FALSE),
    ('member', 'Member', 'Registered community member', '#6b7280', 'user', 0, TRUE, TRUE)
ON DUPLICATE KEY UPDATE display_name = VALUES(display_name);

-- ========== SEED DATA: DEFAULT PERMISSIONS ==========

INSERT INTO permissions (name, display_name, description, category) VALUES
    -- Admin permissions
    ('admin.access', 'Admin Panel Access', 'Access to the admin panel', 'admin'),
    ('admin.users.manage', 'Manage Users', 'Create, edit, and delete user accounts', 'admin'),
    ('admin.roles.manage', 'Manage Roles', 'Create, edit, and delete roles', 'admin'),
    ('admin.settings.manage', 'Manage Settings', 'Modify system-wide settings', 'admin'),
    ('admin.data.sync', 'Sync Data', 'Trigger data synchronization with external sources', 'admin'),

    -- Moderation permissions
    ('mod.users.ban', 'Ban Users', 'Ban or unban users from the community', 'moderation'),
    ('mod.users.warn', 'Warn Users', 'Issue warnings to users', 'moderation'),
    ('mod.content.edit', 'Edit Any Content', 'Edit any user-submitted content', 'moderation'),
    ('mod.content.delete', 'Delete Any Content', 'Delete any user-submitted content', 'moderation'),
    ('mod.reports.view', 'View Reports', 'View user and content reports', 'moderation'),
    ('mod.reports.handle', 'Handle Reports', 'Resolve and manage reports', 'moderation'),
    ('mod.audit.view', 'View Audit Log', 'View moderation audit logs', 'moderation'),

    -- Content permissions
    ('content.resources.create', 'Create Resources', 'Create community resources and guides', 'content'),
    ('content.resources.edit', 'Edit Own Resources', 'Edit own community resources', 'content'),
    ('content.resources.feature', 'Feature Resources', 'Mark resources as featured', 'content'),
    ('content.recipes.submit', 'Submit Recipes', 'Submit new recipes for approval', 'content'),
    ('content.recipes.approve', 'Approve Recipes', 'Approve or reject recipe submissions', 'content'),

    -- Community permissions
    ('community.profile.edit', 'Edit Own Profile', 'Edit own profile information', 'community'),
    ('community.characters.manage', 'Manage Characters', 'Add and manage own characters', 'community'),
    ('community.alliance.create', 'Create Alliance', 'Create new alliances', 'community'),
    ('community.alliance.manage', 'Manage Alliance', 'Manage own alliance settings', 'community'),
    ('community.events.create', 'Create Events', 'Create community events', 'community'),
    ('community.map.edit', 'Edit Map Locations', 'Add and edit map locations', 'community'),

    -- Trading permissions
    ('trading.merchant.create', 'Create Merchant', 'Create merchant listings', 'trading'),
    ('trading.orders.create', 'Create Orders', 'Create buy/sell orders', 'trading'),
    ('trading.prices.submit', 'Submit Prices', 'Submit price data', 'trading'),
    ('trading.trusted', 'Trusted Trader Badge', 'Display trusted trader badge', 'trading')
ON DUPLICATE KEY UPDATE display_name = VALUES(display_name);

-- ========== ASSIGN PERMISSIONS TO ROLES ==========

-- Admin gets ALL permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'admin'
ON DUPLICATE KEY UPDATE role_id = role_id;

-- Moderator permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'moderator' AND p.name IN (
    'admin.access',
    'mod.users.ban', 'mod.users.warn',
    'mod.content.edit', 'mod.content.delete',
    'mod.reports.view', 'mod.reports.handle', 'mod.audit.view',
    'content.resources.feature', 'content.recipes.approve',
    'community.profile.edit', 'community.characters.manage',
    'community.alliance.create', 'community.alliance.manage',
    'community.events.create', 'community.map.edit',
    'trading.merchant.create', 'trading.orders.create', 'trading.prices.submit'
)
ON DUPLICATE KEY UPDATE role_id = role_id;

-- Helper permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'helper' AND p.name IN (
    'mod.reports.view',
    'community.profile.edit', 'community.characters.manage',
    'community.alliance.create', 'community.alliance.manage',
    'community.events.create', 'community.map.edit',
    'trading.merchant.create', 'trading.orders.create', 'trading.prices.submit'
)
ON DUPLICATE KEY UPDATE role_id = role_id;

-- Content Creator permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'content_creator' AND p.name IN (
    'content.resources.create', 'content.resources.edit',
    'content.recipes.submit',
    'community.profile.edit', 'community.characters.manage',
    'community.alliance.create', 'community.alliance.manage',
    'community.events.create', 'community.map.edit',
    'trading.merchant.create', 'trading.orders.create', 'trading.prices.submit'
)
ON DUPLICATE KEY UPDATE role_id = role_id;

-- Trusted Trader permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'trusted_trader' AND p.name IN (
    'trading.trusted',
    'community.profile.edit', 'community.characters.manage',
    'community.alliance.create', 'community.alliance.manage',
    'community.map.edit',
    'trading.merchant.create', 'trading.orders.create', 'trading.prices.submit'
)
ON DUPLICATE KEY UPDATE role_id = role_id;

-- Contributor permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'contributor' AND p.name IN (
    'content.recipes.submit',
    'community.profile.edit', 'community.characters.manage',
    'community.alliance.create', 'community.alliance.manage',
    'community.map.edit',
    'trading.merchant.create', 'trading.orders.create', 'trading.prices.submit'
)
ON DUPLICATE KEY UPDATE role_id = role_id;

-- Member (default) permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'member' AND p.name IN (
    'community.profile.edit', 'community.characters.manage',
    'community.alliance.create', 'community.alliance.manage',
    'community.map.edit',
    'trading.merchant.create', 'trading.orders.create', 'trading.prices.submit'
)
ON DUPLICATE KEY UPDATE role_id = role_id;
