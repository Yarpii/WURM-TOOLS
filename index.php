<?php
/**
 * WurmCalc - WURM Online Crafting Calculator
 * Main entry point
 */

require_once __DIR__ . '/calculator.php';

$calc = new WurmCalculator();

// Handle AJAX requests
if (isset($_GET['ajax'])) {
    header('Content-Type: application/json');
    
    switch ($_GET['ajax']) {
        case 'search':
            $query = $_GET['q'] ?? '';
            echo json_encode($calc->searchItems($query));
            break;
            
        case 'calculate':
            $itemId = (int)($_GET['item'] ?? 0);
            $quantity = (float)($_GET['qty'] ?? 1);
            
            $materials = $calc->calculateBaseMaterials($itemId, $quantity);
            $tree = $calc->buildCraftingTree($itemId, $quantity);
            
            // Convert material IDs to names
            $materialList = [];
            foreach ($materials as $matId => $qty) {
                $item = $calc->getItem($matId);
                $materialList[] = [
                    'id' => $matId,
                    'name' => $item['name'],
                    'category' => $item['category'],
                    'quantity' => $qty,
                    'formatted' => $calc->formatQuantity($qty)
                ];
            }
            
            // Sort by category then name
            usort($materialList, function($a, $b) {
                $catCmp = strcmp($a['category'], $b['category']);
                return $catCmp !== 0 ? $catCmp : strcmp($a['name'], $b['name']);
            });
            
            echo json_encode([
                'materials' => $materialList,
                'tree' => $tree
            ]);
            break;
            
        case 'items':
            echo json_encode($calc->getAllItems());
            break;
    }
    exit;
}

// Get all items for the dropdown
$items = $calc->getAllItems();
$categories = $calc->getCategories();

// Group items by category
$itemsByCategory = [];
foreach ($items as $item) {
    $cat = $item['category'];
    if (!isset($itemsByCategory[$cat])) {
        $itemsByCategory[$cat] = [];
    }
    $itemsByCategory[$cat][] = $item;
}
ksort($itemsByCategory);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WurmCalc - WURM Online Crafting Calculator</title>
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
            --wood: #c4a35a;
            --ore: #7a8b99;
            --material: #9b8b7a;
            --metal: #a8a8a8;
            --vehicle: #6a8caf;
            --building: #b87333;
            --tool: #8b7355;
        }
        
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: var(--bg-dark);
            color: var(--text);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        
        header {
            text-align: center;
            margin-bottom: 30px;
        }
        
        h1 {
            font-size: 2.5rem;
            color: var(--accent);
            margin-bottom: 5px;
        }
        
        h1 span {
            color: var(--text);
        }
        
        .subtitle {
            color: var(--text-muted);
            font-size: 1.1rem;
        }
        
        .calculator-form {
            background: var(--bg-card);
            padding: 25px;
            border-radius: 12px;
            margin-bottom: 25px;
            display: flex;
            gap: 15px;
            flex-wrap: wrap;
            align-items: end;
        }
        
        .form-group {
            flex: 1;
            min-width: 200px;
        }
        
        label {
            display: block;
            margin-bottom: 8px;
            color: var(--text-muted);
            font-size: 0.9rem;
        }
        
        select, input {
            width: 100%;
            padding: 12px 15px;
            border: none;
            border-radius: 8px;
            background: var(--bg-input);
            color: var(--text);
            font-size: 1rem;
        }
        
        select:focus, input:focus {
            outline: 2px solid var(--accent);
        }
        
        input[type="number"] {
            max-width: 120px;
        }
        
        button {
            padding: 12px 30px;
            background: var(--accent);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 1rem;
            cursor: pointer;
            transition: background 0.2s;
        }
        
        button:hover {
            background: var(--accent-hover);
        }
        
        .results {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 25px;
        }
        
        @media (max-width: 900px) {
            .results {
                grid-template-columns: 1fr;
            }
        }
        
        .card {
            background: var(--bg-card);
            border-radius: 12px;
            padding: 20px;
        }
        
        .card h2 {
            color: var(--accent);
            margin-bottom: 15px;
            font-size: 1.3rem;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .material-list {
            list-style: none;
        }
        
        .material-item {
            display: flex;
            justify-content: space-between;
            padding: 10px 12px;
            border-radius: 6px;
            margin-bottom: 6px;
            background: rgba(255,255,255,0.05);
        }
        
        .material-item:hover {
            background: rgba(255,255,255,0.1);
        }
        
        .material-name {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .category-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
        }
        
        .category-wood { background: var(--wood); }
        .category-ore { background: var(--ore); }
        .category-material { background: var(--material); }
        .category-metal { background: var(--metal); }
        .category-vehicle { background: var(--vehicle); }
        .category-building { background: var(--building); }
        .category-tool { background: var(--tool); }
        .category-misc { background: var(--text-muted); }
        
        .material-qty {
            font-weight: bold;
            color: var(--success);
        }
        
        .tree-node {
            padding-left: 20px;
            border-left: 2px solid rgba(255,255,255,0.1);
            margin-left: 10px;
        }
        
        .tree-item {
            padding: 8px 0;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .tree-item.base {
            color: var(--success);
        }
        
        .tree-qty {
            color: var(--text-muted);
            font-size: 0.9rem;
        }
        
        .empty-state {
            text-align: center;
            padding: 40px;
            color: var(--text-muted);
        }
        
        .empty-state svg {
            width: 60px;
            height: 60px;
            margin-bottom: 15px;
            opacity: 0.5;
        }
        
        footer {
            text-align: center;
            margin-top: 40px;
            color: var(--text-muted);
            font-size: 0.9rem;
        }
        
        footer a {
            color: var(--accent);
            text-decoration: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>Wurm<span>Calc</span></h1>
            <p class="subtitle">Calculate total base materials for any craftable item</p>
        </header>
        
        <div class="calculator-form">
            <div class="form-group">
                <label for="item-select">Select Item</label>
                <select id="item-select">
                    <option value="">-- Choose an item --</option>
                    <?php foreach ($itemsByCategory as $category => $catItems): ?>
                        <optgroup label="<?= ucfirst($category) ?>">
                            <?php foreach ($catItems as $item): ?>
                                <?php if (!$item['is_base_material']): ?>
                                    <option value="<?= $item['id'] ?>"><?= htmlspecialchars($item['name']) ?></option>
                                <?php endif; ?>
                            <?php endforeach; ?>
                        </optgroup>
                    <?php endforeach; ?>
                </select>
            </div>
            
            <div class="form-group">
                <label for="quantity">Quantity</label>
                <input type="number" id="quantity" value="1" min="1" max="1000">
            </div>
            
            <button type="button" id="calculate-btn">Calculate</button>
        </div>
        
        <div class="results">
            <div class="card">
                <h2>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                    </svg>
                    Total Base Materials
                </h2>
                <ul class="material-list" id="material-list">
                    <li class="empty-state">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                            <line x1="9" y1="9" x2="9.01" y2="9"></line>
                            <line x1="15" y1="9" x2="15.01" y2="9"></line>
                        </svg>
                        <p>Select an item to see required materials</p>
                    </li>
                </ul>
            </div>
            
            <div class="card">
                <h2>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                        <path d="M2 17l10 5 10-5"></path>
                        <path d="M2 12l10 5 10-5"></path>
                    </svg>
                    Crafting Tree
                </h2>
                <div id="crafting-tree">
                    <div class="empty-state">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                            <path d="M2 17l10 5 10-5"></path>
                            <path d="M2 12l10 5 10-5"></path>
                        </svg>
                        <p>Crafting breakdown will appear here</p>
                    </div>
                </div>
            </div>
        </div>
        
        <footer>
            <p>WurmCalc &mdash; A crafting calculator for <a href="https://www.wurmonline.com/" target="_blank">WURM Online</a></p>
        </footer>
    </div>
    
    <script>
        const itemSelect = document.getElementById('item-select');
        const quantityInput = document.getElementById('quantity');
        const calculateBtn = document.getElementById('calculate-btn');
        const materialList = document.getElementById('material-list');
        const craftingTree = document.getElementById('crafting-tree');
        
        function formatQuantity(qty) {
            if (Number.isInteger(qty)) return qty.toString();
            return qty.toFixed(2).replace(/\.?0+$/, '');
        }
        
        function renderTree(node, isRoot = true) {
            if (!node || !node.name) return '';
            
            const baseClass = node.is_base ? 'base' : '';
            const dot = `<span class="category-dot category-${node.category}"></span>`;
            
            let html = `
                <div class="tree-item ${baseClass}">
                    ${dot}
                    <span>${node.name}</span>
                    <span class="tree-qty">×${formatQuantity(node.quantity)}</span>
                </div>
            `;
            
            if (node.children && node.children.length > 0) {
                html += '<div class="tree-node">';
                for (const child of node.children) {
                    html += renderTree(child, false);
                }
                html += '</div>';
            }
            
            return html;
        }
        
        async function calculate() {
            const itemId = itemSelect.value;
            const quantity = parseInt(quantityInput.value) || 1;
            
            if (!itemId) {
                alert('Please select an item');
                return;
            }
            
            try {
                const response = await fetch(`?ajax=calculate&item=${itemId}&qty=${quantity}`);
                const data = await response.json();
                
                // Render materials list
                if (data.materials && data.materials.length > 0) {
                    materialList.innerHTML = data.materials.map(mat => `
                        <li class="material-item">
                            <span class="material-name">
                                <span class="category-dot category-${mat.category}"></span>
                                ${mat.name}
                            </span>
                            <span class="material-qty">×${mat.formatted}</span>
                        </li>
                    `).join('');
                } else {
                    materialList.innerHTML = '<li class="empty-state"><p>No materials needed (base material)</p></li>';
                }
                
                // Render crafting tree
                if (data.tree && data.tree.name) {
                    craftingTree.innerHTML = renderTree(data.tree);
                } else {
                    craftingTree.innerHTML = '<div class="empty-state"><p>No crafting steps needed</p></div>';
                }
                
            } catch (error) {
                console.error('Calculation error:', error);
                alert('Error calculating materials');
            }
        }
        
        calculateBtn.addEventListener('click', calculate);
        
        // Also calculate on Enter key
        quantityInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') calculate();
        });
        
        itemSelect.addEventListener('change', () => {
            if (itemSelect.value) calculate();
        });
    </script>
</body>
</html>
