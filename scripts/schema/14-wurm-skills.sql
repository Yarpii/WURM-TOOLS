-- WURM-TOOLS MySQL Schema - Part 14: Wurm Skills Reference Data
-- Run: mysql -u root -p wurmtools < 14-wurm-skills.sql
-- Depends on: 11-player-hub.sql

-- ========== SEED DATA: WURM SKILLS ==========

INSERT IGNORE INTO wurm_skills (name, category, parent_skill, description) VALUES
    -- Main skills
    ('Body', 'characteristics', NULL, 'Physical body strength'),
    ('Body Strength', 'characteristics', 'Body', 'Raw physical strength'),
    ('Body Stamina', 'characteristics', 'Body', 'Physical endurance'),
    ('Body Control', 'characteristics', 'Body', 'Physical coordination'),
    ('Mind', 'characteristics', NULL, 'Mental capabilities'),
    ('Mind Logic', 'characteristics', 'Mind', 'Logical thinking'),
    ('Mind Speed', 'characteristics', 'Mind', 'Mental quickness'),
    ('Soul', 'characteristics', NULL, 'Spiritual strength'),
    ('Soul Depth', 'characteristics', 'Soul', 'Spiritual depth'),
    ('Soul Strength', 'characteristics', 'Soul', 'Spiritual strength'),

    -- Combat
    ('Fighting', 'combat', NULL, 'General combat skill'),
    ('Defensive Fighting', 'combat', 'Fighting', 'Defensive combat stance'),
    ('Aggressive Fighting', 'combat', 'Fighting', 'Aggressive combat stance'),
    ('Normal Fighting', 'combat', 'Fighting', 'Normal combat stance'),
    ('Archery', 'combat', NULL, 'Bow and arrow combat'),
    ('Shield Bashing', 'combat', NULL, 'Shield attacks'),

    -- Weapons
    ('Swords', 'weapons', NULL, 'Sword combat'),
    ('Longsword', 'weapons', 'Swords', 'Longsword combat'),
    ('Shortsword', 'weapons', 'Swords', 'Shortsword combat'),
    ('Two Handed Sword', 'weapons', 'Swords', 'Two-handed sword combat'),
    ('Axes', 'weapons', NULL, 'Axe combat'),
    ('Hatchet', 'weapons', 'Axes', 'Hatchet combat'),
    ('Small Axe', 'weapons', 'Axes', 'Small axe combat'),
    ('Huge Axe', 'weapons', 'Axes', 'Huge axe combat'),
    ('Mauls', 'weapons', NULL, 'Maul combat'),
    ('Small Maul', 'weapons', 'Mauls', 'Small maul combat'),
    ('Medium Maul', 'weapons', 'Mauls', 'Medium maul combat'),
    ('Large Maul', 'weapons', 'Mauls', 'Large maul combat'),
    ('Knives', 'weapons', NULL, 'Knife combat'),
    ('Carving Knife', 'weapons', 'Knives', 'Carving knife combat'),
    ('Butchering Knife', 'weapons', 'Knives', 'Butchering knife combat'),
    ('Polearms', 'weapons', NULL, 'Polearm combat'),
    ('Staff', 'weapons', 'Polearms', 'Staff combat'),
    ('Long Spear', 'weapons', 'Polearms', 'Long spear combat'),
    ('Halberd', 'weapons', 'Polearms', 'Halberd combat'),

    -- Smithing
    ('Smithing', 'crafting', NULL, 'General metalworking'),
    ('Blacksmithing', 'crafting', 'Smithing', 'Creating metal tools and items'),
    ('Weapon Smithing', 'crafting', 'Smithing', 'Creating weapons'),
    ('Armour Smithing', 'crafting', 'Smithing', 'Creating armor'),
    ('Jewelry Smithing', 'crafting', 'Smithing', 'Creating jewelry'),
    ('Locksmithing', 'crafting', 'Smithing', 'Creating locks and keys'),
    ('Shield Smithing', 'crafting', 'Smithing', 'Creating shields'),
    ('Chain Armour Smithing', 'crafting', 'Armour Smithing', 'Creating chain armor'),
    ('Plate Armour Smithing', 'crafting', 'Armour Smithing', 'Creating plate armor'),

    -- Woodworking
    ('Carpentry', 'crafting', NULL, 'General woodworking'),
    ('Fine Carpentry', 'crafting', 'Carpentry', 'Detailed woodworking'),
    ('Ship Building', 'crafting', 'Carpentry', 'Building ships and boats'),
    ('Bowyery', 'crafting', 'Carpentry', 'Making bows'),
    ('Fletching', 'crafting', 'Carpentry', 'Making arrows'),
    ('Toy Making', 'crafting', 'Fine Carpentry', 'Making toys'),

    -- Other crafting
    ('Masonry', 'crafting', NULL, 'Stone and brick work'),
    ('Stone Cutting', 'crafting', 'Masonry', 'Cutting stone'),
    ('Pottery', 'crafting', NULL, 'Clay work'),
    ('Tailoring', 'crafting', NULL, 'Cloth work'),
    ('Cloth Tailoring', 'crafting', 'Tailoring', 'Making cloth items'),
    ('Leatherworking', 'crafting', 'Tailoring', 'Working with leather'),
    ('Ropemaking', 'crafting', NULL, 'Making ropes'),
    ('Thatching', 'crafting', NULL, 'Making thatch roofs'),
    ('Paving', 'crafting', NULL, 'Creating roads and paths'),

    -- Gathering
    ('Mining', 'gathering', NULL, 'Extracting ore and rock'),
    ('Digging', 'gathering', NULL, 'Moving dirt and clay'),
    ('Woodcutting', 'gathering', NULL, 'Cutting trees'),
    ('Foraging', 'gathering', NULL, 'Finding plants'),
    ('Botanizing', 'gathering', NULL, 'Finding herbs'),
    ('Fishing', 'gathering', NULL, 'Catching fish'),
    ('Farming', 'gathering', NULL, 'Growing crops'),

    -- Nature
    ('Nature', 'nature', NULL, 'Nature skills'),
    ('Animal Husbandry', 'nature', 'Nature', 'Breeding animals'),
    ('Animal Taming', 'nature', 'Nature', 'Taming wild animals'),
    ('Gardening', 'nature', 'Nature', 'Tending gardens'),
    ('Meditating', 'nature', NULL, 'Meditation paths'),
    ('Forestry', 'nature', 'Nature', 'Managing forests'),
    ('Milking', 'nature', 'Animal Husbandry', 'Milking animals'),
    ('Papyrusmaking', 'nature', NULL, 'Making papyrus'),

    -- Religion
    ('Faith', 'religion', NULL, 'Religious devotion'),
    ('Favor', 'religion', NULL, 'Divine favor'),
    ('Prayer', 'religion', 'Faith', 'Praying to gods'),
    ('Channeling', 'religion', NULL, 'Casting spells'),
    ('Preaching', 'religion', 'Faith', 'Preaching to others'),
    ('Exorcism', 'religion', 'Faith', 'Removing curses'),

    -- Cooking
    ('Cooking', 'cooking', NULL, 'Preparing food'),
    ('Hot Food Cooking', 'cooking', 'Cooking', 'Cooking hot meals'),
    ('Baking', 'cooking', 'Cooking', 'Baking bread and pastries'),
    ('Beverages', 'cooking', 'Cooking', 'Making drinks'),
    ('Butchering', 'cooking', NULL, 'Processing meat'),
    ('Dairy Food Making', 'cooking', 'Cooking', 'Making dairy products'),

    -- Misc
    ('Healing', 'misc', NULL, 'Healing wounds'),
    ('First Aid', 'misc', 'Healing', 'Basic wound treatment'),
    ('Alchemy', 'misc', NULL, 'Creating potions'),
    ('Natural Substances', 'misc', 'Alchemy', 'Creating natural remedies'),
    ('Tracking', 'misc', NULL, 'Tracking animals'),
    ('Trapping', 'misc', NULL, 'Setting traps'),
    ('Climbing', 'misc', NULL, 'Climbing surfaces'),
    ('Stealing', 'misc', NULL, 'Theft skill'),
    ('Lock Picking', 'misc', 'Stealing', 'Opening locks');
