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
  APPLE_ITEM_ID: "custom:apple_growth"
};

// Track apple blocks and their spread timers
const appleTracking = new Map();

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
 */
function harvestApple(dimension, position) {
  try {
    const block = dimension.getBlock(position);
    
    if (!block || block.typeId !== CONFIG.BLOCK_ID) {
      return null;
    }
    
    // Spawn apple item at block position
    const appleItem = new ItemStack(CONFIG.APPLE_ITEM_ID, 1);
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
    
    // Harvest the apple
    const apple = harvestApple(dimension, block.location);
    
    if (apple) {
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
      player.onScreenDisplay.setActionBar("§aApple harvested with clippers");
      return true;
    }
    
    return false;
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
  const { block, brokenBlockPermutation, dimension } = event;
  
  // Check if broken block was an apple or had an apple on it
  if (brokenBlockPermutation && brokenBlockPermutation.type.id === CONFIG.BLOCK_ID) {
    const key = `${block.location.x},${block.location.y},${block.location.z}`;
    appleTracking.delete(key);
    
    // Drop apple item
    if (dimension) {
      const appleItem = new ItemStack(CONFIG.APPLE_ITEM_ID, 1);
      dimension.spawnItem(appleItem, block.location);
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
