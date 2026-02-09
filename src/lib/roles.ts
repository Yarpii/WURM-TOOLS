import { query, withTransaction } from "./db/core";

// ========== TYPES ==========

export interface Role {
  id: number;
  name: string;
  display_name: string;
  description: string | null;
  color: string;
  icon: string;
  priority: number;
  is_system: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface Permission {
  id: number;
  name: string;
  display_name: string;
  description: string | null;
  category: "admin" | "moderation" | "content" | "community" | "trading";
  created_at: string;
}

export interface UserRole {
  user_id: number;
  role_id: number;
  role_name: string;
  role_display_name: string;
  role_color: string;
  role_icon: string;
  role_priority: number;
  assigned_by: number | null;
  assigned_at: string;
}

export interface RoleAuditEntry {
  id: number;
  user_id: number;
  username: string;
  role_id: number;
  role_name: string;
  action: "assigned" | "removed";
  performed_by: number | null;
  performed_by_username: string | null;
  reason: string | null;
  created_at: string;
}

// ========== ROLE FUNCTIONS ==========

export async function getAllRoles(): Promise<Role[]> {
  const result = await query<Role>(
    `SELECT * FROM roles ORDER BY priority DESC, name ASC`
  );
  return result.rows;
}

export async function getRoleById(id: number): Promise<Role | null> {
  const result = await query<Role>(
    `SELECT * FROM roles WHERE id = ?`,
    [id]
  );
  return result.rows[0] || null;
}

export async function getRoleByName(name: string): Promise<Role | null> {
  const result = await query<Role>(
    `SELECT * FROM roles WHERE name = ?`,
    [name]
  );
  return result.rows[0] || null;
}

export async function createRole(input: {
  name: string;
  display_name: string;
  description?: string;
  color?: string;
  icon?: string;
  priority?: number;
}): Promise<{ success: true; role: Role } | { success: false; error: string }> {
  // Validate name format (lowercase, alphanumeric with underscores)
  if (!/^[a-z][a-z0-9_]*$/.test(input.name)) {
    return { success: false, error: "Role name must be lowercase alphanumeric with underscores" };
  }

  // Check for duplicate name
  const existing = await getRoleByName(input.name);
  if (existing) {
    return { success: false, error: "Role with this name already exists" };
  }

  try {
    await query(
      `INSERT INTO roles (name, display_name, description, color, icon, priority)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        input.name,
        input.display_name,
        input.description || null,
        input.color || "#6b7280",
        input.icon || "user",
        input.priority || 0,
      ]
    );

    const role = await getRoleByName(input.name);
    if (!role) {
      return { success: false, error: "Failed to create role" };
    }

    return { success: true, role };
  } catch (e) {
    return { success: false, error: "Failed to create role: " + String(e) };
  }
}

export async function updateRole(
  id: number,
  input: {
    display_name?: string;
    description?: string;
    color?: string;
    icon?: string;
    priority?: number;
  }
): Promise<boolean> {
  const role = await getRoleById(id);
  if (!role) return false;

  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (input.display_name !== undefined) {
    fields.push("display_name = ?");
    values.push(input.display_name);
  }
  if (input.description !== undefined) {
    fields.push("description = ?");
    values.push(input.description || null);
  }
  if (input.color !== undefined) {
    fields.push("color = ?");
    values.push(input.color);
  }
  if (input.icon !== undefined) {
    fields.push("icon = ?");
    values.push(input.icon);
  }
  if (input.priority !== undefined) {
    fields.push("priority = ?");
    values.push(input.priority);
  }

  if (fields.length === 0) return false;

  const result = await query(
    `UPDATE roles SET ${fields.join(", ")} WHERE id = ?`,
    [...values, id]
  );

  return result.rowCount > 0;
}

export async function deleteRole(id: number): Promise<{ success: boolean; error?: string }> {
  const role = await getRoleById(id);
  if (!role) {
    return { success: false, error: "Role not found" };
  }

  if (role.is_system) {
    return { success: false, error: "Cannot delete system roles" };
  }

  try {
    await query(`DELETE FROM roles WHERE id = ?`, [id]);
    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete role" };
  }
}

// ========== PERMISSION FUNCTIONS ==========

export async function getAllPermissions(): Promise<Permission[]> {
  const result = await query<Permission>(
    `SELECT * FROM permissions ORDER BY category, name`
  );
  return result.rows;
}

export async function getPermissionsByCategory(): Promise<Record<string, Permission[]>> {
  const permissions = await getAllPermissions();
  const grouped: Record<string, Permission[]> = {};

  for (const perm of permissions) {
    if (!grouped[perm.category]) {
      grouped[perm.category] = [];
    }
    grouped[perm.category].push(perm);
  }

  return grouped;
}

export async function getRolePermissions(roleId: number): Promise<Permission[]> {
  const result = await query<Permission>(
    `SELECT p.* FROM permissions p
     JOIN role_permissions rp ON rp.permission_id = p.id
     WHERE rp.role_id = ?
     ORDER BY p.category, p.name`,
    [roleId]
  );
  return result.rows;
}

export async function setRolePermissions(
  roleId: number,
  permissionIds: number[]
): Promise<boolean> {
  try {
    await withTransaction(async (client) => {
      // Remove all existing permissions
      await client.query(
        `DELETE FROM role_permissions WHERE role_id = ?`,
        [roleId]
      );

      // Add new permissions (parameterized to prevent SQL injection)
      if (permissionIds.length > 0) {
        const placeholders = permissionIds.map(() => "(?, ?)").join(", ");
        const params = permissionIds.flatMap((pid) => [roleId, pid]);
        await client.query(
          `INSERT INTO role_permissions (role_id, permission_id) VALUES ${placeholders}`,
          params
        );
      }
    });

    return true;
  } catch {
    return false;
  }
}

// ========== USER ROLE FUNCTIONS ==========

export async function getUserRoles(userId: number): Promise<UserRole[]> {
  const result = await query<UserRole>(
    `SELECT
       ur.user_id,
       ur.role_id,
       r.name as role_name,
       r.display_name as role_display_name,
       r.color as role_color,
       r.icon as role_icon,
       r.priority as role_priority,
       ur.assigned_by,
       ur.assigned_at
     FROM user_roles ur
     JOIN roles r ON r.id = ur.role_id
     WHERE ur.user_id = ?
     ORDER BY r.priority DESC`,
    [userId]
  );
  return result.rows;
}

export async function getUserPrimaryRole(userId: number): Promise<UserRole | null> {
  const roles = await getUserRoles(userId);
  return roles[0] || null;
}

export async function hasRole(userId: number, roleName: string): Promise<boolean> {
  const result = await query<{ count: number }>(
    `SELECT COUNT(*) as count FROM user_roles ur
     JOIN roles r ON r.id = ur.role_id
     WHERE ur.user_id = ? AND r.name = ?`,
    [userId, roleName]
  );
  return (result.rows[0]?.count || 0) > 0;
}

export async function assignRole(
  userId: number,
  roleId: number,
  assignedBy: number | null,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if already has this role
    const existing = await query<{ count: number }>(
      `SELECT COUNT(*) as count FROM user_roles WHERE user_id = ? AND role_id = ?`,
      [userId, roleId]
    );

    if ((existing.rows[0]?.count || 0) > 0) {
      return { success: false, error: "User already has this role" };
    }

    await withTransaction(async (client) => {
      // Assign the role
      await client.query(
        `INSERT INTO user_roles (user_id, role_id, assigned_by) VALUES (?, ?, ?)`,
        [userId, roleId, assignedBy]
      );

      // Log the action
      await client.query(
        `INSERT INTO role_audit_log (user_id, role_id, action, performed_by, reason)
         VALUES (?, ?, 'assigned', ?, ?)`,
        [userId, roleId, assignedBy, reason || null]
      );
    });

    // Update legacy role column if this is admin role
    const role = await getRoleById(roleId);
    if (role?.name === "admin") {
      await query(`UPDATE users SET role = 'admin' WHERE id = ?`, [userId]);
    }

    return { success: true };
  } catch (e) {
    return { success: false, error: "Failed to assign role: " + String(e) };
  }
}

export async function removeRole(
  userId: number,
  roleId: number,
  removedBy: number | null,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if user has this role
    const existing = await query<{ count: number }>(
      `SELECT COUNT(*) as count FROM user_roles WHERE user_id = ? AND role_id = ?`,
      [userId, roleId]
    );

    if ((existing.rows[0]?.count || 0) === 0) {
      return { success: false, error: "User does not have this role" };
    }

    // Don't allow removing the member role
    const role = await getRoleById(roleId);
    if (role?.name === "member") {
      return { success: false, error: "Cannot remove the member role" };
    }

    await withTransaction(async (client) => {
      // Remove the role
      await client.query(
        `DELETE FROM user_roles WHERE user_id = ? AND role_id = ?`,
        [userId, roleId]
      );

      // Log the action
      await client.query(
        `INSERT INTO role_audit_log (user_id, role_id, action, performed_by, reason)
         VALUES (?, ?, 'removed', ?, ?)`,
        [userId, roleId, removedBy, reason || null]
      );
    });

    // Update legacy role column if this was admin role
    if (role?.name === "admin") {
      await query(`UPDATE users SET role = 'user' WHERE id = ?`, [userId]);
    }

    return { success: true };
  } catch (e) {
    return { success: false, error: "Failed to remove role: " + String(e) };
  }
}

// ========== PERMISSION CHECK FUNCTIONS ==========

export async function getUserPermissions(userId: number): Promise<string[]> {
  const result = await query<{ name: string }>(
    `SELECT DISTINCT p.name FROM permissions p
     JOIN role_permissions rp ON rp.permission_id = p.id
     JOIN user_roles ur ON ur.role_id = rp.role_id
     WHERE ur.user_id = ?`,
    [userId]
  );
  return result.rows.map((r) => r.name);
}

export async function hasPermission(userId: number, permissionName: string): Promise<boolean> {
  const result = await query<{ count: number }>(
    `SELECT COUNT(*) as count FROM permissions p
     JOIN role_permissions rp ON rp.permission_id = p.id
     JOIN user_roles ur ON ur.role_id = rp.role_id
     WHERE ur.user_id = ? AND p.name = ?`,
    [userId, permissionName]
  );
  return (result.rows[0]?.count || 0) > 0;
}

export async function hasAnyPermission(userId: number, permissionNames: string[]): Promise<boolean> {
  if (permissionNames.length === 0) return false;

  const placeholders = permissionNames.map(() => "?").join(", ");
  const result = await query<{ count: number }>(
    `SELECT COUNT(*) as count FROM permissions p
     JOIN role_permissions rp ON rp.permission_id = p.id
     JOIN user_roles ur ON ur.role_id = rp.role_id
     WHERE ur.user_id = ? AND p.name IN (${placeholders})`,
    [userId, ...permissionNames]
  );
  return (result.rows[0]?.count || 0) > 0;
}

export async function hasAllPermissions(userId: number, permissionNames: string[]): Promise<boolean> {
  if (permissionNames.length === 0) return true;

  const permissions = await getUserPermissions(userId);
  return permissionNames.every((p) => permissions.includes(p));
}

// ========== AUDIT LOG FUNCTIONS ==========

export async function getRoleAuditLog(
  options: {
    userId?: number;
    roleId?: number;
    limit?: number;
    offset?: number;
  } = {}
): Promise<RoleAuditEntry[]> {
  const conditions: string[] = [];
  const params: (number | string)[] = [];

  if (options.userId !== undefined) {
    conditions.push("ral.user_id = ?");
    params.push(options.userId);
  }
  if (options.roleId !== undefined) {
    conditions.push("ral.role_id = ?");
    params.push(options.roleId);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = options.limit || 100;
  const offset = options.offset || 0;

  const result = await query<RoleAuditEntry>(
    `SELECT
       ral.id,
       ral.user_id,
       u.username,
       ral.role_id,
       r.name as role_name,
       ral.action,
       ral.performed_by,
       pb.username as performed_by_username,
       ral.reason,
       ral.created_at
     FROM role_audit_log ral
     JOIN users u ON u.id = ral.user_id
     LEFT JOIN roles r ON r.id = ral.role_id
     LEFT JOIN users pb ON pb.id = ral.performed_by
     ${whereClause}
     ORDER BY ral.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return result.rows;
}

// ========== UTILITY FUNCTIONS ==========

export async function getUsersWithRole(roleId: number): Promise<{
  user_id: number;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  assigned_at: string;
}[]> {
  const result = await query<{
    user_id: number;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    assigned_at: string;
  }>(
    `SELECT
       u.id as user_id,
       u.username,
       u.display_name,
       u.avatar_url,
       ur.assigned_at
     FROM users u
     JOIN user_roles ur ON ur.user_id = u.id
     WHERE ur.role_id = ?
     ORDER BY ur.assigned_at DESC`,
    [roleId]
  );
  return result.rows;
}

export async function getRoleStats(): Promise<{
  total_roles: number;
  total_permissions: number;
  roles_with_users: { role_id: number; role_name: string; user_count: number }[];
}> {
  const [roleCount, permCount, roleUsers] = await Promise.all([
    query<{ count: number }>(`SELECT COUNT(*) as count FROM roles`),
    query<{ count: number }>(`SELECT COUNT(*) as count FROM permissions`),
    query<{ role_id: number; role_name: string; user_count: number }>(
      `SELECT r.id as role_id, r.name as role_name, COUNT(ur.user_id) as user_count
       FROM roles r
       LEFT JOIN user_roles ur ON ur.role_id = r.id
       GROUP BY r.id, r.name
       ORDER BY r.priority DESC`
    ),
  ]);

  return {
    total_roles: roleCount.rows[0]?.count || 0,
    total_permissions: permCount.rows[0]?.count || 0,
    roles_with_users: roleUsers.rows,
  };
}

// ========== MIGRATION HELPER ==========

export async function ensureUserHasDefaultRole(userId: number): Promise<void> {
  // Check if user has any roles
  const roles = await getUserRoles(userId);
  if (roles.length > 0) return;

  // Get the default role
  const defaultRole = await query<Role>(
    `SELECT * FROM roles WHERE is_default = TRUE LIMIT 1`
  );

  if (defaultRole.rows.length > 0) {
    await assignRole(userId, defaultRole.rows[0].id, null, "Auto-assigned default role");
  }
}

// Initialize roles for a new user (called during registration)
export async function initializeUserRoles(userId: number): Promise<void> {
  // Get all default roles
  const defaultRoles = await query<Role>(
    `SELECT * FROM roles WHERE is_default = TRUE`
  );

  for (const role of defaultRoles.rows) {
    await query(
      `INSERT IGNORE INTO user_roles (user_id, role_id, assigned_by) VALUES (?, ?, NULL)`,
      [userId, role.id]
    );
  }
}
