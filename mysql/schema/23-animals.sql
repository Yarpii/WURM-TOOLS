-- =============================================
-- Animal Breeding & Family Tree System
-- =============================================
-- Tracks animals in stables with breeding lineage,
-- traits, and family tree visualization.
-- =============================================

-- Stables: user-owned containers for animals
CREATE TABLE IF NOT EXISTS stables (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    server VARCHAR(50) NOT NULL,
    capacity INT NOT NULL DEFAULT 4,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_stables_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Animals: individual creatures with parent references for family tree
CREATE TABLE IF NOT EXISTS animals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    stable_id INT,
    name VARCHAR(100) NOT NULL,
    animal_type VARCHAR(50) NOT NULL DEFAULT 'horse',
    gender ENUM('male', 'female') NOT NULL,
    color VARCHAR(50),
    mother_id INT,
    father_id INT,
    generation INT NOT NULL DEFAULT 0,
    is_alive BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_animals_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_animals_stable FOREIGN KEY (stable_id) REFERENCES stables(id) ON DELETE SET NULL,
    CONSTRAINT fk_animals_mother FOREIGN KEY (mother_id) REFERENCES animals(id) ON DELETE SET NULL,
    CONSTRAINT fk_animals_father FOREIGN KEY (father_id) REFERENCES animals(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_animals_user ON animals(user_id);
CREATE INDEX idx_animals_stable ON animals(stable_id);
CREATE INDEX idx_animals_mother ON animals(mother_id);
CREATE INDEX idx_animals_father ON animals(father_id);
CREATE INDEX idx_animals_type ON animals(animal_type);

-- Animal traits: special characteristics that can be inherited
CREATE TABLE IF NOT EXISTS animal_traits (
    id INT AUTO_INCREMENT PRIMARY KEY,
    animal_id INT NOT NULL,
    trait_name VARCHAR(100) NOT NULL,
    trait_category ENUM('speed', 'draft', 'combat', 'output', 'misc', 'negative') NOT NULL DEFAULT 'misc',
    is_inherited BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_animal_traits_animal FOREIGN KEY (animal_id) REFERENCES animals(id) ON DELETE CASCADE,
    UNIQUE KEY uq_animal_trait (animal_id, trait_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_animal_traits_animal ON animal_traits(animal_id);
