# Apple Growth & Spreading System

## Overview

The apple growth system allows apples to be placed on the faces of oak, birch, and dark oak leaf blocks. Once placed, apples can spread to adjacent compatible leaf blocks at a natural rate of approximately twice per day.

## Features

### Placement
- Apples can be placed on any face (top, bottom, north, south, east, west) of compatible leaf blocks
- Compatible leaf types:
  - `minecraft:oak_leaves`
  - `minecraft:birch_leaves`
  - `minecraft:dark_oak_leaves`

### Spreading
- **Spread Interval**: ~5 minutes average per spread event (6000 ticks)
- **Spread Rate**: ~Twice per day (one every 12 in-game hours on average)
- **Spread Chance**: 25% per interval (1 in 4 attempts succeed)
- **Light Requirements**: Requires light level 9+ (equivalent to crop growth)

### Mechanics

```
Apple Block Detection → Light Level Check → Adjacent Leaf Search → Random Selection → Placement
     (every 20 ticks)      (level 9+)        (6 adjacent faces)      (25% chance)   (on matching leaves)
```

## Implementation Files

### Behavior Pack

**Items:**
- `behavior_pack/items/apple_growth.json` - Growth apple item definition
- `behavior_pack/items/clippers.json` - Clippers tool for non-destructive harvesting

**Blocks:**
- `behavior_pack/blocks/apple_on_leaves.json` - Apple block definition with placement filter

**Scripts:**
- `behavior_pack/scripts/apple_growth.js` - Core spreading, management, and harvesting logic

### Resource Pack

**Textures:**
- TODO: `textures/items/apple_growth.png` or use vanilla apple texture
- TODO: `textures/blocks/apple_on_leaves.png` - Apple on leaves texture

**Models:**
- TODO: `models/blocks/apple_on_leaves.json` - Attachment model for side faces

## Technical Details

### Block Permutation

The apple block uses a custom permutation to track which face it's attached to:

```
custom:apple_on_leaves[attachment_face=up|down|north|south|east|west]
```

### Light Level Detection

TODO: Current implementation uses placeholder light detection. Requires:
- [ ] Verify actual light level API in Bedrock 1.20.0+
- [ ] Test crop growth light level equivalence (light level 9)
- [ ] Implement proper sky light vs. block light calculation

### Spreading Algorithm

1. **Tick Interval**: Checks every 20 ticks (1 second)
2. **Spread Timer**: Triggers spread attempt every 6000 ticks (~5 minutes)
3. **Target Selection**: Scans 6 adjacent positions for compatible leaves
4. **Success Chance**: 25% probability per attempt
5. **Placement**: Apple spreads to random adjacent leaf block

### State Management

Apple blocks are tracked in memory with:
- Position (x, y, z)
- Dimension ID
- Last spread tick
- Next scheduled spread tick

**Cleanup Events:**
- Block break: Removes tracking
- Block replaced: Removes tracking
- World reload: Rebuilds tracking (requires block scan)

## Configuration

Modify these constants in `apple_growth.js`:

```javascript
const CONFIG = {
  BLOCK_ID: "custom:apple_on_leaves",
  COMPATIBLE_LEAVES: [...],           // Leaf block types
  SPREAD_INTERVAL: 6000,              // Ticks between spread attempts
  SPREAD_CHANCE: 0.25,                // Probability of successful spread
  MIN_LIGHT_LEVEL: 9,                 // Crop growth light requirement
  PARTICLE_SPREAD: "...",             // Particle effect on spread
  CLIPPERS_ID: "custom:clippers",     // Clippers tool item
  CLIPPERS_DURABILITY_COST: 2,        // Durability per harvest
  APPLE_ITEM_ID: "custom:apple_growth",
  // Fortune support
  BASE_APPLE_YIELD: 1,                // Base yield (1 apple)
  CLIPPERS_MIN_YIELD: 1,              // Clippers minimum (1 apple)
  CLIPPERS_MAX_YIELD: 3,              // Clippers maximum (3 apples)
  CLIPPERS_YIELD_CHANCE: 0.5,         // 50% per bonus apple
  // Fortune multipliers
  FORTUNE_LEVEL_1_MULTIPLIER: 2,      // Fortune I = 2x yield
  FORTUNE_LEVEL_2_MULTIPLIER: 3,      // Fortune II = 3x yield
  FORTUNE_LEVEL_3_MULTIPLIER: 4,      // Fortune III = 4x yield
};
```

## Known Limitations & TODOs

1. **Light Level API**
   - TODO: Verify actual light level query availability
   - Current: Placeholder implementation assumes day is always lit
   - Need: Proper sky light + block light calculation

2. **Face Attachment**
   - TODO: Implement proper face-attachment geometry
   - TODO: Model rotation based on attached face
   - TODO: Test all 6 face orientations

3. **Clippers Tool**
   - TODO: Create crafting recipe for clippers
   - TODO: Implement enchantment support (Efficiency, Unbreaking)
   - TODO: Add clippers texture and model
   - TODO: Test durability system across sessions

4. **Harvesting Events**
   - TODO: Verify `playerInteractWithBlock` event reliability
   - TODO: Test cancellation behavior for clippers harvest
   - TODO: Handle edge cases (armor, accessories blocking interact)

5. **Persistence**
   - TODO: Implement block scanning on world load
   - TODO: Store apple positions in NBT for persistence
   - TODO: Handle cross-dimension spreading (if applicable)

6. **Performance**
   - TODO: Optimize tracking for large-scale apple farms
   - TODO: Consider chunk-based spread limits
   - TODO: Profile memory usage with thousands of apples

## Usage

### Placing Apples

1. Hold apple in hand
2. Right-click on a leaf block face
3. Apple attaches and begins spreading cycle

## Harvesting

### Destructive Harvesting (Breaking Leaf Block)
- Break the leaf block containing the apple
- Returns 1-4 apples depending on **Fortune enchantment**
- Leaf block is destroyed
- Apple block tracking is cleaned up

**Fortune Yields:**
- No Fortune: 1 apple
- Fortune I: 2 apples
- Fortune II: 3 apples
- Fortune III: 4 apples

### Non-Destructive Harvesting (Clippers)
- Hold **Clippers** item
- Right-click on apple block
- Returns 1-3 apples randomly (like sheep drops)
- **Leaf block remains intact**
- Clippers durability decreases by 2 per harvest
- Uses 128 durability (64 harvests per tool)
- Repairable with iron ingots

**Clippers Yield Chances:**
- 1 apple: 25% (no bonuses)
- 2 apples: 50% (one bonus triggers)
- 3 apples: 25% (both bonuses trigger)

### Item Drops

When apples are harvested:
- Drops as stackable item (max 64)
- Can be used to replant apples on new leaves
- Participates in standard item physics (falling, collection)
- Fortune support works with any fortune-enchanted tool

**TODO:** Implement crafting recipes for clippers
- Suggested recipe: Iron bars + Iron ingots in cross pattern


### Controlling Spread

**Disable Spreading:**
- Set `CONFIG.SPREAD_CHANCE = 0` to prevent spreading
- Keeps apples in place as static decorations

**Adjust Speed:**
- Modify `SPREAD_INTERVAL` to change frequency
- 3000 ticks = ~2.5 minutes
- 9000 ticks = ~7.5 minutes

## Testing Checklist

- [ ] Apple can be placed on oak leaf faces
- [ ] Apple can be placed on birch leaf faces
- [ ] Apple can be placed on dark oak leaf faces
- [ ] Apple cannot be placed on other block types
- [ ] Apple spreads to adjacent leaves at ~5 min intervals
- [ ] Spread requires light level 9+
- [ ] Spread stops when surrounded by non-leaf blocks
- [ ] **NEW:** Fortune I increases break yield to 2 apples
- [ ] **NEW:** Fortune II increases break yield to 3 apples
- [ ] **NEW:** Fortune III increases break yield to 4 apples
- [ ] **NEW:** Clippers yield averages 1-3 apples
- [ ] **NEW:** Clippers yield follows sheep drop pattern (25%, 50%, 25%)
- [ ] Breaking leaf block with apple destroys both and drops with fortune
- [ ] Clippers can harvest apple without breaking leaf block
- [ ] Clippers durability decreases by 2 per harvest
- [ ] Clippers can be repaired with iron ingots
- [ ] Clippers break after 64 harvests (128 durability total)
- [ ] Apples persist after chunk reload
- [ ] Multiple apple blocks spread independently
- [ ] Particles display on successful spread
- [ ] Particle effects display on clippers harvest
- [ ] Breaking apple removes tracking entry
- [ ] Performance stable with 100+ apples
