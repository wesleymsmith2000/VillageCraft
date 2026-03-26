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
- Current debug target: `DEV 1.0.21`
- Current behavior pack script entry: `scripts/hanging_ladder_full.js`
- Current verification signal: repeating heartbeat message `VillageCraft DEV 1.0.21 hanging ladder heartbeat`
- The heartbeat probe build worked previously under `DEV 1.0.20`.
- The sanitized full ladder build is the current active experiment.

### Portfolio / Blog Angles
- Debugging a game runtime by separating pack-install problems from world-state problems.
- Using probe entrypoints and heartbeat signals instead of trusting one-shot startup messages.
- Diagnosing Bedrock add-on issues through versioning, manifest identity, world metadata, and script runtime isolation.
- Treating toolchain friction as part of product engineering, not just "game modding."

### Next Likely Steps
- Confirm whether the sanitized full ladder heartbeat appears under `DEV 1.0.21`.
- If it fails, continue bisecting `hanging_ladder_full.js` until the exact Bedrock-incompatible construct is isolated.
- Once the full ladder script loads reliably, restore placement debugging and verify actual in-game placement behavior.
