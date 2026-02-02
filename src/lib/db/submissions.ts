import { query } from "./core";
import { getItemByName, getItem, addItem, addRecipeIngredient } from "./items";
import type {
  RecipeSubmission,
  CreateRecipeSubmissionInput,
  ReviewRecipeSubmissionInput,
} from "../types";

// ========== RECIPE SUBMISSIONS ==========

export async function getUserSubmissions(userId: number): Promise<RecipeSubmission[]> {
  const result = await query<RecipeSubmission>(
    "SELECT * FROM recipe_submissions WHERE user_id = ? ORDER BY created_at DESC",
    [userId]
  );
  return result.rows;
}

export async function getAllSubmissions(status?: string): Promise<RecipeSubmission[]> {
  let sql = `
    SELECT rs.*, u.username
    FROM recipe_submissions rs
    LEFT JOIN users u ON rs.user_id = u.id
  `;
  const params: string[] = [];

  if (status) {
    sql += " WHERE rs.status = ?";
    params.push(status);
  }

  sql += " ORDER BY rs.created_at DESC";

  const result = await query<RecipeSubmission>(sql, params);
  return result.rows;
}

export async function getRecipeSubmissionById(id: number): Promise<RecipeSubmission | null> {
  const result = await query<RecipeSubmission>(
    "SELECT * FROM recipe_submissions WHERE id = ?",
    [id]
  );
  return result.rows[0] || null;
}

export async function createRecipeSubmission(
  userId: number,
  input: CreateRecipeSubmissionInput
): Promise<number> {
  await query(
    `INSERT INTO recipe_submissions (user_id, item_name, ingredients, skill, difficulty, notes)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      userId,
      input.item_name,
      typeof input.ingredients === "string" ? input.ingredients : JSON.stringify(input.ingredients),
      (input as unknown as Record<string, unknown>).skill || null,
      (input as unknown as Record<string, unknown>).difficulty || null,
      input.notes || null,
    ]
  );

  const idResult = await query<{ id: number }>("SELECT LAST_INSERT_ID() as id");
  return idResult.rows[0]?.id || 0;
}

export async function reviewRecipeSubmission(
  submissionId: number,
  reviewerId: number,
  input: ReviewRecipeSubmissionInput
): Promise<boolean> {
  const result = await query(
    `UPDATE recipe_submissions SET status = ?, reviewed_by = ?, admin_notes = ?, reviewed_at = NOW() WHERE id = ?`,
    [input.status, reviewerId, input.admin_notes || null, submissionId]
  );
  return result.rowCount > 0;
}

export async function approveAndAddRecipe(submissionId: number, reviewerId: number): Promise<boolean> {
  const submission = await getRecipeSubmissionById(submissionId);
  if (!submission) return false;
  if (submission.status !== "pending") return false;

  try {
    let ingredients: { name: string; quantity: number }[] = [];
    try {
      ingredients = JSON.parse(submission.ingredients);
    } catch {
      return false;
    }

    // Check or create result item
    let resultItem = await getItemByName(submission.item_name);
    if (!resultItem) {
      const slug = submission.item_name.toLowerCase().replace(/\s+/g, '-');
      const resultId = await addItem(submission.item_name, slug, null, null, null, false);
      resultItem = await getItem(resultId);
      if (!resultItem) return false;
    }

    // Add each ingredient to the recipe
    for (const ing of ingredients) {
      let ingredientItem = await getItemByName(ing.name);
      if (!ingredientItem) {
        // Create missing ingredient as base material
        const slug = ing.name.toLowerCase().replace(/\s+/g, '-');
        const ingId = await addItem(ing.name, slug, null, null, null, true);
        ingredientItem = await getItem(ingId);
        if (!ingredientItem) continue;
      }

      await addRecipeIngredient(resultItem.id, ingredientItem.id, ing.quantity);
    }

    // Mark submission as approved
    await reviewRecipeSubmission(submissionId, reviewerId, {
      status: "approved",
      admin_notes: "Recipe approved and added to database",
    });

    return true;
  } catch (error) {
    console.error("Error approving recipe:", error);
    return false;
  }
}
