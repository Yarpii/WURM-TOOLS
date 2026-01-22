import express from "express";
import cors from "cors";
import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from public folder
app.use(express.static(path.join(__dirname, "public")));

const pool = mysql.createPool({
  host: process.env.DB_HOST ?? "127.0.0.1",
  user: process.env.DB_USER ?? "wurm",
  password: process.env.DB_PASS ?? "wurm_pass",
  database: process.env.DB_NAME ?? "wurmpedia",
  charset: "utf8mb4",
  connectionLimit: 10,
});

app.get("/api/health", async (req, res) => {
  try {
    const [[dbCheck]] = await pool.query("SELECT 1 AS ok");
    const [[stats]] = await pool.query("SELECT COUNT(*) AS pages_count FROM pages");
    res.json({
      status: "ok",
      database: dbCheck.ok === 1,
      pages_count: stats.pages_count,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      database: false,
      error: err.message
    });
  }
});

app.get("/api/search", async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  const type = String(req.query.type ?? "").trim();

  if (!q) return res.json([]);

  const params = [q];
  let where = "title LIKE CONCAT('%', ?, '%')";
  if (type) {
    where += " AND page_type = ?";
    params.push(type);
  }

  const [rows] = await pool.query(
    `SELECT slug, title, page_type
     FROM pages
     WHERE ${where}
     ORDER BY title
     LIMIT 50`,
    params
  );

  res.json(rows);
});

app.get("/api/pages/:slug", async (req, res) => {
  const slug = req.params.slug;
  const [rows] = await pool.query(
    `SELECT id, slug, title, article_id, revision_id, page_type, breadcrumbs_json
     FROM pages
     WHERE slug = ?
     LIMIT 1`,
    [slug]
  );

  if (!rows.length) return res.status(404).json({ error: "not_found" });

  const row = rows[0];
  row.breadcrumbs = row.breadcrumbs_json ? JSON.parse(row.breadcrumbs_json) : [];
  delete row.breadcrumbs_json;
  res.json(row);
});

app.get("/api/pages/:slug/infobox", async (req, res) => {
  const slug = req.params.slug;
  const [pRows] = await pool.query("SELECT id FROM pages WHERE slug=? LIMIT 1", [slug]);
  if (!pRows.length) return res.status(404).json({ error: "not_found" });
  const pageId = pRows[0].id;

  const [iRows] = await pool.query(
    `SELECT id, title, image_src, image_alt, image_original
     FROM infoboxes
     WHERE page_id=? LIMIT 1`,
    [pageId]
  );

  if (!iRows.length) return res.json(null);

  const infoboxId = iRows[0].id;
  const [fRows] = await pool.query(
    `SELECT section_name, items_json
     FROM infobox_fields
     WHERE infobox_id=?
     ORDER BY section_name`,
    [infoboxId]
  );

  res.json({
    ...iRows[0],
    fields: fRows.map((r) => ({
      section_name: r.section_name,
      items: r.items_json ? JSON.parse(r.items_json) : null,
    })),
  });
});

app.get("/api/pages/:slug/sections", async (req, res) => {
  const slug = req.params.slug;
  const [pRows] = await pool.query("SELECT id FROM pages WHERE slug=? LIMIT 1", [slug]);
  if (!pRows.length) return res.status(404).json({ error: "not_found" });
  const pageId = pRows[0].id;

  const [rows] = await pool.query(
    `SELECT heading, heading_id, content_text, content_html, section_order
     FROM page_sections
     WHERE page_id=?
     ORDER BY section_order`,
    [pageId]
  );

  res.json(rows);
});

// ============================================
// ITEMS API - For crafting integration
// ============================================

// GET /api/items - List all items with infobox (craftable items)
app.get("/api/items", async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  const category = String(req.query.category ?? "").trim();
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
  const offset = Math.max(0, parseInt(req.query.offset) || 0);

  let where = "i.id IS NOT NULL"; // has infobox
  const params = [];

  if (q) {
    where += " AND p.title LIKE CONCAT('%', ?, '%')";
    params.push(q);
  }

  if (category) {
    where += " AND EXISTS (SELECT 1 FROM page_categories pc JOIN categories c ON pc.category_id = c.id WHERE pc.page_id = p.id AND c.name = ?)";
    params.push(category);
  }

  const [rows] = await pool.query(
    `SELECT p.slug, p.title, p.page_type, i.image_src, i.image_original
     FROM pages p
     JOIN infoboxes i ON i.page_id = p.id
     WHERE ${where}
     ORDER BY p.title
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  // Get total count for pagination
  const [[countRow]] = await pool.query(
    `SELECT COUNT(*) as total FROM pages p JOIN infoboxes i ON i.page_id = p.id WHERE ${where}`,
    params
  );

  res.json({
    items: rows,
    total: countRow.total,
    limit,
    offset
  });
});

// GET /api/items/:slug - Get item with full infobox data
app.get("/api/items/:slug", async (req, res) => {
  const slug = req.params.slug;

  const [pRows] = await pool.query(
    `SELECT p.id, p.slug, p.title, p.page_type, p.breadcrumbs_json,
            i.id as infobox_id, i.title as infobox_title, i.image_src, i.image_alt, i.image_original
     FROM pages p
     LEFT JOIN infoboxes i ON i.page_id = p.id
     WHERE p.slug = ?
     LIMIT 1`,
    [slug]
  );

  if (!pRows.length) return res.status(404).json({ error: "not_found" });

  const page = pRows[0];
  const item = {
    slug: page.slug,
    title: page.title,
    page_type: page.page_type,
    breadcrumbs: page.breadcrumbs_json ? JSON.parse(page.breadcrumbs_json) : [],
    image: page.image_original || page.image_src || null,
    image_alt: page.image_alt,
    infobox: null
  };

  if (page.infobox_id) {
    const [fRows] = await pool.query(
      `SELECT section_name, items_json
       FROM infobox_fields
       WHERE infobox_id = ?
       ORDER BY section_name`,
      [page.infobox_id]
    );

    // Parse infobox fields into a more usable structure
    const fields = {};
    for (const f of fRows) {
      fields[f.section_name] = f.items_json ? JSON.parse(f.items_json) : [];
    }

    item.infobox = {
      title: page.infobox_title,
      fields
    };

    // Extract common crafting fields for convenience
    item.skill = fields["Skill"]?.[0]?.raw || null;
    item.materials = fields["Materials"] || fields["Ingredients"] || [];
    item.tools = fields["Tools"] || fields["Tool"] || [];
    item.result = fields["Result"] || fields["Creates"] || [];
  }

  // Get categories
  const [catRows] = await pool.query(
    `SELECT c.name FROM categories c
     JOIN page_categories pc ON pc.category_id = c.id
     WHERE pc.page_id = ?`,
    [page.id]
  );
  item.categories = catRows.map(r => r.name);

  res.json(item);
});

// GET /api/categories - List all categories
app.get("/api/categories", async (req, res) => {
  const [rows] = await pool.query(
    `SELECT c.name, COUNT(pc.page_id) as count
     FROM categories c
     LEFT JOIN page_categories pc ON pc.category_id = c.id
     GROUP BY c.id, c.name
     ORDER BY c.name`
  );
  res.json(rows);
});

// GET /api/items/:slug/recipe - Get recipe/materials for an item
app.get("/api/items/:slug/recipe", async (req, res) => {
  const slug = req.params.slug;

  const [pRows] = await pool.query(
    `SELECT p.id, p.title, i.id as infobox_id
     FROM pages p
     JOIN infoboxes i ON i.page_id = p.id
     WHERE p.slug = ?
     LIMIT 1`,
    [slug]
  );

  if (!pRows.length) return res.status(404).json({ error: "not_found" });

  const [fRows] = await pool.query(
    `SELECT section_name, items_json
     FROM infobox_fields
     WHERE infobox_id = ?`,
    [pRows[0].infobox_id]
  );

  const fields = {};
  for (const f of fRows) {
    fields[f.section_name] = f.items_json ? JSON.parse(f.items_json) : [];
  }

  // Extract recipe-relevant fields
  const recipe = {
    item: pRows[0].title,
    slug: slug,
    skill: fields["Skill"]?.[0]?.raw || null,
    difficulty: fields["Difficulty"]?.[0]?.raw || null,
    materials: fields["Materials"] || fields["Ingredients"] || [],
    tools: fields["Tools"] || fields["Tool"] || [],
    result: fields["Result"] || fields["Creates"] || [],
    time: fields["Time"]?.[0]?.raw || null,
    all_fields: fields
  };

  res.json(recipe);
});

const port = Number(process.env.PORT ?? 3030);
app.listen(port, () => {
  console.log(`API running on http://127.0.0.1:${port}`);
});
