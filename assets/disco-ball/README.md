# DSC-01 / Celebration Disco Ball with Laser and Lights

An improvised settlement celebration module built by the crew from spare HEL-01 heliostat mirror tiles, LIT-01 alignment lasers and MÖRK service floodlights. Models by jelaludo. The asset works both as a standalone `8 × 8 m` dance-pad celebration rig on the ground and as a suspended balance-ball pendulum hanging from Stålheart’s gantry in the congratulation diorama (`stalheart-disco/`).

## Runtime contract

- Plain GLBs in `lod0/`, `lod1/`, `lod2/` are authoritative. `derived/meshopt/` provides optional preview compression; release packing (`gltfpack -cc -kn -km -ke`) remains game-owned. Files are self-contained and vertex-colored with zero external textures or buffers.
- Metres, `+Y` up, `+Z` forward. `DISCO_BALL_ROOT` sits on the ground at `(0, 0, 0)` at the centre of an `8 × 8 m` plot.
- Intact `D0` only. Damage states `D1–D3` are not authored; damage state remains independent of detail tier.
- `STANDALONE_CRADLE` is the four-leg portal truss and octagonal floor calibration pad used when the rig stands on its own plot. Hide `STANDALONE_CRADLE` (`visible = false`) when suspending the rig from Stålheart’s gantry at `SOCKET_GANTRY_HOOK` `(0, 6.2, 0)`.
- `DISCO_PENDULUM_PIVOT` at `(0, 6.2, 0)` swings the suspended assembly around the top hoist point (`XZ` axes). Child runtime pivots are unbaked:
  - `LIGHT_HALO_YAW` (`+Y`) rotates the upper octagonal lighting halo at `y = 4.9 m`, with `SPOTLIGHT_POD_PITCH` (`+X`) tilting the four party floodlights and `LIGHT_LENS_ARRAY` driving emissive lens output.
  - `LASER_RING_YAW` (`+Y`) counter-rotates the laser turret ring at `y = 4.35 m`, with `LASER_EMITTER_PITCH` (`+X`) sweeping the four laser projectors, `LASER_APERTURE_ARRAY` controlling aperture emission and `LASER_BEAM_PREVIEW` providing an optional translucent beam-cone preview.
  - `DISCO_SPHERE_SPIN` (`+Y`) rotates the `2.7 m`-diameter faceted mirror ball centred at `SOCKET_BALL_CENTER` `(0, 3.0, 0)`.
- All 27 engine and socket lookup names (`ENGINE_NODES`) are preserved without dots across `LOD0`, `LOD1` and `LOD2`. `LOD2` merges geometry into a single static mesh and material (`DISCO_STATIC_BODY`, 1 draw call) while retaining every pivot and socket as a non-articulating lookup node at its rest transform.
- Suggested LOD policy: load `LOD2` beyond `150 m`, swap to `LOD1` inside `150 m` with `20 m` hysteresis, retain `LOD1` while the celebration sequence is active, and use `LOD0` for close-shot cutscenes and recordings.

## Measured exports

| Tier | Triangles | Draws | Plain bytes | Decoded Meshopt bytes |
| --- | ---: | ---: | ---: | ---: |
| LOD0 detailed | 5,876 | 8 | 645,800 | 207,052 |
| LOD1 game | 3,244 | 8 | 361,576 | 122,152 |
| LOD2 static distance | 2,244 | 1 | 246,976 | 76,872 |

Both `LOD1` (≤ 8,000 triangles, ≤ 10 draws, ≤ 400 KB plain) and `LOD2` (≤ 3,000 triangles, 1 draw, ≤ 250 KB plain) meet the landmark budget targets. Exact SHA-256 hashes, bounds, colliders and socket coordinates are recorded in `manifest.json`. No FPS claim is made.

## Source, validation and hand-off

Rebuild with `node tools/asset-pipeline/build-disco-ball.mjs`. Source geometry is in `tools/asset-pipeline/disco-ball-shape.mjs`; runtime choreography is in `assets/disco-ball/runtime.js`. Validate plain and decoded Meshopt files with `node tools/asset-pipeline/validate-disco-ball.mjs`. The standalone viewer is at `disco-ball/` and the Stålheart gantry congratulation diorama is at `stalheart-disco/`. Hand-off is the delivery commit hash plus `assets/disco-ball/`.
