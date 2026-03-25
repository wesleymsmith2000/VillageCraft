# VillageCraft Debugging Guide

## Quick Start

### 1. Install Extensions
Open VS Code and run the following in terminal:
```bash
code --install-extension mojang-studios.minecraft-debugger
code --install-extension blockceptionltd.blockceptionvscodeminecraftbedrockdevelopmentextension
```

Or use VS Code Tasks (Ctrl+Shift+P → "Run Task"):
- `Install Minecraft Debugger Extension`
- `Install Blockception Minecraft Extension`

---

## 2. Launch Minecraft & Packs

### Option A: Manual Setup
1. Copy packs to Minecraft dev folder:
   ```powershell
   $roots = @(
     (Join-Path $env:LOCALAPPDATA "Packages\Microsoft.MinecraftUWP_8wekyb3d8bbwe\LocalState\games\com.mojang"),
     (Join-Path $env:APPDATA "Minecraft Bedrock\Users\Shared\games\com.mojang")
   )
   foreach ($root in $roots) {
     if (-not (Test-Path $root)) { continue }
     $bpDest = Join-Path $root "development_behavior_packs\VillageCraft-behavior"
     $rpDest = Join-Path $root "development_resource_packs\VillageCraft-resource"
     if (Test-Path $bpDest) { Remove-Item $bpDest -Recurse -Force }
     if (Test-Path $rpDest) { Remove-Item $rpDest -Recurse -Force }
     Copy-Item .\behavior_pack $bpDest -Recurse -Force
     Copy-Item .\resource_pack $rpDest -Recurse -Force
   }
   ```

3. Create new world with:
   - ✅ **Beta APIs** enabled (for scripting)
   - ✅ **Upcoming Creator Features** enabled (for creator content)
   - ✅ **GameTest Framework** enabled (if available)
   - Add both **VillageCraft-behavior** and **VillageCraft-resource** packs

### Option B: VS Code Task
Run task: `Copy packs to Minecraft dev folder`

Or run task: `Prepare Minecraft Debugging`

### Option C: .mcaddon Import (Recommended)
1. Locate the `VillageCraft.mcaddon` file in your project root (or run VS Code task: `Build VillageCraft.mcaddon` to generate/update it)
2. Double-click the file to open it with Minecraft Bedrock
3. Minecraft will automatically install the packs
4. Create new world with the same settings as Option A

---

## 3. Debug Configuration

Your `.vscode/launch.json` is already configured with both common Bedrock debugger ports. To start debugging:

1. **Launch Minecraft** with your world
2. **In VS Code**: Press **F5** (Run → Start Debugging)
3. Wait for: `[Minecraft Bedrock Debugger]` connection message
4. Set breakpoints and interact with features in-game

---

## 4. Breakpoint Testing by Feature

### Fish Breeding
**File**: `behavior_pack/scripts/fish_breeding.js`

**Test steps:**
1. Breakpoint at line ~380: `putFishInLove(fish);`
2. Hold kelp → right-click fish
3. Check variables: `fishInLove.size`, `fish.typeId`

**Expected debug output:**
```
[Fish Breeding] System initialized
[Fish Breeding] Mutation chance = 0.1%
[Fish Breeding] Dried kelp feed radius = 8 blocks
```

---

### Waypoint System
**File**: `behavior_pack/scripts/waypoint_system.js`

**Test steps:**
1. Breakpoint at line ~200: `teleportEntity(player, destination);`
2. Place 2 waypoint blocks
3. Right-click waypoint with player/boat
4. Inspect: `selectedWaypoint`, `destination`, teleported entities

**Expected debug output:**
```
[Waypoint] System initialized
[Waypoint] Teleport range: 4 blocks
[Waypoint] DEBUG: Set breakpoints for waypoint interactions
```

---

### Archer Golem
**File**: `behavior_pack/scripts/archer_golem_interactions.js`

**Test steps:**
1. Breakpoint at line ~120: `toggleFollowMode(golem);`
2. Spawn snow golem (placeholder)
3. Shift+click with emerald
4. Watch state changes: `FOLLOW` → `IDLE` → `PASSIVE`

**Expected debug output:**
```
[Archer Golem] Interaction handler loaded
[Archer Golem] DEBUG: Golem states tracking initialized
```

---

### Hanging Ladder
**File**: `behavior_pack/scripts/hanging_ladder.js`

**Test steps:**
1. Breakpoint at line ~200: `validateHangingLadder(block);`
2. Craft hanging ladder (8 ladders + 1 chain)
3. Place on wall/in air/chain
4. Inspect: `isSupportedHangingLadder()`, neighbor checks

**Expected debug output:**
```
[Hanging Ladder] System loaded
[Hanging Ladder] DEBUG: Support chain validation initialized
```

---

### Apple Growth
**File**: `behavior_pack/scripts/apple_growth.js`

**Test steps:**
1. Breakpoint at line ~350: `spreadApple(block, apple);`
2. Find oak/birch/dark oak leaf with apple
3. Wait ~5-10 minutes for spread tick
4. Inspect: spread location, new apple placement

**Expected debug output:**
```
[Apple Growth] System initialized
[Apple Growth] Spread interval: 5 minutes
[Apple Growth] DEBUG: Ready for apple spread monitoring
```

---

## 5. Console Output

**All system messages appear in:**
- In-game console (press `/` then scroll down)
- VS Code Debug Console (when attached)

Filter by system:
```
[Fish Breeding]
[Waypoint]
[Archer Golem]
[Apple Growth]
[Hanging Ladder]
```

---

## 6. Troubleshooting

| Issue | Solution |
|-------|----------|
| Debugger won't connect | Ensure Beta APIs + Upcoming Creator Features + GameTest enabled, then try both 19144 and 19145 launch profiles |
| Can't see console | Press `/` in game, scroll to bottom |
| Breakpoints not pausing | Run `Copy packs to Minecraft dev folder`, then check packs are loaded in world settings |
| "DEBUG:" messages don't show | Verify console.warn() calls added |
| Copy task fails | This workspace uses PowerShell for pack sync; no `bash` install is required |
| Port 19144 in use | Use the `Minecraft Bedrock Debugger (19145)` launch profile |

---

## 7. Common Debugging Patterns

### Watch Fish States
```javascript
// Set a breakpoint here to inspect love mode fish
if (isInLove(f)) {
  const matesNearby = getNearbyLoveFish(f);
  console.warn(`[DEBUG] Fish ${f.id} has ${matesNearby.length} mates nearby`);
}
```

### Monitor Entity Teleportation
```javascript
// Breakpoint in waypoint teleport function
console.warn(`[DEBUG] Teleporting ${entity.typeId} from ${source} to ${dest}`);
```

### Track Golem State Changes
```javascript
// Breakpoint before state update
console.warn(`[DEBUG] Golem ${golem.id} mode: ${golemStates.get(golem.id).mode}`);
```

---

## 8. Tips

- **Hover variables** in debug mode to see values
- **Conditional breakpoints**: Right-click breakpoint → add condition
- **Logpoints**: Right-click breakpoint → convert to logpoint (print without pausing)
- **Step through code**: F10 (step over), F11 (step into)
- **Continue execution**: F5

---

## Resources

- [Microsoft Minecraft Debugger Docs](https://learn.microsoft.com/en-us/minecraft/creator/)
- [GameTest Framework Reference](https://learn.microsoft.com/en-us/minecraft/creator/documents/gametestgettingstarted/)
- [Script API Documentation](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/scriptingapi/)

---

**Happy debugging!** 🐛
