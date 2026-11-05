# PCS / Pallet cargo standard — P-01 + STRIDE-01

First prototype in the standardized pallet logistics series. **P-01** is a passive reusable pallet; **STRIDE-01** is an articulated carrier for moving the complete pallet from A to B. A quarter-footprint crate is included as an optional cargo gauge and reusable prop. Original geometry interprets the supplied cream, graphite and amber references. Dimensions and PCS are provisional project choices, not an external industry standard or an engineered load rating.

## Files, tiers and coordinates

Nine self-contained plain GLBs are authoritative. Optional `derived/meshopt/` files are compressed derivatives, validated after decoding. LOD0 is the detailed recording master; repeatable authoring source: `tools/asset-pipeline/pallet-cargo-shape.mjs`. LOD1 is reduced and articulated. LOD2 is reduced geometry merged into one static mesh/material per module; matching lookup hierarchy/rest frames remain but must not be articulated. Previews are derived browser renders, not concept art.

Metres, +Y up, +Z forward, ground-centred roots: `PALLET_ROOT`, `STRIDE_ROOT`, `CRATE_ROOT`. Names, parent/rest frames, bounds, sockets and gameplay metadata are consistent across tiers. **D0 intact only**; D1–D3 are future damage work, independent of LOD. Each module uses one vertex-colour palette, no textures and no baked clips.

## Interface / PCS_120_100_V1

- Pallet: **1.20 × 1.00 × 0.16 m**. Three bottom runners, nine spacer blocks and five slats. Four-way fork access: front lanes 390 mm wide, side lanes 290 mm wide, vertical clearance 95 mm. This describes clear geometry, not certification for an existing forklift.
- Lock pattern: **X ±0.53 / Z ±0.43 m** (1.06 × 0.86 m pitch). `SOCKET_BOTTOM_LOCK_FL/FR/RL/RR` at Y=0 and `SOCKET_TOP_LOCK_*` at Y=0.16. FL/FR use +Z; L/R use −X/+X. Receiver axis: +Y.
- `SOCKET_CARGO` and `SOCKET_STACK`: (0, 0.16, 0). Empty pallet stack pitch: 0.16 m. Silver receivers and amber tags are passive; the pallet has no electronics or moving rig.
- Parent a pallet with identity local transform to STRIDE's `SOCKET_PALLET`, under `CHASSIS_HEAVE`. At nominal chassis height 0.68 m, pallet origin is Y=0.81 m and deck Y=0.97 m. Four `SOCKET_PALLET_LOCK_*` meet the bottom sockets exactly. The viewer uses equivalent world placement for module separation.
- Crate: **0.56 × 0.46 × 0.36 m**. Four use centres X=±0.30 / Z=±0.25 above `SOCKET_CARGO`, leaving 40 mm gaps. Crate stack socket: Y=0.36. Individual crate restraints and opening lids are not yet rigged.
- STRIDE nominal envelope: **2.072 × 1.210 × 0.833 m** before pallet/cargo. Reserve a 2.2 × 1.4 m plot in the straight pose; steering changes the swept envelope. No collision mesh, load rating, traction or loading mechanism is supplied.

## Runtime and LOD selection

Import `applyStride` and `transportPose` from `runtime.js`. Pass the actual `STRIDE_ROOT` object to `applyStride(root, {height, steer, travel, lock})`.

- `CHASSIS_HEAVE`: local Y position clamped to 0.60–0.76 m. Two-link IK uses 0.30 m upper and 0.34 m lower links, keeping wheel centres at Y=0.205 m on a level floor.
- `LEG_{id}_HIP_PITCH`, `LEG_{id}_KNEE_PITCH`, `LEG_{id}_ANKLE_ROLL`: local Z motors. The ankle cancels accumulated link angles. Names are semantic; the exact axes are declared in node metadata.
- `WHEEL_{id}_YAW`: local Y, front/rear counter-phase ±0.6 rad for inspection. `WHEEL_{id}_ROLL`: local X, signed travel / 0.205 m radius. Transport uses straight steering.
- `LOCK_{id}_YAW`: local Y, 0 open to π/2 secured; normalized `lock` input 0–1. These are visual quarter-turn heads; detailed receiver internals and mechanical strength remain future engineering work.

**Pallet_Transport_Cycle** is a **20-second looping runtime study**, not a GLB clip: hold at A (0–2 s), move 3.4 m to B (2–8 s), hold (8–12 s), reverse to A (12–18 s), hold (18–20 s). Smooth travel drives rolling. Cargo stays secured throughout; delivery is a position hold. Unloading, independent pallet exchange, pathfinding and physical terrain solving are not implemented.

Use LOD1 before gameplay articulation; explicitly select LOD0 for recordings. Proposed loading/map policy: distance first, game inside 150 m, static beyond 170 m. These thresholds are unmeasured and provisional. Shared geometry/palette support downstream instancing; viewer crate and return-stack repetitions share geometry but use individual draws. Static tiers ignore articulation commands.

## Measured exports

| Module | Tier | Triangles | Draws | Plain bytes | Meshopt bytes |
| --- | --- | ---: | ---: | ---: | ---: |
| pallet | LOD0 | 3,284 | 1 | 220,608 | 53,988 |
| pallet | LOD1 | 1,012 | 1 | 75,068 | 21,744 |
| pallet | LOD2 | 372 | 1 | 32,404 | 11,184 |
| stride | LOD0 | 16,372 | 21 | 913,996 | 151,992 |
| stride | LOD1 | 6,236 | 21 | 421,668 | 89,640 |
| stride | LOD2 | 2,876 | 1 | 196,144 | 60,208 |
| crate | LOD0 | 792 | 1 | 68,736 | 19,396 |
| crate | LOD1 | 716 | 1 | 62,232 | 17,876 |
| crate | LOD2 | 372 | 1 | 32,572 | 10,132 |

Pallet/crate game meet the 1.5k-triangle / five-draw base-piece target. STRIDE game meets the 25k articulated-unit triangle target; 21 draws retain independent locks, links, uprights and wheels. Its 421,668 plain bytes exceed the separate 400 KB landmark reference; the contract specifies no unit byte cap. All distance modules meet 3k triangles / one draw / 250 KB. No FPS or reference-phone performance claim is made.

## Viewer and validation

Route: `pallet-cargo/`. Assembly, pallet, carrier, five-pallet return stack and crate views; tier/encoding, cargo, separation, transport, pause/reset/scrub, lift, steering, locks, sockets, wireframe, four cameras, fit, fullscreen and per-module downloads. Static distance disables rig controls. Shared navigation is generated by `tools/build-workshop-docs.py`.

Build: `node tools/asset-pipeline/build-pallet-cargo.mjs`. Validate: `node tools/asset-pipeline/validate-pallet-cargo.mjs`. Browser checks: `node tools/asset-pipeline/test-pallet-cargo-viewer.mjs`, with the repository served and local Playwright/Chromium paths supplied via environment variables if necessary.

`validation-report.json` records 18 plain/decoded files with zero glTF errors/warnings, finite nondegenerate geometry, stable names/frames/bounds, clear fork passages, exact pallet/crate envelopes, 324 suspension/steering/rolling poses, matching locks and static lockout. 1,201 transport samples check travel range and cycle continuity. `viewer-validation.json` covers 30 configuration/tier/encoding combinations, downloads, controls, four cameras, desktop/mobile framing and zero browser errors. These are geometry and kinematic checks, not general self-collision, terrain or force certification.

## Handoff and pending requests

Hand off the **containing repository commit plus `assets/pallet-cargo/`**, pinning individual SHA-256 values from `manifest.json`. Include the viewer/generator for review or re-authoring. Credit: **Models by jelaludo**. Concept provenance is in `reference-provenance.json`; user originals remain unchanged outside the repository. Existing asset families and the received collaboration contract are unchanged.

Completed: P-01, STRIDE-01, optional crate, three tiers, compatible sockets, level-floor articulation, 20-second transport, viewer, previews and measured validation. Pending: visual acceptance and dimension confirmation, D1–D3, physical locks/load rating, pickup/drop-off, terrain/collision/traction, consuming-game r160/release gltfpack checks, LOD thresholds and phone acceptance. CUP, STEP and the return rack are possible later assets, not delivered models.
