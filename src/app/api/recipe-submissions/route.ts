import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  createRecipeSubmission,
  getUserRecipeSubmissions,
  getAllRecipeSubmissions,
  getPendingRecipeSubmissionsCount,
} from "@/lib/database";
import { sanitizeError } from "@/lib/security";
import type { RecipeSubmissionStatus, CreateRecipeSubmissionInput } from "@/lib/types";

// GET - Get submissions (user's own or all for admin)
export async function GET(request: NextRequest) {
  try {
    const sessionId = request.cookies.get("session")?.value;
    if (!sessionId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const result = await getSession(sessionId);
    if (!result) {
      return NextResponse.json(
        { error: "Invalid session" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const viewAll = searchParams.get("all") === "true";
    const status = searchParams.get("status") as RecipeSubmissionStatus | null;
    const countOnly = searchParams.get("count") === "true";

    // Count only - for admin badge
    if (countOnly && result.user.role === "admin") {
      const count = getPendingRecipeSubmissionsCount();
      return NextResponse.json({ count });
    }

    // Admin can view all submissions
    if (viewAll && result.user.role === "admin") {
      const submissions = await getAllRecipeSubmissions(status || undefined);
      return NextResponse.json(submissions);
    }

    // Regular users see only their own submissions
    const submissions = await getUserRecipeSubmissions(result.user.id);
    return NextResponse.json(submissions);
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Fetch recipe submissions") },
      { status: 500 }
    );
  }
}

// POST - Create a new recipe submission
export async function POST(request: NextRequest) {
  try {
    const sessionId = request.cookies.get("session")?.value;
    if (!sessionId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const result = await getSession(sessionId);
    if (!result) {
      return NextResponse.json(
        { error: "Invalid session" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { item_name, ingredients, source_url, notes } = body;

    // Validate required fields
    if (!item_name || item_name.trim() === "") {
      return NextResponse.json(
        { error: "Item name is required" },
        { status: 400 }
      );
    }

    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return NextResponse.json(
        { error: "At least one ingredient is required" },
        { status: 400 }
      );
    }

    // Validate each ingredient
    for (const ing of ingredients) {
      if (!ing.name || ing.name.trim() === "") {
        return NextResponse.json(
          { error: "Each ingredient must have a name" },
          { status: 400 }
        );
      }
      if (typeof ing.quantity !== "number" || ing.quantity <= 0) {
        return NextResponse.json(
          { error: "Each ingredient must have a positive quantity" },
          { status: 400 }
        );
      }
    }

    // Validate source_url if provided
    if (source_url && source_url.trim() !== "") {
      try {
        new URL(source_url);
      } catch {
        return NextResponse.json(
          { error: "Invalid source URL format" },
          { status: 400 }
        );
      }
    }

    const input: CreateRecipeSubmissionInput = {
      item_name: item_name.trim(),
      ingredients: ingredients.map((ing: { name: string; quantity: number }) => ({
        name: ing.name.trim(),
        quantity: ing.quantity,
      })),
      source_url: source_url?.trim() || undefined,
      notes: notes?.trim() || undefined,
    };

    const submissionId = await createRecipeSubmission(result.user.id, input);

    return NextResponse.json({ id: submissionId, success: true });
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Create recipe submission") },
      { status: 500 }
    );
  }
}
