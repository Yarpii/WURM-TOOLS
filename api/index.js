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
  const [[row]] = await pool.query("SELECT 1 AS ok");
  res.json(row);
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

const port = Number(process.env.PORT ?? 3030);
app.listen(port, () => {
  console.log(`API running on http://127.0.0.1:${port}`);
});
