-- Wurmpedia -> MariaDB schema
-- utf8mb4 everywhere

CREATE TABLE IF NOT EXISTS pages (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  article_id INT NULL,
  revision_id INT NULL,
  page_type VARCHAR(50) NOT NULL DEFAULT 'article',
  breadcrumbs_json JSON NULL,
  source VARCHAR(50) NOT NULL DEFAULT 'wurmpedia',
  html_hash CHAR(64) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_pages_slug (slug),
  KEY idx_pages_title (title),
  KEY idx_pages_type (page_type),
  KEY idx_pages_article_id (article_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS categories (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_categories_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS page_categories (
  page_id BIGINT UNSIGNED NOT NULL,
  category_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (page_id, category_id),
  CONSTRAINT fk_pc_page FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE,
  CONSTRAINT fk_pc_cat  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS infoboxes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  page_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(255) NULL,
  image_src TEXT NULL,
  image_alt TEXT NULL,
  image_original TEXT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_infobox_page (page_id),
  CONSTRAINT fk_inf_page FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS infobox_fields (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  infobox_id BIGINT UNSIGNED NOT NULL,
  section_name VARCHAR(255) NOT NULL,
  items_json JSON NULL,
  raw_html MEDIUMTEXT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_infobox_section (infobox_id, section_name),
  CONSTRAINT fk_if_inf FOREIGN KEY (infobox_id) REFERENCES infoboxes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS page_sections (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  page_id BIGINT UNSIGNED NOT NULL,
  heading VARCHAR(255) NOT NULL,
  heading_id VARCHAR(255) NULL,
  content_text MEDIUMTEXT NULL,
  content_html MEDIUMTEXT NULL,
  section_order INT NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_page_heading (page_id, heading),
  KEY idx_sections_page_order (page_id, section_order),
  CONSTRAINT fk_ps_page FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS page_links (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  page_id BIGINT UNSIGNED NOT NULL,
  href TEXT NOT NULL,
  link_text TEXT NULL,
  link_title TEXT NULL,
  context VARCHAR(255) NULL,
  to_slug VARCHAR(255) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_link_dedupe (page_id, context(64), href(191), link_text(64)),
  KEY idx_links_page (page_id),
  KEY idx_links_to_slug (to_slug),
  CONSTRAINT fk_pl_page FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS images (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  src TEXT NOT NULL,
  original_src TEXT NULL,
  alt TEXT NULL,
  width INT NULL,
  height INT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_images_src (src(191))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS page_images (
  page_id BIGINT UNSIGNED NOT NULL,
  image_id BIGINT UNSIGNED NOT NULL,
  context VARCHAR(255) NULL,
  PRIMARY KEY (page_id, image_id, context(64)),
  CONSTRAINT fk_pi_page FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE,
  CONSTRAINT fk_pi_img  FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
