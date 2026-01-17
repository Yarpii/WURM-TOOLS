# WURM Online Cooking System - Implementation Plan

## Overview

This document contains all research and specifications needed to build a complete WURM Online cooking system for WURM-TOOLS, including:
- Recipe browser
- Affinity calculator
- CCFP nutrition calculator

---

## 1. AFFINITY SYSTEM

### How Affinities Work
- Eating prepared food gives a **temporary +10% skill bonus** to a specific skill
- Duration depends on amount eaten and food rarity
- Each player has a unique "Player Number" (0-137) that affects which affinity they get
- Same recipe = different affinity for different players

### Affinity Calculation Formula

```
affinity_skill = (player_number + sum_of_all_components) MOD 138
```

Where `sum_of_all_components` includes:
- Cooker value
- Container value
- Each ingredient's base value
- Each ingredient's preparation modifier
- Each ingredient's rarity modifier

### Rarity Bonuses (Affinity Duration)
| Rarity | Duration Bonus |
|--------|----------------|
| Normal | Base duration |
| Rare | +10% longer |
| Supreme | +40% longer |
| Fantastic | +90% longer |

---

## 2. COMPLETE DATA TABLES

### 2.1 Cookers (4 total)
| Cooker | Affinity Points |
|--------|-----------------|
| None | 0 |
| Campfire | 37 |
| Oven | 40 |
| Forge | 42 |

### 2.2 Containers (12 total)
| Container | Affinity Points |
|-----------|-----------------|
| None | 0 |
| Open Helm | 11 |
| Pie Dish | 61 |
| Cake Tin | 62 |
| Baking Stone | 63 |
| Roasting Dish | 65 |
| Plate | 69 |
| Sauce Pan | 74 |
| Frying Pan | 75 |
| Pottery Bowl | 77 |
| Mushroom Container | 119 |
| Sausage Skin | 132 |

### 2.3 Preparation Methods (14 total)
| Preparation | Affinity Modifier |
|-------------|-------------------|
| Whole | 0 |
| Fried | 1 |
| Roasted | 4 |
| Steamed | 5 |
| Cooked | 7 |
| Chopped | 16 |
| Diced | 16 |
| Ground | 16 |
| Jam | 28 |
| Minced | 32 |
| Mashed | 32 |
| Sausage Veggie | 76 |
| Fresh | 128 |
| Sausage Meat | 132 |

### 2.4 Rarity Modifiers (4 total)
| Rarity | Modifier |
|--------|----------|
| Normal | 0 |
| Rare | 1 |
| Supreme | 2 |
| Fantastic | 3 |

### 2.5 Ingredient Categories (10 total)
| Category | ID |
|----------|-----|
| Meat | 1 |
| Veggie | 2 |
| Fruit | 3 |
| Herb | 4 |
| Cheese | 5 |
| Spice | 6 |
| Mushroom | 7 |
| Fish | 8 |
| Misc | 9 |
| Nut | 10 |

### 2.6 Complete Ingredient List (117 total)

**Meats:**
bear, beef, canine, cat, dragon, fowl, game, horse, human, humanoid, insect, lamb, pork, seafood, snake, tough

**Grains:**
barley, wheat, rye, oat, rice

**Vegetables:**
corn, pumpkin, potato, onion, carrot, cabbage, tomato, lettuce, pea pod, pea, cucumber

**Fruits:**
green apple, strawberries, blueberry, lingonberry, cherries, lemon, blue grapes, olives, green grapes, raspberries, pineapple, orange

**Fish:**
pike, smallmouth bass, herring, catfish, snook, roach, perch, carp, brook trout, marlin, white shark, octopus, sailfish, dorado, tuna

**Cheeses:**
cheese, goat cheese, feta cheese, buffalo cheese

**Nuts:**
hazelnuts, walnut, chestnut, pinenut

**Herbs:**
lovage, sage, garlic, oregano, parsley, basil, thyme, belladonna, rosemary, nettles, sassafras, mint, fennel, camellia, oleander

**Mushrooms:**
green, black, brown, yellow, blue, red

**Spices:**
cumin, ginger, nutmeg, paprika, turmeric, fennel seed

**Miscellaneous:**
honey, salt, egg, maple sap, sugar, cocoa bean, gravy, bacon, butter, croutons, crisps, toast, pesto, stock, white sauce, bread, haggis, kielbasa, fries

### 2.7 Skills List (138 total - IDs 0-137)

```javascript
const SKILLS = {
  0: "Mind", 1: "Body", 2: "Soul", 3: "Body Control", 4: "Body Stamina",
  5: "Body Strength", 6: "Mind Logic", 7: "Mind Speed", 8: "Soul Depth",
  9: "Soul Strength", 10: "Swords", 11: "Axes", 12: "Knives", 13: "Mauls",
  14: "Clubs", 15: "Hammers", 16: "Archery", 17: "Polearms", 18: "Tailoring",
  19: "Cooking", 20: "Smithing", 21: "Weaponsmithing", 22: "Armour Smithing",
  23: "Misc Items", 24: "Shields", 25: "Alchemy", 26: "Nature", 27: "Toys",
  28: "Fighting", 29: "Healing", 30: "Religion", 31: "Thievery",
  32: "War Machines", 33: "Farming", 34: "Papyrus Making", 35: "Thatching",
  36: "Gardening", 37: "Animal Husbandry", 38: "Forestry", 39: "Rake",
  40: "Scythe", 41: "Sickle", 42: "Small Axe", 43: "Mining", 44: "Digging",
  45: "Pickaxe", 46: "Shovel", 47: "Pottery", 48: "Ropemaking", 49: "Religion",
  50: "Hatchet", 51: "Leatherworking", 52: "Cloth Tailoring", 53: "Masonry",
  54: "Blades Smithing", 55: "Weapon Heads Smithing", 56: "Chain Armour Smithing",
  57: "Plate Armour Smithing", 58: "Shield Smithing", 59: "Blacksmithing",
  60: "Dairy Food Making", 61: "Hot Food Cooking", 62: "Baking", 63: "Beverages",
  64: "Longsword", 65: "Large Maul", 66: "Medium Maul", 67: "Small Maul",
  68: "Warhammer", 69: "Long Spear", 70: "Halberd", 71: "Staff",
  72: "Carving Knife", 73: "Butchering Knife", 74: "Stone Chisel", 75: "Huge Club",
  76: "Saw", 77: "Butchering", 78: "Carpentry", 79: "Firemaking", 80: "Tracking",
  81: "Small Wooden Shield", 82: "Medium Wooden Shield", 83: "Large Wooden Shield",
  84: "Small Metal Shield", 85: "Large Metal Shield", 86: "Medium Metal Shield",
  87: "Large Axe", 88: "Huge Axe", 89: "Shortsword", 90: "Two Handed Sword",
  91: "Hammer", 92: "Paving", 93: "Prospecting", 94: "Fishing",
  95: "Locksmithing", 96: "Repairing", 97: "Coal-Making", 98: "Milling",
  99: "Metallurgy", 100: "Natural Substances", 101: "Jewelry Smithing",
  102: "Fine Carpentry", 103: "Bowyery", 104: "Fletching", 105: "Yoyo",
  106: "Puppeteering", 107: "Toymaking", 108: "Weaponless Fighting",
  109: "Aggressive Fighting", 110: "Defensive Fighting", 111: "Normal Fighting",
  112: "First Aid", 113: "Taunting", 114: "Shield Bashing", 115: "Milking",
  116: "Preaching", 117: "Prayer", 118: "Channeling", 119: "Exorcism",
  120: "Artifacts", 121: "Foraging", 122: "Botanizing", 123: "Climbing",
  124: "Stone Cutting", 125: "Lock Picking", 126: "Stealing", 127: "Traps",
  128: "Catapults", 129: "Animal Taming", 130: "Animal Husbandry",
  131: "Short Bow", 132: "Long Bow", 133: "Medium Bow", 134: "Ship Building",
  135: "Ballistae", 136: "Trebuchets", 137: "Turrets"
};
```

---

## 3. CCFP NUTRITION SYSTEM

### Daily Intake Values
| Nutrient | Daily Target |
|----------|--------------|
| Calories | 2,000 |
| Carbohydrates | 300 |
| Fats | 80 |
| Proteins | 50 |

### CCFP Bar Effects
| Bar | Effect When High |
|-----|------------------|
| Calories | Reduces endurance drain |
| Carbohydrates | Reduces water usage |
| Fats | Increases regeneration, reduces sleep bonus drain |
| Proteins | Reduces food usage |

### Example Ingredient CCFP Values
| Ingredient | Calories | Carbs | Fats | Proteins |
|------------|----------|-------|------|----------|
| Barley | 1045.2 | 230.7 | 3.3 | 29.4 |
| Cabbage | 247.0 | 49.0 | 2.0 | 18.0 |
| Carrot | 202.5 | 47.5 | 0.5 | 4.0 |
| Corn | 85.1 | 18.5 | 1.3 | 3.2 |
| Cucumber | 79.0 | 17.5 | 0.0 | 3.0 |

### 100% CCFP Foods
These foods fill all CCFP bars to 100%:
- Full House Pizza (Q60+)
- Haggis
- White Fish Salad
- Chicken Parmigiana

---

## 4. RECIPE TYPES

### Main Recipe Categories
1. **Meals** - Meat/fish + veggies + herbs + spices in frying pan
2. **Casseroles** - Bread-based in pottery bowl
3. **Stews** - Slow-cook with vegetables and meat
4. **Pizza** - Requires dough, cheese, olive oil
5. **Salads** - Raw vegetables combined
6. **Beverages** - Drinks and alcohol
7. **Baked Goods** - Bread, cakes, pies

### Basic Recipe Structure
```
Recipe = Container + Cooker + Mandatory Ingredients + Optional Ingredients
```

### Recipe Difficulty
- Difficulty increases with complexity
- More ingredients = higher difficulty
- Forge > Oven for difficulty
- Optimal skill gain at difficulty ±10 of skill level

---

## 5. DATABASE SCHEMA

### 5.1 cooking_cookers
```sql
CREATE TABLE cooking_cookers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    affinity_value INT NOT NULL DEFAULT 0,
    description TEXT,
    icon_url VARCHAR(255)
);
```

### 5.2 cooking_containers
```sql
CREATE TABLE cooking_containers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    affinity_value INT NOT NULL DEFAULT 0,
    description TEXT,
    icon_url VARCHAR(255)
);
```

### 5.3 cooking_preparations
```sql
CREATE TABLE cooking_preparations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    affinity_modifier INT NOT NULL DEFAULT 0,
    applies_to JSON,  -- ['meat', 'veggie', etc.]
    description TEXT
);
```

### 5.4 cooking_ingredients
```sql
CREATE TABLE cooking_ingredients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(50) NOT NULL,  -- meat, veggie, fruit, herb, etc.
    affinity_value INT NOT NULL DEFAULT 0,

    -- CCFP values
    calories DECIMAL(10,2) DEFAULT 0,
    carbs DECIMAL(10,2) DEFAULT 0,
    fats DECIMAL(10,2) DEFAULT 0,
    proteins DECIMAL(10,2) DEFAULT 0,

    -- Additional info
    weight DECIMAL(10,4),
    difficulty_modifier INT DEFAULT 0,
    icon_url VARCHAR(255),
    notes TEXT,

    INDEX idx_category (category),
    INDEX idx_affinity (affinity_value)
);
```

### 5.5 cooking_skills
```sql
CREATE TABLE cooking_skills (
    id INT PRIMARY KEY,  -- 0-137
    name VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(50),  -- combat, crafting, nature, etc.

    INDEX idx_category (category)
);
```

### 5.6 cooking_recipes
```sql
CREATE TABLE cooking_recipes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(200),

    -- Requirements
    cooker_id INT,
    container_id INT,
    skill_required VARCHAR(50) DEFAULT 'Hot Food Cooking',
    difficulty INT DEFAULT 1,

    -- Results
    result_name VARCHAR(200),
    ccfp_multiplier DECIMAL(5,2) DEFAULT 1.0,

    -- Flags
    is_verified BOOLEAN DEFAULT FALSE,

    -- Metadata
    notes TEXT,
    source_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (cooker_id) REFERENCES cooking_cookers(id),
    FOREIGN KEY (container_id) REFERENCES cooking_containers(id),
    INDEX idx_name (name),
    INDEX idx_difficulty (difficulty)
);
```

### 5.7 cooking_recipe_ingredients
```sql
CREATE TABLE cooking_recipe_ingredients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    recipe_id INT NOT NULL,
    ingredient_id INT NOT NULL,
    quantity DECIMAL(10,4) DEFAULT 1,
    is_mandatory BOOLEAN DEFAULT TRUE,
    preparation_id INT,
    notes TEXT,

    FOREIGN KEY (recipe_id) REFERENCES cooking_recipes(id) ON DELETE CASCADE,
    FOREIGN KEY (ingredient_id) REFERENCES cooking_ingredients(id),
    FOREIGN KEY (preparation_id) REFERENCES cooking_preparations(id),
    INDEX idx_recipe (recipe_id)
);
```

### 5.8 user_player_numbers
```sql
CREATE TABLE user_player_numbers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    player_number INT NOT NULL,  -- 0-137
    character_name VARCHAR(100),
    discovered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_char (user_id, character_name)
);
```

---

## 6. UI COMPONENTS TO BUILD

### 6.1 Recipe Browser Page (`/cooking`)
- Search recipes by name
- Filter by:
  - Container type
  - Cooker type
  - Ingredient category
  - Difficulty range
  - CCFP coverage
- Show recipe details:
  - Ingredients with quantities
  - Required container/cooker
  - Difficulty
  - CCFP values
  - Notes

### 6.2 Affinity Calculator (`/cooking/affinity`)
- Input: Player number (or discover it)
- Select: Cooker, Container
- Add: Ingredients with preparations
- Output: Predicted affinity skill
- Save: Favorite recipes per character

### 6.3 Player Number Discovery Tool
1. User cooks a simple test meal (1 meat + pottery bowl)
2. User tastes meal and sees affinity
3. User enters affinity skill
4. System calculates player number: `player_number = (affinity_skill_id - container - cooker - ingredient) MOD 138`
5. Save player number for future calculations

### 6.4 CCFP Calculator (`/cooking/nutrition`)
- Select ingredients
- Calculate total CCFP values
- Show % of daily intake
- Suggest additions to fill bars

### 6.5 Recipe Maker Tool
- Build custom recipes
- See affinity preview (requires player number)
- Calculate CCFP values
- Save to personal recipe book

---

## 7. API ENDPOINTS TO CREATE

```
GET  /api/cooking/cookers              - List all cookers
GET  /api/cooking/containers           - List all containers
GET  /api/cooking/preparations         - List all preparations
GET  /api/cooking/ingredients          - List ingredients (with filters)
GET  /api/cooking/skills               - List all skills
GET  /api/cooking/recipes              - List recipes (with filters)
GET  /api/cooking/recipes/:id          - Get single recipe

POST /api/cooking/calculate-affinity   - Calculate affinity from components
POST /api/cooking/calculate-ccfp       - Calculate CCFP from ingredients
POST /api/cooking/discover-player-num  - Calculate player number from test meal

POST /api/cooking/user/player-number   - Save user's player number
GET  /api/cooking/user/player-number   - Get user's player number
POST /api/cooking/user/recipes         - Save favorite recipe
GET  /api/cooking/user/recipes         - Get user's saved recipes
```

---

## 8. IMPLEMENTATION ORDER

### Phase 1: Data Foundation
1. Create database schema (migration script)
2. Seed cookers, containers, preparations data
3. Seed skills data (138 skills)
4. Import ingredients from Wurmpedia JSON (with CCFP if available)

### Phase 2: Core API
5. Build API endpoints for data retrieval
6. Implement affinity calculation logic
7. Implement CCFP calculation logic

### Phase 3: Recipe Browser
8. Create recipe browser page
9. Add search and filter functionality
10. Display recipe details

### Phase 4: Affinity Calculator
11. Build affinity calculator UI
12. Add player number discovery tool
13. Implement recipe saving

### Phase 5: Advanced Features
14. CCFP nutrition calculator
15. Recipe maker tool
16. User recipe book

---

## 9. SOURCES & REFERENCES

- [wurmfood.com](https://wurmfood.com/) - Affinity calculator
- [theredlegion.com](https://www.theredlegion.com/) - Food calculator
- [crazyqnt.github.io/wurmfoodcalc](https://crazyqnt.github.io/wurmfoodcalc/) - Food calculator
- [tylerreisinger/wurm-food](https://github.com/tylerreisinger/wurm-food) - Python library (data source)
- [Wurmpedia Cooking Guide](https://www.wurmpedia.com/index.php/Cooking)
- [Steam Guide: Gaining Affinity in Cooking](https://steamcommunity.com/sharedfiles/filedetails/?id=1138334490)
- [Food of Wurm](https://sites.google.com/a/wurmonline.com/food-of-wurm/) - CCFP experiments

---

## 10. NOTES

### Missing Data to Collect
- [ ] Individual ingredient affinity values (need to extract from wurm-food repo JSON)
- [ ] Complete CCFP values for all ingredients
- [ ] Full recipe list from Wurmpedia

### Potential Enhancements
- Recipe suggestions based on available ingredients
- Affinity wishlist - find recipes for desired skill
- Integration with Wurmpedia import system
- Community recipe submissions
- Recipe difficulty auto-calculation

---

*Last updated: January 2026*
*Ready for implementation when tokens are available*
