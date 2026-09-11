# Base kit — game-ready meshes

Also included: **foundation_slab.glb**, a scalable 40 × 40 m island slab with a 1.2 m skirt, only 28 triangles at every island size. See `FOUNDATION-SLAB.md`. The individual 4 × 4 tile is retained.

Lightweight counterparts of all seven original foundation, wall, corner and gate exports. Original model by **jelaludo**; retain attribution under `../../ASSET-LICENSE.md`.

The existing `base-kit/` 3D viewer defaults to this tier. Select **Original / detailed** to compare, or **Repeated modules / performance** to inspect 100, 400 or 1,000 modules with live frame interval, FPS, triangle and draw counts. GPU instancing is enabled by default. Shadows are opt-in. The uninstanced original tier is limited to 100 modules to keep the comparison usable.

| Module | Original triangles | Game triangles | Reduction | Game draws* |
| --- | ---: | ---: | ---: | ---: |
| Foundation | 2,200 | 120 | 94.5% | 1 |
| Straight wall / D0 | 5,856 | 376 | 93.6% | 1 |
| Straight wall / D1 | 9,680 | 716 | 92.6% | 1 |
| Breached wall / D2 | 6,446 | 852 | 86.8% | 1 |
| Destroyed wall / D3 | 1,832 | 520 | 71.6% | 1 |
| Corner | 9,212 | 536 | 94.2% | 1 |
| Vehicle gate | 17,120 | 1,224 | 92.9% | 5 |

*Per visible module, per color pass before instancing; shadow passes add work. Gate = static frame + four animated slats. Every export uses one opaque vertex-color material and no textures. The previous material palette is baked into vertex colors; tiny bevels, bolts and mesh lettering are omitted. Surface roughness/metalness is shared, and indicator strips are colored rather than emissive. The kit uses no runtime compression extensions or special decoder.

## Repetition and engine integration

Share mesh/material resources across copies and use GPU instancing (or your engine's equivalent). A 1,000-module mix of 600 foundations, 300 walls and 100 corners is **238,400 triangles in three instanced color-pass draws**, rather than one draw per placed object. The viewer actually uses `THREE.InstancedMesh` for this mode; turning instancing off creates ordinary mesh copies sharing geometry/materials.

That is a geometry/draw budget, not an FPS guarantee. Resolution, shadows, lighting, GPU, physics, and the rest of the scene determine frame rate. The viewer's live FPS measures its frame interval on your device and can be limited by display refresh. The 1,000-module game-tier preview was observed at approximately 60 FPS / 16.7 ms and three draws in Safari on the development machine with shadows off; this is a local observation, not a cross-device FPS target.

Use spatial batches in a larger game so off-screen sections can be culled. For individual damage changes, move the affected instance to the matching D1/D2/D3 batch. Do not create a unique material for each placement. Share the palette material across imported modules if your loader creates separate equivalent material objects.

Meshes retain their authored local transforms. In Three.js, call `template.updateMatrixWorld(true)` and set each instance matrix to `placementMatrix × mesh.matrixWorld` when collecting meshes from a template at the origin. Copying only the geometry without this transform can misplace parts. The gate's four slat pivots remain separate for animation; instance each moving assembly separately if gates need independent opening times.

## Unchanged placement and gameplay contract

- Metres, +Y up, +Z forward; `ROOT` at original module origin.
- Same 4 m foundation grid, wall/corner/gate socket positions and outward normals.
- Same typed sockets, damage availability, coarse colliders and clearance metadata in `manifest.json`.
- D0/D1 block passage; D2/D3 retain their central pedestrian openings.
- The gate retains its 1.6-second `Gate_Open` clip and four animated `GATE_SLAT_00`–`03` nodes. All slats clear 3.8 m when open.
- Foundation support socket is Y=0 and slab bottom is Y=−0.38 m. Tiny corner locating pads rise to Y=0.007 m, as on the original.

Use manifest collision boxes rather than visual mesh colliders for repeated intact modules. Update collision, navigation and socket availability when damage or gate state changes. These exports do not provide engine physics or navigation systems.

## Source and rebuild

Editable Blender source: `../../source/blender/a6-wall-kit-game.blend`. The original detailed source and exports remain available separately.

```sh
blender -b --python-exit-code 1 --python tools/blender/build_wall_kit.py -- --game
node tools/asset-pipeline/validate-wall-kit.mjs assets/base-kit-game/
node tools/asset-pipeline/validate-base-kit-game.mjs
```

The builder shares the original construction geometry code, removes fine details, bakes colors and merges each rigid assembly. Running without `--game` rebuilds the detailed originals. All seven lightweight GLBs pass Khronos validation with zero errors/warnings; additional checks enforce budgets, vertex colors, one material, placement metadata, socket transforms, passage rays and the animated gate clearance.
