import { NextResponse } from "next/server";
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  if (action === "export") {
    const data = exportToJson();
    return NextResponse.json(data);
  }

  if (action === "stats") {
    const stats = getStats();
    return NextResponse.json(stats);
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, data, replace, csvContent, csvType, items, recipes } = body;

    if (action === "import") {
      if (!data) {
        return NextResponse.json(
          { error: "Data is required" },
          { status: 400 }
        );
      }

      const stats = importFromJson(data, replace || false);
      return NextResponse.json(stats);
    }

    if (action === "clear") {
      clearAllData();
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
        const result = parseItemsCsv(csvContent);
        return NextResponse.json(result);
      } else if (csvType === "recipes") {
        const result = parseRecipesCsv(csvContent);
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
        const result = importItemsFromCsv(items);
        return NextResponse.json(result);
      } else if (csvType === "recipes" && recipes) {
        const result = importRecipesFromCsv(recipes);
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
        const data = JSON.parse(fileContent);

        // Import the data (updates existing items with new extended fields)
        const stats = importFromJson(data, false); // false = don't replace, just update

        return NextResponse.json({
          success: true,
          message: "Extended data reloaded successfully",
          version: data.version,
          stats,
        });
      } catch (error) {
        return NextResponse.json(
          { error: `Failed to reload extended data: ${String(error)}` },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
