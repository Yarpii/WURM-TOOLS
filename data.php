<?php
/**
 * WurmCalc - Data Management
 * Import/Export, CSV Upload, Wiki Scraper
 */

require_once __DIR__ . '/calculator.php';

$calc = new WurmCalculator();
$message = '';
$error = '';
$preview = null;
$importStats = null;
$scrapeResults = null;

// Handle JSON Export
if (isset($_GET['export']) && $_GET['export'] === 'json') {
    $data = $calc->exportToJson();
    header('Content-Type: application/json');
    header('Content-Disposition: attachment; filename="wurmcalc-backup-' . date('Y-m-d') . '.json"');
    echo json_encode($data, JSON_PRETTY_PRINT);
    exit;
}

// Handle POST actions
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    try {
        switch ($action) {
            case 'import_json':
                if (empty($_FILES['json_file']['tmp_name'])) {
                    $error = 'Please select a JSON file';
                    break;
                }

                $content = file_get_contents($_FILES['json_file']['tmp_name']);
                $data = json_decode($content, true);

                if ($data === null) {
                    $error = 'Invalid JSON file';
                    break;
                }

                $replace = isset($_POST['replace_mode']);
                $importStats = $calc->importFromJson($data, $replace);
                $message = "Import complete: {$importStats['items_added']} items added, {$importStats['recipes_added']} recipes added";

                if ($importStats['items_skipped'] || $importStats['recipes_skipped']) {
                    $message .= " ({$importStats['items_skipped']} items, {$importStats['recipes_skipped']} recipes skipped as duplicates)";
                }
                break;

            case 'preview_items_csv':
            case 'import_items_csv':
                if (empty($_FILES['csv_file']['tmp_name'])) {
                    $error = 'Please select a CSV file';
                    break;
                }

                $rows = [];
                $skipHeader = isset($_POST['skip_header']);
                if (($handle = fopen($_FILES['csv_file']['tmp_name'], 'r')) !== false) {
                    $first = true;
                    while (($row = fgetcsv($handle)) !== false) {
                        if ($first && $skipHeader) {
                            $first = false;
                            continue;
                        }
                        $first = false;
                        $rows[] = $row;
                    }
                    fclose($handle);
                }

                $isPreview = $action === 'preview_items_csv';
                $preview = [
                    'type' => 'items',
                    'data' => $calc->importItemsCsv($rows, $isPreview),
                    'is_preview' => $isPreview
                ];

                if (!$isPreview) {
                    $count = count($preview['data']['valid']);
                    $message = "$count items imported successfully";
                }
                break;

            case 'preview_recipes_csv':
            case 'import_recipes_csv':
                if (empty($_FILES['csv_file']['tmp_name'])) {
                    $error = 'Please select a CSV file';
                    break;
                }

                $rows = [];
                $skipHeader = isset($_POST['skip_header']);
                if (($handle = fopen($_FILES['csv_file']['tmp_name'], 'r')) !== false) {
                    $first = true;
                    while (($row = fgetcsv($handle)) !== false) {
                        if ($first && $skipHeader) {
                            $first = false;
                            continue;
                        }
                        $first = false;
                        $rows[] = $row;
                    }
                    fclose($handle);
                }

                $isPreview = $action === 'preview_recipes_csv';
                $preview = [
                    'type' => 'recipes',
                    'data' => $calc->importRecipesCsv($rows, $isPreview),
                    'is_preview' => $isPreview
                ];

                if (!$isPreview) {
                    $count = count($preview['data']['valid']);
                    $message = "$count recipes imported successfully";
                }
                break;

            case 'scrape_wiki':
                $url = $_POST['wiki_url'] ?? '';
                $scrapeResults = scrapeWurmWiki($url, $calc);
                if (!empty($scrapeResults['error'])) {
                    $error = $scrapeResults['error'];
                } else {
                    $message = "Scraped {$scrapeResults['items_found']} items, added {$scrapeResults['items_added']} new items";
                }
                break;

            case 'clear_data':
                if (isset($_POST['confirm_clear'])) {
                    $calc->clearAllData();
                    $message = 'All data cleared successfully';
                    $calc = new WurmCalculator(); // Reload
                } else {
                    $error = 'Please confirm data deletion';
                }
                break;
        }
    } catch (Exception $e) {
        $error = 'Error: ' . $e->getMessage();
    }
}

/**
 * Scrape items from Wurmpedia
 */
function scrapeWurmWiki(string $url, WurmCalculator $calc): array {
    $results = [
        'url' => $url,
        'items_found' => 0,
        'items_added' => 0,
        'items_skipped' => 0,
        'recipes_found' => 0,
        'recipes_added' => 0,
        'items' => [],
        'error' => null
    ];

    if (empty($url)) {
        $results['error'] = 'Please enter a wiki URL';
        return $results;
    }

    // Validate URL is from wurmpedia
    if (!preg_match('/wurmpedia\.com/', $url)) {
        $results['error'] = 'URL must be from wurmpedia.com';
        return $results;
    }

    // Fetch the page
    $context = stream_context_create([
        'http' => [
            'timeout' => 10,
            'user_agent' => 'WurmCalc/1.0'
        ]
    ]);

    $html = @file_get_contents($url, false, $context);
    if ($html === false) {
        $results['error'] = 'Could not fetch the wiki page';
        return $results;
    }

    // Parse for item name (usually in h1 or title)
    $itemName = '';
    if (preg_match('/<h1[^>]*id="firstHeading"[^>]*>([^<]+)</i', $html, $m)) {
        $itemName = trim(html_entity_decode($m[1]));
    }

    if (empty($itemName)) {
        $results['error'] = 'Could not find item name on page';
        return $results;
    }

    $results['items_found'] = 1;
    $results['items'][] = ['name' => $itemName, 'status' => 'found'];

    // Try to determine category from page content
    $category = 'misc';
    $categoryPatterns = [
        'tool' => '/tools?|hammer|saw|chisel|knife|needle/i',
        'weapon' => '/weapon|sword|axe|maul|spear|bow|arrow/i',
        'armor' => '/armou?r|helm|boot|glove|chest|leg/i',
        'vehicle' => '/vehicle|cart|wagon|boat|ship|sail/i',
        'building' => '/building|wall|floor|roof|fence|door/i',
        'material' => '/material|resource|component/i',
        'food' => '/food|meal|meat|vegetable|fruit/i',
        'wood' => '/wood|plank|log|shaft|timber/i',
        'metal' => '/metal|iron|steel|copper|gold|silver|lump/i',
    ];

    foreach ($categoryPatterns as $cat => $pattern) {
        if (preg_match($pattern, $html)) {
            $category = $cat;
            break;
        }
    }

    // Check if it's a base material (look for "gathered" or "harvested" keywords)
    $isBase = (bool)preg_match('/\b(gather|harvest|mine|dig|forage|botanize|fish)\b/i', $html);

    // Add item if not exists
    $existing = $calc->getItemByName($itemName);
    if (!$existing) {
        try {
            $calc->addItem($itemName, $category, $isBase, "Imported from Wurmpedia");
            $results['items_added']++;
            $results['items'][0]['status'] = 'added';
        } catch (Exception $e) {
            $results['items'][0]['status'] = 'error: ' . $e->getMessage();
        }
    } else {
        $results['items_skipped']++;
        $results['items'][0]['status'] = 'skipped (exists)';
    }

    // Try to parse crafting requirements
    // Look for tables with "Materials" or "Ingredients" or recipe info
    $recipePatterns = [
        // Pattern: "X x Item Name" or "Item Name x X"
        '/(\d+(?:\.\d+)?)\s*[x×]\s*([A-Z][a-z]+(?:\s+[A-Z]?[a-z]+)*)/u',
        '/([A-Z][a-z]+(?:\s+[A-Z]?[a-z]+)*)\s*[x×]\s*(\d+(?:\.\d+)?)/u',
    ];

    // Look for recipe/materials section
    if (preg_match('/<h[23][^>]*>.*?(?:Materials?|Ingredients?|Recipe|Creation).*?<\/h[23]>(.*?)(?:<h[23]|$)/is', $html, $section)) {
        $recipeHtml = $section[1];

        // Find all item references in this section
        preg_match_all('/(\d+(?:\.\d+)?)\s*[x×]\s*<a[^>]*>([^<]+)<\/a>/iu', $recipeHtml, $matches, PREG_SET_ORDER);

        foreach ($matches as $match) {
            $qty = floatval($match[1]);
            $ingredientName = trim(html_entity_decode($match[2]));

            if (empty($ingredientName) || $qty <= 0) continue;

            $results['recipes_found']++;

            // Ensure ingredient exists
            $ingredient = $calc->getItemByName($ingredientName);
            if (!$ingredient) {
                // Add as base material (since we don't know its recipe)
                try {
                    $calc->addItem($ingredientName, 'material', true, 'Auto-added ingredient');
                    $ingredient = $calc->getItemByName($ingredientName);
                    $results['items_added']++;
                } catch (Exception $e) {
                    continue;
                }
            }

            // Get the main item we're adding recipe for
            $mainItem = $calc->getItemByName($itemName);
            if ($mainItem && $ingredient) {
                $id = $calc->addRecipeIngredient($mainItem['id'], $ingredient['id'], $qty);
                if ($id !== null) {
                    $results['recipes_added']++;
                }
            }
        }
    }

    return $results;
}

$itemCount = count($calc->getAllItems());
$recipeCount = count($calc->getAllRecipes());
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Data Management - WurmCalc</title>
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
            --info: #17a2b8;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: var(--bg-dark);
            color: var(--text);
            min-height: 100vh;
            padding: 20px;
        }

        .container { max-width: 1200px; margin: 0 auto; }

        header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
            flex-wrap: wrap;
            gap: 15px;
        }

        h1 { color: var(--accent); }
        h1 span { color: var(--text); }

        .nav-links { display: flex; gap: 10px; }

        .nav-link {
            color: var(--accent);
            text-decoration: none;
            padding: 10px 20px;
            border: 1px solid var(--accent);
            border-radius: 6px;
        }
        .nav-link:hover { background: var(--accent); color: white; }

        .stats {
            background: var(--bg-card);
            padding: 15px 25px;
            border-radius: 8px;
            display: flex;
            gap: 30px;
        }

        .stat { text-align: center; }
        .stat-value { font-size: 1.5rem; font-weight: bold; color: var(--accent); }
        .stat-label { font-size: 0.85rem; color: var(--text-muted); }

        .message {
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        .message.success { background: rgba(78, 204, 163, 0.2); border: 1px solid var(--success); }
        .message.error { background: rgba(220, 53, 69, 0.2); border: 1px solid var(--danger); }

        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 25px; }

        .card {
            background: var(--bg-card);
            padding: 25px;
            border-radius: 12px;
        }

        .card h2 {
            color: var(--accent);
            margin-bottom: 20px;
            font-size: 1.2rem;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .card h2 svg { flex-shrink: 0; }

        .card p { color: var(--text-muted); margin-bottom: 15px; font-size: 0.9rem; }

        .form-group { margin-bottom: 15px; }

        label {
            display: block;
            margin-bottom: 5px;
            color: var(--text-muted);
            font-size: 0.9rem;
        }

        input[type="text"], input[type="url"], input[type="file"], select, textarea {
            width: 100%;
            padding: 10px 12px;
            border: none;
            border-radius: 6px;
            background: var(--bg-input);
            color: var(--text);
            font-size: 1rem;
        }
        input:focus, select:focus, textarea:focus { outline: 2px solid var(--accent); }

        input[type="file"] { padding: 8px; }

        .checkbox-group {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 15px;
        }
        .checkbox-group input { width: auto; }
        .checkbox-group label { margin: 0; }

        button {
            padding: 10px 20px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.95rem;
            transition: opacity 0.2s;
            display: inline-flex;
            align-items: center;
            gap: 8px;
        }
        button:hover { opacity: 0.9; }

        .btn-primary { background: var(--accent); color: white; }
        .btn-success { background: var(--success); color: white; }
        .btn-warning { background: var(--warning); color: #333; }
        .btn-danger { background: var(--danger); color: white; }
        .btn-info { background: var(--info); color: white; }
        .btn-block { width: 100%; justify-content: center; }

        .btn-group { display: flex; gap: 10px; flex-wrap: wrap; }

        .preview-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
            font-size: 0.9rem;
        }

        .preview-table th, .preview-table td {
            padding: 10px;
            text-align: left;
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }

        .preview-table th { color: var(--text-muted); font-weight: 500; }

        .badge {
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 0.75rem;
        }
        .badge-success { background: var(--success); color: white; }
        .badge-warning { background: var(--warning); color: #333; }
        .badge-danger { background: var(--danger); color: white; }
        .badge-info { background: var(--info); color: white; }

        .preview-section {
            background: var(--bg-card);
            padding: 25px;
            border-radius: 12px;
            margin-top: 25px;
        }

        .preview-section h3 {
            color: var(--accent);
            margin-bottom: 15px;
        }

        .preview-summary {
            display: flex;
            gap: 20px;
            margin-bottom: 15px;
            flex-wrap: wrap;
        }

        .preview-stat {
            padding: 10px 15px;
            border-radius: 6px;
            background: var(--bg-input);
        }

        .preview-stat.valid { border-left: 3px solid var(--success); }
        .preview-stat.invalid { border-left: 3px solid var(--danger); }
        .preview-stat.duplicate { border-left: 3px solid var(--warning); }

        .code-block {
            background: var(--bg-input);
            padding: 15px;
            border-radius: 6px;
            font-family: monospace;
            font-size: 0.85rem;
            overflow-x: auto;
            white-space: pre;
        }

        .danger-zone {
            border: 1px solid var(--danger);
            padding: 20px;
            border-radius: 8px;
            margin-top: 25px;
        }

        .danger-zone h3 {
            color: var(--danger);
            margin-bottom: 10px;
        }

        .error-list {
            max-height: 200px;
            overflow-y: auto;
            background: var(--bg-input);
            padding: 10px;
            border-radius: 6px;
            margin-top: 10px;
        }

        .error-list li {
            padding: 5px 0;
            border-bottom: 1px solid rgba(255,255,255,0.05);
            font-size: 0.85rem;
            color: var(--text-muted);
        }

        .wiki-help {
            background: var(--bg-input);
            padding: 15px;
            border-radius: 6px;
            margin-top: 15px;
            font-size: 0.85rem;
        }

        .wiki-help h4 {
            color: var(--info);
            margin-bottom: 10px;
        }

        .wiki-help ul {
            margin-left: 20px;
            color: var(--text-muted);
        }

        .wiki-help li { margin-bottom: 5px; }

        .wiki-help code {
            background: var(--bg-dark);
            padding: 2px 6px;
            border-radius: 3px;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <div>
                <h1>Wurm<span>Calc</span> Data</h1>
            </div>
            <div class="stats">
                <div class="stat">
                    <div class="stat-value"><?= $itemCount ?></div>
                    <div class="stat-label">Items</div>
                </div>
                <div class="stat">
                    <div class="stat-value"><?= $recipeCount ?></div>
                    <div class="stat-label">Recipes</div>
                </div>
            </div>
            <div class="nav-links">
                <a href="index.php" class="nav-link">Calculator</a>
                <a href="admin.php" class="nav-link">Admin</a>
            </div>
        </header>

        <?php if ($message): ?>
            <div class="message success"><?= htmlspecialchars($message) ?></div>
        <?php endif; ?>

        <?php if ($error): ?>
            <div class="message error"><?= htmlspecialchars($error) ?></div>
        <?php endif; ?>

        <div class="grid">
            <!-- JSON Export/Import -->
            <div class="card">
                <h2>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                    </svg>
                    JSON Backup/Restore
                </h2>
                <p>Export all items and recipes to JSON for backup, or import from a previous backup.</p>

                <div class="btn-group" style="margin-bottom: 20px;">
                    <a href="?export=json" class="btn-success" style="text-decoration:none;padding:10px 20px;border-radius:6px">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline;vertical-align:middle">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        Download JSON
                    </a>
                </div>

                <form method="post" enctype="multipart/form-data">
                    <input type="hidden" name="action" value="import_json">

                    <div class="form-group">
                        <label>Import JSON File</label>
                        <input type="file" name="json_file" accept=".json">
                    </div>

                    <div class="checkbox-group">
                        <input type="checkbox" id="replace_mode" name="replace_mode">
                        <label for="replace_mode">Replace mode (clear existing data first)</label>
                    </div>

                    <button type="submit" class="btn-primary btn-block">Import JSON</button>
                </form>
            </div>

            <!-- CSV Items Import -->
            <div class="card">
                <h2>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="3" y1="9" x2="21" y2="9"></line>
                        <line x1="9" y1="21" x2="9" y2="9"></line>
                    </svg>
                    CSV Items Import
                </h2>
                <p>Bulk import items from CSV. Format: name, category, is_base_material, description</p>

                <div class="code-block">name,category,is_base,description
Iron Ore,ore,true,Mined from rock
Plank,wood,false,Made from logs</div>

                <form method="post" enctype="multipart/form-data" style="margin-top:15px">
                    <input type="hidden" name="action" value="preview_items_csv">

                    <div class="form-group">
                        <input type="file" name="csv_file" accept=".csv">
                    </div>

                    <div class="checkbox-group">
                        <input type="checkbox" id="skip_header_items" name="skip_header" checked>
                        <label for="skip_header_items">Skip header row</label>
                    </div>

                    <button type="submit" class="btn-info btn-block">Preview Import</button>
                </form>
            </div>

            <!-- CSV Recipes Import -->
            <div class="card">
                <h2>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                        <path d="M2 17l10 5 10-5"></path>
                        <path d="M2 12l10 5 10-5"></path>
                    </svg>
                    CSV Recipes Import
                </h2>
                <p>Bulk import recipes from CSV. Format: result_item, ingredient, quantity</p>

                <div class="code-block">result,ingredient,quantity
Plank,Log,1
Hammer,Shaft,1
Hammer,Iron Lump,1</div>

                <form method="post" enctype="multipart/form-data" style="margin-top:15px">
                    <input type="hidden" name="action" value="preview_recipes_csv">

                    <div class="form-group">
                        <input type="file" name="csv_file" accept=".csv">
                    </div>

                    <div class="checkbox-group">
                        <input type="checkbox" id="skip_header_recipes" name="skip_header" checked>
                        <label for="skip_header_recipes">Skip header row</label>
                    </div>

                    <button type="submit" class="btn-info btn-block">Preview Import</button>
                </form>
            </div>

            <!-- Wiki Scraper -->
            <div class="card">
                <h2>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="2" y1="12" x2="22" y2="12"></line>
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                    </svg>
                    Wurmpedia Scraper
                </h2>
                <p>Import item data directly from Wurmpedia pages.</p>

                <form method="post">
                    <input type="hidden" name="action" value="scrape_wiki">

                    <div class="form-group">
                        <label>Wurmpedia URL</label>
                        <input type="url" name="wiki_url" placeholder="https://www.wurmpedia.com/index.php/Cart">
                    </div>

                    <button type="submit" class="btn-warning btn-block">Scrape Page</button>
                </form>

                <div class="wiki-help">
                    <h4>How to use</h4>
                    <ul>
                        <li>Go to <a href="https://www.wurmpedia.com" target="_blank" style="color:var(--accent)">wurmpedia.com</a></li>
                        <li>Find an item page (e.g., Cart, Hammer, Plank)</li>
                        <li>Copy the URL and paste it above</li>
                        <li>The scraper will try to extract the item name and recipe</li>
                    </ul>
                    <p style="margin-top:10px;color:var(--warning)">Note: Recipe parsing is experimental and may not work for all pages.</p>
                </div>
            </div>
        </div>

        <?php if ($preview): ?>
            <div class="preview-section">
                <h3>Import Preview - <?= ucfirst($preview['type']) ?></h3>

                <div class="preview-summary">
                    <div class="preview-stat valid">
                        <strong><?= count($preview['data']['valid']) ?></strong> ready to import
                    </div>
                    <div class="preview-stat duplicate">
                        <strong><?= count($preview['data']['duplicates']) ?></strong> duplicates (will skip)
                    </div>
                    <div class="preview-stat invalid">
                        <strong><?= count($preview['data']['invalid']) ?></strong> invalid rows
                    </div>
                </div>

                <?php if (!empty($preview['data']['valid'])): ?>
                    <table class="preview-table">
                        <thead>
                            <tr>
                                <th>Row</th>
                                <?php if ($preview['type'] === 'items'): ?>
                                    <th>Name</th>
                                    <th>Category</th>
                                    <th>Type</th>
                                <?php else: ?>
                                    <th>Result</th>
                                    <th>Ingredient</th>
                                    <th>Quantity</th>
                                <?php endif; ?>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach (array_slice($preview['data']['valid'], 0, 20) as $item): ?>
                                <tr>
                                    <td><?= $item['row'] ?></td>
                                    <?php if ($preview['type'] === 'items'): ?>
                                        <td><?= htmlspecialchars($item['name']) ?></td>
                                        <td><?= htmlspecialchars($item['category']) ?></td>
                                        <td><?= $item['is_base_material'] ? 'Base' : 'Crafted' ?></td>
                                    <?php else: ?>
                                        <td><?= htmlspecialchars($item['result']) ?></td>
                                        <td><?= htmlspecialchars($item['ingredient']) ?></td>
                                        <td><?= $item['quantity'] ?></td>
                                    <?php endif; ?>
                                    <td>
                                        <?php if (isset($item['imported'])): ?>
                                            <span class="badge badge-success">Imported</span>
                                        <?php elseif ($preview['is_preview']): ?>
                                            <span class="badge badge-info">Ready</span>
                                        <?php endif; ?>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                            <?php if (count($preview['data']['valid']) > 20): ?>
                                <tr><td colspan="5" style="text-align:center;color:var(--text-muted)">... and <?= count($preview['data']['valid']) - 20 ?> more</td></tr>
                            <?php endif; ?>
                        </tbody>
                    </table>

                    <?php if ($preview['is_preview'] && !empty($preview['data']['valid'])): ?>
                        <form method="post" enctype="multipart/form-data" style="margin-top:20px">
                            <input type="hidden" name="action" value="import_<?= $preview['type'] ?>_csv">
                            <input type="hidden" name="skip_header" value="<?= isset($_POST['skip_header']) ? '1' : '' ?>">
                            <p style="color:var(--text-muted);margin-bottom:10px">Re-upload the same file to confirm import:</p>
                            <div class="form-group">
                                <input type="file" name="csv_file" accept=".csv" required>
                            </div>
                            <button type="submit" class="btn-success">Confirm Import</button>
                        </form>
                    <?php endif; ?>
                <?php endif; ?>

                <?php if (!empty($preview['data']['invalid'])): ?>
                    <h4 style="color:var(--danger);margin-top:20px">Invalid Rows</h4>
                    <ul class="error-list">
                        <?php foreach ($preview['data']['invalid'] as $err): ?>
                            <li>Row <?= $err['row'] ?>: <?= htmlspecialchars($err['error']) ?></li>
                        <?php endforeach; ?>
                    </ul>
                <?php endif; ?>
            </div>
        <?php endif; ?>

        <?php if ($scrapeResults && empty($scrapeResults['error'])): ?>
            <div class="preview-section">
                <h3>Scrape Results</h3>
                <div class="preview-summary">
                    <div class="preview-stat valid">
                        <strong><?= $scrapeResults['items_added'] ?></strong> items added
                    </div>
                    <div class="preview-stat duplicate">
                        <strong><?= $scrapeResults['items_skipped'] ?></strong> items skipped
                    </div>
                    <div class="preview-stat valid">
                        <strong><?= $scrapeResults['recipes_added'] ?></strong> recipes added
                    </div>
                </div>

                <?php if (!empty($scrapeResults['items'])): ?>
                    <table class="preview-table">
                        <thead>
                            <tr>
                                <th>Item</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($scrapeResults['items'] as $item): ?>
                                <tr>
                                    <td><?= htmlspecialchars($item['name']) ?></td>
                                    <td>
                                        <?php if ($item['status'] === 'added'): ?>
                                            <span class="badge badge-success">Added</span>
                                        <?php elseif (strpos($item['status'], 'skipped') !== false): ?>
                                            <span class="badge badge-warning">Skipped</span>
                                        <?php else: ?>
                                            <span class="badge badge-danger"><?= htmlspecialchars($item['status']) ?></span>
                                        <?php endif; ?>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                <?php endif; ?>
            </div>
        <?php endif; ?>

        <?php if ($importStats && !empty($importStats['errors'])): ?>
            <div class="preview-section">
                <h4 style="color:var(--warning)">Import Warnings</h4>
                <ul class="error-list">
                    <?php foreach (array_slice($importStats['errors'], 0, 20) as $err): ?>
                        <li><?= htmlspecialchars($err) ?></li>
                    <?php endforeach; ?>
                    <?php if (count($importStats['errors']) > 20): ?>
                        <li>... and <?= count($importStats['errors']) - 20 ?> more</li>
                    <?php endif; ?>
                </ul>
            </div>
        <?php endif; ?>

        <div class="danger-zone">
            <h3>Danger Zone</h3>
            <p style="color:var(--text-muted);margin-bottom:15px">Clear all items and recipes from the database. This cannot be undone!</p>
            <form method="post" onsubmit="return confirm('Are you sure? This will delete ALL data!')">
                <input type="hidden" name="action" value="clear_data">
                <div class="checkbox-group">
                    <input type="checkbox" id="confirm_clear" name="confirm_clear" required>
                    <label for="confirm_clear">I understand this will delete all data</label>
                </div>
                <button type="submit" class="btn-danger">Clear All Data</button>
            </form>
        </div>
    </div>
</body>
</html>
