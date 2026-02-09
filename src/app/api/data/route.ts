import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import {
  exportToJson,
  importFromJson,
  clearAllData,
  getStats,
  parseItemsCsv,
  parseRecipesCsv,
  importItemsFromCsv,
  importRecipesFromCsv,
} from "@/lib/database";
import { getSession } from "@/lib/auth";
import { sanitizeError } from "@/lib/security";

// SECURITY: Helper function to verify admin authentication
async function verifyAdminAuth(request: NextRequest): Promise<{ error: string; status: number } | null> {
  const sessionId = request.cookies.get("session")?.value;
  if (!sessionId) {
    return { error: "Authentication required", status: 401 };
  }

  const sessionResult = await getSession(sessionId);
  if (!sessionResult) {
    return { error: "Invalid session", status: 401 };
  }

  if (sessionResult.user.role !== "admin") {
    return { error: "Admin privileges required", status: 403 };
  }

  return null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  // SECURITY: Export and stats require admin authentication
  const authError = await verifyAdminAuth(request);
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: authError.status });
  }

  if (action === "export") {
    const data = await exportToJson();
    return NextResponse.json(data);
  }

  if (action === "stats") {
    const stats = await getStats();
    return NextResponse.json(stats);
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, data, replace, csvContent, csvType, items, recipes } = body;

    // SECURITY: All POST actions require admin authentication
    const authError = await verifyAdminAuth(request);
    if (authError) {
      return NextResponse.json({ error: authError.error }, { status: authError.status });
    }

    if (action === "import") {
      if (!data) {
        return NextResponse.json(
          { error: "Data is required" },
          { status: 400 }
        );
      }

      const stats = await importFromJson(data);
      return NextResponse.json(stats);
    }

    if (action === "clear") {
      await clearAllData();
      return NextResponse.json({ success: true });
    }

    // CSV preview - parse and return what would be imported
    if (action === "csv-preview") {
      if (!csvContent) {
        return NextResponse.json(
          { error: "CSV content is required" },
          { status: 400 }
        );
      }

      if (csvType === "items") {
        const result = await parseItemsCsv(csvContent);
        return NextResponse.json(result);
      } else if (csvType === "recipes") {
        const result = await parseRecipesCsv(csvContent);
        return NextResponse.json(result);
      }

      return NextResponse.json(
        { error: "Invalid CSV type (must be 'items' or 'recipes')" },
        { status: 400 }
      );
    }

    // CSV import - actually import the validated data
    if (action === "csv-import") {
      if (csvType === "items" && items) {
        const result = await importItemsFromCsv(items);
        return NextResponse.json(result);
      } else if (csvType === "recipes" && recipes) {
        const result = await importRecipesFromCsv(recipes);
        return NextResponse.json(result);
      }

      return NextResponse.json(
        { error: "Invalid import data" },
        { status: 400 }
      );
    }

    // Reload extended data from JSON file
    if (action === "reload-extended") {
      try {
        const filePath = join(process.cwd(), "data", "wurm-extended-data.json");
        const fileContent = readFileSync(filePath, "utf-8");
        const extData = JSON.parse(fileContent);

        // Import the data (updates existing items with new extended fields)
        const stats = await importFromJson(extData);

        return NextResponse.json({
          success: true,
          message: "Extended data reloaded successfully",
          version: extData.version,
          stats,
        });
      } catch (error) {
        return NextResponse.json(
          { error: sanitizeError(error, "Reload extended data") },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: sanitizeError(error, "Data operation") }, { status: 500 });
  }
}
