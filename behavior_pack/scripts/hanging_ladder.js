/**
 * Hanging Ladder System
 * - Custom hanging ladder block can remain supported when above or below chain exists.
 * - Extend from top/bottom by interacting with placed hanging ladders.
 * - Validate support in periodic tick scan.
 */

import { world, system, Vector3 } from "@minecraft/server";

const CONFIG = {
  BLOCK_ID: "custom:hanging_ladder",
  SUPPORTS: [
    "custom:hanging_ladder",
    "minecraft:ladder"
  ],
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

function hasWallSupport(block) {
  const dimension = block.dimension;
  const { x, y, z } = block.location;
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

const hangingLadders = new Map(); // key -> dimensionId

function posKey(location) {
  return `${location.x},${location.y},${location.z}`;
}


function isLadderBlock(block) {
  if (!block) return false;
  return CONFIG.SUPPORTS.includes(block.typeId);
}

function isSupportedHangingLadder(block, visited = new Set()) {
  if (!block || block.typeId !== CONFIG.BLOCK_ID) return false;
  const key = `${block.location.x},${block.location.y},${block.location.z}`;
  if (visited.has(key)) {
    return false;
  }
  visited.add(key);

  if (hasWallSupport(block)) {
    return true;
  }

  const dimension = block.dimension;
  const above = dimension.getBlock({
    x: block.location.x,
    y: block.location.y + 1,
    z: block.location.z
  });
  const below = dimension.getBlock({
    x: block.location.x,
    y: block.location.y - 1,
    z: block.location.z
  });

  if (above && above.typeId === "minecraft:ladder") {
    return true;
  }
  if (below && below.typeId === "minecraft:ladder") {
    return true;
  }

  if (above && above.typeId === CONFIG.BLOCK_ID) {
    if (isSupportedHangingLadder(above, visited)) {
      return true;
    }
  }

  if (below && below.typeId === CONFIG.BLOCK_ID) {
    if (isSupportedHangingLadder(below, visited)) {
      return true;
    }
  }

  return false;
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

world.afterEvents.blockPlace.subscribe((event) => {
  const { block } = event;
  if (block.typeId !== CONFIG.BLOCK_ID) {
    return;
  }

  const key = posKey(block.location);
  hangingLadders.set(key, block.dimension.id);
  validateHangingLadder(block);
});

world.afterEvents.blockBreak.subscribe((event) => {
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

world.afterEvents.playerInteractWithBlock.subscribe((event) => {
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

system.runInterval(() => {
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
}, CONFIG.CHECK_INTERVAL);

console.warn("[Hanging Ladder] System loaded");
