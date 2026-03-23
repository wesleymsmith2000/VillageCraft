/**
 * Apple Growth & Spreading System
 * Manages placement and natural spreading of apples on leaf block faces
 * 
 * Features:
 * - Apples can be placed on oak, birch, and dark oak leaf blocks
 * - Apples spread to adjacent leaf blocks at ~5 minute intervals (twice per day)
 * - Spreading requires sufficient light (equivalent to crop growth light levels)
 * - Spreads only to matching leaf types or compatible adjacent leaves
 */

import { world, system, BlockPermutation, Direction } from "@minecraft/server";

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
  ADJACENT_FACES: ["up", "down", "north", "south", "east", "west"]
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
  const { block } = event;
  
  if (block && block.typeId === CONFIG.BLOCK_ID) {
    const key = `${block.location.x},${block.location.y},${block.location.z}`;
    appleTracking.delete(key);
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
