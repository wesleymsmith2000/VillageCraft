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

The **Village Waypoint Block** serves as a navigation marker and information hub for villages. It provides a custom UI for accessing village services, viewing waypoints, and coordinating with custom villagers.

### Implementation Notes

- **Block Type**: Custom block (e.g., `custom:village_waypoint`)
- **Block Entity**: Stores waypoint data, linked services, and metadata
- **UI System**: Uses `minecraft:ui` form system for player interaction
- **Rendering**: Custom render controller and texture for visual identification

### TODO Items

- [ ] Verify custom block entity data persistence in current Bedrock version
- [ ] Determine UI form API capabilities (buttons, toggles, text input)
- [ ] Implement block entity NBT schema for waypoint metadata
- [ ] Define network protocol if multiplayer waypoint sync is required
- [ ] Create render controller for waypoint visual states (active, inactive, linked)
- [ ] Verify custom block collision and interaction ranges

### Waypoint UI Features

```
Primary Interface:
  - Village Info (name, population, mood)
  - Linked Services (builder, architect, archer golem)
  - Nearby Waypoints Map
  - Fast Travel Option (if supported)

Secondary Menu:
  - Waypoint Configuration (name, description)
  - Service Settings (trade rates, golem behavior)
  - Village Statistics
```

### Waypoint Block Data Structure Example

```json
{
  "waypoint_id": "village_main_1",
  "village_id": "village_1",
  "position": { "x": 100, "y": 64, "z": 200 },
  "name": "Market Square",
  "description": "Central trading hub",
  "linked_services": ["builder_villager", "archer_golem"],
  "nearby_waypoints": [],
  "ui_form_id": "village_waypoint_main"
}
```

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

