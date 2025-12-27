<?php
/**
 * WurmCalc - Database Setup
 * SQLite database voor WURM Online crafting calculator
 */

function getDatabase(): PDO {
    $dbPath = __DIR__ . '/wurmcalc.sqlite';
    $isNew = !file_exists($dbPath);
    
    $pdo = new PDO('sqlite:' . $dbPath);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    
    if ($isNew) {
        initDatabase($pdo);
        seedData($pdo);
    }
    
    return $pdo;
}

function initDatabase(PDO $pdo): void {
    // Items table - all craftable items and base materials
    $pdo->exec("
        CREATE TABLE items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            category TEXT DEFAULT 'misc',
            is_base_material INTEGER DEFAULT 0,
            description TEXT
        )
    ");
    
    // Recipes table - what ingredients are needed
    $pdo->exec("
        CREATE TABLE recipes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            result_item_id INTEGER NOT NULL,
            ingredient_item_id INTEGER NOT NULL,
            quantity REAL NOT NULL DEFAULT 1,
            FOREIGN KEY (result_item_id) REFERENCES items(id),
            FOREIGN KEY (ingredient_item_id) REFERENCES items(id)
        )
    ");
    
    // Create indexes for faster lookups
    $pdo->exec("CREATE INDEX idx_recipes_result ON recipes(result_item_id)");
    $pdo->exec("CREATE INDEX idx_recipes_ingredient ON recipes(ingredient_item_id)");
}

function seedData(PDO $pdo): void {
    // Base materials (things you gather, not craft)
    $baseMaterials = [
        ['Log', 'wood', 'Harvested from trees'],
        ['Iron Ore', 'ore', 'Mined from rock'],
        ['Clay', 'material', 'Dug from clay tiles'],
        ['Cotton', 'material', 'Harvested from cotton plants'],
        ['Water', 'material', 'Collected from wells or tiles'],
        ['Rock Shards', 'material', 'Mined from rock'],
        ['Pelt', 'material', 'From killed animals'],
        ['Leather', 'material', 'Processed from hides'],
    ];
    
    foreach ($baseMaterials as $mat) {
        $pdo->prepare("INSERT INTO items (name, category, is_base_material, description) VALUES (?, ?, 1, ?)")
            ->execute($mat);
    }
    
    // Crafted items
    $craftedItems = [
        ['Plank', 'wood', 'Sawn from logs'],
        ['Shaft', 'wood', 'Carved from logs'],
        ['Small Nail', 'metal', 'Made from iron lumps'],
        ['Large Nail', 'metal', 'Made from iron lumps'],
        ['Iron Lump', 'metal', 'Smelted from iron ore'],
        ['Wheel', 'vehicle', 'Used in carts and wagons'],
        ['Wheel Axle', 'vehicle', 'Connects wheels'],
        ['Cart', 'vehicle', 'Small transport vehicle'],
        ['Large Cart', 'vehicle', 'Larger transport vehicle'],
        ['Rope', 'material', 'Made from cotton'],
        ['Brick', 'building', 'Made from clay'],
        ['Mortar', 'building', 'Made from clay and sand'],
        ['Mallet', 'tool', 'Wooden hammer'],
        ['Hammer', 'tool', 'Metal hammer'],
        ['Saw', 'tool', 'For cutting planks'],
        ['Spindle', 'tool', 'For making rope'],
    ];
    
    foreach ($craftedItems as $item) {
        $pdo->prepare("INSERT INTO items (name, category, is_base_material, description) VALUES (?, ?, 0, ?)")
            ->execute($item);
    }
    
    // Now add recipes (ingredient relationships)
    $recipes = [
        // Plank: 1 Log
        ['Plank', 'Log', 1],
        
        // Shaft: 1 Log (makes multiple, but 1 log input)
        ['Shaft', 'Log', 1],
        
        // Iron Lump: 1 Iron Ore (smelted)
        ['Iron Lump', 'Iron Ore', 1],
        
        // Small Nail: 0.1 Iron Lump (10 nails per lump roughly)
        ['Small Nail', 'Iron Lump', 0.1],
        
        // Large Nail: 0.2 Iron Lump
        ['Large Nail', 'Iron Lump', 0.2],
        
        // Rope: 2 Cotton
        ['Rope', 'Cotton', 2],
        
        // Spindle: 1 Shaft
        ['Spindle', 'Shaft', 1],
        
        // Mallet: 1 Shaft + 1 Plank
        ['Mallet', 'Shaft', 1],
        ['Mallet', 'Plank', 1],
        
        // Hammer: 1 Shaft + 1 Iron Lump
        ['Hammer', 'Shaft', 1],
        ['Hammer', 'Iron Lump', 1],
        
        // Saw: 1 Shaft + 1 Iron Lump
        ['Saw', 'Shaft', 1],
        ['Saw', 'Iron Lump', 2],
        
        // Wheel Axle: 1 Shaft + 2 Small Nails
        ['Wheel Axle', 'Shaft', 1],
        ['Wheel Axle', 'Small Nail', 2],
        
        // Wheel: 3 Planks + 1 Shaft + 4 Small Nails
        ['Wheel', 'Plank', 3],
        ['Wheel', 'Shaft', 1],
        ['Wheel', 'Small Nail', 4],
        
        // Cart: 2 Wheels + 1 Wheel Axle + 10 Planks + 2 Shafts + 1 Rope + 10 Large Nails
        ['Cart', 'Wheel', 2],
        ['Cart', 'Wheel Axle', 1],
        ['Cart', 'Plank', 10],
        ['Cart', 'Shaft', 2],
        ['Cart', 'Rope', 1],
        ['Cart', 'Large Nail', 10],
        
        // Large Cart: 4 Wheels + 2 Wheel Axles + 20 Planks + 4 Shafts + 2 Ropes + 20 Large Nails
        ['Large Cart', 'Wheel', 4],
        ['Large Cart', 'Wheel Axle', 2],
        ['Large Cart', 'Plank', 20],
        ['Large Cart', 'Shaft', 4],
        ['Large Cart', 'Rope', 2],
        ['Large Cart', 'Large Nail', 20],
        
        // Brick: 1 Clay
        ['Brick', 'Clay', 1],
        
        // Mortar: 1 Clay + 1 Rock Shards
        ['Mortar', 'Clay', 1],
        ['Mortar', 'Rock Shards', 1],
    ];
    
    // Get item IDs
    $stmt = $pdo->query("SELECT id, name FROM items");
    $itemIds = [];
    while ($row = $stmt->fetch()) {
        $itemIds[$row['name']] = $row['id'];
    }
    
    // Insert recipes
    $insertRecipe = $pdo->prepare("INSERT INTO recipes (result_item_id, ingredient_item_id, quantity) VALUES (?, ?, ?)");
    foreach ($recipes as $recipe) {
        $resultId = $itemIds[$recipe[0]] ?? null;
        $ingredientId = $itemIds[$recipe[1]] ?? null;
        if ($resultId && $ingredientId) {
            $insertRecipe->execute([$resultId, $ingredientId, $recipe[2]]);
        }
    }
}
