# VillageCraft Design Notes

This document outlines the architectural design and implementation notes for the VillageCraft Bedrock add-on.

## System Overview

VillageCraft introduces specialized villagers, custom golems, village infrastructure, and advanced trading mechanics to expand the vanilla village ecosystem.

---

## 1. Architect Villager (Enchanting Table)

The **Architect Villager** is a specialized villager profession that uses the enchanting table as its workstation. This villager provides unique trades related to enchanted building materials and magical construction items.

### Implementation Notes

- **Workstation Block**: Enchanting Table (`minecraft:enchanting_table`)
- **Trade Focus**: Enchanted tools, rare building materials, structure blueprints
- **NBT-based Trading**: Uses `minecraft:trading` component with custom trade tiers

### TODO Items

- [ ] Implement villager profession registration (varies by Bedrock version)
- [ ] Create custom trade recipes with enchanted diamond tools
- [ ] Verify enchanting table workstation registration in current Bedrock API
- [ ] Define spawn eggs or summon commands for architect variants

### Custom Trades Example

```
Tier 1: Emerald + Blank Blueprint → Enchanted Wooden Frame
Tier 2: 2 Emeralds + Structure Block → Advanced Blueprint
Tier 3: 5 Emeralds + Enchanted Diamond → Master Structure Template
```

---

## 2. Builder Villager (Lodestone)

The **Builder Villager** specializes in construction and uses the lodestone as its workstation. This villager facilitates large-scale building projects and provides materials for construction-focused gameplay.

### Implementation Notes

- **Workstation Block**: Lodestone (`minecraft:lodestone`)
- **Trade Focus**: Bulk building materials, scaffolding, construction blueprints
- **Navigation**: Lodestone provides visual waypoint markers for player navigation

### TODO Items

- [ ] Verify lodestone can be registered as a valid workstation POI (Point of Interest)
- [ ] Implement lodestone-based waypoint system (requires command/script integration)
- [ ] Define inventory system for builder villagers
- [ ] Create construction-focused trade tiers

### Custom Trades Example

```
Tier 1: Emerald → 16 Scaffolding
Tier 2: 2 Emeralds → Construction Wand (custom item)
Tier 3: 3 Emeralds + Blueprint → Bulk Material Bundle
```

---

## 3. Blank Blueprints & Structure Copying

**Blueprints** are custom items that represent building templates. Blank blueprints can be filled with structure data, enabling players to copy, save, and share building designs.

### Implementation Notes

- **Blueprint System**: Custom item component with NBT data storage
- **Structure Copying**: Uses `minecraft:structure` blocks or `/clone` commands
- **Data Persistence**: Blueprint data stored in custom compound tags

### TODO Items

- [ ] Determine whether to use `minecraft:structure` blocks or script-based copying
- [ ] Implement NBT schema for blueprint data (structure dimensions, offset, rotation)
- [ ] Create UI/command interface for capturing structures into blueprints
- [ ] Define serialization format for shareable blueprint files
- [ ] Verify structure block API availability in target Bedrock version

### Blueprint Data Structure Example

```json
{
  "blueprint_id": "custom:stone_tower_v1",
  "author": "player_name",
  "dimensions": { "x": 10, "y": 15, "z": 10 },
  "origin": { "x": 0, "y": 0, "z": 0 },
  "blocks": [],
  "entities": [],
  "timestamp": 0
}
```

---

## 4. Archer Golem (Ammo Switching)

The **Archer Golem** is a custom combat entity that autonomously hunts hostile mobs. It features dynamic ammo switching based on target type and availability.

### Implementation Notes

- **Entity Definition**: Custom entity derived from `minecraft:snow_golem` or custom base
- **Combat AI**: Uses `minecraft:behavior.melee_attack` or `minecraft:behavior.ranged_attack`
- **Ammo System**: Custom item tracking for arrows, spectral arrows, and special projectiles
- **Inventory**: Custom entity inventory component for ammo management

### TODO Items

- [ ] Verify entity behavior tree support for ammo-switching logic
- [ ] Determine if custom projectile detection is available via script API
- [ ] Implement ammo efficiency tracking (damage vs. ammo cost)
- [ ] Define targeting priority system (endermen vs. skeletons vs. general hostiles)
- [ ] Create ammo type definitions (standard arrows, fire arrows, homing variants)
- [ ] Verify custom spawn conditions and equipment assignment

### Ammo Switching Logic Example

```
If target is Skeleton:
  → Prefer Spectral Arrows (ignore armor)
Else if target is Enderman:
  → Use Homing Arrows (if available)
  → Fallback to standard arrows
Else:
  → Use cheapest ammo with sufficient damage
  → Prioritize standard arrows
```

---

## 5. Village Waypoint Block & UI

The **Village Waypoint Block** serves as a navigation marker and fast-travel hub for villages. It provides teleportation between linked waypoints with a crucial feature: **if the player is in a boat, the boat and all nearby entities within 4 blocks are teleported together**, making it ideal for group transport, mob relocation, and vehicle travel.

### Implementation Notes

- **Block Type**: Custom block (`custom:village_waypoint`)
- **Teleportation**: Bidirectional linking between waypoints with 500ms cooldown
- **Boat Support**: Full boat and passenger teleportation (all boat types)
- **Entity Grouping**: All entities within 4 blocks auto-teleport with player
- **Visual Feedback**: Portal particles at source and destination, block glows (light level 8)
- **Registration**: Auto-registers on placement, supports manual registration

### Features Implemented

✅ Waypoint block definition with blue glow  
✅ Auto-registration on placement  
✅ Bidirectional waypoint linking  
✅ Player teleportation with boat support  
✅ Boat passenger preservation during teleport  
✅ Nearby entity grouping (4-block radius)  
✅ Portal particle effects  
✅ Cooldown protection (500ms)  
✅ Entity type detection (supports all boat variants)  
✅ Comprehensive documentation with examples  

### TODO Items

- [ ] Implement form-based UI for waypoint selection (replace chat menu)
- [ ] Add custom waypoint naming system (with commands)
- [ ] Implement network sync for multiplayer waypoint coordination
- [ ] Create permission system for access control
- [ ] Add teleport sound effects (currently placeholder)
- [ ] Implement spatial indexing for 50+ waypoint optimization
- [ ] Add waypoint data persistence (block entity NBT)
- [ ] Create waypoint visualization/map system

### Boat Teleportation Example

```javascript
// Player in boat with 2 passengers approaches waypoint
boat.addPassenger(player);          // Player riding
boat.addPassenger(villager);        // Passenger 1
boat.addPassenger(archer_golem);    // Passenger 2

// Player interacts with waypoint
// Result: All teleported together to destination
// boat.addPassenger(player);        // Re-mounted
// boat.addPassenger(villager);      // Still aboard
// boat.addPassenger(archer_golem);  // Still aboard
```

### Entity Grouping Example

```
Player at waypoint center (within 4-block radius):
- Boat with 3 passengers (2 blocks away)
- Dropped items (1 block away)
- Armor stand display (3 blocks away)
- Wandering merchant (4 blocks away)

Result: All 7 entities (player + 6 nearby) teleport together
Preserves formation and relationships
```

### Waypoint Network Design

Simple hub:
```
    Market Hub (central)
        |
    ┌───┼───┐
    |   |   |
  Farm Nether Mine
```

Complex network:
```
Village A ←→ Central Hub ←→ Village B
    ↓            |            ↓
  Farm       Waypoint      Trading Post
```

---

## 6. Fish Breeding (Kelp + Fish-Feeding)

The fish breeding system allows regular fish to breed via kelp and enables octopus to be bred by feeding any fish item.

### Implementation Notes

- **Breeding Item (fish)**: Octopus (axolotl) reproduces when given fish items (cod, salmon, tropical fish, pufferfish, cooked cod/salmon).
- **Glowing octopus**: Glowing octopus behaves like regular octopus for breeding and produces glowing offspring when involved.
- **Regular fish**: Continue using kelp as breeding food (preserves original behavior).
- **Species mixing**: Octopus + any fish = baby octopus.
- **Love mode**: 3-second window for finding mates.
- **Rate control**: 50% chance to produce offspring each pairing.

### TODO Items

- [ ] Add dedicated octopus spawn egg / cosmetic (optional)
- [ ] Add config for fish item breeding rate multipliers
- [ ] Clarify behavior for tropical variants and named fish

---

## 7. Hanging Ladder

Hanging ladders provide vertical climb with support transfer in both directions.

### Implementation Notes

- **Block ID**: `custom:hanging_ladder`
- **Crafting**: 8x `minecraft:ladder` around `minecraft:chain` -> 9x `custom:hanging_ladder`
- **Support rules**:
  - Acts as normal ladder when any horizontal block is solid.
  - Can remain in place if a supported `custom:hanging_ladder` or `minecraft:ladder` is directly above or below.
- **Extension**:
  - Right-click top face: place new hanging ladder above when holding one.
  - Right-click bottom face: place new hanging ladder below when holding one.

### TODO Items

- [ ] Add climbing animation control for custom ladder type (optional)
- [ ] Add recipe variants / chain materials (copper chain, gold chain etc.)
- [ ] Add block models and texture for glowing or themed ladders

---

## Technical Architecture

### Behavior Pack Structure

```
behavior_pack/
├── entities/           # Custom entity definitions
├── items/              # Custom item definitions
├── blocks/             # Custom block definitions
├── trading/            # Trading tier definitions
├── scripts/            # GameTest/Script API implementations
└── manifest.json       # Pack metadata
```

### Resource Pack Structure

```
resource_pack/
├── textures/           # Block and item textures
├── models/             # Entity and block models
├── render_controllers/ # Animation and rendering logic
└── manifest.json       # Pack metadata
```

### API Versioning Notes

- Minimum engine version: **1.20.0** (adjust as needed)
- Script API features depend on the Bedrock version being targeted
- Some features may require experimental toggles in world settings

---

## Known Limitations & Workarounds

1. **Custom Workstation POIs**: Lodestone registration may require script-based registration rather than declaration files.
2. **Ammo Management**: Entity inventory for golems may require script API workarounds; verify `minecraft:inventory` component availability.
3. **Structure Copying**: Native structure cloning may be limited; consider hybrid approach with `/clone` commands or plugin-based solutions.
4. **UI Forms**: Form responsiveness and networked state sync may have version-specific limitations.
5. **NBT Data Persistence**: Block entity and item NBT data may have size limits or serialization constraints.

---

## Development Roadmap

- [ ] Phase 1: Define custom entities and basic trading
- [ ] Phase 2: Implement waypoint system and UI forms
- [ ] Phase 3: Add blueprint capture and structure copying
- [ ] Phase 4: Integrate archer golem combat AI
- [ ] Phase 5: Testing and optimization for multiplayer compatibility
- [ ] Phase 6: Documentation and example worlds

---

## References

- [Minecraft Bedrock Add-on Documentation](https://learn.microsoft.com/en-us/minecraft/creator/)
- [Entity JSON Format](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/entityreference/)
- [Block JSON Format](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/blockreference/)
- [Behavior Pack Guide](https://learn.microsoft.com/en-us/minecraft/creator/documents/behaviorpack/)
- [GameTest Framework](https://learn.microsoft.com/en-us/minecraft/creator/documents/gametestgettingstarted/)

---

## Credits & Attribution

### Primary Author
**OdinVanguard** - Lead developer and architect of the VillageCraft add-on

### AI Assistance
This project was developed with significant assistance from AI tools:

- **GitHub Copilot (Codex)** - Code generation, debugging, and implementation assistance
- **ChatGPT** - Design consultation, documentation writing, and feature ideation
- **VS Code** - Integrated development environment with AI-powered features

### Special Thanks
- Minecraft Bedrock community for inspiration and feedback
- Microsoft for providing excellent developer tools and documentation
- Open source contributors to the Minecraft Script API ecosystem

---

*VillageCraft - Expanding the Minecraft village experience since 2024*

