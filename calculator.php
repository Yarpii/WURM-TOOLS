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
}
