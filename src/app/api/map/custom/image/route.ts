import { NextRequest, NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import { join } from "path";

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

    // Sanitize inputs to prevent path traversal
    const sanitize = (input: string) => {
      return input.replace(/\.\./g, "").replace(/[\/\\]/g, "");
    };

    const safeServer = sanitize(server);
    const safeDate = date.replace(/\.\./g, ""); // Allow spaces and slashes for dates like "February 2025"
    const safeFilename = sanitize(filename);

    // Construct the file path
    const filePath = join(MAPS_DIR, safeServer, safeDate, safeFilename);

    // Verify the file exists and is within the MAPS_DIR
    const resolvedPath = join(MAPS_DIR, safeServer, safeDate, safeFilename);
    if (!resolvedPath.startsWith(MAPS_DIR)) {
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
    const ext = safeFilename.toLowerCase().split(".").pop();
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
