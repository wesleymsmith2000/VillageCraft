/**
 * Village Waypoint Block System
 * Allows players to teleport between waypoints
 * Teleports player's boat and nearby entities together
 */

import { world, system, BlockPermutation } from "@minecraft/server";

const CONFIG = {
  WAYPOINT_BLOCK_ID: "custom:village_waypoint",
  WAYPOINT_INTERACT_RANGE: 5,
  ENTITY_TELEPORT_RANGE: 4,  // Entities within 4 blocks get teleported with player
  TELEPORT_COOLDOWN: 500,     // milliseconds between teleports
  PASSENGER_TYPES: [
    "minecraft:boat",
    "minecraft:oak_boat",
    "minecraft:birch_boat",
    "minecraft:jungle_boat",
    "minecraft:acacia_boat",
    "minecraft:spruce_boat",
    "minecraft:dark_oak_boat",
    "minecraft:mangrove_boat",
    "minecraft:cherry_boat",
    "minecraft:bamboo_boat",
    "minecraft:bamboo_raft"
  ],
  TELEPORT_PARTICLE: "minecraft:portal",
  TELEPORT_SOUND: "portal.travel"
};

// Track waypoints and teleport cooldowns
const waypointRegistry = new Map();  // key: {x,y,z} -> {name, linkedWaypoints}
const teleportCooldowns = new Map(); // key: playerId -> timestamp

/**
 * Register a waypoint block
 */
function registerWaypoint(position, name = "Waypoint") {
  const key = `${position.x},${position.y},${position.z}`;
  
  if (!waypointRegistry.has(key)) {
    waypointRegistry.set(key, {
      position: position,
      name: name,
      linkedWaypoints: []
    });
    console.warn(`[Waypoint] Registered waypoint "${name}" at ${key}`);
  }
  
  return waypointRegistry.get(key);
}

/**
 * Link two waypoints together
 */
function linkWaypoints(pos1, pos2) {
  const key1 = `${pos1.x},${pos1.y},${pos1.z}`;
  const key2 = `${pos2.x},${pos2.y},${pos2.z}`;
  
  const waypoint1 = waypointRegistry.get(key1);
  const waypoint2 = waypointRegistry.get(key2);
  
  if (waypoint1 && waypoint2) {
    if (!waypoint1.linkedWaypoints.includes(key2)) {
      waypoint1.linkedWaypoints.push(key2);
    }
    if (!waypoint2.linkedWaypoints.includes(key1)) {
      waypoint2.linkedWaypoints.push(key1);
    }
    console.warn(`[Waypoint] Linked "${waypoint1.name}" <-> "${waypoint2.name}"`);
  }
}

/**
 * Get all waypoints for UI display
 */
function getLinkedWaypoints(position) {
  const key = `${position.x},${position.y},${position.z}`;
  const waypoint = waypointRegistry.get(key);
  
  if (!waypoint) {
    return [];
  }
  
  return waypoint.linkedWaypoints.map(wpKey => {
    const wp = waypointRegistry.get(wpKey);
    return {
      key: wpKey,
      name: wp ? wp.name : "Unknown",
      position: wp ? wp.position : null
    };
  });
}

/**
 * Check if entity is a boat
 */
function isBoat(entity) {
  return CONFIG.PASSENGER_TYPES.includes(entity.typeId);
}

/**
 * Get nearby entities within teleport range
 */
function getNearbyEntitiesToTeleport(player, searchRadius = CONFIG.ENTITY_TELEPORT_RANGE) {
  const dimension = player.dimension;
  const nearbyEntities = [];
  
  try {
    // Get all entities near player
    const entities = dimension.getEntities({
      location: player.location,
      maxDistance: searchRadius
    });
    
    for (const entity of entities) {
      // Skip the player themselves
      if (entity === player) {
        continue;
      }
      
      // Include boats and any other entities in range
      nearbyEntities.push(entity);
    }
  } catch (e) {
    console.warn(`[Waypoint] Error getting nearby entities: ${e.message}`);
  }
  
  return nearbyEntities;
}

/**
 * Teleport player and nearby entities
 */
function teleportToWaypoint(player, sourcePosition, destinationPosition) {
  try {
    const playerId = player.id;
    
    // Check cooldown
    const now = Date.now();
    const lastTeleport = teleportCooldowns.get(playerId) || 0;
    
    if (now - lastTeleport < CONFIG.TELEPORT_COOLDOWN) {
      player.onScreenDisplay.setActionBar("§cTeleportation on cooldown");
      return false;
    }
    
    // Store player's vehicle if riding
    let playerBoat = null;
    const passengers = player.getPassengers();
    
    // Check if player is riding something
    if (player.isOnGround === false && player.getVehicle()) {
      playerBoat = player.getVehicle();
    }
    
    // Get nearby entities to teleport with player
    const nearbyEntities = getNearbyEntitiesToTeleport(player);
    
    // Teleport player first
    player.teleport(destinationPosition, {
      dimension: player.dimension,
      yRot: player.getRotation().y,
      xRot: player.getRotation().x,
      checkForBlocks: true
    });
    
    // Teleport nearby entities
    for (const entity of nearbyEntities) {
      try {
        entity.teleport(destinationPosition, {
          dimension: entity.dimension,
          yRot: entity.getRotation().y,
          xRot: entity.getRotation().x,
          checkForBlocks: true
        });
      } catch (e) {
        console.warn(`[Waypoint] Failed to teleport entity: ${e.message}`);
      }
    }
    
    // Teleport boat separately if player was riding it
    if (playerBoat && isBoat(playerBoat)) {
      try {
        playerBoat.teleport(destinationPosition, {
          dimension: playerBoat.dimension,
          yRot: playerBoat.getRotation().y,
          xRot: playerBoat.getRotation().x,
          checkForBlocks: true
        });
        
        // Re-add player as passenger if boat still exists
        if (playerBoat.isValid()) {
          try {
            playerBoat.addPassenger(player);
          } catch (e) {
            console.warn(`[Waypoint] Failed to re-add player to boat: ${e.message}`);
          }
        }
      } catch (e) {
        console.warn(`[Waypoint] Failed to teleport boat: ${e.message}`);
      }
    }
    
    // Particle effects at source
    try {
      const dimension = player.dimension;
      dimension.spawnParticle(CONFIG.TELEPORT_PARTICLE, sourcePosition);
      dimension.spawnParticle(CONFIG.TELEPORT_PARTICLE, destinationPosition);
    } catch (e) {
      // Particle failed silently
    }
    
    // Update cooldown
    teleportCooldowns.set(playerId, now);
    
    player.onScreenDisplay.setActionBar("§bTeleported!");
    console.warn(`[Waypoint] Teleported ${player.name} + ${nearbyEntities.length} entities`);
    
    return true;
  } catch (e) {
    console.error(`[Waypoint] Teleport failed: ${e.message}`);
    player.onScreenDisplay.setActionBar("§cTeleportation failed");
    return false;
  }
}

/**
 * Display waypoint menu to player
 */
function showWaypointMenu(player, waypointPosition) {
  try {
    const linkedWaypoints = getLinkedWaypoints(waypointPosition);
    const sourceWaypoint = waypointRegistry.get(`${waypointPosition.x},${waypointPosition.y},${waypointPosition.z}`);
    
    if (!linkedWaypoints || linkedWaypoints.length === 0) {
      player.onScreenDisplay.setActionBar("§cNo linked waypoints");
      return;
    }
    
    // TODO: Implement UI form system for waypoint selection
    // For now, log information
    console.warn(`[Waypoint] Menu for "${sourceWaypoint?.name}": ${linkedWaypoints.length} destinations`);
    
    // Simple format: player can use actionbar cycling for now
    let waypointList = `§b=== ${sourceWaypoint?.name} ===\n`;
    for (let i = 0; i < linkedWaypoints.length; i++) {
      waypointList += `${i + 1}. ${linkedWaypoints[i].name}\n`;
    }
    
    player.sendMessage(waypointList);
  } catch (e) {
    console.error(`[Waypoint] Menu display failed: ${e.message}`);
  }
}

/**
 * Handle waypoint block interaction
 */
function setupWaypointInteraction() {
  world.afterEvents.playerInteractWithBlock.subscribe((event) => {
    const { player, block } = event;
    
    // Only handle waypoint blocks
    if (block.typeId !== CONFIG.WAYPOINT_BLOCK_ID) {
      return;
    }
    
    const waypointPosition = block.location;
    const sourceWaypoint = waypointRegistry.get(`${waypointPosition.x},${waypointPosition.y},${waypointPosition.z}`);
    
    if (!sourceWaypoint) {
      // Register new waypoint if not already registered
      registerWaypoint(waypointPosition, `Waypoint ${waypointRegistry.size + 1}`);
    }
    
    // Show menu with linked waypoints
    showWaypointMenu(player, waypointPosition);
  });
}

/**
 * Listen for waypoint block placement to auto-register
 */
function setupWaypointRegistration() {
  world.afterEvents.blockPlace.subscribe((event) => {
    const { block } = event;
    
    if (block.typeId === CONFIG.WAYPOINT_BLOCK_ID) {
      registerWaypoint(block.location, `Waypoint ${waypointRegistry.size + 1}`);
    }
  });
}

/**
 * Command handler for teleporting to specific waypoint (via /teleport or similar)
 * This is a placeholder for future command integration
 */
function setupTeleportCommand() {
  // TODO: Implement when command API available
  // Usage example:
  // /teleport <player> @e[x=100,y=64,z=200,c=1,name="waypoint_marker"]
  // Then trigger teleportToWaypoint() logic
  
  console.warn("[Waypoint] Teleport command system ready (TODO: integrate with commands)");
}

/**
 * Cycle to next waypoint (keyboard shortcut version)
 * Stores current waypoint index per player
 */
const playerWaypointIndices = new Map();

function teleportToNextWaypoint(player, currentWaypointPosition) {
  const linkedWaypoints = getLinkedWaypoints(currentWaypointPosition);
  
  if (linkedWaypoints.length === 0) {
    player.onScreenDisplay.setActionBar("§cNo waypoints linked");
    return;
  }
  
  const playerId = player.id;
  let currentIndex = playerWaypointIndices.get(playerId) || 0;
  
  // Move to next waypoint
  currentIndex = (currentIndex + 1) % linkedWaypoints.length;
  playerWaypointIndices.set(playerId, currentIndex);
  
  const targetWaypoint = linkedWaypoints[currentIndex];
  
  if (targetWaypoint.position) {
    player.onScreenDisplay.setActionBar(`§bNavigating to: ${targetWaypoint.name}`);
    teleportToWaypoint(player, currentWaypointPosition, targetWaypoint.position);
  }
}

// Initialize systems
setupWaypointInteraction();
setupWaypointRegistration();
setupTeleportCommand();

console.warn("[Waypoint] System initialized");
console.warn("[Waypoint] Teleport range: " + CONFIG.ENTITY_TELEPORT_RANGE + " blocks");
console.warn("[Waypoint] Boat types supported: " + CONFIG.PASSENGER_TYPES.length);
console.warn("[Waypoint] DEBUG: Set breakpoints for waypoint interactions");

// Export functions for external use
export { registerWaypoint, linkWaypoints, teleportToWaypoint, teleportToNextWaypoint, getLinkedWaypoints };
