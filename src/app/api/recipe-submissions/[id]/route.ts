import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getRecipeSubmissionById,
  deleteRecipeSubmission,
  reviewRecipeSubmission,
  approveAndAddRecipe,
} from "@/lib/database";
import { sanitizeError } from "@/lib/security";
import type { ReviewRecipeSubmissionInput } from "@/lib/types";

// GET - Get a single submission
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const submissionId = parseInt(id);
    if (isNaN(submissionId)) {
      return NextResponse.json(
        { error: "Invalid submission ID" },
        { status: 400 }
      );
    }

    const submission = await getRecipeSubmissionById(submissionId);
    if (!submission) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 }
      );
    }

    // Check access - user can only see their own, admin can see all
    if (submission.user_id !== result.user.id && result.user.role !== "admin") {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    return NextResponse.json(submission);
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Fetch recipe submission") },
      { status: 500 }
    );
  }
}

// PUT - Review a submission (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Admin only
    if (result.user.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const submissionId = parseInt(id);
    if (isNaN(submissionId)) {
      return NextResponse.json(
        { error: "Invalid submission ID" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { status, admin_notes, approve_and_add } = body;

    // If approve_and_add is true, approve and add the recipe to the database
    if (approve_and_add) {
      const approveResult = await approveAndAddRecipe(submissionId, result.user.id);
      if (!approveResult.success) {
        return NextResponse.json(
          { error: approveResult.error },
          { status: 400 }
        );
      }
      return NextResponse.json({
        success: true,
        itemsCreated: approveResult.itemsCreated,
        recipesCreated: approveResult.recipesCreated,
      });
    }

    // Regular review (approve/reject without adding)
    if (!status || !["approved", "rejected"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400 }
      );
    }

    const input: ReviewRecipeSubmissionInput = {
      status,
      admin_notes: admin_notes || undefined,
    };

    const success = await reviewRecipeSubmission(submissionId, result.user.id, input);
    if (!success) {
      return NextResponse.json(
        { error: "Failed to update submission" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Review recipe submission") },
      { status: 500 }
    );
  }
}

// DELETE - Delete a submission
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const submissionId = parseInt(id);
    if (isNaN(submissionId)) {
      return NextResponse.json(
        { error: "Invalid submission ID" },
        { status: 400 }
      );
    }

    const isAdmin = result.user.role === "admin";
    const success = deleteRecipeSubmission(submissionId, result.user.id, isAdmin);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to delete submission or access denied" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Delete recipe submission") },
      { status: 500 }
    );
  }
}
