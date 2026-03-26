# VillageCraft Development Journal

## 2026-03-25

### Context
- Goal: make the hanging ladder place reliably and support hanging placement from above.
- Secondary goal: get Bedrock script/runtime behavior stable enough to debug the ladder in-game with confidence.

### What Changed
- Added and iterated on hanging ladder placement logic, support validation, sounds, and debug messaging.
- Added real pack UUIDs instead of placeholder all-zero UUIDs.
- Standardized pack version bumps across repeated debug builds.
- Switched the behavior pack between multiple script entrypoint strategies to isolate Bedrock runtime issues.
- Preserved the full ladder implementation in `behavior_pack/scripts/hanging_ladder_full.js`.
- Added a separate probe entrypoint in `behavior_pack/scripts/bedrock_probe.js` for runtime verification.

### Key Findings
- The pack sync/install path was initially wrong for this machine. The active Bedrock root is the Roaming path, not just the UWP LocalState path.
- Old `.mcaddon` imports created stale pack entries and confusion in the world menus.
- A fresh world successfully ran a repeating script heartbeat, proving Bedrock scripting can work on this install.
- Several one-shot startup message tests were likely false negatives because Bedrock appears to drop very early chat/action-bar messages.
- The full ladder script appears to hit Bedrock compatibility issues that do not affect the tiny probe script.
- Bedrock is sensitive enough here that script entrypoint choice, parser/runtime compatibility, and message timing all had to be tested independently.

### Current State
- `DEV 1.0.22` successfully showed the repeating heartbeat from `scripts/hanging_ladder_full.js` in a fresh world.
- That confirms the real hanging ladder script now loads on this Bedrock runtime.
- `DEV 1.0.23` also loaded, with both the heartbeat and the general VillageCraft startup messaging visible in-world.
- Current debug target: `DEV 1.0.26`
- Current behavior pack script entry: `scripts/hanging_ladder_full.js`
- Current verification signal: repeating heartbeat message `VillageCraft DEV 1.0.26 hanging ladder heartbeat`
- Focus has shifted back from script startup to actual hanging ladder placement behavior.
- New placement finding: the interact handlers were reading `event.face`, but the Bedrock Script API exposes `blockFace` on player-block interaction events.
- Latest debug change: placement diagnostics now write to both the action bar and chat, and they fire earlier in the interaction path to prove whether the ladder-use event is reaching script at all.
- Latest placement clue: Bedrock is delivering `blockFace` values like `West`, while the ladder offset helper was only matching lowercase face names. `DEV 1.0.26` normalizes direction strings before computing the target placement position.

### Portfolio / Blog Angles
- Debugging a game runtime by separating pack-install problems from world-state problems.
- Using probe entrypoints and heartbeat signals instead of trusting one-shot startup messages.
- Diagnosing Bedrock add-on issues through versioning, manifest identity, world metadata, and script runtime isolation.
- Treating toolchain friction as part of product engineering, not just "game modding."

### Next Likely Steps
- Verify that `DEV 1.0.26` still shows the heartbeat in a fresh world after the face normalization fix.
- Retest actual hanging ladder placement from inventory and extension placement from an existing ladder.
- If placement still fails, capture the exact action-bar message to determine whether support validation or block placement is rejecting the action.
