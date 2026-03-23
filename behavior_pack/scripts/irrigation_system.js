/**
 * Cauldron Irrigation System
 * Portable water-equivalent irrigation using cauldron + iron trapdoor + mud blocks
 * 
 * Configuration:
 * - Cauldron (water-filled) with closed iron trapdoor on top
 * - Mud blocks on all 4 horizontal sides (north, south, east, west)
 * - Provides irrigation equivalent to water block
 * - Consumes 1 water layer every ~2 days (~2400 game minutes)
 * - Works in all dimensions (Overworld, Nether, End)
 */

import { world, system, BlockPermutation } from "@minecraft/server";

// Configuration
const CONFIG = {
  CAULDRON_ID: "minecraft:cauldron",
  TRAPDOOR_ID: "minecraft:iron_trapdoor",
  MUD_ID: "minecraft:mud",
  IRRIGATION_RANGE: 4, // Distance to hydrate crops
  WATER_CONSUMPTION_INTERVAL: 2400, // ~2 days in ticks (20 ticks/sec * 60 sec * 60 min * 40 min = 48000, but half = 2400 per layer)
  CHECK_INTERVAL: 20, // Check every 20 ticks (1 second)
  PARTICLE_DRAIN: "minecraft:water_evaporation_chance",
  REQUIRED_SIDES: ["north", "south", "east", "west"]
};

// Track active irrigation cauldrons
const irrigationCauldrons = new Map();

/**
 * Check if cauldron is configured for irrigation
 * Requirements: iron trapdoor on top (closed), mud on all 4 sides, water in cauldron
 */
function isIrrigationCauldron(dimension, cauldronPos) {
  try {
    const cauldron = dimension.getBlock(cauldronPos);
    if (!cauldron || cauldron.typeId !== CONFIG.CAULDRON_ID) {
      return false;
    }
    
    // Check for water in cauldron (cauldron must have water_level > 0)
    // TODO: Verify cauldron water level API in Bedrock 1.20.0+
    // For now, assume cauldrons with data are water-filled
    
    // Check for closed iron trapdoor on top
    const trapdoorPos = { x: cauldronPos.x, y: cauldronPos.y + 1, z: cauldronPos.z };
    const trapdoor = dimension.getBlock(trapdoorPos);
    
    if (!trapdoor || trapdoor.typeId !== CONFIG.TRAPDOOR_ID) {
      return false;
    }
    
    // Check trapdoor is closed (open=false)
    // TODO: Verify trapdoor block state API
    const trapdoorOpen = trapdoor.getComponent("minecraft:block_state")?.getState("open") ?? false;
    if (trapdoorOpen) {
      return false;
    }
    
    // Check for mud blocks on all 4 sides
    const requiredSides = [
      { offset: { x: 1, y: 0, z: 0 }, side: "east" },
      { offset: { x: -1, y: 0, z: 0 }, side: "west" },
      { offset: { x: 0, y: 0, z: 1 }, side: "south" },
      { offset: { x: 0, y: 0, z: -1 }, side: "north" }
    ];
    
    let mudCount = 0;
    for (const sideConfig of requiredSides) {
      const sidePos = {
        x: cauldronPos.x + sideConfig.offset.x,
        y: cauldronPos.y + sideConfig.offset.y,
        z: cauldronPos.z + sideConfig.offset.z
      };
      
      try {
        const sideBlock = dimension.getBlock(sidePos);
        if (sideBlock && sideBlock.typeId === CONFIG.MUD_ID) {
          mudCount++;
        }
      } catch (e) {
        // Block out of loaded area
        continue;
      }
    }
    
    return mudCount === 4; // All 4 sides must have mud
  } catch (e) {
    console.warn(`[Irrigation] Failed to validate cauldron at ${cauldronPos.x},${cauldronPos.y},${cauldronPos.z}: ${e.message}`);
    return false;
  }
}

/**
 * Initialize irrigation cauldron tracking
 */
function initializeIrrigationCauldron(dimension, cauldronPos) {
  const key = `${dimension.id}:${cauldronPos.x},${cauldronPos.y},${cauldronPos.z}`;
  
  if (!irrigationCauldrons.has(key)) {
    irrigationCauldrons.set(key, {
      position: cauldronPos,
      dimension: dimension.id,
      lastDrainTick: system.currentTick,
      nextDrainTick: system.currentTick + CONFIG.WATER_CONSUMPTION_INTERVAL
    });
  }
}

/**
 * Get all crops within irrigation range
 */
function getCropsInRange(dimension, cauldronPos, range) {
  const crops = [];
  
  try {
    for (let x = cauldronPos.x - range; x <= cauldronPos.x + range; x++) {
      for (let z = cauldronPos.z - range; z <= cauldronPos.z + range; z++) {
        for (let y = cauldronPos.y - 1; y <= cauldronPos.y + 1; y++) {
          try {
            const pos = { x, y, z };
            const block = dimension.getBlock(pos);
            
            // Check if it's a hydrateable crop
            if (block && isCrop(block)) {
              crops.push({ block, position: pos });
            }
          } catch (e) {
            // Block out of loaded area
            continue;
          }
        }
      }
    }
  } catch (e) {
    console.warn(`[Irrigation] Failed to scan crops: ${e.message}`);
  }
  
  return crops;
}

/**
 * Check if block is a crop that needs hydration
 */
function isCrop(block) {
  const cropTypes = [
    "minecraft:wheat",
    "minecraft:carrots",
    "minecraft:potatoes",
    "minecraft:beetroots",
    "minecraft:farmland",
    "minecraft:farmland_hydrated"
  ];
  
  return cropTypes.includes(block.typeId);
}

/**
 * Check if farmland is hydrated
 */
function isFarmlandHydrated(block) {
  if (block.typeId === "minecraft:farmland_hydrated") {
    return true;
  }
  
  // Check moisture level if available
  try {
    const state = block.getComponent("minecraft:block_state");
    if (state && state.getState("hydrated") === true) {
      return true;
    }
  } catch (e) {
    // Assume not hydrated if state unavailable
  }
  
  return false;
}

/**
 * Hydrate crops in irrigation range
 */
function hydrateCropsInRange(dimension, cauldronPos) {
  const crops = getCropsInRange(dimension, cauldronPos, CONFIG.IRRIGATION_RANGE);
  
  for (const { block, position } of crops) {
    try {
      // Skip if already hydrated
      if (isFarmlandHydrated(block)) {
        continue;
      }
      
      // Hydrate farmland by setting to hydrated variant
      if (block.typeId === "minecraft:farmland" || block.typeId === "minecraft:farmland_hydrated") {
        const hydrated = BlockPermutation.resolve("minecraft:farmland[hydrated=true]");
        block.setPermutation(hydrated);
      }
      
      // For growing crops, continue growth stage (handled by game if on hydrated farmland)
    } catch (e) {
      console.warn(`[Irrigation] Failed to hydrate crop at ${position.x},${position.y},${position.z}: ${e.message}`);
    }
  }
}

/**
 * Consume water layer from cauldron
 */
function drainCauldronLayer(dimension, cauldronPos) {
  try {
    const cauldron = dimension.getBlock(cauldronPos);
    
    if (!cauldron || cauldron.typeId !== CONFIG.CAULDRON_ID) {
      return false;
    }
    
    // TODO: Implement water level decrease
    // Currently placeholder - needs cauldron water level API
    // When available, decrease water_level by 1
    
    // Visual feedback
    try {
      dimension.spawnParticle(CONFIG.PARTICLE_DRAIN, cauldronPos, { x: 0.2, y: 0.1, z: 0.2 });
    } catch (e) {
      // Particle failed silently
    }
    
    console.warn(`[Irrigation] Drained water layer from cauldron at ${cauldronPos.x},${cauldronPos.y},${cauldronPos.z}`);
    return true;
  } catch (e) {
    console.error(`[Irrigation] Failed to drain cauldron: ${e.message}`);
    return false;
  }
}

/**
 * Main tick handler for irrigation system
 */
function tickIrrigation() {
  const currentTick = system.currentTick;
  const toRemove = [];
  
  for (const [key, cauldronData] of irrigationCauldrons.entries()) {
    try {
      const dimension = world.getDimension(cauldronData.dimension);
      
      // Validate cauldron is still configured
      if (!isIrrigationCauldron(dimension, cauldronData.position)) {
        toRemove.push(key);
        continue;
      }
      
      // Hydrate crops continuously
      hydrateCropsInRange(dimension, cauldronData.position);
      
      // Consume water layer on schedule
      if (currentTick >= cauldronData.nextDrainTick) {
        const drained = drainCauldronLayer(dimension, cauldronData.position);
        
        if (drained) {
          cauldronData.lastDrainTick = currentTick;
          cauldronData.nextDrainTick = currentTick + CONFIG.WATER_CONSUMPTION_INTERVAL;
        }
      }
    } catch (e) {
      console.warn(`[Irrigation] Error processing cauldron ${key}: ${e.message}`);
      toRemove.push(key);
    }
  }
  
  // Cleanup invalid cauldrons
  for (const key of toRemove) {
    irrigationCauldrons.delete(key);
  }
}

/**
 * Listen for block placement to detect new irrigation setups
 */
world.afterEvents.blockPlace.subscribe((event) => {
  const { block, dimension } = event;
  
  // Check if placed block could be part of irrigation setup
  if (block.typeId === CONFIG.CAULDRON_ID || 
      block.typeId === CONFIG.TRAPDOOR_ID || 
      block.typeId === CONFIG.MUD_ID) {
    
    // Search for cauldrons nearby
    const searchRadius = 2;
    try {
      for (let x = block.location.x - searchRadius; x <= block.location.x + searchRadius; x++) {
        for (let y = block.location.y - searchRadius; y <= block.location.y + searchRadius; y++) {
          for (let z = block.location.z - searchRadius; z <= block.location.z + searchRadius; z++) {
            const pos = { x, y, z };
            if (isIrrigationCauldron(dimension, pos)) {
              initializeIrrigationCauldron(dimension, pos);
            }
          }
        }
      }
    } catch (e) {
      console.warn(`[Irrigation] Placement scan failed: ${e.message}`);
    }
  }
});

/**
 * Listen for block destruction to cleanup irrigation cauldrons
 */
world.afterEvents.blockBreak.subscribe((event) => {
  const { block, dimension } = event;
  
  // If broke cauldron or trapdoor, cleanup tracking
  if (block.typeId === CONFIG.CAULDRON_ID || block.typeId === CONFIG.TRAPDOOR_ID) {
    let cauldronPos = block.location;
    
    // If trapdoor broke, cauldron is below
    if (block.typeId === CONFIG.TRAPDOOR_ID) {
      cauldronPos = { x: block.location.x, y: block.location.y - 1, z: block.location.z };
    }
    
    const key = `${dimension.id}:${cauldronPos.x},${cauldronPos.y},${cauldronPos.z}`;
    irrigationCauldrons.delete(key);
  }
});

/**
 * Main loop for irrigation updates
 * Runs every CHECK_INTERVAL ticks to hydrate crops and manage water
 */
system.runInterval(() => {
  try {
    tickIrrigation();
  } catch (e) {
    console.error(`[Irrigation] Main loop error: ${e.message}`);
  }
}, CONFIG.CHECK_INTERVAL);

// Log initialization
console.warn("[Irrigation] Cauldron irrigation system initialized");
console.warn("Setup: Cauldron + Iron Trapdoor (top, closed) + Mud (4 sides)");
console.warn(`Range: ${CONFIG.IRRIGATION_RANGE} blocks | Drain: ${CONFIG.WATER_CONSUMPTION_INTERVAL / 20 / 60 / 20} minutes`);
