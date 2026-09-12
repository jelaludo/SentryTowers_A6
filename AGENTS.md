# Library preferences

- Display complete web URLs as plain text so they can be copied.
- New or substantially revised 3D asset families should include a detailed master for close shots, animation and recordings, plus reduced game and distance/loading LODs where useful.
- Treat geometric LOD and file compression separately. Supply plain GLB files for compatibility and Meshopt-compressed GLBs for supported runtimes. Preserve originals.
- Keep coordinate systems, root placement, dimensions, damage-state identifiers, connection sockets and gameplay metadata consistent across LODs. Preserve animation pivots in the game tier; explicitly document static distance tiers.
- Include measured triangles, draw calls, byte sizes, LOD selection metadata, integration notes and viewer controls. Validate decoded compressed exports, not only plain files. Do not claim FPS improvements without measuring them.
- Prefer merged materials, shared geometry and instancing-friendly modules. Avoid tiny modeled surface details at distance. Keep damage states distinct from LOD levels.
