/**
 * Archer Golem Interaction Handler
 * Manages player interactions with tamed archer golems
 * 
 * Interactions:
 * - Normal Click: Toggle between follow/passive modes, or heal with redstone
 * - Shift+Click: Toggle between follow and idle (attack) modes
 */

import { world, system, Player, Entity } from "@minecraft/server";

// Track golem states
const golemStates = new Map();

const GOLEM_ID = "custom:archer_golem";
const REDSTONE_ITEM = "minecraft:redstone";

// Define interaction modes
const MODES = {
  FOLLOW: "follow",
  IDLE: "idle",
  PASSIVE: "passive"
};

/**
 * Initialize golem state tracking
 */
function initializeGolemState(entity) {
  const key = entity.id;
  if (!golemStates.has(key)) {
    golemStates.set(key, {
      mode: MODES.FOLLOW,
      health: entity.getComponent("minecraft:health").currentValue
    });
  }
  return golemStates.get(key);
}

/**
 * Get golem state and update health
 */
function getGolemState(entity) {
  const state = initializeGolemState(entity);
  const healthComponent = entity.getComponent("minecraft:health");
  if (healthComponent) {
    state.health = healthComponent.currentValue;
    state.maxHealth = healthComponent.effectiveMax;
  }
  return state;
}

/**
 * Toggle follow/idle mode (Shift + Click)
 * Retains attack behavior, only toggles movement following
 */
function toggleFollowIdleMode(player, entity) {
  const state = getGolemState(entity);
  
  if (state.mode === MODES.FOLLOW) {
    state.mode = MODES.IDLE;
    // Trigger idle mode event: stops following, keeps attacking
    entity.triggerEvent("custom:toggle_idle");
    player.onScreenDisplay.setActionBar("§bArcher Golem§r: Holding position");
  } else if (state.mode === MODES.IDLE) {
    state.mode = MODES.FOLLOW;
    // Trigger follow mode event: resume following and attacking
    entity.triggerEvent("custom:toggle_follow");
    player.onScreenDisplay.setActionBar("§bArcher Golem§r: Following");
  } else if (state.mode === MODES.PASSIVE) {
    state.mode = MODES.FOLLOW;
    entity.triggerEvent("custom:toggle_follow");
    player.onScreenDisplay.setActionBar("§bArcher Golem§r: Following");
  }
}

/**
 * Toggle passive mode (Normal Click)
 * Disables both following and attack behavior
 */
function togglePassiveMode(player, entity) {
  const state = getGolemState(entity);
  
  if (state.mode === MODES.PASSIVE) {
    state.mode = MODES.FOLLOW;
    entity.triggerEvent("custom:toggle_follow");
    player.onScreenDisplay.setActionBar("§bArcher Golem§r: Following");
  } else {
    state.mode = MODES.PASSIVE;
    entity.triggerEvent("custom:toggle_passive");
    player.onScreenDisplay.setActionBar("§bArcher Golem§r: Passive mode (sitting)");
  }
}

/**
 * Heal golem with redstone
 */
function healGolem(player, entity) {
  const state = getGolemState(entity);
  const healthComponent = entity.getComponent("minecraft:health");
  
  if (!healthComponent) {
    player.onScreenDisplay.setActionBar("§cCannot heal golem");
    return;
  }
  
  const currentHealth = healthComponent.currentValue;
  const maxHealth = healthComponent.effectiveMax;
  
  if (currentHealth >= maxHealth) {
    player.onScreenDisplay.setActionBar("§bArcher Golem§r: Already at full health");
    return;
  }
  
  // Check if player is holding redstone
  const inventory = player.getComponent("minecraft:inventory");
  if (!inventory) {
    player.onScreenDisplay.setActionBar("§cNo inventory");
    return;
  }
  
  const container = inventory.container;
  let hasRedstone = false;
  
  for (let i = 0; i < container.size; i++) {
    const item = container.getItem(i);
    if (item && item.typeId === REDSTONE_ITEM) {
      hasRedstone = true;
      // Consume one redstone
      item.amount--;
      container.setItem(i, item.amount > 0 ? item : undefined);
      break;
    }
  }
  
  if (!hasRedstone) {
    player.onScreenDisplay.setActionBar("§cNeed redstone to heal");
    return;
  }
  
  // Heal the golem
  const healAmount = 10;
  const newHealth = Math.min(currentHealth + healAmount, maxHealth);
  healthComponent.resetToMaxHealth();
  healthComponent.currentValue = newHealth;
  
  player.onScreenDisplay.setActionBar(`§bArcher Golem§r: Healed (+${healAmount} HP)`);
}

/**
 * Handle player interaction with archer golems
 */
world.afterEvents.playerInteractWithEntity.subscribe((event) => {
  const { player, target } = event;
  
  // Only handle archer golems
  if (target.typeId !== GOLEM_ID) {
    return;
  }
  
  // Check if player is owner (TODO: Verify ownership check with query API)
  // For now, allow any player to interact
  
  const isShifting = player.isSneaking;
  
  if (isShifting) {
    // Shift + Click: Toggle follow/idle mode (keep attack behavior)
    toggleFollowIdleMode(player, target);
  } else {
    // Normal Click: Toggle passive mode or heal
    // Check if holding redstone
    const inventory = player.getComponent("minecraft:inventory");
    if (inventory) {
      const container = inventory.container;
      let hasRedstone = false;
      
      for (let i = 0; i < container.size; i++) {
        const item = container.getItem(i);
        if (item && item.typeId === REDSTONE_ITEM) {
          hasRedstone = true;
          break;
        }
      }
      
      if (hasRedstone) {
        healGolem(player, target);
      } else {
        togglePassiveMode(player, target);
      }
    } else {
      togglePassiveMode(player, target);
    }
  }
});

/**
 * Cleanup: Remove golem state when entity dies
 */
world.afterEvents.entityDie.subscribe((event) => {
  const { deadEntity } = event;
  if (deadEntity.typeId === GOLEM_ID) {
    golemStates.delete(deadEntity.id);
  }
});

// Log initialization
console.warn("[Archer Golem] Interaction handler loaded");
console.warn("Interactions: Shift+Click = Toggle Follow/Idle | Click = Toggle Passive/Follow | Click+Redstone = Heal");
console.warn("[Archer Golem] DEBUG: Golem states tracking initialized");
