# Dispenser Clippers Integration System

## Overview

Dispensers loaded with clippers can automatically and renewably harvest mature crops without ejecting the clippers. This creates automated renewable crop farming systems.

## Features

- **Renewable Harvesting**: Mature crops reset to stage 0 when harvested by dispenser
- **Single Item Yield**: 1 crop item per harvest (like manual clippers harvesting)
- **Durability Tracking**: Clippers lose 1 durability per harvest (when API available)
- **Automatic Operation**: Dispensers activate and trigger harvests without player interaction
- **All Crops Supported**: Works with wheat, carrots, potatoes, and beetroots

## Supported Crops

| Crop | Max Stage | Drop Item | Yield |
|------|-----------|-----------|-------|
| Wheat | 7 | Wheat | 1 |
| Carrots | 7 | Carrot | 1 |
| Potatoes | 7 | Potato | 1 |
| Beetroots | 3 | Beetroot | 1 |

## Setup Guide

### Basic Setup

1. **Place Dispenser** pointing at farmland with crops
   ```
   Farmland → Dispenser facing farmland
   ```

2. **Load Clippers** into dispenser inventory
   - Dispenser must contain at least one clippers item
   - Clippers remain in dispenser (not ejected)

3. **Power Dispenser** with redstone signal
   - Repeater on 4-tick delay = ~1 harvest every 5 seconds
   - Repeater on 8-tick delay = ~1 harvest every 10 seconds
   - Instant pulse = continuous harvesting (not recommended)

### Directional Facing

Dispensers face different directions:

```
Direction Codes:
0 = Down (below dispenser)
1 = Up (above dispenser)
2 = North (negative Z)
3 = South (positive Z)
4 = East (positive X)
5 = West (negative X)
```

Place farmland in the direction your dispenser faces.

## Example Designs

### Simple Automatic Farm

```
              Redstone Torch
                    |
      ┌─────────────┘
      |
    Repeater (4-tick)
      |
   Dispenser
   (facing South)
      |
   Farmland with Crops
```

**Result**: Dispenser triggers every 5 seconds, harvesting mature crops

### Multi-Level Harvester

```
Level 3:  Dispenser ──→ Farmland  (Redstone signal)
             |
Level 2:  Dispenser ──→ Farmland
             |
Level 1:  Dispenser ──→ Farmland
             |
       Redstone Signal Source
```

**Result**: Stacked dispensers harvest multiple crop rows automatically

### Pulse Generator

```
     Comparator (from hopper)
           |
      Repeater (1-tick)
           |
      Repeater (2-tick)
           |
        Dispenser
```

**Result**: Hopper signals when full; repeaters create harvest pulse

## Mechanical Behavior

### Harvesting Process

1. **Maturity Check**: Block state `age` property checked
   - Crop must equal `maxStage` for its type (7 for wheat/carrots/potatoes, 3 for beetroots)
   
2. **Stage Reset**: Crop block state `age` set to 0
   - Crop immediately reverts to lowest growth stage
   - No delay - instant reset
   
3. **Item Drop**: 1 crop item spawned at dispenser position
   - Item falls from dispenser block location
   - Travels with gravity and collects in hoppers/items frames below
   
4. **Durability**: Clippers durability decreased by 1
   - When API available: clippers losing 1 durability per harvest
   - TODO: Full implementation pending block entity container access
   
5. **Particle Feedback**: Harvest particle effect displayed
   - `minecraft:crop_dust` particle at crop location
   - Visual indication that harvest occurred

### Activation Requirements

- **Dispenser powered**: Requires redstone signal
- **Clippers in dispenser**: At least 1 clippers item present
- **Mature crop**: Block `age` state equals maxStage for crop type
- **Facing valid crop**: Dispenser facing direction points to farmland block

## Configuration

### Crop Types (CONFIG.CROPS)

Add new crop types by extending the CONFIG object:

```javascript
"minecraft:new_crop": {
  minStage: 0,
  maxStage: 7,
  dropItem: "minecraft:crop_item",
  dropAmount: 1
}
```

### Dispenser Directions (CONFIG.DISPENSER_DIRECTIONS)

Facing direction mappings:
- 0: Down (y - 1)
- 1: Up (y + 1)
- 2: North (z + 1)
- 3: South (z - 1)
- 4: East (x + 1)
- 5: West (x - 1)

### Particle Effects

Change harvest particle by modifying:
```javascript
CONFIG.PARTICLE_HARVEST: "minecraft:crop_dust"  // or other particle
```

Available particles: `crop_dust`, `harvest`, `block_dust`, etc.

## Technical Details

### Block State Queries

The system queries block state properties:

```javascript
const state = block.getComponent("minecraft:block_state");
const age = state.getState("age");  // Current growth stage
state.setState("age", 0);            // Reset to stage 0
```

### Dispensers vs Droppers

- **Dispenser**: Ejects solid items (and activates behaviors like BUD)
- **Dropper**: Quietly drops items in inventory
- **Recommended**: Use dispenser for visual activation feedback

### Hopper Compatibility

Dispensers work with hoppers:
- Place hopper below dispenser
- Harvested crop items collect in hopper
- Hopper can transport to storage or other systems

```
   Dispenser
       |
     Hopper
       |
   Chest
```

## Limitations & TODOs

### Current Limitations

1. **Block Entity Access**: Cannot access dispenser inventory container yet
   - TODO: Full durability tracking when block entity API available
   - STATUS: Currently placeholder (no durability decrease)

2. **Dispenser Activation Detection**: No reliable event for when dispenser fires
   - WORKAROUND: Manual tick-based checking (TODO)
   - Current: Tick system initialized but checks disabled pending API

3. **Timing Precision**: Redstone signal timing can be unpredictable
   - RECOMMENDATION: Use repeaters for consistent intervals
   - TEST: Verify 4-tick repeater = ~200ms interval

### Version-Specific APIs

The following require Bedrock 1.20.0+ verification:

- `block.getComponent("minecraft:block_state")` - Block state queries
- `state.getState("age")` / `setState("age")` - Crop age manipulation
- `dimension.spawnItem()` - Item dropping
- `dimension.spawnParticle()` - Particle effects
- **TODO**: Block entity container access for dispenser inventory

## Testing Checklist

- [ ] **Dispenser Placement**: Dispenser faces crop block
- [ ] **Clippers Loading**: Clippers successfully placed in dispenser
- [ ] **Mature Crops**: Plant crops and wait for max stage (7 for wheat/carrots)
- [ ] **Single Activation**: Pulse signal once, verify 1 crop harvested
- [ ] **Item Drop**: Harvested item spawns and can be collected
- [ ] **Stage Reset**: Crop reverts to stage 0 after harvest
- [ ] **Repeated Harvesting**: Multiple signals harvest multiple times
- [ ] **Durability**: Verify clippers durability decreases (when implemented)
- [ ] **Wrong Crop Stage**: Test immature crop (no harvest should occur)
- [ ] **No Clippers**: Test with empty dispenser (no harvest occurs)
- [ ] **All Crop Types**: Verify wheat, carrots, potatoes, beetroots work
- [ ] **Hopper Integration**: Items correctly route through hoppers below

## Integration Examples

### With Irrigation System

Combine dispenser harvesting with cauldron irrigation for fully automated farms:

```
Cauldron (with closed trapdoor + mud)
    ↓
Farmland (hydrated)
    ↓
Dispenser + Clippers (harvests)
    ↓
Hopper
    ↓
Storage
```

**Result**: Self-sustaining farm needing only initial setup

### With Apple Growth System

While apples cannot be dispensed (not block-based), the dispenser system shares the same clippers item:

```
Manual Clippers Harvesting (apples)
       +
Dispenser Harvesting (crops)
       =
Unified Tool
```

**Result**: One tool handles both apple and crop harvesting

### With Redstone Automation

Advanced pulse generation:

```
Comparator → Repeater → NOT Gate → Repeater → Dispenser
(hopper full)                              ↓
                                       Dispenser
                                    (fires once when full)
```

**Result**: Harvest trigger when storage is full, preventing overflow

## Performance Considerations

### Optimization Tips

1. **Batch Harvests**: Use multiple dispensers on same signal
   - Reduces tick overhead
   - Processes multiple crops simultaneously

2. **Tick Interval**: Current system checks every 20 ticks (1 second)
   - TODO: Optimize when dispenser event available
   - Consider increasing interval if many dispensers active

3. **Hopper Chains**: Keep hopper chains short
   - Long chains slow item transit
   - Use multiple hoppers in parallel if needed

### Large-Scale Farming

For 100+ crop rows with dispensers:

- TODO: Implement spatial indexing
- TODO: Consider alternative redstone pulse generation
- TODO: Test with 10+ simultaneous harvesters

Current system should handle 10-20 dispensers without lag.

## Troubleshooting

### Dispenser Not Harvesting

**Problem**: Dispenser placed but not harvesting crops

**Solutions**:
1. Verify dispenser is **powered** (should have red particles when powered)
2. Check **crop is mature** (fully grown, not mid-growth)
3. Confirm **clippers in dispenser** inventory
4. Verify **facing direction** correct (toward crop block)

### Item Not Dropping

**Problem**: Harvest occurs but no item spawned

**Solutions**:
1. Check **item spawn location** (should appear at dispenser)
2. Verify **hopper not blocking** item spawn
3. Check **block state API** working correctly
4. Look for **console errors** in logs

### Durability Not Decreasing

**Problem**: Clippers durability seems infinite

**Status**: This is a **known limitation**. Block entity container API not yet available.

**Workaround**: Manually manage clippers durability or wait for API update.

## See Also

- [Clippers Harvesting System](clippers_harvesting.md) - Manual crop harvesting
- [Apple Growth System](apple_growth_system.md) - Apple harvesting with clippers
- [Irrigation System](irrigation_system.md) - Automated crop hydration
- [Design Notes](../../docs/design-notes.md) - Overall system architecture

## Changelog

**v1.0.0** - Initial dispenser clippers integration
- Basic structure for all crop types
- TODO placeholders for block entity container access
- Harvest mechanics (stage reset, item drop, particles)
