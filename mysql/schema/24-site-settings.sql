-- =============================================
-- Site Settings - Admin-configurable branding & style
-- =============================================

CREATE TABLE IF NOT EXISTS site_settings (
    setting_key VARCHAR(100) PRIMARY KEY,
    setting_value TEXT NOT NULL,
    setting_type ENUM('string', 'color', 'url', 'json') DEFAULT 'string',
    category ENUM('branding', 'colors', 'social', 'seo') DEFAULT 'branding',
    description VARCHAR(255),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by INT,

    CONSTRAINT fk_site_settings_user FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Index for category-based lookups
CREATE INDEX idx_site_settings_category ON site_settings(category);

-- Default branding settings
INSERT INTO site_settings (setting_key, setting_value, setting_type, category, description) VALUES
    ('site_name',           'Wurm Tools',                                      'string', 'branding', 'Site display name'),
    ('site_tagline',        'Community Hub for Wurm Online',                    'string', 'branding', 'Short tagline shown in header/footer'),
    ('header_logo_dark',    '',                                                'url',    'branding', 'Header logo for dark theme (with site name text)'),
    ('header_logo_light',   '',                                                'url',    'branding', 'Header logo for light theme (with site name text)'),
    ('footer_icon_dark',    '',                                                'url',    'branding', 'Footer icon for dark theme (icon only)'),
    ('footer_icon_light',   '',                                                'url',    'branding', 'Footer icon for light theme (icon only)'),
    ('favicon_dark',        '/icon.svg',                                       'url',    'branding', 'Favicon for dark theme'),
    ('favicon_light',       '/icon.svg',                                       'url',    'branding', 'Favicon for light theme'),
    ('og_image_url',        '/og-image.svg',                                   'url',    'branding', 'Default Open Graph image URL')
ON DUPLICATE KEY UPDATE setting_key = setting_key;

-- Default color settings
INSERT INTO site_settings (setting_key, setting_value, setting_type, category, description) VALUES
    ('color_accent',       '#3b82f6', 'color', 'colors', 'Primary accent color'),
    ('color_accent_hover', '#60a5fa', 'color', 'colors', 'Accent hover color'),
    ('color_success',      '#22c55e', 'color', 'colors', 'Success/positive color'),
    ('color_warning',      '#f59e0b', 'color', 'colors', 'Warning color'),
    ('color_danger',       '#ef4444', 'color', 'colors', 'Danger/error color'),
    ('color_info',         '#06b6d4', 'color', 'colors', 'Info color')
ON DUPLICATE KEY UPDATE setting_key = setting_key;

-- Default social settings
INSERT INTO site_settings (setting_key, setting_value, setting_type, category, description) VALUES
    ('social_twitter',  '@wurmtools',                          'string', 'social', 'Twitter/X handle'),
    ('social_github',   'https://github.com/Yarpii/WURM-TOOLS', 'url',  'social', 'GitHub repository URL'),
    ('social_discord',  '',                                     'url',   'social', 'Discord invite URL')
ON DUPLICATE KEY UPDATE setting_key = setting_key;

-- Default SEO settings
INSERT INTO site_settings (setting_key, setting_value, setting_type, category, description) VALUES
    ('seo_description', 'Your all-in-one toolkit for Wurm Online: crafting calculators, cooking affinities, skill optimizer, marketplace, merchant directory, interactive map, and community features.', 'string', 'seo', 'Default meta description'),
    ('seo_keywords',    'Wurm Online,crafting calculator,cooking affinity,skill optimizer,marketplace,merchants,community,MMO tools,game companion,Wurm toolkit', 'string', 'seo', 'Default meta keywords (comma-separated)')
ON DUPLICATE KEY UPDATE setting_key = setting_key;
