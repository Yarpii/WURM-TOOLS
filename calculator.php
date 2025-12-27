<?php
/**
 * WurmCalc - Calculator Class
 * Recursively calculates total base materials needed
 */

require_once __DIR__ . '/database.php';

class WurmCalculator {
    private PDO $pdo;
    private array $itemCache = [];
    private array $recipeCache = [];
    
    public function __construct() {
        $this->pdo = getDatabase();
        $this->loadCaches();
    }
    
    private function loadCaches(): void {
        // Cache all items
        $stmt = $this->pdo->query("SELECT * FROM items");
        while ($row = $stmt->fetch()) {
            $this->itemCache[$row['id']] = $row;
        }
        
        // Cache all recipes grouped by result_item_id
        $stmt = $this->pdo->query("SELECT * FROM recipes");
        while ($row = $stmt->fetch()) {
            $resultId = $row['result_item_id'];
            if (!isset($this->recipeCache[$resultId])) {
                $this->recipeCache[$resultId] = [];
            }
            $this->recipeCache[$resultId][] = $row;
        }
    }
    
    /**
     * Get all items
     */
    public function getAllItems(): array {
        return array_values($this->itemCache);
    }
    
    /**
     * Get item by ID
     */
    public function getItem(int $id): ?array {
        return $this->itemCache[$id] ?? null;
    }
    
    /**
     * Get item by name
     */
    public function getItemByName(string $name): ?array {
        foreach ($this->itemCache as $item) {
            if (strcasecmp($item['name'], $name) === 0) {
                return $item;
            }
        }
        return null;
    }
    
    /**
     * Get direct recipe for an item
     */
    public function getRecipe(int $itemId): array {
        return $this->recipeCache[$itemId] ?? [];
    }
    
    /**
     * Calculate total base materials needed for an item
     * Returns array of [item_id => quantity]
     */
    public function calculateBaseMaterials(int $itemId, float $quantity = 1): array {
        $item = $this->getItem($itemId);
        if (!$item) {
            return [];
        }
        
        // If it's a base material, return it directly
        if ($item['is_base_material']) {
            return [$itemId => $quantity];
        }
        
        // Get recipe
        $recipe = $this->getRecipe($itemId);
        if (empty($recipe)) {
            // No recipe found, treat as base material
            return [$itemId => $quantity];
        }
        
        // Recursively calculate for each ingredient
        $materials = [];
        foreach ($recipe as $ingredient) {
            $ingredientId = $ingredient['ingredient_item_id'];
            $needed = $ingredient['quantity'] * $quantity;
            
            $subMaterials = $this->calculateBaseMaterials($ingredientId, $needed);
            
            foreach ($subMaterials as $matId => $matQty) {
                if (!isset($materials[$matId])) {
                    $materials[$matId] = 0;
                }
                $materials[$matId] += $matQty;
            }
        }
        
        return $materials;
    }
    
    /**
     * Build a crafting tree for visualization
     * Returns nested array structure
     */
    public function buildCraftingTree(int $itemId, float $quantity = 1, int $depth = 0): array {
        $item = $this->getItem($itemId);
        if (!$item) {
            return [];
        }
        
        $node = [
            'id' => $itemId,
            'name' => $item['name'],
            'category' => $item['category'],
            'quantity' => $quantity,
            'is_base' => (bool)$item['is_base_material'],
            'depth' => $depth,
            'children' => []
        ];
        
        // If base material or max depth, stop
        if ($item['is_base_material'] || $depth > 10) {
            return $node;
        }
        
        $recipe = $this->getRecipe($itemId);
        foreach ($recipe as $ingredient) {
            $childTree = $this->buildCraftingTree(
                $ingredient['ingredient_item_id'],
                $ingredient['quantity'] * $quantity,
                $depth + 1
            );
            if (!empty($childTree)) {
                $node['children'][] = $childTree;
            }
        }
        
        return $node;
    }
    
    /**
     * Search items by name
     */
    public function searchItems(string $query): array {
        $results = [];
        $query = strtolower($query);
        
        foreach ($this->itemCache as $item) {
            if (str_contains(strtolower($item['name']), $query)) {
                $results[] = $item;
            }
        }
        
        return $results;
    }
    
    /**
     * Get all categories
     */
    public function getCategories(): array {
        $categories = [];
        foreach ($this->itemCache as $item) {
            $categories[$item['category']] = true;
        }
        return array_keys($categories);
    }
    
    /**
     * Get items by category
     */
    public function getItemsByCategory(string $category): array {
        $items = [];
        foreach ($this->itemCache as $item) {
            if ($item['category'] === $category) {
                $items[] = $item;
            }
        }
        return $items;
    }

    /**
     * Format quantity for display (round to 2 decimals, remove trailing zeros)
     */
    public function formatQuantity(float $qty): string {
        if ($qty == floor($qty)) {
            return (string)(int)$qty;
        }
        return rtrim(rtrim(number_format($qty, 2), '0'), '.');
    }

    // ========== ADMIN FUNCTIONS ==========

    /**
     * Add a new item
     */
    public function addItem(string $name, string $category, bool $isBaseMaterial, string $description = ''): int {
        $stmt = $this->pdo->prepare("INSERT INTO items (name, category, is_base_material, description) VALUES (?, ?, ?, ?)");
        $stmt->execute([$name, $category, $isBaseMaterial ? 1 : 0, $description]);
        $id = (int)$this->pdo->lastInsertId();

        // Update cache
        $this->itemCache[$id] = [
            'id' => $id,
            'name' => $name,
            'category' => $category,
            'is_base_material' => $isBaseMaterial ? 1 : 0,
            'description' => $description
        ];

        return $id;
    }

    /**
     * Update an item
     */
    public function updateItem(int $id, string $name, string $category, bool $isBaseMaterial, string $description = ''): bool {
        $stmt = $this->pdo->prepare("UPDATE items SET name = ?, category = ?, is_base_material = ?, description = ? WHERE id = ?");
        $result = $stmt->execute([$name, $category, $isBaseMaterial ? 1 : 0, $description, $id]);

        if ($result) {
            $this->itemCache[$id] = [
                'id' => $id,
                'name' => $name,
                'category' => $category,
                'is_base_material' => $isBaseMaterial ? 1 : 0,
                'description' => $description
            ];
        }

        return $result;
    }

    /**
     * Delete an item and its recipes
     */
    public function deleteItem(int $id): bool {
        // Delete recipes where this item is result or ingredient
        $this->pdo->prepare("DELETE FROM recipes WHERE result_item_id = ? OR ingredient_item_id = ?")->execute([$id, $id]);

        // Delete item
        $stmt = $this->pdo->prepare("DELETE FROM items WHERE id = ?");
        $result = $stmt->execute([$id]);

        if ($result) {
            unset($this->itemCache[$id]);
            unset($this->recipeCache[$id]);
            // Clean up recipes that used this item
            foreach ($this->recipeCache as $resultId => &$ingredients) {
                $ingredients = array_filter($ingredients, fn($r) => $r['ingredient_item_id'] != $id);
            }
        }

        return $result;
    }

    /**
     * Add a recipe ingredient
     */
    public function addRecipeIngredient(int $resultItemId, int $ingredientItemId, float $quantity): ?int {
        // Check for circular dependency
        if ($this->wouldCreateCycle($resultItemId, $ingredientItemId)) {
            return null;
        }

        $stmt = $this->pdo->prepare("INSERT INTO recipes (result_item_id, ingredient_item_id, quantity) VALUES (?, ?, ?)");
        $stmt->execute([$resultItemId, $ingredientItemId, $quantity]);
        $id = (int)$this->pdo->lastInsertId();

        // Update cache
        if (!isset($this->recipeCache[$resultItemId])) {
            $this->recipeCache[$resultItemId] = [];
        }
        $this->recipeCache[$resultItemId][] = [
            'id' => $id,
            'result_item_id' => $resultItemId,
            'ingredient_item_id' => $ingredientItemId,
            'quantity' => $quantity
        ];

        return $id;
    }

    /**
     * Update a recipe ingredient quantity
     */
    public function updateRecipeIngredient(int $recipeId, float $quantity): bool {
        $stmt = $this->pdo->prepare("UPDATE recipes SET quantity = ? WHERE id = ?");
        $result = $stmt->execute([$quantity, $recipeId]);

        // Update cache
        foreach ($this->recipeCache as &$recipes) {
            foreach ($recipes as &$r) {
                if ($r['id'] == $recipeId) {
                    $r['quantity'] = $quantity;
                }
            }
        }

        return $result;
    }

    /**
     * Delete a recipe ingredient
     */
    public function deleteRecipeIngredient(int $recipeId): bool {
        $stmt = $this->pdo->prepare("DELETE FROM recipes WHERE id = ?");
        $result = $stmt->execute([$recipeId]);

        // Update cache
        foreach ($this->recipeCache as $resultId => &$recipes) {
            $recipes = array_filter($recipes, fn($r) => $r['id'] != $recipeId);
        }

        return $result;
    }

    /**
     * Get all recipes with item names
     */
    public function getAllRecipes(): array {
        $recipes = [];
        foreach ($this->recipeCache as $resultId => $ingredients) {
            $resultItem = $this->getItem($resultId);
            if (!$resultItem) continue;

            foreach ($ingredients as $ing) {
                $ingredientItem = $this->getItem($ing['ingredient_item_id']);
                if (!$ingredientItem) continue;

                $recipes[] = [
                    'id' => $ing['id'],
                    'result_item_id' => $resultId,
                    'result_name' => $resultItem['name'],
                    'ingredient_item_id' => $ing['ingredient_item_id'],
                    'ingredient_name' => $ingredientItem['name'],
                    'quantity' => $ing['quantity']
                ];
            }
        }

        usort($recipes, fn($a, $b) => strcmp($a['result_name'], $b['result_name']));
        return $recipes;
    }

    /**
     * Check if adding an ingredient would create a circular dependency
     */
    public function wouldCreateCycle(int $resultItemId, int $ingredientItemId): bool {
        // If ingredient is same as result, it's circular
        if ($resultItemId === $ingredientItemId) {
            return true;
        }

        // Check if resultItem is reachable from ingredientItem's dependencies
        return $this->canReach($ingredientItemId, $resultItemId, []);
    }

    /**
     * Check if we can reach targetId starting from itemId
     */
    private function canReach(int $itemId, int $targetId, array $visited): bool {
        if (in_array($itemId, $visited)) {
            return false; // Already visited, avoid infinite loop
        }

        $visited[] = $itemId;
        $recipe = $this->getRecipe($itemId);

        foreach ($recipe as $ingredient) {
            $ingId = $ingredient['ingredient_item_id'];
            if ($ingId === $targetId) {
                return true;
            }
            if ($this->canReach($ingId, $targetId, $visited)) {
                return true;
            }
        }

        return false;
    }

    // ========== REVERSE LOOKUP ==========

    /**
     * Find what items can be crafted using a given item as ingredient
     */
    public function findCraftableFrom(int $itemId): array {
        $results = [];

        foreach ($this->recipeCache as $resultId => $ingredients) {
            foreach ($ingredients as $ing) {
                if ($ing['ingredient_item_id'] === $itemId) {
                    $resultItem = $this->getItem($resultId);
                    if ($resultItem) {
                        $results[] = [
                            'item' => $resultItem,
                            'quantity_needed' => $ing['quantity']
                        ];
                    }
                    break;
                }
            }
        }

        usort($results, fn($a, $b) => strcmp($a['item']['name'], $b['item']['name']));
        return $results;
    }

    /**
     * Recursively find all items that eventually use this item
     */
    public function findAllCraftableFrom(int $itemId, array $visited = []): array {
        if (in_array($itemId, $visited)) {
            return [];
        }
        $visited[] = $itemId;

        $direct = $this->findCraftableFrom($itemId);
        $all = $direct;

        foreach ($direct as $result) {
            $indirect = $this->findAllCraftableFrom($result['item']['id'], $visited);
            foreach ($indirect as $ind) {
                // Avoid duplicates
                $exists = false;
                foreach ($all as $existing) {
                    if ($existing['item']['id'] === $ind['item']['id']) {
                        $exists = true;
                        break;
                    }
                }
                if (!$exists) {
                    $all[] = $ind;
                }
            }
        }

        return $all;
    }
}
