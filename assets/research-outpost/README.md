# Alien research outpost / batch 02

12 modular families, 48 GLBs. Preview at `research-outpost/`.

All assets use meters, +Y up and +Z forward, with their origin at the center of the reserved plot at foundation height. Four files per family share a plot and stable socket IDs: D0 intact, D1 damaged, D2 critical, D3 destroyed. Export one state per instance. Materials are shared within each GLB; there are no texture dependencies.

The manifest records district, reserved plot, connection transforms, geometry statistics, coarse collision boxes and damage behavior. Power/data/utility sockets are disabled at D2/D3. These are exterior art prototypes: building collision is deliberately conservative, interiors are reveal details rather than navigable rooms, and the garage road socket is unavailable pending an articulated vehicle door. Door navigation, physics, service routing and effects require engine integration. Damaged road/pad surfaces are flagged invalid; their conservative collision boxes must be replaced with engine-specific surface collision before driving or landing simulation.

The xenobiology vessels use opaque tinted pressure shells, not transparent glass. No runtime fracture simulation or mine behavior is included. Ruins contain bounded static debris. Plot sizes reserve approach space; service connections at plot borders are abstract interfaces, not complete utility-route geometry.

Rebuild:

```sh
/opt/homebrew/bin/blender --background --python-exit-code 1 --python tools/blender/build_research_outpost.py
node tools/asset-pipeline/validate-research-outpost.mjs
```

Editable source: `source/blender/a6-research-outpost.blend`. Families form rows and D0–D3 form columns, spaced 38 m apart. Source objects remain separate for editing; GLBs are uncompressed first-pass assets. Mesh merging and LOD authoring remain future optimization work.
