# Wall kit 01

Lightweight, merged **game-ready versions** of all seven modules are available in `../base-kit-game/`. The 3D viewer now defaults to these and includes original/game comparisons and a 100–1,000-module instancing view.

First Blender-authored construction kit for the base research. The [preview](../../base-kit/) shows each module, damage selection, gate opening, socket/collider helpers and a connected assembly. These are prototype assets; only the straight wall has damage variants in this delivery.

| Export | Dimensions / state |
| --- | --- |
| `wall_standard_d0.glb` | 4 m long, 3.2 m tall; intact |
| `wall_standard_d1.glb` | Damaged armor, scoring/cracks and fault indicators; still blocking |
| `wall_standard_d2.glb` | Authored central breach and exposed reinforcement |
| `wall_standard_d3.glb` | End stumps, fragments and bounded rubble |
| `wall_corner_d0.glb` | 90° corner; two 2 m arms in a 4 × 4 m plot |
| `gate_vehicle_d0.glb` | 12 × 8 m plot, 8 m opening; four telescoping slats |
| `foundation_flat_d0.glb` | 4 × 4 m slab; top support plane at zero, bottom at −0.38 m |

## Source and regeneration

Editable source: `source/blender/a6-wall-kit.blend`. Collections separate the seven modules and arrange them as a gallery. The gate is closed at frame 1 and open at frame 49. Gallery placement offsets are for reviewing the source only; each GLB exports at its own origin.

Run from project root:

```sh
blender --background --python-exit-code 1 --python tools/blender/build_wall_kit.py
```

This rebuilds the source file and exports from the script. Preserve manual `.blend` edits in a separate file or incorporate them into the builder before regenerating. The builder refuses to run inside the live Blender GUI, so it cannot clear the current interactive scene.

## Integration contract

GLBs use meters, +Y up and +Z forward. `ROOT` stays at the center of the plot at support height. The JSON manifest is the source for plot reservations, available typed sockets, coarse collider boxes and declared clearance regions. Every socket node's local +Z points along its outward normal.

- Wall endpoints are X = ±2 m. Corner sockets are +X = 2 m and +Z = 2 m.
- Gate wall sockets are X = ±6 m; road sockets are Z = ±4 m. A 12 m plot is needed to put supports outside the 8 m vehicle opening. This corrects the earlier 8 m-wide plot assumption in the design catalog.
- `Gate_Open` is one 1.6-second animation affecting `GATE_SLAT_00` through `_03`. Scrub or reverse it for closing. The preview keeps the conservative closed collision box until the animation is fully open; an engine may use animated per-slat colliders instead.
- D0 and D1 wall collision stays blocking. D2 and D3 have a declared central 1.2 m-wide, 2.4 m-high pedestrian corridor. Sampled ray tests confirm empty geometry through this region; this is not a substitute for the consuming engine's swept character-capsule tests.
- D3 retains socket locations for reconstruction but marks the wall connections unavailable. Damage state must update the connection graph as well as the visible mesh.
- Collider boxes live in `manifest.json`, not visible mesh geometry. Helpers in the preview visualize them. No physics, navmesh rebuild, health system or automatic fragmentation simulation runs on this page.
- Material names and moving assemblies are preserved. Exported meshes remain separate for editing and inspection; production batching should merge compatible materials within each static or moving assembly, preserving sockets and slat animation.

The example assembly has six wall-to-wall joins, matched by position and opposite socket normals. It is a connection study rather than a closed or operational base. All assets use local planar plots; spherical terrain adapters remain future work.

## Checks

All seven GLBs passed the Khronos validator with zero errors and warnings. Additional checks cover exported socket transforms, sampled clear/blocked wall passages, all four raised gate slats above 3.8 m, and the six assembly joins. Browser review covered every export, the opening animation and the connected assembly.

Install the dependencies in `tools/asset-pipeline`, then run `node tools/asset-pipeline/validate-wall-kit.mjs` from project root to repeat structural checks. Preview tests used local Chromium and the same pinned Three.js version as the page.

Next art stages: damaged corner/gate/slab variants, richer fracture surfaces, directional damage variants and production batching. Barracks and other buildings are not part of this first kit.
