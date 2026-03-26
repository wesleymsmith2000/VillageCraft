/**
 * VillageCraft Main Script Index
 * Imports and initializes all custom systems
 */

import { world, system } from "@minecraft/server";
import "./hanging_ladder.js";

system.run(() => {
  world.sendMessage("VillageCraft DEV 1.0.17 ladder bootstrap loaded");
});
