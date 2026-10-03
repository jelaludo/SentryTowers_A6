# MÖRK / Open-roof customization garage

A compact crew paint bay for the first terraforming settlement. Models by jelaludo. The garage is an original, separate module; the MÖRK shown in the viewer is the existing `assets/hover-tank/customization/models/lod1/mork_d0.glb` and is not duplicated in the garage export. The pad has no roof, two tripod lights, a side-mounted articulated spray arm, a workbench, a color-test board and small paint containers in six colors.

## Runtime contract

- Plain GLBs in `lod0/`, `lod1/`, `lod2/` are authoritative. `derived/meshopt/` is optional preview compression; release packing remains game-owned. Files are self-contained, vertex-colored, with no textures or external buffers.
- Metres, +Y up, +Z forward. `MORK_GARAGE_ROOT` sits at ground level at the center of a 12 × 18 m plot. The deck top is 0.28 m; place the separate tank's ground origin at `SOCKET_VEHICLE_ORIGIN` (0, 0.31, 0). The arm and bench remain outside the central vehicle bay. No roof or overhead structure is exported.
- D0 only. Damage states D1–D3 are future work, independent of LOD. LOD0 adds extra paint cans, lids and bench details for close shots. LOD1 keeps arm pivots and independently addressable light lenses. LOD2 is a single static mesh/material, with the arm in its parked pose and no lamp emission or motion; named pivot and socket empties remain for lookup.
- Runtime nodes: `ARM_BASE_YAW` around local Y, `ARM_SHOULDER`, `ARM_ELBOW` and `ARM_WRIST` around local Z. Pivots are unbaked. The viewer's `Garage_Paint_Cycle` is a 12-second looping demonstration controlled by `runtime.js`; there are no baked GLB clips. `SOCKET_SPRAY_NOZZLE` follows the wrist. `SPRAY_PLUME` is an optional translucent coral preview whose opacity the runtime controls during the paint phase; paint particles and actual livery transfer remain game effects.
- `LIGHT_LENS_L` and `LIGHT_LENS_R` are independently emissive in LOD0/1. Set emission and attach scene lights at `SOCKET_LIGHT_L` and `SOCKET_LIGHT_R` when the game declares a night cycle; the viewer has a manual night-cycle switch. The GLB contains no serialized Three.js lights. Do not rely on emission to light the vehicle. LOD2 uses static unlit lens colors.
- `SOCKET_POWER` and `SOCKET_PAINT_SUPPLY` identify interfaces; no consumption or inventory simulation is implied. The garage has no automated MÖRK livery binding. Apply recipes through the separate customization system.
- Suggested LOD policy: load LOD2 beyond 150 m, swap to LOD1 inside 150 m with 20 m hysteresis, retain LOD1 during service/painting, use LOD0 only for manual close-shot recordings. Game camera and device thresholds remain pending.

## Measured exports

| Tier | Triangles | Draws | Plain bytes | Decoded Meshopt bytes |
| --- | ---: | ---: | ---: | ---: |
| LOD0 detailed | 2,688 | 7 | 226,760 | 77,352 |
| LOD1 game | 1,704 | 7 | 150,416 | 54,772 |
| LOD2 static distance | 1,536 | 1 | 129,916 | 41,944 |

All game and distance landmark targets are met. Triangle and draw measurements exclude the separately displayed MÖRK and runtime scene lights. Exact hashes, bounds and socket positions are in `manifest.json`; there is no FPS claim.

## Ways to make it feel lived in

These are optional future additions, not included in the measured GLBs:

- A magnetic wall of paint swatches named for early landing sites, each with a crew vote and date.
- A hand-painted MÖRK mascot on a removable panel, with one deliberately bad first sketch left underneath.
- Shift mugs, a thermos and a small speaker clipped below the bench, outside the paint safety zone.
- A rotating “livery of the week” sign where each crew member gets one experiment before it is repainted.
- A transparent sample jar of local red dust used as pigment inspiration, plus a note on which colors survived weathering.
- An improvised photo mark on the floor for end-of-shift portraits, and a small pinned gallery of old liveries.
- Patch labels, jokes and tiny hand-lettered paint names on the containers; keep these as close-shot decals rather than distance geometry.
- A lightweight shade sail or retractable weather shield as a separate module when the world needs it, leaving this core asset open-roof.

The garage is a voluntary crew project: a place to try colors and record small wins while the wider planet is being terraformed.

## Source, validation and hand-off

Rebuild with `node tools/asset-pipeline/build-mork-garage.mjs`. Source geometry is in `mork-garage-shape.mjs`; runtime poses are in `runtime.js`. Validate with `node tools/asset-pipeline/validate-mork-garage.mjs`. `validation-report.json` records plain and decoded Meshopt results: hashes, triangle/draw parity, named nodes, zero degenerate triangles, night lens behavior and budget checks. The viewer at `mork-garage/` offers tier/encoding, cycle timeline, night-cycle lamps, MÖRK reference visibility, wireframe, cameras and GLB download.

Live game-camera review, Three.js r160/release gltfpack behavior, mobile appearance and reference-phone performance are pending. Hand-off is the delivery commit hash plus `assets/mork-garage/`; preserve the plain GLBs and mark derivatives.
