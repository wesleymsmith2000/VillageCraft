/**
 * Hanging Ladder System
 * - Custom hanging ladder block can remain supported when above or below chain exists.
 * - Extend from top/bottom by interacting with placed hanging ladders.
 * - Validate support in periodic tick scan.
 */

import { world, system } from "@minecraft/server";

const CONFIG = {
  BLOCK_ID: "custom:hanging_ladder",
  SUPPORTS: [
    "custom:hanging_ladder",
    "minecraft:ladder"
  ],
  DEBUG: true,
  SUPPORTED_OCTOPUS: false,
  CHECK_INTERVAL: 20,
  MAX_RECURSION: 16,
  CLIMBABLE_ID: "custom:hanging_ladder"
};

const NON_SOLID = new Set([
  "minecraft:air",
  "minecraft:cave_air",
  "minecraft:water",
  "minecraft:lava",
  "minecraft:bubble_column",
  "minecraft:torch",
  "minecraft:oak_sapling",
  "minecraft:spruce_sapling",
  "minecraft:birch_sapling",
  "minecraft:jungle_sapling",
  "minecraft:acacia_sapling",
  "minecraft:dark_oak_sapling",
  "minecraft:grass",
  "minecraft:fern",
  "minecraft:large_fern",
  "minecraft:dead_bush",
  "minecraft:seagrass",
  "minecraft:kelp",
  "minecraft:ladder"
]);

function isSolidBlock(block) {
  if (!block) {
    return false;
  }
  if (NON_SOLID.has(block.typeId)) {
    return false;
  }
  return true;
}

function hasWallSupportAt(dimension, location) {
  const { x, y, z } = location;
  const neighbours = [
    { x: x + 1, y: y, z: z },
    { x: x - 1, y: y, z: z },
    { x: x, y: y, z: z + 1 },
    { x: x, y: y, z: z - 1 }
  ];

  for (const pos of neighbours) {
    const neighbour = dimension.getBlock(pos);
    if (neighbour && isSolidBlock(neighbour)) {
      return true;
    }
  }
  return false;
}

function hasWallSupport(block) {
  return hasWallSupportAt(block.dimension, block.location);
}

function hasTopSupportAt(dimension, location) {
  const above = dimension.getBlock({
    x: location.x,
    y: location.y + 1,
    z: location.z
  });

  return isSolidBlock(above);
}

function hasTopSupport(block) {
  return hasTopSupportAt(block.dimension, block.location);
}

const hangingLadders = new Map(); // key -> dimensionId

function posKey(location) {
  return `${location.x},${location.y},${location.z}`;
}

function isEmptyBlockForPlacement(block) {
  return !!block && ["minecraft:air", "minecraft:cave_air"].includes(block.typeId);
}

function getLocationForFace(location, face) {
  const offsets = {
    down: { x: 0, y: -1, z: 0 },
    up: { x: 0, y: 1, z: 0 },
    north: { x: 0, y: 0, z: -1 },
    south: { x: 0, y: 0, z: 1 },
    west: { x: -1, y: 0, z: 0 },
    east: { x: 1, y: 0, z: 0 },
    0: { x: 0, y: -1, z: 0 },
    1: { x: 0, y: 1, z: 0 },
    2: { x: 0, y: 0, z: -1 },
    3: { x: 0, y: 0, z: 1 },
    4: { x: -1, y: 0, z: 0 },
    5: { x: 1, y: 0, z: 0 }
  };

  const offset = offsets[face];
  if (!offset) {
    return undefined;
  }

  return {
    x: location.x + offset.x,
    y: location.y + offset.y,
    z: location.z + offset.z
  };
}


function isLadderBlock(block) {
  if (!block) return false;
  return CONFIG.SUPPORTS.includes(block.typeId);
}

function isSupportedHangingLadderAt(dimension, location, visited) {
  if (!visited) {
    visited = new Set();
  }
  const key = posKey(location);
  if (visited.has(key)) {
    return false;
  }
  visited.add(key);

  if (hasWallSupportAt(dimension, location)) {
    return true;
  }

  if (hasTopSupportAt(dimension, location)) {
    return true;
  }

  const above = dimension.getBlock({
    x: location.x,
    y: location.y + 1,
    z: location.z
  });
  const below = dimension.getBlock({
    x: location.x,
    y: location.y - 1,
    z: location.z
  });

  if (above && above.typeId === "minecraft:ladder") {
    return true;
  }
  if (below && below.typeId === "minecraft:ladder") {
    return true;
  }

  if (above && above.typeId === CONFIG.BLOCK_ID) {
    if (isSupportedHangingLadderAt(dimension, above.location, visited)) {
      return true;
    }
  }

  if (below && below.typeId === CONFIG.BLOCK_ID) {
    if (isSupportedHangingLadderAt(dimension, below.location, visited)) {
      return true;
    }
  }

  return false;
}

function isSupportedHangingLadder(block, visited) {
  if (!visited) {
    visited = new Set();
  }
  if (!block || block.typeId !== CONFIG.BLOCK_ID) return false;
  return isSupportedHangingLadderAt(block.dimension, block.location, visited);
}

function validateHangingLadder(block) {
  if (!block || block.typeId !== CONFIG.BLOCK_ID) {
    return;
  }
  if (!isSupportedHangingLadder(block)) {
    block.dimension.runCommandAsync(`setblock ${block.location.x} ${block.location.y} ${block.location.z} air`);
    return;
  }
}

function getBlockAbove(block) {
  return block.dimension.getBlock({
    x: block.location.x,
    y: block.location.y + 1,
    z: block.location.z
  });
}

function getBlockBelow(block) {
  return block.dimension.getBlock({
    x: block.location.x,
    y: block.location.y - 1,
    z: block.location.z
  });
}

function playPlacementSound(dimension, location) {
  const { x, y, z } = location;
  dimension.runCommandAsync(
    `playsound use.wood @a[x=${x},y=${y},z=${z},r=12] ${x} ${y} ${z} 0.8 1.0`
  ).catch(() => {});
}

function debugPlayer(player, message) {
  if (!CONFIG.DEBUG || !player) {
    return;
  }

  player.onScreenDisplay.setActionBar(message);
  console.warn(`[Hanging Ladder] ${message}`);
}

function consumeHangingLadderItem(player) {
  const inv = player.getComponent("minecraft:inventory");
  if (!inv) {
    return false;
  }

  const container = inv.container;
  let slotIndex = typeof player.selectedSlotIndex === "number" ? player.selectedSlotIndex : -1;
  const selectedItem = slotIndex >= 0 ? container.getItem(slotIndex) : undefined;

  if (!selectedItem || selectedItem.typeId !== CONFIG.BLOCK_ID) {
    slotIndex = -1;
    for (let i = 0; i < container.size; i++) {
      const item = container.getItem(i);
      if (item && item.typeId === CONFIG.BLOCK_ID) {
        slotIndex = i;
        break;
      }
    }
  }

  if (slotIndex === -1) {
    return false;
  }

  const stack = container.getItem(slotIndex);
  if (!stack) {
    return false;
  }

  stack.amount -= 1;
  if (stack.amount <= 0) {
    container.setItem(slotIndex, undefined);
  } else {
    container.setItem(slotIndex, stack);
  }

  return true;
}

function placeHangingLadder(dimension, location) {
  dimension.runCommandAsync(
    `setblock ${location.x} ${location.y} ${location.z} ${CONFIG.BLOCK_ID}`
  ).then(() => {
    system.run(() => {
      const block = dimension.getBlock(location);
      if (!block || block.typeId !== CONFIG.BLOCK_ID) {
        return;
      }

      hangingLadders.set(posKey(location), dimension.id);
      validateHangingLadder(block);
    });
  }).catch(() => {});
}

function subscribeSignal(signal, name, callback) {
  if (!signal || !signal.subscribe) {
    console.warn(`[Hanging Ladder] ${name} unavailable`);
    return false;
  }

  signal.subscribe(callback);
  return true;
}

function runLater(callback) {
  if (typeof system.run === "function") {
    system.run(callback);
  }
}

function validateTrackedLadders() {
  for (const [key, dimensionId] of hangingLadders) {
    const [x, y, z] = key.split(",").map(Number);
    const dim = world.getDimension(dimensionId);
    if (!dim) {
      continue;
    }

    const block = dim.getBlock({ x, y, z });
    if (!block || block.typeId !== CONFIG.BLOCK_ID) {
      hangingLadders.delete(key);
      continue;
    }

    validateHangingLadder(block);
  }
}

function startValidationLoop() {
  if (typeof system.runInterval === "function") {
    system.runInterval(() => {
      validateTrackedLadders();
    }, CONFIG.CHECK_INTERVAL);
    return;
  }

  let ticksUntilCheck = CONFIG.CHECK_INTERVAL;
  const tick = () => {
    ticksUntilCheck -= 1;
    if (ticksUntilCheck <= 0) {
      validateTrackedLadders();
      ticksUntilCheck = CONFIG.CHECK_INTERVAL;
    }
    runLater(tick);
  };

  runLater(tick);
}

subscribeSignal(world.afterEvents && world.afterEvents.blockPlace, "afterEvents.blockPlace", (event) => {
  const { block } = event;
  if (block.typeId !== CONFIG.BLOCK_ID) {
    return;
  }

  const key = posKey(block.location);
  hangingLadders.set(key, block.dimension.id);
  validateHangingLadder(block);
  playPlacementSound(block.dimension, block.location);
});

subscribeSignal(world.afterEvents && world.afterEvents.blockBreak, "afterEvents.blockBreak", (event) => {
  const { block } = event;
  if (![CONFIG.BLOCK_ID, "minecraft:ladder"].includes(block.typeId)) {
    return;
  }

  if (block.typeId === CONFIG.BLOCK_ID) {
    const key = posKey(block.location);
    hangingLadders.delete(key);
  }

  // Revalidate chain above and below
  const dimension = block.dimension;
  const positions = [
    { x: block.location.x, y: block.location.y + 1, z: block.location.z },
    { x: block.location.x, y: block.location.y - 1, z: block.location.z }
  ];

  for (const pos of positions) {
    const neighbour = dimension.getBlock(pos);
    if (neighbour && neighbour.typeId === CONFIG.BLOCK_ID) {
      validateHangingLadder(neighbour);
    }
  }
});

subscribeSignal(world.afterEvents && world.afterEvents.playerInteractWithBlock, "afterEvents.playerInteractWithBlock", (event) => {
  const { player, block, face } = event;
  if (block.typeId !== CONFIG.BLOCK_ID) {
    return;
  }

  let targetPos;
  if (face === "up" || face === 1) {
    targetPos = { x: block.location.x, y: block.location.y + 1, z: block.location.z };
  } else if (face === "down" || face === 0) {
    targetPos = { x: block.location.x, y: block.location.y - 1, z: block.location.z };
  } else {
    return;
  }

  const dimension = block.dimension;
  const targetBlock = dimension.getBlock(targetPos);
  if (!targetBlock || targetBlock.typeId !== "minecraft:air") {
    return;
  }

  const inv = player.getComponent("minecraft:inventory");
  if (!inv) return;

  const container = inv.container;
  let slotIndex = -1;
  for (let i = 0; i < container.size; i++) {
    const item = container.getItem(i);
    if (item && item.typeId === "custom:hanging_ladder") {
      slotIndex = i;
      break;
    }
  }

  if (slotIndex === -1) {
    return;
  }

  dimension.runCommandAsync(`setblock ${targetPos.x} ${targetPos.y} ${targetPos.z} custom:hanging_ladder`);
  playPlacementSound(dimension, targetPos);
  const stack = container.getItem(slotIndex);
  stack.amount -= 1;
  if (stack.amount <= 0) {
    container.setItem(slotIndex, undefined);
  } else {
    container.setItem(slotIndex, stack);
  }

  player.onScreenDisplay.setActionBar("§aHanging ladder extended");
  event.cancel = true;
});

subscribeSignal(world.beforeEvents && world.beforeEvents.playerInteractWithBlock, "beforeEvents.playerInteractWithBlock", (event) => {
    const { player, itemStack, block, face } = event;
    if (!player || !itemStack || itemStack.typeId !== CONFIG.BLOCK_ID) {
      return;
    }
    if (!block || block.typeId === CONFIG.BLOCK_ID) {
      return;
    }

    const targetPos = getLocationForFace(block.location, face);
    if (!targetPos) {
      debugPlayer(player, "Hanging ladder: unsupported face");
      return;
    }

    const dimension = block.dimension;
    const targetBlock = dimension.getBlock(targetPos);
    if (!isEmptyBlockForPlacement(targetBlock)) {
      const targetBlockTypeId = targetBlock && targetBlock.typeId ? targetBlock.typeId : "unknown";
      debugPlayer(player, `Hanging ladder: blocked by ${targetBlockTypeId}`);
      return;
    }
    if (!isSupportedHangingLadderAt(dimension, targetPos)) {
      debugPlayer(player, "Hanging ladder: no valid support");
      return;
    }

    event.cancel = true;
    system.run(() => {
      if (!consumeHangingLadderItem(player)) {
        debugPlayer(player, "Hanging ladder: could not consume item");
        return;
      }

      placeHangingLadder(dimension, targetPos);
      playPlacementSound(dimension, targetPos);
      debugPlayer(player, "Hanging ladder: placed via script");
    });
});

subscribeSignal(world.afterEvents && world.afterEvents.playerSpawn, "afterEvents.playerSpawn", (event) => {
  if (!CONFIG.DEBUG) {
    return;
  }

  debugPlayer(event.player, "VillageCraft DEV 1.0.15 scripts active");
});

startValidationLoop();

let heartbeatMessagesRemaining = 3;
function heartbeatTick() {
  if (CONFIG.DEBUG && system.currentTick % 200 === 0 && heartbeatMessagesRemaining > 0) {
    world.sendMessage("VillageCraft DEV 1.0.21 hanging ladder heartbeat");
    heartbeatMessagesRemaining -= 1;
  }

  runLater(heartbeatTick);
}

runLater(heartbeatTick);

console.warn("[Hanging Ladder] System loaded");
console.warn("[Hanging Ladder] DEBUG: Support chain validation initialized");
