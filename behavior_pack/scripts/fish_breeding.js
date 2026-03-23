/**
 * Fish Breeding System
 * Allows fish to breed when given kelp
 * Supports all fish types (cod, salmon, tropical fish, pufferfish)
 */

import { world, system, EntityQueryOptions, ItemStack } from "@minecraft/server";

const CONFIG = {
  FISH_TYPES: [
    "minecraft:cod",
    "minecraft:salmon",
    "minecraft:tropical_fish",
    "minecraft:pufferfish"
  ],
  BREEDING_ITEM: "minecraft:kelp",
  BABY_COOLDOWN: 5 * 60 * 20,  // 5 minutes in ticks (1 tick = 50ms)
  BREED_SUCCESS_CHANCE: 0.5,    // 50% chance to breed
  PARTICLES: "minecraft:happy_villager",
  PARTICLE_COUNT: 10,
  LOVE_MODE_DURATION: 3000      // milliseconds
};

// Track fish in love mode
const fishInLove = new Map(); // key: entityId -> { timestamp, partnerId }

/**
 * Check if entity is a breedable fish
 */
function isFish(entity) {
  return CONFIG.FISH_TYPES.includes(entity.typeId);
}

/**
 * Check if fish can breed (not on cooldown)
 */
function canBreed(fish) {
  try {
    const ageComponent = fish.getComponent("minecraft:age");
    if (!ageComponent) {
      return true; // No age component, assume can breed
    }
    
    // Only adult fish can breed (age === 0 for adults)
    return ageComponent.age === 0;
  } catch (e) {
    console.warn(`[Fish Breeding] Error checking age: ${e.message}`);
    return true;
  }
}

/**
 * Put fish into love mode
 */
function putFishInLove(fish) {
  try {
    // Trigger love event if available
    try {
      fish.triggerEvent("minecraft:on_love");
    } catch (e) {
      // Event may not exist, continue anyway
    }
    
    // Store in love map
    fishInLove.set(fish.id, {
      timestamp: Date.now(),
      partnerId: null
    });
    
    // Spawn particles
    try {
      const dimension = fish.dimension;
      dimension.spawnParticle(CONFIG.PARTICLES, fish.location, { x: 0.5, y: 0.5, z: 0.5 });
    } catch (e) {
      // Particle failed silently
    }
    
    return true;
  } catch (e) {
    console.warn(`[Fish Breeding] Error putting fish in love: ${e.message}`);
    return false;
  }
}

/**
 * Check if fish is in love mode
 */
function isInLove(fish) {
  if (!fishInLove.has(fish.id)) {
    return false;
  }
  
  const loveData = fishInLove.get(fish.id);
  const now = Date.now();
  
  // Check if love duration expired
  if (now - loveData.timestamp > CONFIG.LOVE_MODE_DURATION) {
    fishInLove.delete(fish.id);
    return false;
  }
  
  return true;
}

/**
 * Get nearby fish of same type in love mode
 */
function getNearbyLoveFish(fish, searchRadius = 8) {
  try {
    const dimension = fish.dimension;
    const nearbyEntities = dimension.getEntities({
      location: fish.location,
      maxDistance: searchRadius,
      type: fish.typeId
    });
    
    const loveFish = [];
    for (const entity of nearbyEntities) {
      // Skip self and already processed fish
      if (entity === fish || entity.id === fish.id) {
        continue;
      }
      
      // Check if in love mode
      if (isInLove(entity)) {
        loveFish.push(entity);
      }
    }
    
    return loveFish;
  } catch (e) {
    console.warn(`[Fish Breeding] Error finding nearby fish: ${e.message}`);
    return [];
  }
}

/**
 * Breed two fish together
 */
function breedFish(fish1, fish2) {
  try {
    // Random chance to actually breed
    if (Math.random() > CONFIG.BREED_SUCCESS_CHANCE) {
      return false;
    }
    
    // Spawn baby fish at midpoint
    const midpoint = {
      x: (fish1.location.x + fish2.location.x) / 2,
      y: (fish1.location.y + fish2.location.y) / 2 + 1,
      z: (fish1.location.z + fish2.location.z) / 2
    };
    
    const dimension = fish1.dimension;
    
    // Spawn baby fish (spawn as adult, age component makes it baby)
    try {
      const baby = dimension.spawnEntity(fish1.typeId, midpoint);
      
      // Set baby age
      const ageComponent = baby.getComponent("minecraft:age");
      if (ageComponent) {
        ageComponent.age = -24000;  // Baby age (negative = child)
      }
      
      console.warn(`[Fish Breeding] Spawned baby ${fish1.typeId}`);
    } catch (e) {
      console.warn(`[Fish Breeding] Failed to spawn baby: ${e.message}`);
    }
    
    // Particles for both parents
    try {
      dimension.spawnParticle(CONFIG.PARTICLES, fish1.location, { x: 0.3, y: 0.3, z: 0.3 });
      dimension.spawnParticle(CONFIG.PARTICLES, fish2.location, { x: 0.3, y: 0.3, z: 0.3 });
      dimension.spawnParticle(CONFIG.PARTICLES, midpoint, { x: 0.5, y: 0.5, z: 0.5 });
    } catch (e) {
      // Particle failed silently
    }
    
    // Remove from love mode
    fishInLove.delete(fish1.id);
    fishInLove.delete(fish2.id);
    
    return true;
  } catch (e) {
    console.error(`[Fish Breeding] Breeding failed: ${e.message}`);
    return false;
  }
}

/**
 * Handle player interaction with fish using kelp
 */
world.afterEvents.playerInteractWithEntity.subscribe((event) => {
  const { player, target } = event;
  
  // Only handle fish
  if (!isFish(target)) {
    return;
  }
  
  // Check if player is holding kelp
  const inventory = player.getComponent("minecraft:inventory");
  if (!inventory) {
    return;
  }
  
  const container = inventory.container;
  let hasKelp = false;
  let kelpSlot = -1;
  
  for (let i = 0; i < container.size; i++) {
    const item = container.getItem(i);
    if (item && item.typeId === CONFIG.BREEDING_ITEM) {
      hasKelp = true;
      kelpSlot = i;
      break;
    }
  }
  
  if (!hasKelp) {
    return;
  }
  
  // Check if fish is adult
  if (!canBreed(target)) {
    player.onScreenDisplay.setActionBar("§cFish is still a baby");
    return;
  }
  
  // Already in love mode
  if (isInLove(target)) {
    player.onScreenDisplay.setActionBar("§bFish is already in love mode");
    return;
  }
  
  // Put fish in love mode
  putFishInLove(target);
  
  // Consume kelp
  const kelpItem = container.getItem(kelpSlot);
  kelpItem.amount--;
  if (kelpItem.amount <= 0) {
    container.setItem(kelpSlot, undefined);
  } else {
    container.setItem(kelpSlot, kelpItem);
  }
  
  player.onScreenDisplay.setActionBar(`§b${target.typeId.split(":")[1]} is in love mode!`);
  console.warn(`[Fish Breeding] Put ${target.typeId} in love mode`);
});

/**
 * Tick-based breeding check
 * Finds fish in love and attempts to breed them
 */
system.runInterval(() => {
  try {
    // Iterate through all dimensions
    const allPlayers = world.getAllPlayers();
    
    for (const player of allPlayers) {
      const dimension = player.dimension;
      
      // Get all fish entities
      for (const fishType of CONFIG.FISH_TYPES) {
        try {
          const fish = dimension.getEntities({
            type: fishType,
            maxDistance: 128  // Check fish within 128 blocks of players
          });
          
          for (const f of fish) {
            // Check if this fish is in love mode
            if (isInLove(f)) {
              // Find potential mate
              const matesNearby = getNearbyLoveFish(f);
              
              if (matesNearby.length > 0) {
                // Breed with first available mate
                const mate = matesNearby[0];
                breedFish(f, mate);
              }
            }
          }
        } catch (e) {
          // Continue to next fish type
        }
      }
    }
  } catch (e) {
    console.warn(`[Fish Breeding] Tick handler error: ${e.message}`);
  }
}, 40); // Run every 2 seconds

console.warn("[Fish Breeding] System initialized");
console.warn("[Fish Breeding] Supported fish: " + CONFIG.FISH_TYPES.join(", "));
console.warn("[Fish Breeding] Breeding item: " + CONFIG.BREEDING_ITEM);
console.warn("[Fish Breeding] Love duration: " + (CONFIG.LOVE_MODE_DURATION / 1000) + " seconds");
