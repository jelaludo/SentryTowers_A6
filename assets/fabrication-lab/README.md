# Stålheart / MÖRK fabrication

Models by jelaludo. This scene reuses the existing Terraformer 3000 / Stålheart and MÖRK tank assets. It does not redesign either asset. Plain GLB files are the hand-off source of truth; `.meshopt.glb` files are derived release previews and require `EXT_meshopt_compression` decoding.

## Construction behavior

`MORK_Fabrication_Sequence` is a 16-second one-shot in LOD0 and LOD1. It retains the useful Stålheart motion from `Terraforming_Cycle` and adds two construction stages:

- `MORK_STAGE_01_CHASSIS_HULL` forms from 0.6 to 7 seconds.
- `MORK_STAGE_02_TURRET_WEAPONS` forms from 8 to 16 seconds.
- `MORK_BUILD_LATTICE` is a simplified internal structural lattice. It sits inside the armor instead of sharing coplanar surfaces, preventing wireframe z-fighting.
- `FABRICATION_FRONT` carries the moving cyan construction boundary.

The MÖRK operational clips are deliberately excluded while the tank is under construction. The source tank hierarchy remains under `MORK_ROOT`; the two construction-stage nodes are the additional clip targets. Engine code should clamp the one-shot at its end if the completed pose must persist.

## Export tiers

| Tier | Triangles | Draw calls | Plain GLB | Meshopt GLB | Intended use |
| --- | ---: | ---: | ---: | ---: | --- |
| LOD0 detailed | 191,462 | 853 | 12,673,640 bytes | 1,905,684 bytes | Close shots, animation review and recordings |
| LOD1 game | 7,261 | 10 | 863,160 bytes | 238,100 bytes | Active gameplay fabrication sequence |
| LOD2 distance | 2,336 | 1 | 178,872 bytes | 77,052 bytes | Static 50% state for distance and initial loading |

LOD1 meets the triangle and draw-call targets. Its plain animated GLB exceeds the 400 KB transfer target; the optional decoded Meshopt copy is about 233 KB. Meshopt uses filter mode without position quantization so tiny source features do not collapse into degenerate triangles. LOD2 meets the 3,000-triangle, one-draw and 250 KB plain targets. These are measured export properties, not FPS measurements.

Only the intact D0 fabrication scene is authored. D1–D3 fabrication states are not supplied or implied; damage-state work remains separate from detail selection.

LOD2 retains the named hierarchy and metadata but contains one merged static visual mesh and no animation. It must not be presented as an animating tier. Load it first if useful, then approach LOD1 at the game-specific threshold. The manifest proposes 150 m with 20 m hysteresis as a starting point; tune this against the actual camera and reference phone.

## Coordinates and integration

All tiers use meters, +Y up and +Z forward. `ROOT` remains at the Stålheart plot origin. Stålheart and MÖRK engine-facing nodes remain dot-free and stable across tiers, including gantry and arm pivots. The tank build origin is exposed as `SOCKET_FABRICATION_ORIGIN`. Coarse reserved-machine and build-bay collider metadata is in `manifest.json`; it is not a detailed physical collision mesh.

AFR-9 is the fiction for the process: a magnetically aligned ferroceramic load lattice receives a rapid-sinter metal-ceramic skin. Cyan lines show energized structural paths; completed armor becomes opaque as the field cools.

Rebuild with `node tools/asset-pipeline/build-stalheart-mork-fabrication.mjs`. Validate both plain and decoded Meshopt files with `node tools/asset-pipeline/validate-stalheart-mork-fabrication.mjs`.
