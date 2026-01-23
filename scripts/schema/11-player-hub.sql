-- WURM-TOOLS MySQL Schema - Part 11: Player Hub (Skills, Timers, Events)
-- Run: mysql -u root -p wurmtools < 11-player-hub.sql
-- Depends on: 01-core.sql, 02-characters.sql

-- ========== PLAYER HUB: SKILL TRACKING ==========

CREATE TABLE IF NOT EXISTS user_skills (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    character_id INT,
    skill_name VARCHAR(100) NOT NULL,
    current_level DECIMAL(10, 4) NOT NULL DEFAULT 1.0,
    target_level DECIMAL(10, 4),
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_user_skills_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_skills_character FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE SET NULL,
    UNIQUE KEY uk_user_skill_char (user_id, character_id, skill_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_user_skills_user ON user_skills(user_id);
CREATE INDEX idx_user_skills_name ON user_skills(skill_name);

CREATE TABLE IF NOT EXISTS skill_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_skill_id INT NOT NULL,
    old_level DECIMAL(10, 4) NOT NULL,
    new_level DECIMAL(10, 4) NOT NULL,
    recorded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_skill_history_skill FOREIGN KEY (user_skill_id) REFERENCES user_skills(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_skill_history_skill ON skill_history(user_skill_id);
CREATE INDEX idx_skill_history_date ON skill_history(recorded_at);

-- ========== PLAYER HUB: TIMERS ==========

CREATE TABLE IF NOT EXISTS user_timers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    timer_type VARCHAR(30) NOT NULL,
    duration_minutes INT NOT NULL,
    start_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_time DATETIME NOT NULL,
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_interval INT,
    notify_discord BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    notified_at TIMESTAMP NULL,
    color VARCHAR(20) DEFAULT '#3b82f6',
    icon VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_user_timers_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT chk_user_timers_type CHECK (timer_type IN ('sleep_bonus', 'fatigue', 'crop', 'animal', 'sermon', 'meditation', 'custom', 'cooldown', 'bulk'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_user_timers_user ON user_timers(user_id);
CREATE INDEX idx_user_timers_type ON user_timers(timer_type);
CREATE INDEX idx_user_timers_end ON user_timers(end_time);
CREATE INDEX idx_user_timers_active ON user_timers(is_active);

CREATE TABLE IF NOT EXISTS timer_presets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    name VARCHAR(100) NOT NULL,
    timer_type VARCHAR(30) NOT NULL,
    duration_minutes INT NOT NULL,
    description TEXT,
    color VARCHAR(20) DEFAULT '#3b82f6',
    icon VARCHAR(50),
    is_public BOOLEAN DEFAULT FALSE,

    CONSTRAINT fk_timer_presets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_timer_presets_user ON timer_presets(user_id);
CREATE INDEX idx_timer_presets_type ON timer_presets(timer_type);

-- ========== PLAYER HUB: EVENTS / CALENDAR ==========

CREATE TABLE IF NOT EXISTS events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    event_type VARCHAR(30) NOT NULL,
    server VARCHAR(50),
    location VARCHAR(200),
    coordinates VARCHAR(50),
    start_date DATETIME NOT NULL,
    end_date TIMESTAMP NULL,
    is_all_day BOOLEAN DEFAULT FALSE,
    is_public BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    max_attendees INT,
    contact_info TEXT,
    external_link VARCHAR(500),
    image_url VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_events_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT chk_events_type CHECK (event_type IN ('impalong', 'rift', 'unique', 'sermon_group', 'market', 'pvp', 'community', 'personal', 'other'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_events_user ON events(user_id);
CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_server ON events(server);
CREATE INDEX idx_events_start ON events(start_date);
CREATE INDEX idx_events_public ON events(is_public);
CREATE INDEX idx_events_featured ON events(is_featured);

CREATE TABLE IF NOT EXISTS event_attendees (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    user_id INT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'interested',
    character_name VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_event_attendees_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    CONSTRAINT fk_event_attendees_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT chk_event_attendees_status CHECK (status IN ('interested', 'going', 'maybe', 'not_going')),
    UNIQUE KEY uk_event_attendee (event_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_event_attendees_event ON event_attendees(event_id);
CREATE INDEX idx_event_attendees_user ON event_attendees(user_id);
CREATE INDEX idx_event_attendees_status ON event_attendees(status);

-- ========== WURM SKILL REFERENCE ==========

CREATE TABLE IF NOT EXISTS wurm_skills (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(50) NOT NULL,
    parent_skill VARCHAR(100),
    max_level DECIMAL(5, 2) DEFAULT 100.00,
    description TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_wurm_skills_category ON wurm_skills(category);
CREATE INDEX idx_wurm_skills_parent ON wurm_skills(parent_skill);
