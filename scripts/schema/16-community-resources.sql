-- Community Resources System
-- Allows users to share guides, tools, data, and other resources

CREATE TABLE IF NOT EXISTS community_resources (
  id INT AUTO_INCREMENT PRIMARY KEY,
  alliance_id INT NULL,                    -- Optional: for alliance-specific resources
  resource_type ENUM('guide', 'tool', 'data', 'media', 'template', 'other') NOT NULL DEFAULT 'other',
  name VARCHAR(255) NOT NULL,
  description TEXT,
  external_url VARCHAR(1000) NULL,         -- For external links (Google Drive, etc.)
  file_path VARCHAR(500) NULL,             -- For local uploads: /resources/{category}/{filename}
  file_size BIGINT NULL,                   -- In bytes
  category VARCHAR(100) NOT NULL,
  tags JSON NULL,                          -- Array of tags for filtering
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  view_count INT DEFAULT 0,
  download_count INT DEFAULT 0,
  is_approved BOOLEAN DEFAULT TRUE,        -- Moderation flag (default: auto-approve)
  is_featured BOOLEAN DEFAULT FALSE,       -- Highlight important resources

  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (alliance_id) REFERENCES alliances(id) ON DELETE SET NULL,

  INDEX idx_resource_type (resource_type),
  INDEX idx_category (category),
  INDEX idx_created_by (created_by),
  INDEX idx_alliance_id (alliance_id),
  INDEX idx_created_at (created_at),
  INDEX idx_is_featured (is_featured)
);

CREATE TABLE IF NOT EXISTS resource_versions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  resource_id INT NOT NULL,
  version VARCHAR(50) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size BIGINT,
  uploaded_by INT NOT NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  changelog TEXT,

  FOREIGN KEY (resource_id) REFERENCES community_resources(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE,

  INDEX idx_resource_id (resource_id),
  INDEX idx_uploaded_at (uploaded_at)
);

CREATE TABLE IF NOT EXISTS resource_ratings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  resource_id INT NOT NULL,
  user_id INT NOT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (resource_id) REFERENCES community_resources(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

  UNIQUE KEY unique_user_rating (resource_id, user_id),
  INDEX idx_resource_id (resource_id),
  INDEX idx_user_id (user_id),
  INDEX idx_rating (rating)
);

CREATE TABLE IF NOT EXISTS resource_comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  resource_id INT NOT NULL,
  user_id INT NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (resource_id) REFERENCES community_resources(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

  INDEX idx_resource_id (resource_id),
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
);

-- Insert some example categories
INSERT IGNORE INTO community_resources (
  name,
  description,
  resource_type,
  category,
  external_url,
  tags,
  created_by,
  is_featured
) VALUES (
  'WURM Community Resources (Google Drive)',
  'Official WURM community folder with guides, tools, spreadsheets, and community-contributed content. This is the main repository for community-shared resources.',
  'data',
  'Community Archives',
  'https://drive.google.com/drive/folders/0B6J_aGQ6URL8UURFN2VadWxtSWs?resourcekey=0-DuurGPuGLSABmTTu7-999g',
  '["guides", "tools", "community", "archive", "official"]',
  1,
  TRUE
);
