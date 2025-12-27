import { NextResponse } from "next/server";
import { getMaterialsList, buildCraftingTree } from "@/lib/database";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const itemId = parseInt(searchParams.get("item") || "0");
  const quantity = parseFloat(searchParams.get("qty") || "1");

  if (!itemId) {
    return NextResponse.json(
      { error: "Item ID is required" },
      { status: 400 }
    );
  }

  const materials = getMaterialsList(itemId, quantity);
  const tree = buildCraftingTree(itemId, quantity);

  return NextResponse.json({ materials, tree });
}
