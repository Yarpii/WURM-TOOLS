import { NextResponse } from "next/server";
import {
  findCraftableFrom,
  findAllCraftableFrom,
  formatQuantity,
} from "@/lib/database";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const itemId = parseInt(searchParams.get("item") || "0");
  const includeAll = searchParams.get("all") === "1";

  if (!itemId) {
    return NextResponse.json(
      { error: "Item ID is required" },
      { status: 400 }
    );
  }

  const craftable = includeAll
    ? findAllCraftableFrom(itemId)
    : findCraftableFrom(itemId);

  const results = craftable.map((c) => ({
    id: c.item.id,
    name: c.item.name,
    category: c.item.category,
    quantity_needed: c.quantity_needed,
    formatted: formatQuantity(c.quantity_needed),
  }));

  return NextResponse.json(results);
}
