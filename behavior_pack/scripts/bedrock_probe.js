import { world, system } from "@minecraft/server";

let probeMessagesRemaining = 3;

function probeTick() {
  if (system.currentTick % 200 === 0 && probeMessagesRemaining > 0) {
    world.sendMessage("VillageCraft DEV 1.0.20 bedrock probe heartbeat");
    probeMessagesRemaining -= 1;
  }

  system.run(probeTick);
}

system.run(probeTick);
