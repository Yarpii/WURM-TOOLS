<?php
/**
 * WurmCalc - Admin Panel
 * CRUD for items and recipes
 */

require_once __DIR__ . '/calculator.php';

$calc = new WurmCalculator();
$message = '';
$error = '';

// Handle POST actions
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    try {
        switch ($action) {
            case 'add_item':
                $name = trim($_POST['name'] ?? '');
                $category = trim($_POST['category'] ?? 'misc');
                $isBase = isset($_POST['is_base_material']);
                $description = trim($_POST['description'] ?? '');

                if (empty($name)) {
                    $error = 'Item name is required';
                } elseif ($calc->getItemByName($name)) {
                    $error = 'Item with this name already exists';
                } else {
                    $calc->addItem($name, $category, $isBase, $description);
                    $message = "Item '$name' added successfully";
                }
                break;

            case 'update_item':
                $id = (int)($_POST['id'] ?? 0);
                $name = trim($_POST['name'] ?? '');
                $category = trim($_POST['category'] ?? 'misc');
                $isBase = isset($_POST['is_base_material']);
                $description = trim($_POST['description'] ?? '');

                if (empty($name)) {
                    $error = 'Item name is required';
                } else {
                    $existing = $calc->getItemByName($name);
                    if ($existing && $existing['id'] != $id) {
                        $error = 'Another item with this name already exists';
                    } else {
                        $calc->updateItem($id, $name, $category, $isBase, $description);
                        $message = "Item '$name' updated successfully";
                    }
                }
                break;

            case 'delete_item':
                $id = (int)($_POST['id'] ?? 0);
                $item = $calc->getItem($id);
                if ($item) {
                    $calc->deleteItem($id);
                    $message = "Item '{$item['name']}' deleted successfully";
                }
                break;

            case 'add_recipe':
                $resultId = (int)($_POST['result_item_id'] ?? 0);
                $ingredientId = (int)($_POST['ingredient_item_id'] ?? 0);
                $quantity = (float)($_POST['quantity'] ?? 1);

                if ($resultId === $ingredientId) {
                    $error = 'An item cannot be an ingredient of itself';
                } elseif ($quantity <= 0) {
                    $error = 'Quantity must be greater than 0';
                } else {
                    $id = $calc->addRecipeIngredient($resultId, $ingredientId, $quantity);
                    if ($id === null) {
                        $error = 'Cannot add: this would create a circular dependency!';
                    } else {
                        $result = $calc->getItem($resultId);
                        $ingredient = $calc->getItem($ingredientId);
                        $message = "Added {$ingredient['name']} to {$result['name']} recipe";
                    }
                }
                break;

            case 'update_recipe':
                $recipeId = (int)($_POST['recipe_id'] ?? 0);
                $quantity = (float)($_POST['quantity'] ?? 1);

                if ($quantity <= 0) {
                    $error = 'Quantity must be greater than 0';
                } else {
                    $calc->updateRecipeIngredient($recipeId, $quantity);
                    $message = "Recipe updated successfully";
                }
                break;

            case 'delete_recipe':
                $recipeId = (int)($_POST['recipe_id'] ?? 0);
                $calc->deleteRecipeIngredient($recipeId);
                $message = "Recipe ingredient removed successfully";
                break;
        }
    } catch (Exception $e) {
        $error = 'Error: ' . $e->getMessage();
    }

    // Reload calculator to get fresh data
    $calc = new WurmCalculator();
}

$items = $calc->getAllItems();
$recipes = $calc->getAllRecipes();
$categories = $calc->getCategories();

// Group recipes by result item
$recipesByItem = [];
foreach ($recipes as $r) {
    if (!isset($recipesByItem[$r['result_item_id']])) {
        $recipesByItem[$r['result_item_id']] = [
            'name' => $r['result_name'],
            'ingredients' => []
        ];
    }
    $recipesByItem[$r['result_item_id']]['ingredients'][] = $r;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin - WurmCalc</title>
    <style>
        :root {
            --bg-dark: #1a1a2e;
            --bg-card: #16213e;
            --bg-input: #0f3460;
            --accent: #e94560;
            --accent-hover: #ff6b6b;
            --text: #eee;
            --text-muted: #888;
            --success: #4ecca3;
            --warning: #ffc107;
            --danger: #dc3545;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: var(--bg-dark);
            color: var(--text);
            min-height: 100vh;
            padding: 20px;
        }

        .container { max-width: 1400px; margin: 0 auto; }

        header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
        }

        h1 { color: var(--accent); }
        h1 span { color: var(--text); }

        .back-link {
            color: var(--accent);
            text-decoration: none;
            padding: 10px 20px;
            border: 1px solid var(--accent);
            border-radius: 6px;
        }
        .back-link:hover { background: var(--accent); color: white; }

        .message {
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        .message.success { background: rgba(78, 204, 163, 0.2); border: 1px solid var(--success); }
        .message.error { background: rgba(220, 53, 69, 0.2); border: 1px solid var(--danger); }

        .tabs {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
        }

        .tab {
            padding: 12px 24px;
            background: var(--bg-card);
            border: none;
            border-radius: 8px 8px 0 0;
            color: var(--text-muted);
            cursor: pointer;
            font-size: 1rem;
        }
        .tab.active { background: var(--bg-input); color: var(--text); }

        .panel {
            display: none;
            background: var(--bg-card);
            padding: 25px;
            border-radius: 0 12px 12px 12px;
        }
        .panel.active { display: block; }

        .grid { display: grid; grid-template-columns: 1fr 2fr; gap: 25px; }
        @media (max-width: 900px) { .grid { grid-template-columns: 1fr; } }

        .card {
            background: var(--bg-input);
            padding: 20px;
            border-radius: 10px;
        }

        .card h2 {
            color: var(--accent);
            margin-bottom: 15px;
            font-size: 1.2rem;
        }

        .form-group { margin-bottom: 15px; }

        label {
            display: block;
            margin-bottom: 5px;
            color: var(--text-muted);
            font-size: 0.9rem;
        }

        input, select, textarea {
            width: 100%;
            padding: 10px 12px;
            border: none;
            border-radius: 6px;
            background: var(--bg-dark);
            color: var(--text);
            font-size: 1rem;
        }
        input:focus, select:focus, textarea:focus { outline: 2px solid var(--accent); }

        textarea { resize: vertical; min-height: 80px; }

        .checkbox-group {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .checkbox-group input { width: auto; }

        button {
            padding: 10px 20px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.95rem;
            transition: opacity 0.2s;
        }
        button:hover { opacity: 0.9; }

        .btn-primary { background: var(--accent); color: white; }
        .btn-success { background: var(--success); color: white; }
        .btn-danger { background: var(--danger); color: white; }
        .btn-small { padding: 6px 12px; font-size: 0.85rem; }

        table {
            width: 100%;
            border-collapse: collapse;
        }

        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }

        th { color: var(--text-muted); font-weight: 500; }

        tr:hover { background: rgba(255,255,255,0.05); }

        .actions { display: flex; gap: 8px; }

        .badge {
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 0.8rem;
        }
        .badge-base { background: var(--success); color: white; }
        .badge-crafted { background: var(--accent); color: white; }

        .recipe-group {
            background: var(--bg-dark);
            border-radius: 8px;
            margin-bottom: 15px;
            overflow: hidden;
        }

        .recipe-header {
            padding: 12px 15px;
            background: rgba(255,255,255,0.05);
            font-weight: 500;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .recipe-ingredients { padding: 10px 15px; }

        .ingredient-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .ingredient-row:last-child { border-bottom: none; }

        .qty-input { width: 80px !important; }

        .empty-state {
            text-align: center;
            padding: 40px;
            color: var(--text-muted);
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>Wurm<span>Calc</span> Admin</h1>
            <a href="index.php" class="back-link">Back to Calculator</a>
        </header>

        <?php if ($message): ?>
            <div class="message success"><?= htmlspecialchars($message) ?></div>
        <?php endif; ?>

        <?php if ($error): ?>
            <div class="message error"><?= htmlspecialchars($error) ?></div>
        <?php endif; ?>

        <div class="tabs">
            <button class="tab active" onclick="showPanel('items')">Items</button>
            <button class="tab" onclick="showPanel('recipes')">Recipes</button>
        </div>

        <!-- Items Panel -->
        <div class="panel active" id="panel-items">
            <div class="grid">
                <div class="card">
                    <h2>Add New Item</h2>
                    <form method="post">
                        <input type="hidden" name="action" value="add_item">

                        <div class="form-group">
                            <label for="item-name">Name</label>
                            <input type="text" id="item-name" name="name" required>
                        </div>

                        <div class="form-group">
                            <label for="item-category">Category</label>
                            <input type="text" id="item-category" name="category" value="misc" list="categories">
                            <datalist id="categories">
                                <?php foreach ($categories as $cat): ?>
                                    <option value="<?= htmlspecialchars($cat) ?>">
                                <?php endforeach; ?>
                            </datalist>
                        </div>

                        <div class="form-group">
                            <div class="checkbox-group">
                                <input type="checkbox" id="item-base" name="is_base_material">
                                <label for="item-base" style="margin:0">Base Material (gathered, not crafted)</label>
                            </div>
                        </div>

                        <div class="form-group">
                            <label for="item-desc">Description</label>
                            <textarea id="item-desc" name="description"></textarea>
                        </div>

                        <button type="submit" class="btn-primary">Add Item</button>
                    </form>
                </div>

                <div class="card">
                    <h2>All Items (<?= count($items) ?>)</h2>
                    <?php if (empty($items)): ?>
                        <div class="empty-state">No items yet</div>
                    <?php else: ?>
                        <table>
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Category</th>
                                    <th>Type</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php foreach ($items as $item): ?>
                                    <tr>
                                        <td><?= htmlspecialchars($item['name']) ?></td>
                                        <td><?= htmlspecialchars($item['category']) ?></td>
                                        <td>
                                            <?php if ($item['is_base_material']): ?>
                                                <span class="badge badge-base">Base</span>
                                            <?php else: ?>
                                                <span class="badge badge-crafted">Crafted</span>
                                            <?php endif; ?>
                                        </td>
                                        <td class="actions">
                                            <button class="btn-small btn-primary" onclick="editItem(<?= htmlspecialchars(json_encode($item)) ?>)">Edit</button>
                                            <form method="post" style="display:inline" onsubmit="return confirm('Delete this item and all its recipes?')">
                                                <input type="hidden" name="action" value="delete_item">
                                                <input type="hidden" name="id" value="<?= $item['id'] ?>">
                                                <button type="submit" class="btn-small btn-danger">Delete</button>
                                            </form>
                                        </td>
                                    </tr>
                                <?php endforeach; ?>
                            </tbody>
                        </table>
                    <?php endif; ?>
                </div>
            </div>
        </div>

        <!-- Recipes Panel -->
        <div class="panel" id="panel-recipes">
            <div class="grid">
                <div class="card">
                    <h2>Add Recipe Ingredient</h2>
                    <form method="post">
                        <input type="hidden" name="action" value="add_recipe">

                        <div class="form-group">
                            <label for="result-item">Result Item (what you're making)</label>
                            <select id="result-item" name="result_item_id" required>
                                <option value="">-- Select item --</option>
                                <?php foreach ($items as $item): ?>
                                    <?php if (!$item['is_base_material']): ?>
                                        <option value="<?= $item['id'] ?>"><?= htmlspecialchars($item['name']) ?></option>
                                    <?php endif; ?>
                                <?php endforeach; ?>
                            </select>
                        </div>

                        <div class="form-group">
                            <label for="ingredient-item">Ingredient</label>
                            <select id="ingredient-item" name="ingredient_item_id" required>
                                <option value="">-- Select ingredient --</option>
                                <?php foreach ($items as $item): ?>
                                    <option value="<?= $item['id'] ?>"><?= htmlspecialchars($item['name']) ?></option>
                                <?php endforeach; ?>
                            </select>
                        </div>

                        <div class="form-group">
                            <label for="recipe-qty">Quantity Required</label>
                            <input type="number" id="recipe-qty" name="quantity" value="1" min="0.01" step="0.01" required>
                        </div>

                        <button type="submit" class="btn-primary">Add Ingredient</button>
                    </form>
                </div>

                <div class="card">
                    <h2>All Recipes</h2>
                    <?php if (empty($recipesByItem)): ?>
                        <div class="empty-state">No recipes yet</div>
                    <?php else: ?>
                        <?php foreach ($recipesByItem as $itemId => $data): ?>
                            <div class="recipe-group">
                                <div class="recipe-header">
                                    <span><?= htmlspecialchars($data['name']) ?></span>
                                    <span style="color:var(--text-muted)"><?= count($data['ingredients']) ?> ingredient(s)</span>
                                </div>
                                <div class="recipe-ingredients">
                                    <?php foreach ($data['ingredients'] as $ing): ?>
                                        <div class="ingredient-row">
                                            <span><?= htmlspecialchars($ing['ingredient_name']) ?></span>
                                            <div class="actions">
                                                <form method="post" style="display:flex;gap:8px;align-items:center">
                                                    <input type="hidden" name="action" value="update_recipe">
                                                    <input type="hidden" name="recipe_id" value="<?= $ing['id'] ?>">
                                                    <input type="number" name="quantity" value="<?= $ing['quantity'] ?>" min="0.01" step="0.01" class="qty-input">
                                                    <button type="submit" class="btn-small btn-success">Update</button>
                                                </form>
                                                <form method="post" style="display:inline" onsubmit="return confirm('Remove this ingredient?')">
                                                    <input type="hidden" name="action" value="delete_recipe">
                                                    <input type="hidden" name="recipe_id" value="<?= $ing['id'] ?>">
                                                    <button type="submit" class="btn-small btn-danger">Remove</button>
                                                </form>
                                            </div>
                                        </div>
                                    <?php endforeach; ?>
                                </div>
                            </div>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </div>
            </div>
        </div>
    </div>

    <!-- Edit Item Modal -->
    <div id="edit-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:100;padding:20px;overflow:auto">
        <div style="max-width:500px;margin:50px auto;background:var(--bg-card);padding:25px;border-radius:12px">
            <h2 style="color:var(--accent);margin-bottom:20px">Edit Item</h2>
            <form method="post">
                <input type="hidden" name="action" value="update_item">
                <input type="hidden" name="id" id="edit-id">

                <div class="form-group">
                    <label>Name</label>
                    <input type="text" name="name" id="edit-name" required>
                </div>

                <div class="form-group">
                    <label>Category</label>
                    <input type="text" name="category" id="edit-category" list="categories">
                </div>

                <div class="form-group">
                    <div class="checkbox-group">
                        <input type="checkbox" name="is_base_material" id="edit-base">
                        <label for="edit-base" style="margin:0">Base Material</label>
                    </div>
                </div>

                <div class="form-group">
                    <label>Description</label>
                    <textarea name="description" id="edit-desc"></textarea>
                </div>

                <div style="display:flex;gap:10px">
                    <button type="submit" class="btn-primary">Save Changes</button>
                    <button type="button" class="btn-danger" onclick="closeModal()">Cancel</button>
                </div>
            </form>
        </div>
    </div>

    <script>
        function showPanel(name) {
            document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.getElementById('panel-' + name).classList.add('active');
            event.target.classList.add('active');
        }

        function editItem(item) {
            document.getElementById('edit-id').value = item.id;
            document.getElementById('edit-name').value = item.name;
            document.getElementById('edit-category').value = item.category;
            document.getElementById('edit-base').checked = item.is_base_material == 1;
            document.getElementById('edit-desc').value = item.description || '';
            document.getElementById('edit-modal').style.display = 'block';
        }

        function closeModal() {
            document.getElementById('edit-modal').style.display = 'none';
        }

        document.getElementById('edit-modal').addEventListener('click', function(e) {
            if (e.target === this) closeModal();
        });
    </script>
</body>
</html>
