import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { getSessionAsync } from "@/lib/auth";
import { getStaticUrl } from "@/lib/static-url";

// Allowed image types
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// SECURITY: Whitelist of allowed file extensions to prevent executable uploads
const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp"];

// SECURITY: Magic byte signatures to verify actual file content matches declared type
const MAGIC_BYTES: Record<string, { bytes: number[]; offset?: number; extra?: { bytes: number[]; offset: number } }> = {
  "image/jpeg": { bytes: [0xFF, 0xD8, 0xFF] },
  "image/png": { bytes: [0x89, 0x50, 0x4E, 0x47] },
  "image/gif": { bytes: [0x47, 0x49, 0x46] },
  "image/webp": { bytes: [0x52, 0x49, 0x46, 0x46], extra: { bytes: [0x57, 0x45, 0x42, 0x50], offset: 8 } },
};

function verifyMagicBytes(buffer: Buffer, mimeType: string): boolean {
  const signature = MAGIC_BYTES[mimeType];
  if (!signature) return false;

  if (buffer.length < signature.bytes.length) return false;

  const offset = signature.offset || 0;
  for (let i = 0; i < signature.bytes.length; i++) {
    if (buffer[offset + i] !== signature.bytes[i]) return false;
  }

  // Check extra signature (e.g., WEBP marker at offset 8)
  if (signature.extra) {
    if (buffer.length < signature.extra.offset + signature.extra.bytes.length) return false;
    for (let i = 0; i < signature.extra.bytes.length; i++) {
      if (buffer[signature.extra.offset + i] !== signature.extra.bytes[i]) return false;
    }
  }

  return true;
}

// SECURITY: Whitelist of allowed upload categories to prevent path traversal
const ALLOWED_CATEGORIES = ["screenshots", "avatars", "banners", "items", "general"];

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSessionAsync();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const requestedCategory = (formData.get("category") as string) || "screenshots";

    // SECURITY: Validate category against whitelist to prevent path traversal
    const category = ALLOWED_CATEGORIES.includes(requestedCategory) ? requestedCategory : "general";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: JPEG, PNG, GIF, WebP" },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5MB" },
        { status: 400 }
      );
    }

    // SECURITY: Extract and validate file extension against whitelist
    const originalExtension = file.name.split(".").pop()?.toLowerCase() || "";
    const extension = ALLOWED_EXTENSIONS.includes(originalExtension) ? originalExtension : "jpg";

    // Create unique filename with validated extension
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const filename = `${session.userId}_${timestamp}_${randomString}.${extension}`;

    // Ensure upload directory exists
    const uploadDir = join(process.cwd(), "public", "uploads", category);
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Write file to disk
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // SECURITY: Verify file content matches declared MIME type via magic bytes
    if (!verifyMagicBytes(buffer, file.type)) {
      return NextResponse.json(
        { error: "File content does not match declared type" },
        { status: 400 }
      );
    }

    const filePath = join(uploadDir, filename);

    // SECURITY FIX: Actually write the file to disk (was missing)
    await writeFile(filePath, buffer);

    // Return the public URL (with CDN prefix if configured)
    const relativePath = `/uploads/${category}/${filename}`;
    const publicUrl = getStaticUrl(relativePath);

    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename: filename,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}
