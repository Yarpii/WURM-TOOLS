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

        case 'reverse':
            $itemId = (int)($_GET['item'] ?? 0);
            $includeIndirect = ($_GET['all'] ?? '0') === '1';

            if ($includeIndirect) {
                $craftable = $calc->findAllCraftableFrom($itemId);
            } else {
                $craftable = $calc->findCraftableFrom($itemId);
            }

            $results = [];
            foreach ($craftable as $c) {
                $results[] = [
                    'id' => $c['item']['id'],
                    'name' => $c['item']['name'],
                    'category' => $c['item']['category'],
                    'quantity_needed' => $c['quantity_needed'],
                    'formatted' => $calc->formatQuantity($c['quantity_needed'])
                ];
            }

            echo json_encode($results);
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

        /* Search autocomplete */
        .search-container {
            position: relative;
            flex: 2;
        }

        .search-input {
            width: 100%;
            padding: 12px 15px;
            border: none;
            border-radius: 8px;
            background: var(--bg-input);
            color: var(--text);
            font-size: 1rem;
        }

        .autocomplete-dropdown {
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: var(--bg-card);
            border-radius: 0 0 8px 8px;
            max-height: 300px;
            overflow-y: auto;
            z-index: 100;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            display: none;
        }

        .autocomplete-dropdown.show { display: block; }

        .autocomplete-item {
            padding: 10px 15px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .autocomplete-item:hover, .autocomplete-item.selected {
            background: rgba(255,255,255,0.1);
        }

        .autocomplete-item .item-type {
            font-size: 0.75rem;
            padding: 2px 6px;
            border-radius: 4px;
            background: var(--accent);
        }

        .autocomplete-item .item-type.base {
            background: var(--success);
        }

        /* Mode switcher */
        .mode-switcher {
            display: flex;
            gap: 10px;
            margin-bottom: 15px;
        }

        .mode-btn {
            padding: 10px 20px;
            background: var(--bg-input);
            border: 2px solid transparent;
            border-radius: 8px;
            color: var(--text-muted);
            cursor: pointer;
            transition: all 0.2s;
        }

        .mode-btn:hover {
            color: var(--text);
        }

        .mode-btn.active {
            border-color: var(--accent);
            color: var(--text);
        }

        /* Admin link */
        .admin-link {
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 10px 20px;
            background: var(--bg-card);
            color: var(--text-muted);
            text-decoration: none;
            border-radius: 8px;
            font-size: 0.9rem;
            transition: all 0.2s;
        }

        .admin-link:hover {
            background: var(--accent);
            color: white;
        }

        /* Reverse lookup results */
        .reverse-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }

        .toggle-all {
            font-size: 0.85rem;
            color: var(--text-muted);
            cursor: pointer;
        }

        .toggle-all:hover {
            color: var(--accent);
        }

        .craftable-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px;
            background: rgba(255,255,255,0.05);
            border-radius: 6px;
            margin-bottom: 8px;
            cursor: pointer;
            transition: background 0.2s;
        }

        .craftable-item:hover {
            background: rgba(255,255,255,0.1);
        }

        .craftable-info {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .craftable-uses {
            color: var(--text-muted);
            font-size: 0.9rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>Wurm<span>Calc</span></h1>
            <p class="subtitle">Calculate total base materials for any craftable item</p>
        </header>
        
        <div class="mode-switcher">
            <button class="mode-btn active" data-mode="calculate">Calculate Materials</button>
            <button class="mode-btn" data-mode="reverse">Reverse Lookup</button>
        </div>

        <div class="calculator-form">
            <div class="search-container">
                <label>Search Item</label>
                <input type="text" class="search-input" id="item-search" placeholder="Type to search..." autocomplete="off">
                <input type="hidden" id="selected-item-id">
                <div class="autocomplete-dropdown" id="autocomplete"></div>
            </div>

            <div class="form-group" id="qty-group">
                <label for="quantity">Quantity</label>
                <input type="number" id="quantity" value="1" min="1" max="1000">
            </div>

            <button type="button" id="calculate-btn">Calculate</button>
        </div>
        
        <!-- Calculate Mode Results -->
        <div class="results" id="calculate-results">
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

        <!-- Reverse Lookup Results -->
        <div class="results" id="reverse-results" style="display:none">
            <div class="card" style="grid-column: span 2">
                <div class="reverse-header">
                    <h2>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="15 14 20 9 15 4"></polyline>
                            <path d="M4 20v-7a4 4 0 0 1 4-4h12"></path>
                        </svg>
                        <span id="reverse-title">What can I make?</span>
                    </h2>
                    <label class="toggle-all">
                        <input type="checkbox" id="show-indirect"> Include indirect uses
                    </label>
                </div>
                <div id="craftable-list">
                    <div class="empty-state">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="11" cy="11" r="8"></circle>
                            <path d="m21 21-4.35-4.35"></path>
                        </svg>
                        <p>Select an item to see what you can craft with it</p>
                    </div>
                </div>
            </div>
        </div>
        
        <footer>
            <p>WurmCalc &mdash; A crafting calculator for <a href="https://www.wurmonline.com/" target="_blank">WURM Online</a></p>
        </footer>

        <a href="admin.php" class="admin-link">Admin Panel</a>
    </div>

    <script>
        // Elements
        const itemSearch = document.getElementById('item-search');
        const selectedItemId = document.getElementById('selected-item-id');
        const autocomplete = document.getElementById('autocomplete');
        const quantityInput = document.getElementById('quantity');
        const qtyGroup = document.getElementById('qty-group');
        const calculateBtn = document.getElementById('calculate-btn');
        const materialList = document.getElementById('material-list');
        const craftingTree = document.getElementById('crafting-tree');
        const calculateResults = document.getElementById('calculate-results');
        const reverseResults = document.getElementById('reverse-results');
        const craftableList = document.getElementById('craftable-list');
        const reverseTitle = document.getElementById('reverse-title');
        const showIndirect = document.getElementById('show-indirect');
        const modeBtns = document.querySelectorAll('.mode-btn');

        let currentMode = 'calculate';
        let allItems = [];
        let selectedIndex = -1;

        // Load all items for autocomplete
        fetch('?ajax=items')
            .then(r => r.json())
            .then(items => { allItems = items; });

        // Mode switching
        modeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                modeBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentMode = btn.dataset.mode;

                if (currentMode === 'calculate') {
                    calculateResults.style.display = 'grid';
                    reverseResults.style.display = 'none';
                    qtyGroup.style.display = 'block';
                    calculateBtn.textContent = 'Calculate';
                } else {
                    calculateResults.style.display = 'none';
                    reverseResults.style.display = 'grid';
                    qtyGroup.style.display = 'none';
                    calculateBtn.textContent = 'Find Uses';
                }

                // Clear selection
                itemSearch.value = '';
                selectedItemId.value = '';
            });
        });

        // Autocomplete
        itemSearch.addEventListener('input', () => {
            const query = itemSearch.value.trim().toLowerCase();
            if (query.length < 1) {
                autocomplete.classList.remove('show');
                return;
            }

            // Filter items based on mode
            let filtered = allItems.filter(item =>
                item.name.toLowerCase().includes(query)
            );

            // In calculate mode, only show craftable items
            if (currentMode === 'calculate') {
                filtered = filtered.filter(item => !item.is_base_material);
            }

            if (filtered.length === 0) {
                autocomplete.classList.remove('show');
                return;
            }

            selectedIndex = -1;
            autocomplete.innerHTML = filtered.slice(0, 10).map((item, i) => `
                <div class="autocomplete-item" data-id="${item.id}" data-name="${item.name}" data-index="${i}">
                    <span class="category-dot category-${item.category}"></span>
                    <span>${item.name}</span>
                    <span class="item-type ${item.is_base_material ? 'base' : ''}">${item.is_base_material ? 'Base' : 'Crafted'}</span>
                </div>
            `).join('');
            autocomplete.classList.add('show');
        });

        // Keyboard navigation
        itemSearch.addEventListener('keydown', (e) => {
            const items = autocomplete.querySelectorAll('.autocomplete-item');
            if (!items.length) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
                updateSelection(items);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                selectedIndex = Math.max(selectedIndex - 1, 0);
                updateSelection(items);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (selectedIndex >= 0 && items[selectedIndex]) {
                    selectItem(items[selectedIndex]);
                } else if (selectedItemId.value) {
                    doAction();
                }
            } else if (e.key === 'Escape') {
                autocomplete.classList.remove('show');
            }
        });

        function updateSelection(items) {
            items.forEach((item, i) => {
                item.classList.toggle('selected', i === selectedIndex);
            });
        }

        // Click selection
        autocomplete.addEventListener('click', (e) => {
            const item = e.target.closest('.autocomplete-item');
            if (item) selectItem(item);
        });

        function selectItem(item) {
            selectedItemId.value = item.dataset.id;
            itemSearch.value = item.dataset.name;
            autocomplete.classList.remove('show');
            doAction();
        }

        // Close autocomplete on outside click
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-container')) {
                autocomplete.classList.remove('show');
            }
        });

        // Main action button
        calculateBtn.addEventListener('click', doAction);

        function doAction() {
            if (currentMode === 'calculate') {
                calculate();
            } else {
                reverseLookup();
            }
        }

        // Format quantity helper
        function formatQuantity(qty) {
            if (Number.isInteger(qty)) return qty.toString();
            return qty.toFixed(2).replace(/\.?0+$/, '');
        }

        // Render crafting tree
        function renderTree(node) {
            if (!node || !node.name) return '';

            const baseClass = node.is_base ? 'base' : '';
            const dot = `<span class="category-dot category-${node.category}"></span>`;

            let html = `
                <div class="tree-item ${baseClass}">
                    ${dot}
                    <span>${node.name}</span>
                    <span class="tree-qty">&times;${formatQuantity(node.quantity)}</span>
                </div>
            `;

            if (node.children && node.children.length > 0) {
                html += '<div class="tree-node">';
                for (const child of node.children) {
                    html += renderTree(child);
                }
                html += '</div>';
            }

            return html;
        }

        // Calculate materials
        async function calculate() {
            const itemId = selectedItemId.value;
            const quantity = parseInt(quantityInput.value) || 1;

            if (!itemId) {
                alert('Please select an item');
                return;
            }

            try {
                const response = await fetch(`?ajax=calculate&item=${itemId}&qty=${quantity}`);
                const data = await response.json();

                if (data.materials && data.materials.length > 0) {
                    materialList.innerHTML = data.materials.map(mat => `
                        <li class="material-item">
                            <span class="material-name">
                                <span class="category-dot category-${mat.category}"></span>
                                ${mat.name}
                            </span>
                            <span class="material-qty">&times;${mat.formatted}</span>
                        </li>
                    `).join('');
                } else {
                    materialList.innerHTML = '<li class="empty-state"><p>No materials needed (base material)</p></li>';
                }

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

        // Reverse lookup
        async function reverseLookup() {
            const itemId = selectedItemId.value;

            if (!itemId) {
                alert('Please select an item');
                return;
            }

            const includeAll = showIndirect.checked ? '1' : '0';

            try {
                const response = await fetch(`?ajax=reverse&item=${itemId}&all=${includeAll}`);
                const data = await response.json();

                reverseTitle.textContent = `Uses for: ${itemSearch.value}`;

                if (data.length > 0) {
                    craftableList.innerHTML = data.map(item => `
                        <div class="craftable-item" data-id="${item.id}" data-name="${item.name}">
                            <div class="craftable-info">
                                <span class="category-dot category-${item.category}"></span>
                                <span>${item.name}</span>
                            </div>
                            <span class="craftable-uses">needs &times;${item.formatted}</span>
                        </div>
                    `).join('');
                } else {
                    craftableList.innerHTML = '<div class="empty-state"><p>This item is not used in any recipes</p></div>';
                }

            } catch (error) {
                console.error('Reverse lookup error:', error);
                alert('Error looking up uses');
            }
        }

        // Toggle indirect uses
        showIndirect.addEventListener('change', () => {
            if (selectedItemId.value) reverseLookup();
        });

        // Click on craftable item to switch to calculate mode
        craftableList.addEventListener('click', (e) => {
            const item = e.target.closest('.craftable-item');
            if (item) {
                // Switch to calculate mode
                modeBtns[0].click();
                selectedItemId.value = item.dataset.id;
                itemSearch.value = item.dataset.name;
                calculate();
            }
        });
    </script>
</body>
</html>
