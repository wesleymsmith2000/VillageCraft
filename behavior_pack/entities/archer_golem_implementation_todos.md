# Archer Golem Implementation TODOs

## Interaction Modes (NEW)

The archer golem supports multiple interaction modes for tamed golems controlled by the owner:

### Mode System

1. **Follow Mode** (Default after taming)
   - Golem follows the owner
   - Continues to attack hostile mobs autonomously
   - Event: `custom:toggle_follow`

2. **Idle Mode** (Shift+Click)
   - Golem stays in place and does random strolls
   - Continues to attack hostile mobs autonomously
   - Reduces movement speed to defend a position
   - Event: `custom:toggle_idle`

3. **Passive Mode** (Normal Click - no redstone held)
   - Golem sits still with minimal movement
   - **Does NOT attack** - purely defensive/decorative
   - Event: `custom:toggle_passive`

### Healing System (Normal Click + Redstone held)

- Right-click golem while holding redstone dust
- Consumes 1 redstone, heals golem by 10 HP
- Max health: 40 HP
- Implemented in `behavior_pack/scripts/archer_golem_interactions.js`

### Script Integration

**Implementation Notes:**
- TODO: Test `playerInteractWithEntity` event subscription reliability
- TODO: Verify ownership checking via query API (`query.is_owner_identifier`)
- TODO: Implement persistence of mode state across chunk reloads
- TODO: Add mode state visualization (particles or scoreboard)

**File:** `behavior_pack/scripts/archer_golem_interactions.js`

---

## Emissive Head

When the archer golem is aiming at a target, the head should emit light to show it's actively targeting.

**Implementation Notes:**
- TODO: Verify multi-layer render controller support in Bedrock 1.20.0+
- TODO: Test emissive overlay layer rendering with the main texture layer
- TODO: Determine correct texture coordinates for the archer_golem_emissive_head texture
- TODO: Confirm eye glow animation timing with shooting animation

**File:** `resource_pack/render_controllers/archer_golem.json`
**Layer Name:** `layer.emissive_head`
**Texture:** `textures/entity/archer_golem/archer_golem_emissive_head`
**Condition:** `query.is_aiming && query.is_owner_identifier`

---

## Dispenser-Face Aiming

The right arm should rotate to face the target with a 1x1 opening resembling a dispenser block face.

**Implementation Notes:**
- TODO: Create custom model for right arm bone with dispenser texture pattern
- TODO: Verify bone attachment points for accurate projectile origin
- TODO: Implement rotation quaternion calculations for precise target tracking
- TODO: Test aiming arc with different target distances and heights
- TODO: Define projectile spawn offset relative to right arm bone

**File:** `resource_pack/animations/archer_golem.json`
**Animation:** `animation.archer_golem.aiming`
**Bone:** `RightArm`
**Current Rotation:** `[-120, 0, 45]` with position `[0.5, 0.0, 0.0]`

**Target Behavior:**
```
Arm rotates to point at target entity
Head rotates independently to aim
Right arm face rotates to show dispenser opening direction
Projectile spawn point: Right arm tip position + forward offset
```

---

## Ammo Particles

Custom particle effects should emit when the archer golem shoots different ammo types.

**Implementation Notes:**
- TODO: Verify particle event API in Script API vs. behavior pack animation events
- TODO: Create separate particle emitter for each ammo type (arrow, spectral arrow, custom projectile)
- TODO: Test particle attachment to RightArm bone during shoot animation
- TODO: Implement ammo-specific colors and velocities
- TODO: Add wind/air distortion particles for long-range shots

**Ammo Types:**
1. **Standard Arrow**: `minecraft:basic_smoke_particle` (white/gray)
2. **Spectral Arrow**: Custom particle with blue glow effect
3. **Custom Projectile**: Particle effect TBD based on final projectile design

**File References:**
- Animations: `resource_pack/animations/archer_golem.json`
- Animation Controller: `resource_pack/animation_controllers/archer_golem.json`
- Behavior Bank: `behavior_pack/entities/archer_golem.json` (Script API integration)

**Particle Timeline Example:**
```
0.0s - Ammo selection particle (based on inventory)
0.1s - Draw/aim particle
0.5s - Release particle with ammo-type color
0.6s - Smoke trail if applicable
```

---

## Texture Files Needed

These placeholder textures should be created:

- `textures/entity/archer_golem/archer_golem.png` - Main texture (reuse snow golem UV layout)
- `textures/entity/archer_golem/archer_golem_alt.png` - Tamed variant
- `textures/entity/archer_golem/archer_golem_emissive_head.png` - Glow map for head
- `textures/entity/archer_golem/archer_golem_dispenser_face.png` - Optional: High-res dispenser detail

---

## Testing Checklist

- [ ] Entity spawns correctly with snow golem geometry
- [ ] Idle, walk, and aiming animations blend smoothly
- [ ] Shoot animation triggers when targeting hostile mobs
- [ ] Emissive head layer renders (if supported)
- [ ] Dispenser-face arm rotation reaches targets at various distances
- [ ] Particles emit during shooting sequence
- [ ] Taming with emerald works correctly
- [ ] Owner-based behavior switching works
- [ ] **NEW:** Shift+Click toggles between follow/idle modes
- [ ] **NEW:** Normal click toggles passive mode
- [ ] **NEW:** Redstone healing works when holding redstone dust
- [ ] **NEW:** Mode states persist across interactions
- [ ] **NEW:** Attack behavior retained in follow and idle modes
- [ ] Multiplayer compatibility (renders for all players)

