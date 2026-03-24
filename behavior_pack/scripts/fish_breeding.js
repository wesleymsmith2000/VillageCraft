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
  BREEDING_ITEMS: ["minecraft:kelp", "minecraft:dried_kelp"],
  OCTOPUS_BREEDING_ITEMS: [
    "minecraft:cod",
    "minecraft:salmon",
    "minecraft:tropical_fish",
    "minecraft:pufferfish",
    "minecraft:cooked_cod",
    "minecraft:cooked_salmon"
  ],
  MUTATION_CHANCE: 0.001,  // 0.1% chance for visual mutation in tropical fish
  TROPICAL_VARIANT_RANGE: 35,  // approximate possible tropical fish variants
  DRIED_KELP_FEED_RADIUS: 8,
  DRIED_KELP_CONSUME_RADIUS: 2,
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

function getTropicalVariant(entity) {
  if (!entity) return null;
  const variantComp = entity.getComponent("minecraft:tropical_fish_variant") || entity.getComponent("minecraft:variant");
  if (!variantComp) return null;
  try {
    if (typeof variantComp.value !== "undefined") {
      return variantComp.value;
    }
    if (typeof variantComp.typeId !== "undefined") {
      return variantComp.typeId;
    }
  } catch (e) {
    return null;
  }
  return null;
}

function setTropicalVariant(entity, variant) {
  if (!entity) return;
  const variantComp = entity.getComponent("minecraft:tropical_fish_variant") || entity.getComponent("minecraft:variant");
  if (!variantComp) return;
  try {
    if (typeof variantComp.value !== "undefined") {
      variantComp.value = variant;
    } else if (typeof variantComp.typeId !== "undefined") {
      variantComp.typeId = variant;
    }
  } catch (e) {
    console.warn(`[Fish Breeding] Failed to set tropical variant: ${e.message}`);
  }
}

function chooseChildTropicalVariant(parentA, parentB) {
  const variantA = getTropicalVariant(parentA);
  const variantB = getTropicalVariant(parentB);
  let childVariant = variantA || variantB;

  // Randomly inherit variant from one of parents (if available)
  if (variantA !== null && variantB !== null) {
    childVariant = Math.random() < 0.5 ? variantA : variantB;
  }

  // Mutation chance: random variant
  if (Math.random() < CONFIG.MUTATION_CHANCE) {
    childVariant = Math.floor(Math.random() * CONFIG.TROPICAL_VARIANT_RANGE);
  }

  return childVariant;
}

function getItemTypeFromEntity(itemEntity) {
  if (!itemEntity) return null;
  if (itemEntity.typeId !== "minecraft:item") return null;
  try {
    const itemComp = itemEntity.getComponent("minecraft:item");
    if (itemComp && itemComp.itemStack && itemComp.itemStack.typeId) {
      return itemComp.itemStack.typeId;
    }
  } catch (e) {
    // component might not exist or value may be unavailable
  }
  return null;
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
      }

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
      
      // Tropical fish inheritance / mutation
      if (babySpecies === "minecraft:tropical_fish") {
        const childVariant = chooseChildTropicalVariant(fish1, fish2);
        if (childVariant !== null) {
          setTropicalVariant(baby, childVariant);
        }
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
  
  // Check if player is holding kelp in selected slot
  const inventory = player.getComponent("minecraft:inventory");
  if (!inventory) {
    return;
  }
  
  const container = inventory.container;
  const selectedSlot = player.selectedSlotIndex;
  const item = container.getItem(selectedSlot);
  if (!item) {
    return;
  }
  
  let hasBreedingItem = false;
  let isOctopusFood = false;
  
  if (CONFIG.OCTOPUS_TYPES.includes(target.typeId) && CONFIG.OCTOPUS_BREEDING_ITEMS.includes(item.typeId)) {
    hasBreedingItem = true;
    isOctopusFood = true;
  } else if (target.typeId !== CONFIG.OCTOPUS_ID && CONFIG.BREEDING_ITEMS.includes(item.typeId)) {
    hasBreedingItem = true;
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
 * Dried kelp floating in water triggers nearby fish into love mode
 */
function processFloatingDriedKelp() {
  try {
    const players = world.getAllPlayers();
    for (const player of players) {
      const dimension = player.dimension;
      const items = dimension.getEntities({
        type: "minecraft:item",
        maxDistance: 64,
        location: player.location
      });

      for (const itemEntity of items) {
        const itemType = getItemTypeFromEntity(itemEntity);
        if (itemType !== "minecraft:dried_kelp") continue;

        // Find nearby fish in water
        const nearbyFish = dimension.getEntities({
          maxDistance: CONFIG.DRIED_KELP_FEED_RADIUS,
          location: itemEntity.location
        }).filter(entity => isFish(entity) && !isInLove(entity) && canBreed(entity));

        if (nearbyFish.length === 0) continue;

        // Attract first eligible fish
        const fish = nearbyFish[0];
        putFishInLove(fish);
        fish.dimension.spawnParticle(CONFIG.PARTICLES, fish.location, { x: 0.3, y: 0.3, z: 0.3 });

        // Try to consume dried kelp item entity; if item stack type accessible
        try {
          const itemComp = itemEntity.getComponent("minecraft:item");
          if (itemComp && itemComp.itemStack) {
            // Decrease just one units and remove entity if now empty
            if (itemComp.itemStack.amount > 1) {
              itemComp.itemStack.amount -= 1;
            } else {
              itemEntity.kill();
            }
          }
        } catch (e) {
          // If consumption fails, leave item in world
        }
      }
    }
  } catch (e) {
    console.warn(`[Fish Breeding] Floating dried kelp handler error: ${e.message}`);
  }
}

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
    // Check floating dried kelp feeding behavior
    processFloatingDriedKelp();
  } catch (e) {
    console.warn(`[Fish Breeding] Tick handler error: ${e.message}`);
  }
}, 40); // Run every 2 seconds

console.warn("[Fish Breeding] System initialized");
console.warn("[Fish Breeding] Supported fish: " + CONFIG.FISH_TYPES.join(", "));
console.warn("[Fish Breeding] Breeding items: " + CONFIG.BREEDING_ITEMS.join(", "));
console.warn("[Fish Breeding] Love duration: " + (CONFIG.LOVE_MODE_DURATION / 1000) + " seconds");
console.warn("[Fish Breeding] Octopus (axolotl) can breed with any fish type");
console.warn("[Fish Breeding] DEBUG: Mutation chance = " + (CONFIG.MUTATION_CHANCE * 100) + "%");
console.warn("[Fish Breeding] DEBUG: Dried kelp feed radius = " + CONFIG.DRIED_KELP_FEED_RADIUS + " blocks");
