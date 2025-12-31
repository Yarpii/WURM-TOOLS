#!/usr/bin/env npx ts-node

/**
 * Wurmpedia Page Harvester
 *
 * Fetches all page titles from Wurmpedia API and saves to JSON.
 * Run with: npx ts-node harvest.ts
 */

import * as fs from "fs";
import * as path from "path";

const API_BASE = "https://wurmpedia.com/api.php";
const OUTPUT_FILE = path.join(__dirname, "wurmpedia-pages.json");
const RATE_LIMIT_MS = 2000;
const RETRY_DELAY_MS = 5000;
const MAX_RETRIES = 3;

interface WikiPage {
  pageid: number;
  ns: number;
  title: string;
}

interface ApiResponse {
  query?: {
    allpages: WikiPage[];
  };
  continue?: {
    apcontinue: string;
  };
}

interface OutputData {
  fetched_at: string;
  total_pages: number;
  pages: { pageid: number; title: string }[];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string, retries = MAX_RETRIES): Promise<ApiResponse> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`  ❌ Attempt ${attempt}/${retries} failed: ${errorMsg}`);

      if (attempt < retries) {
        console.log(`  ⏳ Waiting ${RETRY_DELAY_MS / 1000}s before retry...`);
        await sleep(RETRY_DELAY_MS);
      } else {
        throw new Error(`Failed after ${retries} attempts: ${errorMsg}`);
      }
    }
  }

  throw new Error("Unexpected: exhausted retries");
}

async function harvestPages(): Promise<void> {
  console.log("🔨 Wurmpedia Page Harvester");
  console.log("===========================\n");

  const allPages = new Map<number, { pageid: number; title: string }>();
  let startPoint = "";
  let batchNumber = 0;

  console.log("📡 Starting harvest from Wurmpedia API...\n");

  while (true) {
    batchNumber++;

    // Build URL
    const params = new URLSearchParams({
      action: "query",
      list: "allpages",
      aplimit: "500",
      format: "json",
    });

    if (startPoint) {
      params.set("apfrom", startPoint);
    }

    const url = `${API_BASE}?${params.toString()}`;

    console.log(`📦 Batch ${batchNumber}: Fetching from "${startPoint || "A"}"...`);

    const data = await fetchWithRetry(url);

    // Check if we have results
    const pages = data.query?.allpages || [];

    if (pages.length === 0) {
      console.log("  ✅ No more pages to fetch.\n");
      break;
    }

    // Add pages to map (deduplicates by pageid)
    let newCount = 0;
    for (const page of pages) {
      if (!allPages.has(page.pageid)) {
        allPages.set(page.pageid, {
          pageid: page.pageid,
          title: page.title,
        });
        newCount++;
      }
    }

    const lastPage = pages[pages.length - 1];
    console.log(`  ✅ Fetched ${pages.length} pages (${newCount} new), now at "${lastPage.title}"`);
    console.log(`  📊 Total unique pages: ${allPages.size}`);

    // Check for continuation
    if (data.continue?.apcontinue) {
      startPoint = data.continue.apcontinue;
    } else {
      console.log("\n  ✅ Reached end of pages.\n");
      break;
    }

    // Rate limit
    console.log(`  ⏳ Waiting ${RATE_LIMIT_MS / 1000}s (rate limit)...\n`);
    await sleep(RATE_LIMIT_MS);
  }

  // Build output
  const output: OutputData = {
    fetched_at: new Date().toISOString(),
    total_pages: allPages.size,
    pages: Array.from(allPages.values()).sort((a, b) =>
      a.title.localeCompare(b.title)
    ),
  };

  // Write to file
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), "utf-8");

  console.log("===========================");
  console.log(`✅ Harvest complete!`);
  console.log(`📄 Total pages: ${output.total_pages}`);
  console.log(`💾 Saved to: ${OUTPUT_FILE}`);
}

// Run
harvestPages().catch((error) => {
  console.error("\n❌ Fatal error:", error.message);
  process.exit(1);
});
