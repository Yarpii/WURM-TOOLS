import { NextResponse } from "next/server";
import { query } from "@/lib/database";
import { getSlugById } from "@/lib/items-transform";
import { sanitizeError } from "@/lib/security";

interface DbResult {
  id: number;
  slug: string;
  name: string;
  skill: string | null;
  quantity: number;
  unit: string;
}

interface ReverseLookupItem {
  id: number;
  name: string;
  category: string;
  formatted: string;
}

function formatQuantity(quantity: number, unit: string): string {
  if (unit === "kg") {
    return `${quantity} kg`;
  }
  return quantity.toString();
}

function getCategory(skill: string | null): string {
  if (!skill) return "misc";
  const s = skill.toLowerCase();
  if (s.includes("smithing") || s.includes("metal")) return "smithing";
  if (s.includes("carpentry") || s.includes("wood")) return "carpentry";
  if (s.includes("masonry") || s.includes("stone")) return "masonry";
  if (s.includes("tailoring") || s.includes("cloth")) return "tailoring";
  if (s.includes("cooking") || s.includes("baking")) return "cooking";
  if (s.includes("alchemy")) return "alchemy";
  if (s.includes("pottery")) return "pottery";
  return "misc";
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const itemId = parseInt(searchParams.get("item") || "0");
    const includeIndirect = searchParams.get("all") === "1";
    const source = searchParams.get("source");

    if (!itemId || isNaN(itemId) || itemId < 1) {
      return NextResponse.json(
        { error: "Valid Item ID is required" },
        { status: 400 }
      );
    }

    // Get the item's slug for matching
    let itemSlug: string | null = null;
    if (source === "wurmpedia") {
      itemSlug = getSlugById(itemId) || null;
    }

    // Find all items that use this item as a material
    const directQuery = `
      SELECT DISTINCT
        i.id,
        i.slug,
        i.name,
        i.skill,
        rm.quantity,
        rm.unit
      FROM items i
      INNER JOIN recipe_materials rm ON rm.item_id = i.id
      WHERE rm.material_id = ?
         OR rm.material_slug = ?
      ORDER BY i.name ASC
    `;

    const directResults = await query<DbResult>(
      directQuery,
      [itemId, itemSlug || ""]
    );

    // Transform to expected format
    const results: ReverseLookupItem[] = directResults.rows.map((item) => ({
      id: item.id,
      name: item.name,
      category: getCategory(item.skill),
      formatted: formatQuantity(item.quantity, item.unit || "piece")
    }));

    if (includeIndirect) {
      // For indirect, find items that use items that use this material
      const indirectQuery = `
        SELECT DISTINCT
          i.id,
          i.slug,
          i.name,
          i.skill,
          rm.quantity,
          rm.unit
        FROM items i
        INNER JOIN recipe_materials rm ON rm.item_id = i.id
        INNER JOIN recipe_materials rm2 ON rm.material_id = rm2.item_id
        WHERE (rm2.material_id = ? OR rm2.material_slug = ?)
          AND i.id NOT IN (
            SELECT DISTINCT item_id FROM recipe_materials
            WHERE material_id = ? OR material_slug = ?
          )
        ORDER BY i.name ASC
      `;

      const indirectResults = await query<DbResult>(
        indirectQuery,
        [itemId, itemSlug || "", itemId, itemSlug || ""]
      );

      // Add indirect results (mark them somehow if needed)
      indirectResults.rows.forEach((item) => {
        results.push({
          id: item.id,
          name: item.name,
          category: getCategory(item.skill),
          formatted: formatQuantity(item.quantity, item.unit || "piece")
        });
      });
    }

    return NextResponse.json(results);

  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Reverse lookup") },
      { status: 500 }
    );
  }
}
