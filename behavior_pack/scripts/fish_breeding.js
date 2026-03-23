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
  OCTOPUS_ID: "minecraft:axolotl",  // Closest equivalent to octopus
  GLOWING_OCTOPUS_ID: "custom:glowing_octopus",
  OCTOPUS_TYPES: ["minecraft:axolotl", "custom:glowing_octopus"],
  BREEDING_ITEM: "minecraft:kelp",
  OCTOPUS_BREEDING_ITEMS: [
    "minecraft:cod",
    "minecraft:salmon",
    "minecraft:tropical_fish",
    "minecraft:pufferfish",
    "minecraft:cooked_cod",
    "minecraft:cooked_salmon"
  ],
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
  return CONFIG.FISH_TYPES.includes(entity.typeId) || CONFIG.OCTOPUS_TYPES.includes(entity.typeId);
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
    // Get all entities (octopus can breed with any fish type)
    const allNearby = dimension.getEntities({
      location: fish.location,
      maxDistance: searchRadius
    });
    
    const loveFish = [];
    for (const entity of allNearby) {
      // Skip self and already processed fish
      if (entity === fish || entity.id === fish.id) {
        continue;
            // Check if entity is a fish or octopus
            if (!isFish(entity)) {
              continue;
            }
      
            // Allow breeding if:
            // 1. Both are same type (fish with fish), OR
            // 2. One is octopus (octopus with any fish)
            const sameType = entity.typeId === fish.typeId;
            const hasOctopus = entity.typeId === CONFIG.OCTOPUS_ID || fish.typeId === CONFIG.OCTOPUS_ID;
      
            if (!sameType && !hasOctopus) {
              continue;
            }
      
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
        // Determine what species to spawn
        // If octopus is involved, spawn baby octopus
        // Otherwise spawn baby of first parent's type
        let babySpecies = fish1.typeId;
        const isFirstOctopus = CONFIG.OCTOPUS_TYPES.includes(fish1.typeId);
        const isSecondOctopus = CONFIG.OCTOPUS_TYPES.includes(fish2.typeId);

        if (isFirstOctopus || isSecondOctopus) {
          // Prioritize glowing if either parent is glowing
          if (fish1.typeId === CONFIG.GLOWING_OCTOPUS_ID || fish2.typeId === CONFIG.GLOWING_OCTOPUS_ID) {
            babySpecies = CONFIG.GLOWING_OCTOPUS_ID;
          } else {
            babySpecies = CONFIG.OCTOPUS_ID;
          }
        }
    
    
    // Spawn baby fish (spawn as adult, age component makes it baby)
    try {
      const baby = dimension.spawnEntity(babySpecies, midpoint);
      
      // Set baby age
      const ageComponent = baby.getComponent("minecraft:age");
      if (ageComponent) {
        ageComponent.age = -24000;  // Baby age (negative = child)
      }
      
      const fishName = babySpecies.split(":")[1];
      console.warn(`[Fish Breeding] Spawned baby ${fishName}`);
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
  let hasBreedingItem = false;
  let breedingSlot = -1;
  let isOctopusFood = false;
  
  for (let i = 0; i < container.size; i++) {
    const item = container.getItem(i);
    if (!item) continue;

    if (CONFIG.OCTOPUS_TYPES.includes(target.typeId) && CONFIG.OCTOPUS_BREEDING_ITEMS.includes(item.typeId)) {
      hasBreedingItem = true;
      breedingSlot = i;
      isOctopusFood = true;
      break;
    }

    if (target.typeId !== CONFIG.OCTOPUS_ID && item.typeId === CONFIG.BREEDING_ITEM) {
      hasBreedingItem = true;
      breedingSlot = i;
      break;
    }
  }
  
  if (!hasBreedingItem) {
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
  
  // Consume breeding item
  const breedingItem = container.getItem(breedingSlot);
  breedingItem.amount--;
  if (breedingItem.amount <= 0) {
    container.setItem(breedingSlot, undefined);
  } else {
    container.setItem(breedingSlot, breedingItem);
  }
  
  if (CONFIG.OCTOPUS_TYPES.includes(target.typeId) && isOctopusFood) {
    player.onScreenDisplay.setActionBar("§bOctopus is in love mode (fed fish)!");
  } else {
    player.onScreenDisplay.setActionBar(`§b${target.typeId.split(":")[1]} is in love mode!`);
  }
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

      // Also check octopus outside fish-type loop
      try {
        const octopi = dimension.getEntities({
          type: CONFIG.OCTOPUS_ID,
          maxDistance: 128
        });

        for (const octopus of octopi) {
          if (isInLove(octopus)) {
            const matesNearby = getNearbyLoveFish(octopus);

            if (matesNearby.length > 0) {
              const mate = matesNearby[0];
              breedFish(octopus, mate);
            }
          }
        }
      } catch (e) {
        // Octopus check failed
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
console.warn("[Fish Breeding] Octopus (axolotl) can breed with any fish type");
