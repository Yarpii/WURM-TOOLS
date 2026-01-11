import { NextRequest, NextResponse } from "next/server";
import { readdir, stat } from "fs/promises";
import { join } from "path";

// Path to custom maps folder
const MAPS_DIR = join(process.cwd(), "scripts", "Maps");

interface CustomMapInfo {
  server: string;
  date: string;
  mapTypes: {
    type: string;
    filename: string;
  }[];
}

interface CustomMapsResponse {
  servers: string[];
  maps: CustomMapInfo[];
}

// Scan the custom maps directory and return available maps
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const serverFilter = searchParams.get("server");

    // Check if maps directory exists
    let dirExists = false;
    try {
      const dirStat = await stat(MAPS_DIR);
      dirExists = dirStat.isDirectory();
    } catch {
      dirExists = false;
    }

    if (!dirExists) {
      return NextResponse.json({
        servers: [],
        maps: [],
        error: "Maps directory not found"
      });
    }

    // Scan servers
    const serverDirs = await readdir(MAPS_DIR);
    const servers: string[] = [];
    const maps: CustomMapInfo[] = [];

    for (const serverDir of serverDirs) {
      const serverPath = join(MAPS_DIR, serverDir);
      const serverStat = await stat(serverPath);

      if (!serverStat.isDirectory()) continue;

      servers.push(serverDir);

      // Filter by server if specified
      if (serverFilter && serverDir.toLowerCase() !== serverFilter.toLowerCase()) {
        continue;
      }

      // Scan date folders
      const dateDirs = await readdir(serverPath);

      for (const dateDir of dateDirs) {
        const datePath = join(serverPath, dateDir);
        const dateStat = await stat(datePath);

        if (!dateStat.isDirectory()) continue;

        // Scan map files
        const files = await readdir(datePath);
        const mapTypes: { type: string; filename: string }[] = [];

        for (const file of files) {
          if (!file.endsWith(".png")) continue;

          // Determine map type from filename
          const lowerFile = file.toLowerCase();
          let type = "unknown";

          if (lowerFile.includes("isometric") || lowerFile.includes("classic")) {
            type = "isometric";
          } else if (lowerFile.includes("terrain")) {
            type = "terrain";
          } else if (lowerFile.includes("topo") || lowerFile.includes("topographical") || lowerFile.includes("topographic")) {
            type = "topographic";
          } else if (lowerFile.includes("route")) {
            type = "routes";
          }

          mapTypes.push({ type, filename: file });
        }

        if (mapTypes.length > 0) {
          maps.push({
            server: serverDir,
            date: dateDir,
            mapTypes: mapTypes.sort((a, b) => a.type.localeCompare(b.type))
          });
        }
      }
    }

    // Sort maps by server, then by date (newest first)
    maps.sort((a, b) => {
      if (a.server !== b.server) {
        return a.server.localeCompare(b.server);
      }
      // Parse dates for sorting (e.g., "February 2025" -> 2025-02)
      const parseDate = (d: string) => {
        const months: { [key: string]: string } = {
          january: "01", february: "02", march: "03", april: "04",
          may: "05", june: "06", july: "07", august: "08",
          september: "09", october: "10", november: "11", december: "12"
        };
        const parts = d.toLowerCase().split(" ");
        if (parts.length === 2) {
          const month = months[parts[0]] || "00";
          const year = parts[1];
          return `${year}-${month}`;
        }
        return d;
      };

      return parseDate(b.date).localeCompare(parseDate(a.date));
    });

    const response: CustomMapsResponse = {
      servers: servers.sort(),
      maps
    };

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "public, max-age=3600" // Cache for 1 hour
      }
    });
  } catch (error) {
    console.error("Error scanning custom maps:", error);
    return NextResponse.json(
      { error: "Failed to scan custom maps", servers: [], maps: [] },
      { status: 500 }
    );
  }
}
