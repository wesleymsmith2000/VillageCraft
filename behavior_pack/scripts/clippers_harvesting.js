/**
 * Clippers Crop Harvesting System
 * Allows clippers to harvest crops renewably, leaving lowest growth stage
 * 
 * Features:
 * - Right-click mature crops with clippers to harvest
 * - Leaves crops at growth stage 0 (lowest stage)
 * - Yields 1 crop item per harvest
 * - Costs 1 durability per harvest
 * - Works with wheat, carrots, potatoes, beetroots
 */

import { world, system, ItemStack, BlockPermutation } from "@minecraft/server";

// Configuration
const CONFIG = {
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
  }
};

/**
 * Get growth stage of a crop block
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
    console.warn(`[Clippers] Failed to get crop stage: ${e.message}`);
    return null;
  }
}

/**
 * Check if crop is at mature stage (harvestable)
 */
function isCropMature(block) {
  const stage = getCropStage(block);
  if (stage === null) {
    return false;
  }
  
  const cropConfig = CONFIG.CROPS[block.typeId];
  if (!cropConfig) {
    return false;
  }
  
  // Mature when at max stage
  return stage >= cropConfig.maxStage;
}

/**
 * Harvest crop with clippers - leaves at stage 0
 */
function harvestCropWithClippers(player, block) {
  try {
    const cropConfig = CONFIG.CROPS[block.typeId];
    
    if (!cropConfig) {
      return false;
    }
    
    // Check if crop is mature
    const stage = getCropStage(block);
    if (stage === null || stage < cropConfig.maxStage) {
      player.onScreenDisplay.setActionBar("§cCrop not ready to harvest");
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
    
    try {
      // Reset crop to stage 0
      const cropState = block.getComponent("minecraft:block_state");
      if (cropState) {
        cropState.setState("age", 0);
      }
      
      // Drop crop item
      const cropItem = new ItemStack(cropConfig.dropItem, cropConfig.dropAmount);
      dimension.spawnItem(cropItem, block.location);
      
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
      try {
        dimension.spawnParticle(CONFIG.PARTICLE_HARVEST, block.location, { x: 0.3, y: 0.3, z: 0.3 });
      } catch (e) {
        // Particle failed silently
      }
      
      player.onScreenDisplay.setActionBar(`§aHarvested ${cropConfig.dropItem.split(":")[1]} (renewable)`);
      return true;
    } catch (e) {
      console.error(`[Clippers] Failed to harvest crop: ${e.message}`);
      player.onScreenDisplay.setActionBar("§cFailed to harvest crop");
      return false;
    }
  } catch (e) {
    console.error(`[Clippers] Crop harvest failed: ${e.message}`);
    return false;
  }
}

/**
 * Listen for player interaction with blocks to handle crop harvesting with clippers
 */
world.afterEvents.playerInteractWithBlock.subscribe((event) => {
  const { player, block } = event;
  
  // Check if block is a harvestable crop
  if (!CONFIG.CROPS[block.typeId]) {
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
    // Attempt to harvest with clippers
    event.cancel = true;
    harvestCropWithClippers(player, block);
  }
});

// Log initialization
console.warn("[Clippers] Crop harvesting system initialized");
console.warn("Harvest mature crops with clippers to yield 1 item and reset to stage 0");
console.warn("Supported crops: Wheat, Carrots, Potatoes, Beetroots");
