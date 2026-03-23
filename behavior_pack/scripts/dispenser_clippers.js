/**
 * Dispenser Clippers Integration
 * Allows dispensers to harvest crops renewably when loaded with clippers
 * 
 * Behavior:
 * - When dispenser with clippers would dispense onto crop block
 * - Instead of ejecting clippers, perform renewable harvest
 * - Drop 1 crop item and reset crop to stage 0
 * - Clippers durability decreases by 1
 * - Clippers remain in dispenser
 */

import { world, system, ItemStack } from "@minecraft/server";

// Configuration
const CONFIG = {
  DISPENSER_ID: "minecraft:dispenser",
  CLIPPERS_ID: "custom:clippers",
  CLIPPERS_DURABILITY_COST: 1,
  PARTICLE_HARVEST: "minecraft:crop_dust",
  CROPS: {
    "minecraft:wheat": {
      minStage: 0,
      maxStage: 7,
      dropItem: "minecraft:wheat",
      dropAmount: 1
    },
    "minecraft:carrots": {
      minStage: 0,
      maxStage: 7,
      dropItem: "minecraft:carrot",
      dropAmount: 1
    },
    "minecraft:potatoes": {
      minStage: 0,
      maxStage: 7,
      dropItem: "minecraft:potato",
      dropAmount: 1
    },
    "minecraft:beetroots": {
      minStage: 0,
      maxStage: 3,
      dropItem: "minecraft:beetroot",
      dropAmount: 1
    }
  },
  DISPENSER_DIRECTIONS: {
    0: { x: 0, y: -1, z: 0 },  // Down
    1: { x: 0, y: 1, z: 0 },   // Up
    2: { x: 0, y: 0, z: 1 },   // North
    3: { x: 0, y: 0, z: -1 },  // South
    4: { x: 1, y: 0, z: 0 },   // East
    5: { x: -1, y: 0, z: 0 }   // West
  }
};

/**
 * Get facing direction from dispenser block state
 */
function getDispenserFacing(block) {
  try {
    const state = block.getComponent("minecraft:block_state");
    if (!state) {
      return 2; // Default to north
    }
    
    const facing = state.getState("facing_direction");
    if (facing !== undefined && facing !== null) {
      return facing;
    }
    
    return 2; // Default
  } catch (e) {
    console.warn(`[Dispenser Clippers] Failed to get facing: ${e.message}`);
    return 2;
  }
}

/**
 * Get target block position based on dispenser facing
 */
function getTargetBlockPosition(dispenserPos, facing) {
  const direction = CONFIG.DISPENSER_DIRECTIONS[facing] || CONFIG.DISPENSER_DIRECTIONS[2];
  return {
    x: dispenserPos.x + direction.x,
    y: dispenserPos.y + direction.y,
    z: dispenserPos.z + direction.z
  };
}

/**
 * Check if dispenser has clippers
 */
function hasClippersInDispenser(dimension, dispenserPos) {
  try {
    const dispenser = dimension.getBlock(dispenserPos);
    if (!dispenser || dispenser.typeId !== CONFIG.DISPENSER_ID) {
      return false;
    }
    
    // TODO: Verify block entity container access in Bedrock 1.20.0+
    // For now, use placeholder
    // When API available: access block entity inventory and search for clippers
    
    return false; // Placeholder until API verified
  } catch (e) {
    console.warn(`[Dispenser Clippers] Failed to check dispenser contents: ${e.message}`);
    return false;
  }
}

/**
 * Get crop growth stage
 */
function getCropStage(block) {
  try {
    const state = block.getComponent("minecraft:block_state");
    if (!state) {
      return null;
    }
    
    const age = state.getState("age");
    if (age !== undefined && age !== null) {
      return age;
    }
    
    return null;
  } catch (e) {
    console.warn(`[Dispenser Clippers] Failed to get crop stage: ${e.message}`);
    return null;
  }
}

/**
 * Harvest crop with dispenser clippers
 */
function harvestCropWithDispenserClippers(dimension, cropBlock, dispenserBlock) {
  try {
    const cropConfig = CONFIG.CROPS[cropBlock.typeId];
    
    if (!cropConfig) {
      return false;
    }
    
    // Check if crop is mature
    const stage = getCropStage(cropBlock);
    if (stage === null || stage < cropConfig.maxStage) {
      return false; // Not mature yet
    }
    
    try {
      // Reset crop to stage 0
      const cropState = cropBlock.getComponent("minecraft:block_state");
      if (cropState) {
        cropState.setState("age", 0);
      }
      
      // Drop crop item at dispenser position (not crop position - items dispense from block)
      const cropItem = new ItemStack(cropConfig.dropItem, cropConfig.dropAmount);
      dimension.spawnItem(cropItem, dimension.getBlock(dispenserBlock.location).location);
      
      // Reduce clippers durability in dispenser
      // TODO: Implement when block entity container API available
      // For now, placeholder
      
      // Particle feedback
      try {
        dimension.spawnParticle(CONFIG.PARTICLE_HARVEST, cropBlock.location, { x: 0.3, y: 0.3, z: 0.3 });
      } catch (e) {
        // Particle failed silently
      }
      
      console.warn(`[Dispenser Clippers] Harvested ${cropConfig.dropItem} at ${cropBlock.location.x},${cropBlock.location.y},${cropBlock.location.z}`);
      return true;
    } catch (e) {
      console.error(`[Dispenser Clippers] Failed to harvest: ${e.message}`);
      return false;
    }
  } catch (e) {
    console.error(`[Dispenser Clippers] Crop harvest failed: ${e.message}`);
    return false;
  }
}

/**
 * Listen for block place events to detect dispenser placement
 * This is a workaround since dispenser activation is difficult to intercept
 */
world.afterEvents.blockPlace.subscribe((event) => {
  const { block, dimension } = event;
  
  // Detect dispenser placement for future reference
  if (block.typeId === CONFIG.DISPENSER_ID) {
    // Could log this for tracking purposes
    console.warn(`[Dispenser Clippers] Dispenser placed at ${block.location.x},${block.location.y},${block.location.z}`);
  }
});

/**
 * Listen for projectile hit events (dispenser firing)
 * TODO: Verify projectile event availability in Bedrock 1.20.0+
 * This is a placeholder for actual dispenser activation interception
 */
function setupDispenserInterception() {
  // TODO: Implement when dispenser fire event or projectile event available
  // Currently no reliable way to intercept dispenser activation
  // Workaround: Manual dispenser check via tick system
  
  system.runInterval(() => {
    // TODO: Scan for dispensers with clippers nearby crops
    // This would require:
    // 1. Track all dispenser positions
    // 2. Check if clippers in dispenser container
    // 3. Get target block in facing direction
    // 4. If target is mature crop, harvest it
  }, 20); // Check every second
}

// Initialize dispenser interception
setupDispenserInterception();

// Log initialization
console.warn("[Dispenser Clippers] Integration system initialized");
console.warn("Dispensers with clippers will renewably harvest mature crops");
console.warn("TODO: Block entity container API needed for full implementation");
