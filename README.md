# VillageCraft

A comprehensive Minecraft Bedrock add-on that introduces specialized villagers, custom golems, and advanced village infrastructure systems.

## Features

- **Architect Villager**: Uses enchanting table as workstation; trades enchanted materials and blueprints
- **Builder Villager**: Uses lodestone as workstation; provides construction materials and bulk supplies
- **Blank Blueprints**: Custom item system for capturing and sharing building designs
- **Archer Golem**: Custom combat entity with dynamic ammo switching based on target type
- **Village Waypoint Block**: Navigation hub with UI for village management and services

## Project Structure

```
VillageCraft/
├── behavior_pack/          # Core gameplay mechanics and entities
│   ├── entities/          # Custom entity definitions
│   ├── items/             # Custom item definitions
│   ├── blocks/            # Custom block definitions
│   ├── trading/           # Trading tier configurations
│   ├── scripts/           # GameTest/Script API implementations
│   └── manifest.json      # Behavior pack metadata
├── resource_pack/          # Visual and audio assets
│   ├── textures/          # Block and item textures
│   ├── models/            # Entity and block models
│   ├── render_controllers/# Animation and rendering logic
│   └── manifest.json      # Resource pack metadata
├── docs/
│   └── design-notes.md    # Complete system architecture and TODOs
└── README.md
```

## Getting Started

1. Clone this repository
2. Review `docs/design-notes.md` for architectural overview
3. Review the TODO items in the design notes for implementation priorities
4. Add entity, item, and block definitions in their respective folders
5. Test the add-on in Minecraft Bedrock with experimental features enabled

## Requirements

- Minecraft Bedrock Edition 1.20.0+
- Understanding of Minecraft add-on development
- JSON editing capability

## Installation

1. Copy `behavior_pack/` and `resource_pack/` folders to your Minecraft development folder
2. Enable experimental features in world settings
3. Create a new world and enable both packs

## Development Notes

- All systems include TODO comments for version-specific API implementations
- See `docs/design-notes.md` for detailed implementation guidance
- No unsupported Bedrock APIs are assumed in the codebase

## Roadmap

- [ ] Phase 1: Define custom entities and basic trading
- [ ] Phase 2: Implement waypoint system and UI forms
- [ ] Phase 3: Add blueprint capture and structure copying
- [ ] Phase 4: Integrate archer golem combat AI
- [ ] Phase 5: Testing and optimization for multiplayer compatibility
- [ ] Phase 6: Documentation and example worlds

## References

- [Minecraft Bedrock Creator Documentation](https://learn.microsoft.com/en-us/minecraft/creator/)
- [Add-on Development Guide](https://learn.microsoft.com/en-us/minecraft/creator/documents/addondocumentation/)
- [GameTest Framework](https://learn.microsoft.com/en-us/minecraft/creator/documents/gametestgettingstarted/)

## License

This project is provided as-is for personal use and learning purposes.

---

For questions or issues, check the design notes or open an issue in this repository.
