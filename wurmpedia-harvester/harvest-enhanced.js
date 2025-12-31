#!/usr/bin/env node

/**
 * Wurmpedia Enhanced Page Harvester
 *
 * Fetches all pages with categories and auto-classification.
 * Run with: node harvest-enhanced.js
 */

const fs = require("fs");
const path = require("path");

const API_BASE = "https://wurmpedia.com/api.php";
const OUTPUT_FILE = path.join(__dirname, "wurmpedia-pages.json");
const OUTPUT_CATEGORIZED = path.join(__dirname, "wurmpedia-categorized.json");
const RATE_LIMIT_MS = 2000;
const RETRY_DELAY_MS = 5000;
const MAX_RETRIES = 3;
const CATEGORY_BATCH_SIZE = 50; // Fetch categories for 50 pages at a time

// Auto-classification patterns
const PATTERNS = {
  skills: [
    /^(Blacksmithing|Carpentry|Masonry|Mining|Woodcutting|Digging|Farming|Cooking|Pottery|Ropemaking|Cloth tailoring|Leatherworking|Smithing|Jewelry smithing|Fine carpentry|Ship building|Bowyery|Fletching|Natural substances|Alchemy|Toymaking|Paving|Prospecting|Stonecutting|Butchering|Milling|Beverages|Hot food cooking|Baking|Dairy food making|Firemaking|Papyrusmaking|Animal husbandry|Meditating|Channeling|Preaching|Exorcism|Artifacts|Hammers|Religion|Prayer|Faith|Alignment|First aid|Foraging|Botanizing|Fighting|Archery|Shields|Swords|Axes|Mauls|Knives|Polearms|Misc items|Defensive fighting|Aggressive fighting|Normal fighting|Taunting|Shield bashing|Lockpicking|Stealing|Traps|Catapults|War machines|Animal taming|Nature|Tracking|Climbing|Swimming|Body|Body strength|Body stamina|Body control|Mind|Mind logic|Mind speed|Soul|Soul depth|Soul strength)$/i,
    /skill$/i,
  ],
  tools: [
    /^(Hammer|Mallet|Saw|Chisel|File|Awl|Needle|Scissors|Knife|Pickaxe|Shovel|Rake|Hoe|Scythe|Sickle|Trowel|Spatula|Spindle|Loom|Rope tool|Leather knife|Carving knife|Butchering knife|Stone chisel|Grooming brush|Branding iron|Pelt|Whetstone|Water|Clay|Dye)$/i,
    /\b(tool|hammer|mallet|saw|chisel|file|awl|needle|pickaxe|shovel|rake|hoe|scythe|knife|scissors)\b/i,
  ],
  weapons: [
    /^(Longsword|Shortsword|Two handed sword|Huge axe|Small axe|Hatchet|Large maul|Small maul|Medium maul|Sickle|Scythe|Staff|Spear|Halberd|Long spear|Pike|Short bow|Long bow|Medium bow|Hunting arrow|War arrow|Bodkin arrow|Shield|Large metal shield|Large wooden shield|Small metal shield|Small wooden shield)$/i,
    /\b(sword|axe|maul|bow|arrow|spear|halberd|pike|shield|weapon)\b/i,
  ],
  armor: [
    /^(Chain.*|Plate.*|Leather.*|Studded.*|Cloth.*|Drake.*|Scale.*)$/i,
    /\b(armour|armor|helm|helmet|boot|gauntlet|sleeve|jacket|pants|leggings|cap|hat|glove)\b/i,
  ],
  creatures: [
    /^(Cow|Bull|Pig|Horse|Hen|Rooster|Sheep|Dog|Cat|Wolf|Bear|Lion|Crocodile|Scorpion|Spider|Troll|Goblin|Zombie|Skeleton|Ghost|Wraith|Hell horse|Hell hound|Unicorn|Dragon|Drake|Seal|Dolphin|Shark|Octopus|Crab|Deer|Pheasant|Bison|Anaconda|Black bear|Brown bear|Cave bug|Fog spider|Huge spider|Lava spider|Lava fiend|Deathcrawler minion|Forest giant|Kyklops|Sol demon|Rift beast|Rift jackal|Rift ogre|Rift caster|Rift warmaster|Worg|Hyena|Wildcat|Mountain lion|Hell scorpius|Nogump|Goblin leader|Troll king)$/i,
    /\b(creature|animal|monster|beast|spawn)\b/i,
  ],
  materials: [
    /^(Iron|Steel|Silver|Gold|Copper|Tin|Zinc|Lead|Bronze|Brass|Electrum|Adamantine|Glimmersteel|Seryll|Moonmetal|Wood|Oak|Pine|Cedar|Birch|Maple|Willow|Linden|Chestnut|Walnut|Fir|Lemon|Olive|Cherry|Orange|Apple|Lavender|Camellia|Oleander|Grape|Rose|Thorn|Hazelnut|Stone|Rock|Marble|Slate|Sandstone|Pottery|Clay|Dirt|Sand|Gravel|Tar|Peat|Moss|Leather|Fur|Wool|Cotton|Cloth|Lye|Ash|Charcoal|Coal)$/i,
    /\b(ore|lump|bar|plank|board|shaft|log|pelt|hide|ingot|alloy)\b/i,
  ],
  food: [
    /\b(meal|stew|soup|casserole|bread|cake|pie|pizza|sandwich|salad|sausage|meat|fish|fillet|steak|chop|roast|wrap|rice|porridge|omelette|egg|cheese|butter|milk|cream|honey|sugar|salt|herb|spice|vegetable|fruit|berry|mushroom|nut|seed|flour|dough|yeast)\b/i,
    /^(Corn|Wheat|Barley|Oat|Rye|Rice|Potato|Onion|Garlic|Pumpkin|Cabbage|Tomato|Lettuce|Cucumber|Carrot|Pea|Bean|Strawberry|Blueberry|Raspberry|Lingonberry|Apple|Lemon|Orange|Olive|Grape|Cherry|Hazelnut|Chestnut|Walnut|Cocoa bean)$/i,
  ],
  buildings: [
    /\b(house|building|shed|tower|castle|mansion|cottage|inn|tavern|temple|church|chapel|cathedral|guardtower|colossus|bridge|fence|gate|wall|floor|roof|door|window|stairs|arch|pillar|column)\b/i,
    /^(Wooden house|Stone house|Marble building|Rendered house|Pottery building|Sandstone building|Slate building|Rounded stone building|Timber framed building)$/i,
  ],
  furniture: [
    /\b(bed|chair|table|bench|stool|throne|bookshelf|chest|cabinet|wardrobe|cupboard|coffin|altar|statue|canopy|candelabra|lamp|lantern|chandelier|carpet|tapestry|curtain|pillow|cushion|rug|mirror|clock|sign|flag|banner)\b/i,
  ],
  vehicles: [
    /^(Cart|Wagon|Large cart|Small cart|Rowing boat|Sailboat|Corbita|Cog|Knarr|Caravel|Ship|Raft)$/i,
    /\b(boat|ship|cart|wagon|vehicle|sail)\b/i,
  ],
  containers: [
    /\b(container|barrel|crate|chest|satchel|backpack|quiver|pouch|bucket|flask|jar|amphora|pottery jar|small barrel|large barrel|food storage bin|bulk storage bin|magic chest|large magical chest)\b/i,
  ],
  gods: [
    /^(Fo|Magranon|Vynora|Libila|Nathan|Tosiek|Gary|Paaweelr|Smeagain)$/i,
    /\b(deity|god|goddess|demigod|religion|faith|prayer|altar|sermon|follower|priest|champion)\b/i,
  ],
  enchantments: [
    /^(Circle of Cunning|Wind of Ages|Blessings of the Dark|Life Transfer|Nimbleness|Mind Stealer|Venom|Flaming Aura|Frostbrand|Rotting Touch|Bloodthirst|Aura of Shared Pain|Web Armour|Nolocate|Lurker in the Dark|Lurker in the Woods|Lurker in the Deep|Mend|Dispel|Courier|Dark Messenger|Genesis|Dominate|Charm|Cure Light|Cure Medium|Cure Serious|Heal|Light of Fo|Humid Drizzle|Wild Growth|Refresh|Morning Fog|Oakshell|Tangleweave|Bearpaws|Dirt|Fungus|Libila's Shielding|Truehit|Drain Health|Drain Stamina|Zombie Infestation|Summon Skeleton|Summon Wraith|Summon Zombies)$/i,
    /\b(enchant|spell|cast|favor|channeling|enchantment)\b/i,
  ],
  mechanics: [
    /\b(deed|village|settlement|kingdom|alliance|player|account|premium|skill gain|affinity|title|karma|sleep bonus|fatigue|stamina|nutrition|food bar|water bar|ccfp|ql|quality|damage|decay|improve|repair|create|continue|action timer)\b/i,
  ],
};

// Known main categories from Wurmpedia
const MAIN_CATEGORIES = [
  "Skills", "Items", "Creatures", "Buildings", "Weapons", "Armor", "Tools",
  "Materials", "Food", "Cooking", "Farming", "Vehicles", "Ships", "Religion",
  "Magic", "Combat", "Guides", "Servers", "Updates", "Mechanics", "Crafting"
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, retries = MAX_RETRIES) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`  ❌ Attempt ${attempt}/${retries} failed: ${errorMsg}`);
      if (attempt < retries) {
        console.log(`  ⏳ Waiting ${RETRY_DELAY_MS / 1000}s before retry...`);
        await sleep(RETRY_DELAY_MS);
      } else {
        throw new Error(`Failed after ${retries} attempts: ${errorMsg}`);
      }
    }
  }
  throw new Error("Unexpected: exhausted retries");
}

function autoClassify(title) {
  const detected = [];

  for (const [category, patterns] of Object.entries(PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(title)) {
        detected.push(category);
        break;
      }
    }
  }

  return detected.length > 0 ? detected : ["uncategorized"];
}

async function fetchCategoriesForPages(pageIds) {
  const params = new URLSearchParams({
    action: "query",
    prop: "categories",
    pageids: pageIds.join("|"),
    cllimit: "500",
    format: "json",
  });

  const url = `${API_BASE}?${params.toString()}`;
  const data = await fetchWithRetry(url);

  const result = {};
  if (data.query?.pages) {
    for (const [pageId, pageData] of Object.entries(data.query.pages)) {
      const categories = (pageData.categories || [])
        .map(c => c.title.replace(/^Category:/, ""))
        .filter(c => !c.startsWith("Pages ") && !c.includes("articles"));
      result[pageId] = categories;
    }
  }

  return result;
}

async function harvestPages() {
  console.log("🔨 Wurmpedia Enhanced Page Harvester");
  console.log("=====================================\n");

  const allPages = new Map();
  let startPoint = "";
  let batchNumber = 0;

  // Phase 1: Collect all pages
  console.log("📡 Phase 1: Fetching all pages...\n");

  while (true) {
    batchNumber++;

    const params = new URLSearchParams({
      action: "query",
      list: "allpages",
      aplimit: "500",
      format: "json",
    });

    if (startPoint) {
      params.set("apfrom", startPoint);
    }

    const url = `${API_BASE}?${params.toString()}`;
    console.log(`📦 Batch ${batchNumber}: Fetching from "${startPoint || "A"}"...`);

    const data = await fetchWithRetry(url);
    const pages = data.query?.allpages || [];

    if (pages.length === 0) {
      console.log("  ✅ No more pages to fetch.\n");
      break;
    }

    for (const page of pages) {
      if (!allPages.has(page.pageid)) {
        allPages.set(page.pageid, {
          pageid: page.pageid,
          title: page.title,
          ns: page.ns,
          wiki_categories: [],
          auto_categories: autoClassify(page.title),
        });
      }
    }

    const lastPage = pages[pages.length - 1];
    console.log(`  ✅ Fetched ${pages.length} pages, now at "${lastPage.title}"`);
    console.log(`  📊 Total unique pages: ${allPages.size}`);

    if (data.continue?.apcontinue) {
      startPoint = data.continue.apcontinue;
    } else {
      console.log("\n  ✅ Reached end of pages.\n");
      break;
    }

    console.log(`  ⏳ Waiting ${RATE_LIMIT_MS / 1000}s...\n`);
    await sleep(RATE_LIMIT_MS);
  }

  // Phase 2: Fetch categories for all pages
  console.log("📡 Phase 2: Fetching categories for pages...\n");

  const pageIds = Array.from(allPages.keys());
  const totalBatches = Math.ceil(pageIds.length / CATEGORY_BATCH_SIZE);

  for (let i = 0; i < pageIds.length; i += CATEGORY_BATCH_SIZE) {
    const batchIds = pageIds.slice(i, i + CATEGORY_BATCH_SIZE);
    const batchNum = Math.floor(i / CATEGORY_BATCH_SIZE) + 1;

    console.log(`🏷️  Batch ${batchNum}/${totalBatches}: Fetching categories...`);

    try {
      const categories = await fetchCategoriesForPages(batchIds);

      for (const [pageId, cats] of Object.entries(categories)) {
        const page = allPages.get(parseInt(pageId));
        if (page) {
          page.wiki_categories = cats;
        }
      }

      console.log(`  ✅ Got categories for ${Object.keys(categories).length} pages`);
    } catch (error) {
      console.error(`  ⚠️ Failed to get categories: ${error.message}`);
    }

    if (i + CATEGORY_BATCH_SIZE < pageIds.length) {
      await sleep(RATE_LIMIT_MS);
    }
  }

  // Phase 3: Build categorized output
  console.log("\n📊 Phase 3: Building categorized output...\n");

  const pagesArray = Array.from(allPages.values());

  // Build category index
  const byAutoCategory = {};
  const byWikiCategory = {};

  for (const page of pagesArray) {
    // Auto categories
    for (const cat of page.auto_categories) {
      if (!byAutoCategory[cat]) byAutoCategory[cat] = [];
      byAutoCategory[cat].push({ pageid: page.pageid, title: page.title });
    }

    // Wiki categories
    for (const cat of page.wiki_categories) {
      if (!byWikiCategory[cat]) byWikiCategory[cat] = [];
      byWikiCategory[cat].push({ pageid: page.pageid, title: page.title });
    }
  }

  // Sort categories by page count
  const sortedAutoCategories = Object.entries(byAutoCategory)
    .sort((a, b) => b[1].length - a[1].length)
    .reduce((acc, [k, v]) => { acc[k] = v.sort((a, b) => a.title.localeCompare(b.title)); return acc; }, {});

  const sortedWikiCategories = Object.entries(byWikiCategory)
    .sort((a, b) => b[1].length - a[1].length)
    .reduce((acc, [k, v]) => { acc[k] = v.sort((a, b) => a.title.localeCompare(b.title)); return acc; }, {});

  // Stats
  const stats = {
    total_pages: pagesArray.length,
    pages_with_wiki_categories: pagesArray.filter(p => p.wiki_categories.length > 0).length,
    auto_category_counts: Object.fromEntries(
      Object.entries(byAutoCategory).map(([k, v]) => [k, v.length]).sort((a, b) => b[1] - a[1])
    ),
    top_wiki_categories: Object.fromEntries(
      Object.entries(byWikiCategory)
        .sort((a, b) => b[1].length - a[1].length)
        .slice(0, 30)
        .map(([k, v]) => [k, v.length])
    ),
  };

  // Simple output (backwards compatible)
  const simpleOutput = {
    fetched_at: new Date().toISOString(),
    total_pages: pagesArray.length,
    pages: pagesArray
      .map(p => ({ pageid: p.pageid, title: p.title }))
      .sort((a, b) => a.title.localeCompare(b.title)),
  };

  // Categorized output
  const categorizedOutput = {
    fetched_at: new Date().toISOString(),
    stats,
    by_auto_category: sortedAutoCategories,
    by_wiki_category: sortedWikiCategories,
    all_pages: pagesArray.sort((a, b) => a.title.localeCompare(b.title)),
  };

  // Write files
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(simpleOutput, null, 2), "utf-8");
  fs.writeFileSync(OUTPUT_CATEGORIZED, JSON.stringify(categorizedOutput, null, 2), "utf-8");

  // Print summary
  console.log("=====================================");
  console.log("✅ Harvest complete!\n");
  console.log(`📄 Total pages: ${stats.total_pages}`);
  console.log(`🏷️  Pages with wiki categories: ${stats.pages_with_wiki_categories}`);
  console.log("\n📊 Auto-detected categories:");
  for (const [cat, count] of Object.entries(stats.auto_category_counts)) {
    console.log(`   ${cat}: ${count} pages`);
  }
  console.log("\n🏷️  Top Wiki categories:");
  for (const [cat, count] of Object.entries(stats.top_wiki_categories).slice(0, 15)) {
    console.log(`   ${cat}: ${count} pages`);
  }
  console.log(`\n💾 Saved to:`);
  console.log(`   ${OUTPUT_FILE}`);
  console.log(`   ${OUTPUT_CATEGORIZED}`);
}

// Run
harvestPages().catch((error) => {
  console.error("\n❌ Fatal error:", error.message);
  process.exit(1);
});
