# Clippers Crop Harvesting System

## Overview

The clippers tool provides a renewable crop harvesting method that allows sustainable farming. When harvesting mature crops with clippers, the crop is reset to its lowest growth stage (stage 0), leaving it ready to regrow without replanting.

## Features

### Renewable Harvesting

- **Non-Destructive**: Crop remains in place, ready to regrow
- **Sustainable**: No need to replant after harvest
- **Single Yield**: Returns only 1 crop item per harvest
- **Durability Cost**: 1 durability per harvest (128 total harvests per clippers)

### Supported Crops

All standard growth-stage crops are supported:

1. **Wheat** (stages 0-7)
   - Harvest at stage 7 (mature)
   - Yields: 1 wheat
   - Resets to stage 0

2. **Carrots** (stages 0-7)
   - Harvest at stage 7 (mature)
   - Yields: 1 carrot
   - Resets to stage 0

3. **Potatoes** (stages 0-7)
   - Harvest at stage 7 (mature)
   - Yields: 1 potato
   - Resets to stage 0

4. **Beetroots** (stages 0-3)
   - Harvest at stage 3 (mature)
   - Yields: 1 beetroot
   - Resets to stage 0

## Usage

### Harvesting Mature Crops

1. Hold clippers in hand
2. Right-click on a mature crop (at max growth stage)
3. Crop resets to stage 0
4. Crop item drops at block location
5. Clippers durability decreases by 1

### Crop Stages

Each crop has multiple growth stages:

```
Stage 0: Just planted (tiny seedling)
  ↓
Stage 1-6: Growing (progressive size increase)
  ↓
Stage 7 (or max): Mature (harvestable with clippers)
```

**Immature Crops**: Right-clicking immature crops with clippers shows message "Crop not ready to harvest"

## Mechanics

### Sustainable Farming Workflow

```
1. Plant seeds on hydrated farmland
2. Wait for crops to mature
3. Right-click with clippers
4. Receive 1 crop item
5. Crop resets to stage 0
6. Repeat from step 2 (no replanting needed)
```

### Durability vs. Traditional Harvesting

**Clippers (Renewable):**
- Yield: 1 crop per harvest
- Durability: 1 per harvest
- Lifecycle: 128 harvests per tool
- Crop status: Remains planted, immediately re-grows

**Breaking Crop (Destructive):**
- Yield: 1-3 crops (varied)
- Replanting: Required (use seeds)
- Efficiency: Higher yield but requires seeds

### Use Cases

**Sustainable Farming:**
- Continuous harvesting without replanting
- Perfect for renewable resource setups
- Minimal maintenance (refill when empty)

**Single Crop Farming:**
- Consistent 1 item per harvest
- Predictable yields for automation
- Low risk of over-harvesting

**Renewable Crops Setup:**
- Combine with irrigation systems
- Sustainable XP farms (if applicable)
- Infinite renewable resource

## Technical Details

### Crop Detection

System detects mature crops by checking:
1. Block is registered crop type (wheat, carrots, potatoes, beetroots)
2. Block has `age` state component
3. Age equals maximum for crop type
4. Player holds clippers

### Stage Reset

When harvesting:
1. Get crop block
2. Query current stage via block state
3. Set age state to 0 (stage 0)
4. Spawn item at block location
5. Reduce clippers durability

### Particle Feedback

- Visual effect: `minecraft:crop_dust` particles
- Displayed at crop location
- Indicates successful harvest

## Configuration

Modify crop definitions in `clippers_harvesting.js`:

```javascript
const CONFIG = {
  CLIPPERS_ID: "custom:clippers",
  CLIPPERS_DURABILITY_COST: 1,
  CROPS: {
    "minecraft:wheat": {
      minStage: 0,
      maxStage: 7,
      dropItem: "minecraft:wheat",
      dropAmount: 1
    },
    // ... other crops
  }
};
```

**To add new crops:**
1. Identify block ID: `minecraft:crop_name`
2. Determine stage range (min to max)
3. Identify drop item ID
4. Add entry to CONFIG.CROPS

## Comparison: Clippers vs. Breaking Crops

| Feature | Clippers | Breaking |
|---------|----------|----------|
| Yield | 1 item | 1-3 items |
| Replanting | No | Yes (need seeds) |
| Durability Cost | 1 per harvest | None |
| Renewable | Yes | Yes (with seeds) |
| Efficiency | Low volume | Higher volume |
| Use Case | Sustainable | Bulk harvest |

## Known Limitations & TODOs

1. **Block State API**
   - TODO: Verify block state `age` component in Bedrock 1.20.0+
   - TODO: Test stage reset with all crop types
   - TODO: Confirm immature crop detection works

2. **Crop Stages**
   - TODO: Verify exact stage numbers for each crop
   - TODO: Test beetroot stages (may differ from others)
   - TODO: Document any custom crop stage requirements

3. **Item Drops**
   - TODO: Verify crop item IDs (carrot vs. carrots)
   - TODO: Test drop counts match config
   - TODO: Verify item pickup behavior

4. **Durability Handling**
   - TODO: Test tool break notification
   - TODO: Verify durability persists across sessions
   - TODO: Test repair with iron ingots

5. **Integration**
   - TODO: Combine with irrigation for full farm loop
   - TODO: Test with fortune-enchanted clippers (if applicable)
   - TODO: Integration with other farming systems

## Testing Checklist

- [ ] Clippers can harvest mature wheat (stage 7)
- [ ] Clippers can harvest mature carrots (stage 7)
- [ ] Clippers can harvest mature potatoes (stage 7)
- [ ] Clippers can harvest mature beetroots (stage 3)
- [ ] Immature crops cannot be harvested with clippers
- [ ] Harvested crop resets to stage 0
- [ ] Crop item drops at harvest location
- [ ] Clippers durability decreases by 1 per harvest
- [ ] Clippers break after 128 harvests
- [ ] Clippers can be repaired with iron ingots
- [ ] Particles display on successful harvest
- [ ] Crop regrows from stage 0 on hydrated farmland
- [ ] Multiple crops can be harvested in sequence
- [ ] Works with irrigation systems
- [ ] Works on all farmland types
- [ ] Action bar shows correct crop name
- [ ] Performance stable with large farms

## Implementation Files

**Scripts:**
- `behavior_pack/scripts/clippers_harvesting.js` - Crop harvesting logic

**Items:**
- `behavior_pack/items/clippers.json` - Clippers tool definition (updated with lore)

