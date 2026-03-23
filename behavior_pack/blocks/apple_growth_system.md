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

**Blocks:**
- `behavior_pack/blocks/apple_on_leaves.json` - Apple block definition with placement filter

**Scripts:**
- `behavior_pack/scripts/apple_growth.js` - Core spreading and management logic

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
  COMPATIBLE_LEAVES: [...],      // Leaf block types
  SPREAD_INTERVAL: 6000,         // Ticks between spread attempts
  SPREAD_CHANCE: 0.25,           // Probability of successful spread
  MIN_LIGHT_LEVEL: 9,            // Crop growth light requirement
  PARTICLE_SPREAD: "...",        // Particle effect on spread
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

3. **Persistence**
   - TODO: Implement block scanning on world load
   - TODO: Store apple positions in NBT for persistence
   - TODO: Handle cross-dimension spreading (if applicable)

4. **Performance**
   - TODO: Optimize tracking for large-scale apple farms
   - TODO: Consider chunk-based spread limits
   - TODO: Profile memory usage with thousands of apples

5. **Integration**
   - TODO: Add crafting recipes for apple placement
   - TODO: Create admin commands for apple farm setup
   - TODO: Add growth visualization particles

## Usage

### Placing Apples

1. Hold apple in hand
2. Right-click on a leaf block face
3. Apple attaches and begins spreading cycle

### Harvesting

- Break apple block with any tool
- Returns as item (stackable, max 64)

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
- [ ] Apples persist after chunk reload
- [ ] Multiple apple blocks spread independently
- [ ] Particles display on successful spread
- [ ] Breaking apple removes tracking entry
- [ ] Performance stable with 100+ apples
