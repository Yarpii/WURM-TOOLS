import { query } from "./core";
import { getItem } from "./items";
import { calculateBaseMaterials } from "./calculator";
import type {
  Project,
  ProjectItem,
  ProjectMaterial,
  CreateProjectInput,
  UpdateProjectInput,
  AddProjectItemInput,
} from "../types";

// ========== PROJECTS ==========

export async function getUserProjects(userId: number): Promise<Project[]> {
  const result = await query<Project>(
    "SELECT * FROM projects WHERE user_id = ? ORDER BY created_at DESC",
    [userId]
  );
  return result.rows;
}

export async function getSharedProjects(allianceId: number): Promise<Project[]> {
  const result = await query<Project>(
    "SELECT * FROM projects WHERE alliance_id = ? AND is_shared = 1 ORDER BY created_at DESC",
    [allianceId]
  );
  return result.rows;
}

export async function getProjectById(projectId: number): Promise<Project | null> {
  const result = await query<Project>("SELECT * FROM projects WHERE id = ?", [projectId]);
  return result.rows[0] || null;
}

export async function createProject(userId: number, input: CreateProjectInput): Promise<number> {
  await query(
    `INSERT INTO projects (user_id, name, description, status, is_shared, alliance_id)
     VALUES (?, ?, ?, 'planning', ?, ?)`,
    [userId, input.name, input.description || null, input.is_shared ? 1 : 0, input.alliance_id || null]
  );

  const idResult = await query<{ id: number }>("SELECT LAST_INSERT_ID() as id");
  return idResult.rows[0]?.id || 0;
}

export async function updateProject(
  projectId: number,
  userId: number,
  input: UpdateProjectInput
): Promise<boolean> {
  const project = await getProjectById(projectId);
  if (!project || project.user_id !== userId) return false;

  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (input.name !== undefined) {
    fields.push("name = ?");
    values.push(input.name);
  }
  if (input.description !== undefined) {
    fields.push("description = ?");
    values.push(input.description);
  }
  if (input.status !== undefined) {
    fields.push("status = ?");
    values.push(input.status);
  }
  if (input.is_shared !== undefined) {
    fields.push("is_shared = ?");
    values.push(input.is_shared ? 1 : 0);
  }

  if (fields.length === 0) return false;

  values.push(projectId);
  const result = await query(`UPDATE projects SET ${fields.join(", ")} WHERE id = ?`, values);
  return result.rowCount > 0;
}

export async function deleteProject(projectId: number, userId: number): Promise<boolean> {
  const project = await getProjectById(projectId);
  if (!project || project.user_id !== userId) return false;

  await query("DELETE FROM project_items WHERE project_id = ?", [projectId]);
  const result = await query("DELETE FROM projects WHERE id = ?", [projectId]);
  return result.rowCount > 0;
}

export async function getProjectItems(projectId: number): Promise<ProjectItem[]> {
  const result = await query<ProjectItem>(
    "SELECT * FROM project_items WHERE project_id = ? ORDER BY id",
    [projectId]
  );
  return result.rows;
}

export async function addProjectItem(projectId: number, input: AddProjectItemInput): Promise<number> {
  await query(
    `INSERT INTO project_items (project_id, item_id, quantity, completed_quantity)
     VALUES (?, ?, ?, 0)`,
    [projectId, input.item_id, input.quantity]
  );

  const idResult = await query<{ id: number }>("SELECT LAST_INSERT_ID() as id");
  return idResult.rows[0]?.id || 0;
}

// ========== PROJECT MATERIALS ==========

export async function getProjectMaterials(projectId: number): Promise<ProjectMaterial[]> {
  const items = await getProjectItems(projectId);
  const materialMap = new Map<number, ProjectMaterial>();

  for (const item of items) {
    const itemData = await getItem(item.item_id);
    if (!itemData) continue;

    // Get base materials for this item
    const baseMaterials = await calculateBaseMaterials(item.item_id, item.quantity);

    for (const [matId, quantity] of baseMaterials) {
      const material = await getItem(matId);
      if (!material) continue;

      const existing = materialMap.get(matId);
      if (existing) {
        existing.required_quantity += quantity;
        existing.remaining_quantity = existing.required_quantity - existing.completed_quantity;
      } else {
        materialMap.set(matId, {
          item_id: matId,
          item_name: material.name,
          category: material.category,
          required_quantity: quantity,
          completed_quantity: 0,
          remaining_quantity: quantity,
        });
      }
    }
  }

  return Array.from(materialMap.values()).sort((a, b) => a.item_name.localeCompare(b.item_name));
}

export async function removeProjectItem(
  itemId: number,
  projectId: number,
  userId: number
): Promise<boolean> {
  const project = await getProjectById(projectId);
  if (!project || project.user_id !== userId) return false;

  const result = await query("DELETE FROM project_items WHERE id = ? AND project_id = ?", [
    itemId,
    projectId,
  ]);
  return result.rowCount > 0;
}

export async function updateProjectItemProgress(
  itemId: number,
  projectId: number,
  userId: number,
  completedQty: number
): Promise<boolean> {
  const project = await getProjectById(projectId);
  if (!project || project.user_id !== userId) return false;

  const result = await query(
    "UPDATE project_items SET quantity_completed = ? WHERE id = ? AND project_id = ?",
    [completedQty, itemId, projectId]
  );
  return result.rowCount > 0;
}
