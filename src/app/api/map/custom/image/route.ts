import { NextRequest, NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import { join, resolve, sep } from "path";

// Path to custom maps folder
const MAPS_DIR = join(process.cwd(), "scripts", "Maps");

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const server = searchParams.get("server");
    const date = searchParams.get("date");
    const filename = searchParams.get("filename");

    // Validate required parameters
    if (!server || !date || !filename) {
      return NextResponse.json(
        { error: "Missing required parameters: server, date, filename" },
        { status: 400 }
      );
    }

    // Construct the file path
    const filePath = join(MAPS_DIR, server, date, filename);

    // Verify the resolved path is strictly within MAPS_DIR (prevents path traversal)
    const resolvedPath = resolve(filePath);
    if (!resolvedPath.startsWith(resolve(MAPS_DIR) + sep)) {
      return NextResponse.json(
        { error: "Invalid file path" },
        { status: 400 }
      );
    }

    // Check if file exists
    try {
      const fileStat = await stat(filePath);
      if (!fileStat.isFile()) {
        return NextResponse.json(
          { error: "Not a file" },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: "Map image not found" },
        { status: 404 }
      );
    }

    // Read and return the image
    const fileBuffer = await readFile(filePath);

    // Determine content type
    const ext = filename.toLowerCase().split(".").pop();
    const contentType = ext === "png" ? "image/png" :
                        ext === "jpg" || ext === "jpeg" ? "image/jpeg" :
                        "application/octet-stream";

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=604800", // Cache for 1 week (static content)
        "Content-Length": fileBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Error serving custom map image:", error);
    return NextResponse.json(
      { error: "Failed to serve map image" },
      { status: 500 }
    );
  }
}
