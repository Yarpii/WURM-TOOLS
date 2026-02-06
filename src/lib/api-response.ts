/**
 * Standardized API response helpers
 *
 * Provides consistent response format across all API endpoints:
 * - Success: { success: true, ...data }
 * - Error:   { error: "message" }
 *
 * Usage:
 *   return apiSuccess({ items, total })  // { success: true, items: [...], total: 5 }
 *   return apiCreated({ id: 42 })        // { success: true, id: 42 } (201)
 *   return apiError("Not found", 404)    // { error: "Not found" } (404)
 */

import { NextResponse } from "next/server";

/**
 * Return a success response (200) with optional data fields merged in.
 */
export function apiSuccess(data?: Record<string, unknown>, status = 200): NextResponse {
  return NextResponse.json(
    { success: true, ...data },
    { status }
  );
}

/**
 * Return a created response (201) with optional data fields.
 */
export function apiCreated(data?: Record<string, unknown>): NextResponse {
  return NextResponse.json(
    { success: true, ...data },
    { status: 201 }
  );
}

/**
 * Return a standard error response.
 */
export function apiError(message: string, status = 400): NextResponse {
  return NextResponse.json(
    { error: message },
    { status }
  );
}
