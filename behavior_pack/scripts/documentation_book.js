/**
 * VillageCraft Documentation Book Generator
 * Automatically generates a written book with addon documentation
 * on player first join or respawn
 */

import { world, system, ItemStack } from "@minecraft/server";

const CONFIG = {
  BOOK_TITLE: "VillageCraft Guide",
  BOOK_AUTHOR: "VillageCraft",
  GIVE_ON_SPAWN: true,
  GIVE_ON_FIRST_JOIN: true,
  MAX_CHAR_PER_PAGE: 258,  // Minecraft book page limit
  PLAYERS_WITH_BOOK: new Set()
};

// Condensed ASCII documentation content
const DOCUMENTATION = `
VillageCraft - Village Expansion Add-on

=== ARCHER GOLEM ===
Custom guardian entity with ranged combat and configurable behavior modes.

INTERACTIONS:
- Shift+Click: Toggle Follow/Idle modes (retains attack)
- Click: Toggle Passive/Follow modes
- Click+Redstone: Heal 10 HP (costs 1 redstone)

TAMING: Right-click with emerald

MODES:
> FOLLOW: Follows owner, attacks enemies
> IDLE: Stays in place, attacks enemies nearby
> PASSIVE: Stands still, no attacks

HEALTH: 40 HP
HEALING: Use redstone while clicking

=== CLIPPERS TOOL ===
Renewable harvesting tool for apples and crops.

USES:
- Harvest apples from leaves non-destructively
- Harvest mature crops (resets to stage 0)
- Yield: 1-3 apples, 1 crop per harvest

DURABILITY: 128 uses
REPAIR: Combine with iron ingots

CROPS SUPPORTED:
> Wheat (stage 7)
> Carrots (stage 7)
> Potatoes (stage 7)
> Beetroots (stage 3)

=== APPLE GROWTH ===
Apples grow naturally on oak, birch, dark oak leaves.

PLACEMENT: Apples attach to all 6 leaf faces
SPREADING: Apples spread every ~5 minutes (25% chance)
HARVESTING:
- Break leaf: 1-4 apples (with Fortune)
- Use clippers: 1-3 apples (non-destructive)

FORTUNE MULTIPLIERS:
> Fortune I: 2x yield
> Fortune II: 3x yield
> Fortune III: 4x yield

=== IRRIGATION ===
Portable water-equivalent irrigation system.

SETUP:
1. Place cauldron with water
2. Place closed iron trapdoor on top
3. Place mud blocks on all 4 sides

EFFECT: Hydrates farmland in 4-block radius
CONSUMPTION: ~1 water layer every 2 days

WORKS IN: All dimensions (Overworld, Nether, End)

=== DISPENSER AUTOMATION ===
Dispensers with clippers harvest crops automatically.

SETUP:
1. Load dispenser with clippers
2. Point at farmland with crops
3. Power with redstone signal

EFFECT: Harvests mature crops renewably
YIELD: 1 crop per activation
ITEMS: Drop at dispenser position

COMPATIBLE WITH: Hoppers for item routing

=== WAYPOINTS ===
Fast travel system between linked waypoints.

SETUP:
1. Place village waypoint blocks
2. Link them together (bidirectional)
3. Right-click to see destinations
4. Teleport to linked waypoint

SPECIAL: If in boat, boat + nearby entities teleport too!
RANGE: Entities within 4 blocks auto-teleport
SUPPORTS: All boat types with passengers

USES:
- Connect villages
- Transport groups
- Move mobs/cargo with boat
- Quick travel network

=== FISH BREEDING ===
Breed fish with kelp to create baby fish.

SUPPORTED FISH:
> Cod
> Salmon
> Tropical Fish
> Pufferfish
> Octopus (Axolotl)
> Glowing Octopus (custom)
> Octopus (Axolotl)

BREEDING:
1. Find adult fish
2. Hold kelp in hand
3. Right-click fish
4. Fish enters love mode (3 seconds)
5. Get 2+ fish in love mode nearby
6. They breed, spawn baby fish
7. Consume 1 kelp per fish

SPECIAL: Octopus can breed with ANY fish type!
Result: Always spawns baby octopus
Glowing variant: Any pairing with glowing octopus produces baby glowing octopus.

EXAMPLE: Octopus + Salmon = Baby Octopus

LOVE MODE: 3 seconds to find mate
SUCCESS: 50% chance per pairing
BABY: Takes time to grow to adult
RANGE: Fish find mates within 8 blocks

=== HANGING LADDER ===

Vertical climbing with chain support system.

CRAFTING:
8x Ladder around 1x Chain = 9x Hanging Ladder

PLACEMENT:
- Place on solid blocks like normal ladder
- Can hang in chains (supported above/below)
- Support: Any ladder or hanging ladder above/below

EXTENDING:
- Right-click top face: Add ladder above
- Right-click bottom face: Add ladder below
- Must hold hanging ladder in hand

SUPPORT RULES:
- Stays if attached to solid block
- Stays if supported by ladder chain
- Falls if unsupported (breaks chain)

USES:
- Vertical shafts
- Hanging structures
- Chain-supported climbing

=== QUICK TIPS ===

FARMING SETUP:
1. Build irrigation (cauldron + trapdoor + mud)
2. Plant crops on hydrated farmland
3. Add dispenser with clippers
4. Connect redstone for automation

APPLE FARMING:
1. Find oak/birch/dark oak trees
2. Place on leaf blocks nearby
3. Wait for natural spreading
4. Harvest with clippers or break leaves

GOLEM ARMY:
1. Tame golems with emeralds
2. Set to Follow mode for combat
3. Use Idle to hold positions
4. Heal with redstone as needed

FISH FARMING:
1. Catch fish in buckets
2. Find/create water area
3. Use kelp to breed them
4. Wait for babies to grow

=== CONFIG & CUSTOMIZATION ===

Crop Types: Modify CROPS config in clippers_harvesting.js
Apple Spread: Adjust SPREAD_INTERVAL in apple_growth.js (6000 ticks)
Irrigation: Change WATER_CONSUMPTION_INTERVAL (2400 ticks)
Dispenser: Add new crops to CONFIG in dispenser_clippers.js
Fish Breeding: Adjust BREED_SUCCESS_CHANCE (0.5 = 50%)
Waypoints: Change ENTITY_TELEPORT_RANGE (4 blocks)

=== KNOWN LIMITATIONS ===

- Dispenser clippers durability not decreasing (API pending)
- Light level detection placeholder (API verification needed)
- Cauldron water level decrease placeholder (API pending)
- Golem ownership verification not implemented (shared taming)
- Fish breeding uses 50% success rate (not guaranteed)

=== FUTURE PLANS ===

- Architect & Builder villagers
- Blueprint block system
- Village waypoint UI forms
- More golem variants
- Crafting recipes

For more info, check script documentation files in behavior pack.

Made with love for Minecraft Bedrock Edition.
`.trim();

/**
 * Split documentation into pages
 */
function createBookPages() {
  const pages = [];
  const lines = DOCUMENTATION.split('\n');
  let currentPage = '';
  
  for (const line of lines) {
    const potentialPage = currentPage + line + '\n';
    
    if (potentialPage.length > CONFIG.MAX_CHAR_PER_PAGE) {
      // Current line doesn't fit, save current page and start new one
      if (currentPage.length > 0) {
        pages.push(currentPage.trim());
        currentPage = line + '\n';
      } else {
        // Line itself is too long, split it
        pages.push(line.substring(0, CONFIG.MAX_CHAR_PER_PAGE).trim());
        currentPage = line.substring(CONFIG.MAX_CHAR_PER_PAGE) + '\n';
      }
    } else {
      currentPage = potentialPage;
    }
  }
  
  // Add final page
  if (currentPage.trim().length > 0) {
    pages.push(currentPage.trim());
  }
  
  return pages;
}

/**
 * Create written book item with documentation
 */
function createDocumentationBook() {
  try {
    const book = new ItemStack("minecraft:written_book", 1);
    
    // Get or create book component
    const bookComponent = book.getComponent("minecraft:book_content");
    if (!bookComponent) {
      console.warn("[Documentation Book] Book component not available");
      return null;
    }
    
    // Set book properties
    bookComponent.title = CONFIG.BOOK_TITLE;
    bookComponent.author = CONFIG.BOOK_AUTHOR;
    
    // Add pages
    const pages = createBookPages();
    for (const page of pages) {
      try {
        bookComponent.addPage({
          text: page
        });
      } catch (e) {
        console.warn(`[Documentation Book] Failed to add page: ${e.message}`);
      }
    }
    
    return book;
  } catch (e) {
    console.error(`[Documentation Book] Failed to create book: ${e.message}`);
    return null;
  }
}

/**
 * Give documentation book to player
 */
function giveDocumentationBook(player) {
  try {
    const book = createDocumentationBook();
    if (!book) {
      console.warn(`[Documentation Book] Could not create book for ${player.name}`);
      return false;
    }
    
    // Try to add to inventory
    const inventory = player.getComponent("minecraft:inventory");
    if (!inventory) {
      console.warn(`[Documentation Book] Player ${player.name} has no inventory`);
      return false;
    }
    
    const container = inventory.container;
    
    // Find empty slot
    for (let i = 0; i < container.size; i++) {
      const item = container.getItem(i);
      if (!item) {
        container.setItem(i, book);
        player.onScreenDisplay.setActionBar("§bReceived VillageCraft Guide book!");
        CONFIG.PLAYERS_WITH_BOOK.add(player.id);
        console.warn(`[Documentation Book] Given book to ${player.name}`);
        return true;
      }
    }
    
    // No empty slot, drop in front of player instead
    const dimension = player.dimension;
    dimension.spawnItem(book, player.location);
    player.onScreenDisplay.setActionBar("§bVillageCraft Guide dropped at your feet!");
    CONFIG.PLAYERS_WITH_BOOK.add(player.id);
    console.warn(`[Documentation Book] Dropped book for ${player.name} (inventory full)`);
    return true;
  } catch (e) {
    console.error(`[Documentation Book] Error giving book to ${player.name}: ${e.message}`);
    return false;
  }
}

/**
 * Handle player spawning
 */
function setupPlayerSpawnHandler() {
  world.afterEvents.playerSpawn.subscribe((event) => {
    const { player } = event;
    
    // Check if player already has book
    if (CONFIG.PLAYERS_WITH_BOOK.has(player.id)) {
      return;
    }
    
    if (CONFIG.GIVE_ON_SPAWN) {
      giveDocumentationBook(player);
    }
  });
}

/**
 * Handle player first join (alternative method)
 */
function setupPlayerJoinHandler() {
  if (!CONFIG.GIVE_ON_FIRST_JOIN) {
    return;
  }
  
  // Check all current players on load
  const allPlayers = world.getAllPlayers();
  for (const player of allPlayers) {
    if (!CONFIG.PLAYERS_WITH_BOOK.has(player.id)) {
      system.run(() => {
        giveDocumentationBook(player);
      });
    }
  }
  
  // Setup ongoing handler for new players
  world.afterEvents.playerSpawn.subscribe((event) => {
    const { player } = event;
    if (!CONFIG.PLAYERS_WITH_BOOK.has(player.id) && CONFIG.GIVE_ON_FIRST_JOIN) {
      giveDocumentationBook(player);
    }
  });
}

/**
 * Command to get book manually
 * Usage: /function give_documentation_book (if registered as function)
 * Or trigger via player event
 */
function setupManualGiveCommand() {
  // Listen for a trigger (could be via command or chat)
  // This is a placeholder for future command integration
  console.warn("[Documentation Book] Manual give system ready");
}

// Initialize systems
setupPlayerSpawnHandler();
setupPlayerJoinHandler();
setupManualGiveCommand();

console.warn("[Documentation Book] System initialized");
console.warn(`[Documentation Book] Book pages: ${createBookPages().length}`);
console.warn(`[Documentation Book] First join: ${CONFIG.GIVE_ON_FIRST_JOIN}, On spawn: ${CONFIG.GIVE_ON_SPAWN}`);
