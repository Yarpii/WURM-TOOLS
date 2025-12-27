import { NextResponse } from "next/server";
import {
  exportToJson,
  importFromJson,
  clearAllData,
  getStats,
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
    const { action, data, replace } = body;

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

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
