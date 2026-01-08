import { NextRequest, NextResponse } from "next/server";

const VALID_SERVERS = [
  "harmony",
  "melody",
  "cadence",
  "defiance",
  "independence",
  "deliverance",
  "exodus",
  "celebration",
  "pristine",
  "release",
  "xanadu",
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const server = searchParams.get("server");

  if (!server || !VALID_SERVERS.includes(server)) {
    return NextResponse.json(
      { error: "Invalid server" },
      { status: 400 }
    );
  }

  const mapUrl = `https://${server}.wurmonline.com/dumps/latest/map.png`;

  try {
    const response = await fetch(mapUrl, {
      headers: {
        "User-Agent": "Blackforge-WURM-Tools/1.0",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch map: ${response.status}` },
        { status: response.status }
      );
    }

    const contentType = response.headers.get("content-type") || "image/png";
    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400", // Cache for 24 hours
      },
    });
  } catch (error) {
    console.error("Error fetching map:", error);
    return NextResponse.json(
      { error: "Failed to fetch map image" },
      { status: 500 }
    );
  }
}
