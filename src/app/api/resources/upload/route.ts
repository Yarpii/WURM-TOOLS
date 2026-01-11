import { NextRequest, NextResponse } from "next/server";
import { getSessionAsync as getSession } from "@/lib/auth";
import { createCommunityResource } from "@/lib/database";
import { sanitizeError } from "@/lib/security";
import fs from "fs/promises";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "public", "resources", "community");
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const ALLOWED_TYPES = [
  // Images
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  // Documents
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  // Text
  "text/plain",
  "text/csv",
  // Archives
  "application/zip",
  "application/x-rar-compressed",
  "application/x-7z-compressed",
  // Other
  "application/json",
];

// Sanitize filename
function sanitizeFilename(filename: string): string {
  // Remove any path traversal attempts
  const name = path.basename(filename);

  // Replace unsafe characters
  return name
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_{2,}/g, "_")
    .substring(0, 255);
}

// Get file extension
function getExtension(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  return ext || "";
}

// Determine resource type from mime type
function getResourceTypeFromMime(mimeType: string): "guide" | "tool" | "data" | "media" | "template" | "other" {
  if (mimeType.startsWith("image/")) return "media";
  if (mimeType.includes("pdf")) return "guide";
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel") || mimeType === "text/csv") return "data";
  if (mimeType.includes("word") || mimeType.includes("presentation")) return "guide";
  if (mimeType.includes("zip") || mimeType.includes("rar") || mimeType.includes("7z")) return "tool";
  return "other";
}

// POST /api/resources/upload - Upload a file
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const name = formData.get("name") as string;
    const description = formData.get("description") as string | null;
    const category = formData.get("category") as string;
    const tags = formData.get("tags") as string | null;
    const resourceType = formData.get("resource_type") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!name || !category) {
      return NextResponse.json(
        { error: "Missing required fields: name, category" },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `File type ${file.type} not allowed` },
        { status: 400 }
      );
    }

    // Generate safe filename
    const timestamp = Date.now();
    const originalName = file.name;
    const ext = getExtension(originalName);
    const safeName = sanitizeFilename(`${timestamp}_${originalName}`);

    // Create category subfolder if it doesn't exist
    const categoryFolder = path.join(UPLOAD_DIR, sanitizeFilename(category));
    await fs.mkdir(categoryFolder, { recursive: true });

    // Save file
    const filePath = path.join(categoryFolder, safeName);
    const arrayBuffer = await file.arrayBuffer();
    await fs.writeFile(filePath, Buffer.from(arrayBuffer));

    // Get relative path for database (relative to /public/)
    const relativePath = path.relative(
      path.join(process.cwd(), "public"),
      filePath
    );
    const webPath = "/" + relativePath.replace(/\\/g, "/");

    // Determine resource type
    const finalResourceType = resourceType || getResourceTypeFromMime(file.type);

    // Parse tags
    const parsedTags = tags
      ? tags.split(",").map((tag) => tag.trim()).filter(Boolean)
      : [];

    // Create resource in database
    const resourceId = await createCommunityResource(
      {
        name,
        description: description || undefined,
        resource_type: finalResourceType as any,
        category,
        file_path: webPath,
        file_size: file.size,
        tags: parsedTags,
      },
      session.userId
    );

    return NextResponse.json({
      success: true,
      resourceId,
      filePath: webPath,
      fileName: safeName,
      fileSize: file.size,
      message: "File uploaded successfully",
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: sanitizeError(error, "Upload failed") },
      { status: 500 }
    );
  }
}

// GET /api/resources/upload - Get upload configuration
export async function GET() {
  return NextResponse.json({
    maxFileSize: MAX_FILE_SIZE,
    maxFileSizeMB: MAX_FILE_SIZE / 1024 / 1024,
    allowedTypes: ALLOWED_TYPES,
    allowedExtensions: [
      ".jpg", ".jpeg", ".png", ".gif", ".webp",
      ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
      ".txt", ".csv",
      ".zip", ".rar", ".7z",
      ".json"
    ],
  });
}
