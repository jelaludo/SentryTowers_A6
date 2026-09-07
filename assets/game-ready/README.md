# HUGIN and Stålheart / Game geometry

Eight reduced GLBs: HUGIN and Stålheart, each in D0–D3. The target is approximately **40,000 rendered triangles per complete asset per destruction state**. Displaying both intact assets together uses 80,237 triangles, excluding the workshop ground/grid.

| Asset | State | Original triangles | Game triangles | Original → game material batches |
|---|---|---:|---:|---:|
| HUGIN | D0 | 91,428 | 39,731 | 408 → 90 |
| HUGIN | D1 | 92,940 | 39,727 | 422 → 91 |
| HUGIN | D2 | 93,948 | 40,284 | 430 → 93 |
| HUGIN | D3 | 40,064 | 40,064 | 195 → 47 |
| Stålheart | D0 | 165,404 | 40,506 | 782 → 105 |
| Stålheart | D1 | 167,564 | 40,009 | 802 → 106 |
| Stålheart | D2 | 160,836 | 40,254 | 787 → 59 |
| Stålheart | D3 | 70,732 | 39,639 | 344 → 25 |

HUGIN D3 already meets the triangle target; its geometry is retained and compatible parts are batched. Batch counts are mesh/material primitives before shadows and additional render passes, not a whole-engine performance measurement.

[Game asset workshop](../../game-assets/) shows both models at a shared meter scale. It supports D0–D3, game/original comparison, individual views, animation scrubbing and downloads. The detailed originals remain available in [HUGIN](../../launchpad/) and [Stålheart](../../terraformer/).

Editable reduced scenes: [HUGIN game Blender](../../source/blender/a6-launchpad-game.blend) and [Stålheart game Blender](../../source/blender/a6-terraformer-game.blend). Blender scenes retain individual reduced objects for editing; final GLBs batch compatible sibling meshes within their existing transform hierarchy.

## Rebuild and validate

```sh
blender --background --python-exit-code 1 --python tools/blender/build_game_lods.py
node tools/asset-pipeline/build-game-assets.mjs
node tools/asset-pipeline/validate-game-assets.mjs
```

The first step reads the detailed `.blend` sources, tunes collapse decimation to the triangle budget, bakes reduced mesh data, and writes separate reduced `.blend` scenes and GLBs. The second step welds/deduplicates data and batches compatible sibling geometry by material. No Draco or meshopt decoder extension is required to load these GLBs.

The pipeline preserves source animation timing, moving assemblies, named control pivots, semantic sockets, materials and state origins. Static decorative mesh names can be merged or removed. Validation checks all eight files, actual rendered triangle and batch counts, key node existence, world transforms at sampled animation times against the originals, and overall bounds. D0/D1 retain HUGIN's 20-second cargo recovery and Stålheart's 16-second construction cycle. D2/D3 remain static replacement states.

These variants reduce geometry and batches; they are not automatic distance-based LOD chains. Physics colliders, runtime state/LOD selection, cargo ownership changes and gameplay simulation remain the consuming engine's responsibility. Original integration notes still apply. Reduced bevels, round surfaces and small markings are intended for normal gameplay distances.
