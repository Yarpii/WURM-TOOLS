import { NextResponse } from "next/server";
import {
  getAllItems,
  searchItems,
  addItem,
  getItemByName,
  getCategories,
} from "@/lib/database";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const categoriesOnly = searchParams.get("categories");

  if (categoriesOnly) {
    const categories = getCategories();
    return NextResponse.json(categories);
  }

  if (query) {
    const items = searchItems(query);
    return NextResponse.json(items);
  }

  const items = getAllItems();
  return NextResponse.json(items);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, category, is_base_material, description } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const existing = getItemByName(name);
    if (existing) {
      return NextResponse.json(
        { error: "Item already exists" },
        { status: 400 }
      );
    }

    const id = addItem(
      name,
      category || "misc",
      is_base_material || false,
      description || ""
    );

    return NextResponse.json({ id, success: true });
  } catch (error) {
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
