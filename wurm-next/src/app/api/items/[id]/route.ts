import { NextResponse } from "next/server";
import { getItem, updateItem, deleteItem, getItemByName } from "@/lib/database";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const item = getItem(parseInt(id));

  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  return NextResponse.json(item);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, category, is_base_material, description } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const existing = getItemByName(name);
    if (existing && existing.id !== parseInt(id)) {
      return NextResponse.json(
        { error: "Another item with this name exists" },
        { status: 400 }
      );
    }

    const success = updateItem(
      parseInt(id),
      name,
      category || "misc",
      is_base_material || false,
      description || ""
    );

    return NextResponse.json({ success });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const success = deleteItem(parseInt(id));
    return NextResponse.json({ success });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
