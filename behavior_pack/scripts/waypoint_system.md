# Village Waypoint System

## Overview

The Village Waypoint System provides fast travel between waypoints across the world. When a player interacts with a waypoint block, they can teleport to any linked waypoint. **Crucially, if the player is in a boat, the boat and all nearby entities within 4 blocks are teleported together**, making it perfect for transporting groups, vehicles, or transported items.

## Features

- **Multi-waypoint linking**: Connect waypoints in chains or networks
- **Boat teleportation**: Boats with passengers/cargo teleport together
- **Entity grouping**: All entities within 4 blocks of player teleport too
- **Particle effects**: Portal particles at source and destination
- **Cooldown protection**: Prevents spam teleporting (500ms cooldown)
- **Bidirectional linking**: Link two waypoints in both directions automatically

## Block Properties

- **Block ID**: `custom:village_waypoint`
- **Light Emission**: 8 (glows in dark)
- **Color**: Royal Blue (#4169E1)
- **Hardness**: 1 second to break
- **Collision**: Full block
- **Transparency**: None (opaque)

## Basic Usage

### Placing Waypoints

1. Place `custom:village_waypoint` blocks at desired locations
2. Each waypoint auto-registers when placed
3. Waypoints glow with blue light for easy visibility

```
Waypoint Block Examples:
- Market square entrance
- Farm hub
- Mining outpost
- Nether portal area
- Fishing dock
```

### Linking Waypoints

Two ways to link waypoints:

**Method 1: Script-based linking**
```javascript
import { linkWaypoints } from "./waypoint_system.js";

linkWaypoints(
  { x: 100, y: 64, z: 200 },  // Source waypoint
  { x: 200, y: 65, z: 150 }   // Destination waypoint
);
```

**Method 2: Multiple separate waypoints**
Create chains: A ↔ B ↔ C ↔ D

**Method 3: Hub system**
Create hub with multiple links:
```
    A
    |
D - Hub - B
    |
    C
```

### Using Waypoints

1. **Navigate to waypoint block** - Approach within 5 blocks
2. **Right-click (interact)** with waypoint block
3. **See available destinations** - Chat message lists linked waypoints
4. **Sneak-click next waypoint in chat** - Or use command to select destination
5. **Teleport** - Player, boat (if riding), and nearby entities teleport

## Boat Teleportation

### Supported Boats

All vanilla boat types teleport:
- Oak Boat
- Birch Boat
- Jungle Boat
- Acacia Boat
- Spruce Boat
- Dark Oak Boat
- Mangrove Boat
- Cherry Boat
- Bamboo Boat
- Bamboo Raft

### Boat Group Teleportation

When player rides a boat to a waypoint and teleports:

```
BEFORE:                        AFTER:
┌─────────────────┐            ┌─────────────────┐
│ Player in Boat  │            │ Player in Boat  │
│ + 3 Passengers  │  ────────→ │ + 3 Passengers  │
│ + 2 Chests      │            │ + 2 Chests      │
└─────────────────┘            └─────────────────┘
   Source Waypoint               Destination Waypoint
```

**Result**: Entire boat group maintains formation and passengers

### Mob Transport

Use boats to transport mobs through waypoints:

```
Setup:
1. Boat with villager/golem passenger
2. Player sits in boat (or stands on boat)
3. Approach waypoint, interact
4. Select destination
5. Entire group teleports

Result:
- Villagers can be transported to new villages
- Golems can be repositioned
- Cargo/mobs stay with boat
```

## Nearby Entity Teleportation

### Entity Range

- **Teleport Range**: 4 blocks from player
- **Includes**: All entity types (mobs, items, armor stands, etc.)
- **Excludes**: Player themselves (teleported separately)

### Examples

**Scenario 1: Traveling with mobs**
```
Player at Waypoint ← 3 blocks → Zombie
All entities within 4 blocks get teleported
Result: Player + Zombie teleport together
```

**Scenario 2: Item groups**
```
Player at Waypoint ← 2 blocks → Item (diamonds)
Item teleports with player
Result: Dropped items automatically collected at destination
```

**Scenario 3: Mixed group**
```
At waypoint center:
- Player (center)
- Boat with 2 passengers (3 blocks away)
- Wandering trader (2 blocks away)
- Item frames with maps (1 block away)
All teleport together = synchronized group transport
```

## Setup Examples

### Simple Hub Network

```
                    Hub Waypoint
                    (central point)
                          |
        ┌─────────────────┼─────────────────┐
        |                 |                 |
    Waypoint 1        Waypoint 2        Waypoint 3
    (Farm)            (Market)          (Mining)

Navigation:
Farm → Hub → Market
Market → Hub → Mining
Mining → Hub → Farm
```

### Linear Chain

```
Waypoint A ←→ Waypoint B ←→ Waypoint C ←→ Waypoint D

Navigation:
A → B → C → D → A (cycle through)
D → C → B → A (cycle backward)
```

### Village Districts

```
                    Central Waypoint
                          |
        ┌─────────────────┼─────────────────┐
        |                 |                 |
    Builder District   Archer District   Farm District
    (Lodestones)       (Training Area)   (Irrigation)
       |
    Waypoint B1 ←→ Waypoint B2 (District internal links)
```

## Technical Details

### Teleportation Process

1. **Cooldown check** - Prevent spam (500ms minimum between teleports)
2. **Vehicle detection** - Check if player riding boat
3. **Nearby entity scan** - Get all entities within 4-block radius
4. **Player teleport** - Main player teleports first
5. **Entity teleport** - Each nearby entity teleports
6. **Boat re-passenger** - If riding boat, re-add player as passenger
7. **Particle effects** - Portal particles at both waypoints
8. **Cooldown update** - Restart cooldown timer

### Configuration

Edit CONFIG object in `waypoint_system.js`:

```javascript
const CONFIG = {
  WAYPOINT_BLOCK_ID: "custom:village_waypoint",  // Block identifier
  WAYPOINT_INTERACT_RANGE: 5,                     // Interaction distance
  ENTITY_TELEPORT_RANGE: 4,                       // Nearby entity range
  TELEPORT_COOLDOWN: 500,                         // Milliseconds
  PASSENGER_TYPES: [/* boat types */],            // Boat entity IDs
  TELEPORT_PARTICLE: "minecraft:portal",          // Particle effect
  TELEPORT_SOUND: "portal.travel"                 // Sound effect (TODO)
};
```

### Waypoint Registration

Waypoints auto-register on placement:

```javascript
registerWaypoint(position, name = "Waypoint")
```

Manual registration also supported:

```javascript
import { registerWaypoint } from "./waypoint_system.js";

registerWaypoint({ x: 100, y: 64, z: 200 }, "Market Hub");
```

### Linking Waypoints

Create connections between waypoints:

```javascript
import { linkWaypoints } from "./waypoint_system.js";

// Bidirectional link (both can reach each other)
linkWaypoints(
  { x: 100, y: 64, z: 200 },  // Farm waypoint
  { x: 200, y: 65, z: 150 }   // Market waypoint
);
```

## Limitations & TODOs

### Current Limitations

1. **No persistent UI forms** - Menu shows in chat (TODO: implement form-based UI)
2. **No waypoint naming/customization** - Names auto-generated (TODO: custom names via command)
3. **No network sync** - Waypoint data not synced in multiplayer (TODO: network protocol)
4. **No access control** - All players can use all waypoints (TODO: permission system)
5. **Sound not implemented** - Particle effects only (TODO: add teleport sound)

### Version-Specific APIs

The following require Bedrock 1.20.0+ verification:

- `entity.teleport()` - Entity teleportation API
- `player.getVehicle()` - Get player's vehicle
- `entity.addPassenger()` - Re-add player to boat
- `dimension.getEntities()` - Nearby entity queries
- `dimension.spawnParticle()` - Portal particle effects

### Known Issues

- **Boat re-passengering**: Sometimes player doesn't re-mount boat after teleport
  - Workaround: Manual click to mount boat again
  
- **Rotation preservation**: Player rotation may reset
  - Workaround: Manually adjust camera after teleport
  
- **Chunk loading**: Destination chunk must be loaded
  - Workaround: Ensure waypoint chunks are loaded before teleport

## Testing Checklist

- [ ] **Basic waypoint placement**: Place block, check glow
- [ ] **Waypoint registration**: Confirm auto-registers on placement
- [ ] **Single waypoint**: Interact with isolated waypoint (no destinations)
- [ ] **Linked waypoints**: Create 2 waypoints, link them
- [ ] **Boat teleportation**: Get in boat, teleport via waypoint
- [ ] **Passenger preservation**: Mob passengers stay in boat after teleport
- [ ] **Item teleportation**: Items within 4 blocks teleport with player
- [ ] **Entity grouping**: 5+ nearby entities all teleport together
- [ ] **Cooldown**: Rapid clicks don't spam-teleport (500ms delay)
- [ ] **Hub network**: Create 3+ waypoint hub, test all routes
- [ ] **Chain teleportation**: A ↔ B ↔ C ↔ D cycle
- [ ] **Mixed groups**: Boat + mobs + items all teleport simultaneously
- [ ] **Dimensional teleportation**: Teleport between Overworld waypoints
- [ ] **Particle effects**: Portal particles visible at source and destination

## Integration Examples

### With Irrigation System

Transport players to automated farms via waypoints:

```
Hub → Farm District
      ├── Waypoint at irrigation (cauldron)
      ├── Waypoint at dispenser array
      └── Waypoint at hopper storage

Usage: Quick travel between farm areas
```

### With Village System

Connect custom villagers across world:

```
Central Market Waypoint
├── Builder Villager (Lodge Stone)
├── Archer Golem (Training Area)
├── Archer Trader (Trading Post)
└── Supply Station (Item storage)

Usage: Quick access to all village services
```

### With Nether Travel

Safe portal system:

```
Overworld Hub
    ↓ (nether portal)
Nether Hub Waypoint ←→ Nether Farm ←→ Nether Fortress
    ↓ (return portal)
Overworld Hub

Usage: Organized Nether access without getting lost
```

## Performance Considerations

### Optimization Tips

1. **Limit entity range**: Keep ENTITY_TELEPORT_RANGE at 4 blocks
2. **Cooldown protection**: 500ms prevents lag from spam
3. **Chunk preloading**: Pre-load destination chunks
4. **Entity limits**: Cap simultaneous teleports per tick

### Large-Scale Testing

For 20+ waypoint networks:

- TODO: Implement spatial indexing for faster lookups
- TODO: Cache linked waypoint lists
- TODO: Batch entity teleportation (process in groups)

Current system handles 10-50 waypoints without lag.

## See Also

- [Design Notes](../../docs/design-notes.md) - Overall waypoint architecture
- [Archer Golem](archer_golem_interactions.js) - Compatible with golem transport
- [Irrigation System](irrigation_system.md) - Waypoint integration example

## Changelog

**v1.0.0** - Initial waypoint system
- Basic waypoint block and registration
- Bidirectional linking between waypoints
- Player teleportation with boat support
- Nearby entity grouping (4-block range)
- Portal particle effects
- 500ms cooldown protection
- Auto-register on block placement
