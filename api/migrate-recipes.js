/**
 * Migration Script: Convert infobox JSON to relational recipe tables
 *
 * Run: node migrate-recipes.js
 *
 * This script:
 * 1. Creates the new tables (items, recipe_materials, recipe_tools, item_categories)
 * 2. Parses infobox_fields JSON data
 * 3. Inserts structured data into the new tables
 */

import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
function loadDotenv(filePath) {
  try {
    const text = fs.readFileSync(filePath, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith("#") || !t.includes("=")) continue;
      const [k, ...rest] = t.split("=");
      const v = rest.join("=").trim().replace(/^"|"$/g, "").replace(/^'|'$/g, "");
      if (!process.env[k]) process.env[k] = v;
    }
  } catch {
    // ignore
  }
}

loadDotenv(path.join(process.cwd(), ".env"));

const pool = mysql.createPool({
  host: process.env.DB_HOST ?? "127.0.0.1",
  user: process.env.DB_USER ?? "wurm",
  password: process.env.DB_PASS ?? "wurm_pass",
  database: process.env.DB_NAME ?? "wurmpedia",
  charset: "utf8mb4",
  connectionLimit: 10,
  multipleStatements: true,
});

// ============================================
// PARSING UTILITIES
// ============================================

/**
 * Parse material string like "22x planks" or "1.5 kg metal lump"
 */
function parseMaterialString(raw) {
  if (!raw) return null;

  // Pattern: "X.XX kg item"
  const kgMatch = raw.match(/^([\d.]+)\s*kg\s+(.+)$/i);
  if (kgMatch) {
    return {
      quantity: parseFloat(kgMatch[1]),
      unit: "kg",
      name: kgMatch[2].trim(),
    };
  }

  // Pattern: "Xx item" or "X item"
  const xMatch = raw.match(/^(\d+)x?\s+(.+)$/i);
  if (xMatch) {
    return {
      quantity: parseInt(xMatch[1], 10),
      unit: "piece",
      name: xMatch[2].trim(),
    };
  }

  // No quantity, default to 1
  return {
    quantity: 1,
    unit: "piece",
    name: raw.trim(),
  };
}

/**
 * Extract slug from href like "/index.php/Plank" or "/wiki/Plank"
 */
function extractSlugFromHref(href) {
  if (!href) return null;
  const match = href.match(/\/(?:index\.php|wiki)\/(.+)$/);
  return match ? match[1].toLowerCase().replace(/ /g, "_") : null;
}

/**
 * Parse skill from "Skill and improvement" or "Skill" field
 */
function parseSkill(skillText) {
  if (!skillText) return null;

  // "Uses fine carpentry skill" -> "fine carpentry"
  const usesMatch = skillText.match(/uses?\s+(.+?)\s+skill/i);
  if (usesMatch) return usesMatch[1].toLowerCase();

  // Direct skill name
  return skillText.toLowerCase().trim();
}

/**
 * Parse difficulty from string
 */
function parseDifficulty(diffText) {
  if (!diffText) return null;
  const match = diffText.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Parse time from string like "30 seconds" or "2 minutes"
 */
function parseTime(timeText) {
  if (!timeText) return null;

  const secMatch = timeText.match(/(\d+)\s*(?:sec|second)/i);
  if (secMatch) return parseInt(secMatch[1], 10);

  const minMatch = timeText.match(/(\d+)\s*(?:min|minute)/i);
  if (minMatch) return parseInt(minMatch[1], 10) * 60;

  return null;
}

/**
 * Check if item is a base material
 */
function isBaseMaterial(categories, name) {
  const baseCategories = [
    "ores", "logs", "rocks", "raw materials", "meat", "fish",
    "vegetables", "fruits", "herbs", "seeds"
  ];

  const baseMaterials = [
    "lump", "plank", "shaft", "log", "clay", "sand", "rock shard",
    "stone brick", "mortar", "leather", "wool", "cotton", "string",
    "rope", "nail", "ribbon", "pelt", "fur"
  ];

  const nameLower = name.toLowerCase();
  const catsLower = categories.map(c => c.toLowerCase());

  for (const cat of catsLower) {
    for (const baseCat of baseCategories) {
      if (cat.includes(baseCat)) return true;
    }
  }

  for (const mat of baseMaterials) {
    if (nameLower.includes(mat)) return true;
  }

  return false;
}

// ============================================
// MAIN MIGRATION
// ============================================

async function migrate() {
  console.log("🚀 Starting recipe migration...\n");

  // Step 1: Drop existing recipe tables (in order due to FK constraints)
  console.log("🗑️  Dropping existing recipe tables...");
  await pool.query("DROP VIEW IF EXISTS v_material_uses");
  await pool.query("DROP VIEW IF EXISTS v_recipes");
  await pool.query("DROP VIEW IF EXISTS v_items_summary");
  await pool.query("DROP TABLE IF EXISTS item_categories");
  await pool.query("DROP TABLE IF EXISTS recipe_steps");
  await pool.query("DROP TABLE IF EXISTS recipe_tools");
  await pool.query("DROP TABLE IF EXISTS recipe_materials");
  await pool.query("DROP TABLE IF EXISTS items");
  console.log("  ✓ Dropped\n");

  // Step 2: Create tables fresh
  console.log("📋 Creating tables...");
  const schema = fs.readFileSync(path.join(__dirname, "schema-recipes.sql"), "utf8");

  // Split by semicolons but keep CREATE VIEW statements together
  const statements = schema
    .split(/;(?=\s*(?:CREATE|ALTER|DROP|INSERT|--|\n\n|$))/i)
    .map(s => s.trim())
    .filter(s => s && !s.startsWith("--"));

  for (const stmt of statements) {
    if (stmt) {
      try {
        await pool.query(stmt);
      } catch (err) {
        // Ignore "already exists" errors
        if (!err.message.includes("already exists")) {
          console.error(`  Warning: ${err.message.substring(0, 80)}`);
        }
      }
    }
  }
  console.log("  ✓ Tables created\n");

  // Step 3: Get all pages with infoboxes
  console.log("📖 Fetching pages with infoboxes...");
  const [pages] = await pool.query(`
    SELECT
      p.id as page_id,
      p.slug,
      p.title,
      i.id as infobox_id,
      i.image_src,
      i.image_original
    FROM pages p
    JOIN infoboxes i ON i.page_id = p.id
    ORDER BY p.title
  `);
  console.log(`  ✓ Found ${pages.length} pages\n`);

  // Step 4: Get all infobox fields
  console.log("📦 Fetching infobox fields...");
  const [allFields] = await pool.query(`
    SELECT infobox_id, section_name, items_json
    FROM infobox_fields
  `);

  // Group by infobox_id
  const fieldsByInfobox = {};
  for (const f of allFields) {
    if (!fieldsByInfobox[f.infobox_id]) fieldsByInfobox[f.infobox_id] = {};
    fieldsByInfobox[f.infobox_id][f.section_name] = f.items_json ? JSON.parse(f.items_json) : [];
  }
  console.log(`  ✓ Loaded fields for ${Object.keys(fieldsByInfobox).length} infoboxes\n`);

  // Step 5: Get categories for all pages
  console.log("🏷️  Fetching categories...");
  const [allCats] = await pool.query(`
    SELECT pc.page_id, c.name
    FROM page_categories pc
    JOIN categories c ON pc.category_id = c.id
  `);

  const catsByPage = {};
  for (const c of allCats) {
    if (!catsByPage[c.page_id]) catsByPage[c.page_id] = [];
    catsByPage[c.page_id].push(c.name);
  }
  console.log(`  ✓ Loaded categories\n`);

  // Step 6: Process each page
  console.log("⚙️  Processing items...");
  let itemCount = 0;
  let materialCount = 0;
  let toolCount = 0;
  let stepCount = 0;

  for (const page of pages) {
    const fields = fieldsByInfobox[page.infobox_id] || {};
    const categories = catsByPage[page.page_id] || [];

    // Parse skill
    const skillRaw = fields["Skill"]?.[0]?.raw
      || fields["Skill and improvement"]?.[0]?.raw
      || null;
    const skill = parseSkill(skillRaw);

    // Parse difficulty
    const difficulty = parseDifficulty(fields["Difficulty"]?.[0]?.raw);

    // Parse time
    const baseTime = parseTime(fields["Time"]?.[0]?.raw);

    // Check if base material
    const isBase = isBaseMaterial(categories, page.title);

    // Insert item
    const [itemResult] = await pool.query(`
      INSERT INTO items (page_id, slug, name, skill, difficulty, base_time_seconds, image_url, is_base_material)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      page.page_id,
      page.slug,
      page.title,
      skill,
      difficulty,
      baseTime,
      page.image_original || page.image_src,
      isBase
    ]);

    const itemId = itemResult.insertId;
    itemCount++;

    // Insert categories
    for (const cat of categories) {
      await pool.query(`
        INSERT INTO item_categories (item_id, category) VALUES (?, ?)
      `, [itemId, cat.toLowerCase()]);
    }

    // Parse materials - prefer Material Breakdown or Total materials
    const materials = fields["Material Breakdown"]
      || fields["Total materials"]
      || fields["Materials"]
      || fields["Ingredients"]
      || [];

    let sortOrder = 0;
    for (const mat of materials) {
      const parsed = parseMaterialString(mat.raw);
      if (!parsed || !parsed.name) continue;

      // Skip instruction-like entries
      if (parsed.name.toLowerCase().includes("activate") ||
          parsed.name.toLowerCase().includes("right-click") ||
          parsed.name.toLowerCase().includes("submenu")) {
        continue;
      }

      // Try to get slug from links
      let materialSlug = null;
      if (mat.links && mat.links.length > 0) {
        materialSlug = extractSlugFromHref(mat.links[0].href);
      }
      if (!materialSlug) {
        materialSlug = parsed.name.toLowerCase().replace(/\s+/g, "_");
      }

      await pool.query(`
        INSERT INTO recipe_materials (item_id, material_name, material_slug, quantity, unit, sort_order)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [itemId, parsed.name, materialSlug, parsed.quantity, parsed.unit, sortOrder++]);

      materialCount++;
    }

    // Parse tools
    const tools = fields["Tools"] || fields["Tool"] || [];
    for (const tool of tools) {
      if (!tool.raw) continue;

      let toolSlug = null;
      if (tool.links && tool.links.length > 0) {
        toolSlug = extractSlugFromHref(tool.links[0].href);
      }
      if (!toolSlug) {
        toolSlug = tool.raw.toLowerCase().replace(/\s+/g, "_");
      }

      const isWorkstation = ["anvil", "forge", "loom", "bench", "kiln", "oven"]
        .some(w => tool.raw.toLowerCase().includes(w));

      await pool.query(`
        INSERT INTO recipe_tools (item_id, tool_name, tool_slug, is_workstation)
        VALUES (?, ?, ?, ?)
      `, [itemId, tool.raw, toolSlug, isWorkstation]);

      toolCount++;
    }

    // Parse Creation steps
    const creation = fields["Creation"] || [];
    let stepOrder = 1;
    for (const step of creation) {
      if (!step.raw) continue;

      const action = step.action || "unknown";
      let targetName = step.raw;
      let targetSlug = null;
      let targetQuantity = null;
      let targetUnit = null;
      let submenuPath = null;

      // Extract target from links if available
      if (step.links && step.links.length > 0) {
        targetSlug = extractSlugFromHref(step.links[0].href);
        // Use the link text as a cleaner target name
        if (step.links[0].text) {
          targetName = step.links[0].text;
        }
      }

      // Parse quantity from raw text (e.g., "1.00 kg")
      const kgMatch = step.raw.match(/\(?([\d.]+)\s*kg\)?/i);
      if (kgMatch) {
        targetQuantity = parseFloat(kgMatch[1]);
        targetUnit = "kg";
      }

      // For submenu, extract the path
      if (action === "submenu") {
        const submenuMatch = step.raw.match(/submenu\s*"([^"]+)"/i);
        if (submenuMatch) {
          submenuPath = submenuMatch[1].replace(/&gt;/g, ">").replace(/&lt;/g, "<");
        }
      }

      await pool.query(`
        INSERT INTO recipe_steps (item_id, step_order, action, target_name, target_slug, target_quantity, target_unit, submenu_path, raw_text)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [itemId, stepOrder++, action, targetName, targetSlug, targetQuantity, targetUnit, submenuPath, step.raw]);

      stepCount++;
    }

    // Progress indicator
    if (itemCount % 100 === 0) {
      process.stdout.write(`  Processed ${itemCount}/${pages.length} items...\r`);
    }
  }

  console.log(`  ✓ Processed ${itemCount} items\n`);

  // Step 7: Link materials to items
  console.log("🔗 Linking materials to items...");
  const [linkResult] = await pool.query(`
    UPDATE recipe_materials rm
    JOIN items i ON i.slug = rm.material_slug
    SET rm.material_id = i.id
    WHERE rm.material_id IS NULL
  `);
  console.log(`  ✓ Linked ${linkResult.affectedRows} materials\n`);

  // Step 8: Link tools to items
  console.log("🔗 Linking tools to items...");
  const [toolLinkResult] = await pool.query(`
    UPDATE recipe_tools rt
    JOIN items i ON i.slug = rt.tool_slug
    SET rt.tool_id = i.id
    WHERE rt.tool_id IS NULL
  `);
  console.log(`  ✓ Linked ${toolLinkResult.affectedRows} tools\n`);

  // Summary
  console.log("=" .repeat(50));
  console.log("📊 Migration Summary:");
  console.log(`   Items:     ${itemCount}`);
  console.log(`   Materials: ${materialCount}`);
  console.log(`   Tools:     ${toolCount}`);
  console.log(`   Steps:     ${stepCount}`);
  console.log("=" .repeat(50));

  // Test query
  console.log("\n🧪 Test Query - Large cart recipe:");
  const [testResult] = await pool.query(`
    SELECT
      i.name as item,
      rm.quantity,
      rm.unit,
      rm.material_name
    FROM items i
    JOIN recipe_materials rm ON rm.item_id = i.id
    WHERE i.slug = 'large_cart'
    ORDER BY rm.sort_order
  `);

  if (testResult.length > 0) {
    console.log("   Recipe materials:");
    for (const row of testResult) {
      console.log(`   - ${row.quantity} ${row.unit} ${row.material_name}`);
    }
  } else {
    console.log("   (no results - item may not exist or have materials)");
  }

  await pool.end();
  console.log("\n✅ Migration complete!");
}

migrate().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
