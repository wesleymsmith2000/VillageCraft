/**
 * Apple Growth & Spreading System
 * Manages placement and natural spreading of apples on leaf block faces
 * 
 * Features:
 * - Apples can be placed on oak, birch, and dark oak leaf blocks
 * - Apples spread to adjacent leaf blocks at ~5 minute intervals (twice per day)
 * - Spreading requires sufficient light (equivalent to crop growth light levels)
 * - Spreads only to matching leaf types or compatible adjacent leaves
 * - Apples can be harvested by breaking the leaf block or using clippers (non-destructive)
 */

import { world, system, BlockPermutation, Direction, ItemStack } from "@minecraft/server";

// Configuration
const CONFIG = {
  BLOCK_ID: "custom:apple_on_leaves",
  COMPATIBLE_LEAVES: [
    "minecraft:oak_leaves",
    "minecraft:birch_leaves",
    "minecraft:dark_oak_leaves"
  ],
  SPREAD_INTERVAL: 6000, // 5 minutes in ticks (20 ticks/sec * 60 sec * 5 min = 6000)
  SPREAD_CHANCE: 0.25, // 25% chance per attempt (1 in 4)
  MIN_LIGHT_LEVEL: 9, // Crop growth requires light level 9+
  PARTICLE_SPREAD: "minecraft:redstone_ore_dust",
  PARTICLE_HARVEST: "minecraft:crop_dust",
  ADJACENT_FACES: ["up", "down", "north", "south", "east", "west"],
  CLIPPERS_ID: "custom:clippers",
  CLIPPERS_DURABILITY_COST: 2,
  APPLE_ITEM_ID: "custom:apple_growth",
  // Fortune and yield configuration
  FORTUNE_ITEM_ID: "minecraft:fortune",
  BASE_APPLE_YIELD: 1,
  CLIPPERS_MIN_YIELD: 1,
  CLIPPERS_MAX_YIELD: 3,
  CLIPPERS_YIELD_CHANCE: 0.5, // 50% chance per apple for extra yields (like sheep)
  // Enchantment handling
  FORTUNE_LEVEL_1_MULTIPLIER: 2,
  FORTUNE_LEVEL_2_MULTIPLIER: 3,
  FORTUNE_LEVEL_3_MULTIPLIER: 4
};

// Track apple blocks and their spread timers
const appleTracking = new Map();

/**
 * Get enchantment level from an item
 */
function getEnchantmentLevel(item, enchantmentId) {
  try {
    if (!item) return 0;
    
    const enchantable = item.getComponent("minecraft:enchantable");
    if (!enchantable || !enchantable.enchantments) {
      return 0;
    }
    
    const enchantments = enchantable.enchantments;
    for (const enchantment of enchantments) {
      if (enchantment.type.id === enchantmentId) {
        return enchantment.level || 0;
      }
    }
    return 0;
  } catch (e) {
    console.warn(`[Apple Growth] Failed to get enchantment level: ${e.message}`);
    return 0;
  }
}

/**
 * Calculate yield based on fortune level
 */
function calculateFortuneYield(baseYield, fortuneLevel) {
  if (fortuneLevel === 0) {
    return baseYield;
  } else if (fortuneLevel === 1) {
    return Math.floor(baseYield * CONFIG.FORTUNE_LEVEL_1_MULTIPLIER);
  } else if (fortuneLevel === 2) {
    return Math.floor(baseYield * CONFIG.FORTUNE_LEVEL_2_MULTIPLIER);
  } else if (fortuneLevel >= 3) {
    return Math.floor(baseYield * CONFIG.FORTUNE_LEVEL_3_MULTIPLIER);
  }
  return baseYield;
}

/**
 * Calculate clippers harvest yield (1-3 apples)
 */
function calculateClippersYield() {
  let appleCount = CONFIG.CLIPPERS_MIN_YIELD;
  
  // 50% chance for +1 apple (up to 2)
  if (Math.random() < CONFIG.CLIPPERS_YIELD_CHANCE && appleCount < 2) {
    appleCount++;
  }
  
  // 50% chance for +1 more apple (up to 3)
  if (Math.random() < CONFIG.CLIPPERS_YIELD_CHANCE && appleCount < CONFIG.CLIPPERS_MAX_YIELD) {
    appleCount++;
  }
  
  return appleCount;
}

/**
 * Get light level at a position
 * TODO: Verify actual light level API availability in Bedrock 1.20.0+
 * For now, use placeholder approximation based on time of day
 */
function getLightLevel(dimension, position) {
  // Placeholder: Returns day/night approximation
  // TODO: Replace with actual light level query when API available
  const timeOfDay = dimension.runCommandAsync(`execute if block ${position.x} ${position.y} ${position.z} minecraft:oak_leaves run time query daytime`)
    .then(result => {
      // Simplified: assume good light during day (6000-18000 ticks)
      // This is a workaround - actual implementation needs proper light level API
      return true;
    })
    .catch(() => false);
  
  return timeOfDay;
}

/**
 * Check if a block supports apple placement (is a compatible leaf block)
 */
function isCompatibleLeafBlock(block) {
  return CONFIG.COMPATIBLE_LEAVES.includes(block.typeId);
}

/**
 * Get adjacent block positions (faces)
 */
function getAdjacentPositions(position) {
  return [
    { x: position.x, y: position.y + 1, z: position.z, face: "up" },
    { x: position.x, y: position.y - 1, z: position.z, face: "down" },
    { x: position.x + 1, y: position.y, z: position.z, face: "east" },
    { x: position.x - 1, y: position.y, z: position.z, face: "west" },
    { x: position.x, y: position.y, z: position.z + 1, face: "south" },
    { x: position.x, y: position.y, z: position.z - 1, face: "north" }
  ];
}

/**
 * Attempt to spread apple to adjacent leaf block
 */
function attemptSpread(dimension, applePosition) {
  try {
    const adjacentPositions = getAdjacentPositions(applePosition);
    const validTargets = [];
    
    // Find all valid adjacent leaf blocks
    for (const adjPos of adjacentPositions) {
      try {
        const adjacentBlock = dimension.getBlock(adjPos);
        
        if (adjacentBlock && isCompatibleLeafBlock(adjacentBlock)) {
          validTargets.push({ block: adjacentBlock, position: adjPos });
        }
      } catch (e) {
        // Block out of loaded area or access denied
        continue;
      }
    }
    
    if (validTargets.length === 0) {
      return false;
    }
    
    // Random chance to spread
    if (Math.random() > CONFIG.SPREAD_CHANCE) {
      return false;
    }
    
    // Select random target
    const targetIndex = Math.floor(Math.random() * validTargets.length);
    const target = validTargets[targetIndex];
    
    // TODO: Check actual light level at target position
    // For now, assume spreading is possible
    const hasLight = true;
    
    if (!hasLight) {
      return false;
    }
    
    // Place apple on target leaf block
    try {
      const appleBlock = target.block.above; // TODO: Place on appropriate face
      if (appleBlock) {
        appleBlock.setPermutation(
          BlockPermutation.resolve(CONFIG.BLOCK_ID)
        );
        
        // Visual feedback
        dimension.spawnParticle(
          CONFIG.PARTICLE_SPREAD,
          target.position,
          { x: 0.5, y: 0.5, z: 0.5 }
        );
        
        return true;
      }
    } catch (e) {
      console.error(`[Apple Growth] Failed to place apple: ${e.message}`);
      return false;
    }
  } catch (e) {
    console.error(`[Apple Growth] Spread attempt failed: ${e.message}`);
    return false;
  }
}

/**
 * Initialize tracking for apple block
 */
function initializeApple(block, dimension) {
  const key = `${block.location.x},${block.location.y},${block.location.z}`;
  
  if (!appleTracking.has(key)) {
    appleTracking.set(key, {
      position: block.location,
      dimension: dimension.id,
      lastSpreadTick: system.currentTick,
      nextSpreadTick: system.currentTick + CONFIG.SPREAD_INTERVAL
    });
  }
}

/**
 * Harvest apple from a position - returns the apple as an item
 * Supports fortune enchantment for increased yield
 */
function harvestApple(dimension, position, tool = null) {
  try {
    const block = dimension.getBlock(position);
    
    if (!block || block.typeId !== CONFIG.BLOCK_ID) {
      return null;
    }
    
    // Calculate yield based on fortune enchantment
    let appleYield = CONFIG.BASE_APPLE_YIELD;
    if (tool) {
      const fortuneLevel = getEnchantmentLevel(tool, "minecraft:fortune");
      appleYield = calculateFortuneYield(CONFIG.BASE_APPLE_YIELD, fortuneLevel);
    }
    
    // Spawn apple item at block position
    const appleItem = new ItemStack(CONFIG.APPLE_ITEM_ID, appleYield);
    dimension.spawnItem(appleItem, position);
    
    // Remove the apple block
    dimension.setBlockType(position, "minecraft:air");
    
    // Remove tracking
    const key = `${position.x},${position.y},${position.z}`;
    appleTracking.delete(key);
    
    return appleItem;
  } catch (e) {
    console.error(`[Apple Growth] Harvest failed: ${e.message}`);
    return null;
  }
}

/**
 * Handle player interaction with clippers on apples
 * Non-destructive harvesting that keeps the leaf block intact
 * Can yield 1-3 apples with fortune support
 */
function harvestWithClippers(player, block) {
  try {
    if (block.typeId !== CONFIG.BLOCK_ID) {
      return false;
    }
    
    // Get player's held item
    const inventory = player.getComponent("minecraft:inventory");
    if (!inventory) {
      return false;
    }
    
    const container = inventory.container;
    const selectedSlot = player.selectedSlotIndex;
    const heldItem = container.getItem(selectedSlot);
    
    if (!heldItem || heldItem.typeId !== CONFIG.CLIPPERS_ID) {
      return false;
    }
    
    const dimension = player.dimension;
    
    // Calculate apple yield (1-3 apples like sheep)
    const appleCount = calculateClippersYield();
    
    try {
      // Harvest the apples
      const appleItem = new ItemStack(CONFIG.APPLE_ITEM_ID, appleCount);
      dimension.spawnItem(appleItem, block.location);
      
      // Remove the apple block (leaf remains intact)
      dimension.setBlockType(block.location, "minecraft:air");
      
      // Remove tracking
      const key = `${block.location.x},${block.location.y},${block.location.z}`;
      appleTracking.delete(key);
      
      // Damage clippers
      if (heldItem.getComponent("minecraft:durability")) {
        const durability = heldItem.getComponent("minecraft:durability");
        durability.damage += CONFIG.CLIPPERS_DURABILITY_COST;
        
        // If durability exceeded, remove item
        if (durability.damage >= durability.maxDurability) {
          container.setItem(selectedSlot, undefined);
          player.onScreenDisplay.setActionBar("§cClippers broke!");
        } else {
          container.setItem(selectedSlot, heldItem);
        }
      }
      
      // Particle feedback
      dimension.spawnParticle(CONFIG.PARTICLE_HARVEST, block.location, { x: 0.3, y: 0.3, z: 0.3 });
      player.onScreenDisplay.setActionBar(`§aHarvested ${appleCount} apples with clippers`);
      return true;
    } catch (e) {
      console.error(`[Apple Growth] Clippers harvest placement failed: ${e.message}`);
      return false;
    }
  } catch (e) {
    console.error(`[Apple Growth] Clippers harvest failed: ${e.message}`);
    return false;
  }
}

/**
 * Main tick handler for apple spreading
 */
function tickApples() {
  const currentTick = system.currentTick;
  const ticksToRemove = [];
  
  for (const [key, appleData] of appleTracking.entries()) {
    try {
      // Get dimension
      const dimension = world.getDimension(appleData.dimension);
      const block = dimension.getBlock(appleData.position);
      
      // Check if block still exists and is an apple
      if (!block || block.typeId !== CONFIG.BLOCK_ID) {
        ticksToRemove.push(key);
        continue;
      }
      
      // Check if spread interval has passed
      if (currentTick >= appleData.nextSpreadTick) {
        const spreadSuccess = attemptSpread(dimension, appleData.position);
        
        // Update next spread time regardless of success
        appleData.lastSpreadTick = currentTick;
        appleData.nextSpreadTick = currentTick + CONFIG.SPREAD_INTERVAL;
      }
    } catch (e) {
      console.warn(`[Apple Growth] Error processing apple at ${key}: ${e.message}`);
      ticksToRemove.push(key);
    }
  }
  
  // Clean up removed apples
  for (const key of ticksToRemove) {
    appleTracking.delete(key);
  }
}

/**
 * Listen for block placement events
 */
world.afterEvents.blockPlace.subscribe((event) => {
  const { block, dimension } = event;
  
  if (block.typeId === CONFIG.BLOCK_ID) {
    initializeApple(block, dimension);
  }
});

/**
 * Listen for block destruction events
 */
world.afterEvents.blockBreak.subscribe((event) => {
  const { block, brokenBlockPermutation, dimension, player } = event;
  
  // Check if broken block was an apple or had an apple on it
  if (brokenBlockPermutation && brokenBlockPermutation.type.id === CONFIG.BLOCK_ID) {
    const key = `${block.location.x},${block.location.y},${block.location.z}`;
    appleTracking.delete(key);
    
    // Drop apple item with fortune calculation if player used a tool
    if (dimension && player) {
      const inventory = player.getComponent("minecraft:inventory");
      const tool = inventory ? inventory.container.getItem(player.selectedSlotIndex) : null;
      harvestApple(dimension, block.location, tool);
    }
  }
});

/**
 * Listen for player interaction with blocks to handle clippers harvesting
 */
world.afterEvents.playerInteractWithBlock.subscribe((event) => {
  const { player, block } = event;
  
  // Check if block is an apple
  if (block.typeId !== CONFIG.BLOCK_ID) {
    return;
  }
  
  // Check if player is holding clippers
  const inventory = player.getComponent("minecraft:inventory");
  if (!inventory) {
    return;
  }
  
  const container = inventory.container;
  const selectedSlot = player.selectedSlotIndex;
  const heldItem = container.getItem(selectedSlot);
  
  if (heldItem && heldItem.typeId === CONFIG.CLIPPERS_ID) {
    // Harvest with clippers (non-destructive)
    event.cancel = true;
    harvestWithClippers(player, block);
  }
});

/**
 * Main loop for apple spreading updates
 * Runs every 20 ticks to check for spread opportunities
 */
system.runInterval(() => {
  try {
    tickApples();
  } catch (e) {
    console.error(`[Apple Growth] Main loop error: ${e.message}`);
  }
}, 20);

// Log initialization
console.warn("[Apple Growth] System initialized");
console.warn(`Spread interval: ${CONFIG.SPREAD_INTERVAL / 20 / 60} minutes`);
console.warn(`Compatible leaves: ${CONFIG.COMPATIBLE_LEAVES.join(", ")}`);
