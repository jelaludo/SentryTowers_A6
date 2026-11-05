# PCS / P-01, STRIDE-01 and CUP-01

Revision 2 gives STRIDE a 45-degree corner stance, independently swivelling wheels and compact telescopic suspension inspired by the repository's Nih-Dairia mechanism. CUP-01 is a separate pressurized-bay loader with four flexible suction cups, an articulated arm and a complete pallet-to-pallet crate transfer study. The original cream/graphite/amber visual language and provisional 1.20 × 1.00 m pallet standard remain.

## Files and preservation

Twelve self-contained plain GLBs are authoritative. Each module has a detailed recording master (LOD0), articulated/reduced game version (LOD1) and one-mesh/one-material static loading/map version (LOD2). `derived/meshopt/` contains optional compressed copies validated after decoding. All files use metres, +Y up, +Z forward and ground-centred module origins; one vertex-colour palette, no external textures and no baked clips. D0 is the only authored damage state. LOD2 preserves the same named lookup hierarchy/rest frames but ignores articulation.

`revisions/r1/` preserves the first release from commit `610d174e57cb488bf3fbbd4a54ee43d6147d1872`, including all original exports, runtime, manifest, reports, previews and source snapshots. `preservation.json` records their hashes. Current pallet and crate GLBs, including their Meshopt copies, remain byte-identical. STRIDE's older engine node names remain, but new splay/slide parents and wheel-centred steering change its rig frames: deploy r2 model and r2 runtime together. `revision-2.json` documents that migration; the archived source snapshots restore their original relative locations when used with the original checkout.

## Shared cargo interface

P-01 remains **1.20 × 1.00 × 0.16 m**. Its five slats, three runners and nine spacers provide four-way fork entries: 390 mm front-lane width, 290 mm side-lane width, 95 mm height. Four locks are at X=±0.53 / Z=±0.43 m, with bottom sockets at Y=0 and top sockets at Y=0.16. FL/FR are +Z; L/R are −X/+X. Locks face +Y. `SOCKET_CARGO` and `SOCKET_STACK` are (0, 0.16, 0); empty return pitch is 160 mm. The pallet is passive.

Parent `PALLET_ROOT` with identity local transform to STRIDE's `SOCKET_PALLET`, under `CHASSIS_HEAVE`. At nominal chassis height 0.68 m, pallet origin is Y=0.81 and deck Y=0.97. All four `SOCKET_PALLET_LOCK_*` match `SOCKET_BOTTOM_LOCK_*` through the lift range. Quarter-footprint crates remain **0.56 × 0.46 × 0.36 m**, on a 600 × 500 mm cell grid, with 40 mm gaps and a top stack socket at Y=0.36. Individual crate restraints and opening lids are not rigged.

## STRIDE / 45-degree stance and suspension

`applyStride(STRIDE_ROOT, options)` accepts `height` (0.60–0.76 m), `steer` (common heading in radians), `headings` (independent FL/FR/RL/RR headings), `travel` / `wheelTravel` (signed metres), `suspension` (independent signed metres, −0.035…+0.035), and `lock` (0 open to 1 secured). Omitting steer/headings uses the 45-degree ready stance. Headings are relative to the robot root, measured from +Z toward +X. There is no ±34-degree steering limit: all four kingpins support continuous rotation.

Each `LEG_{id}_SPLAY_YAW` turns its corner outward 45 degrees. Existing hip/knee motors rotate local Z; a new `LEG_{id}_SUSPENSION_EXTEND` translates along local −Y. The upper link is 0.30 m and the lower knee-to-ankle span is 0.34 m plus the requested stroke. The fixed dark barrel receives a rigid silver rod with at least 75 mm overlap; rod diameter/length are never scaled. `LEG_{id}_ANKLE_ROLL` cancels leg pitch. `WHEEL_{id}_YAW` rotates about local Y through the wheel centre line; `WHEEL_{id}_ROLL` is local X at a 0.205 m radius. The wheel centre is 0.10 m below its kingpin. Steering does not orbit the contact centre.

Wheel centres remain at X=±(0.59+0.43/√2), Z=±(0.40+0.43/√2), Y=0.205 on a level floor. Nominal measured envelope: approximately **2.177 × 1.797 × 0.833 m** before cargo. Reserve **2.4 × 2.0 m** for the straight chassis and swivel sweep. The original pallet lock/deck heights are unchanged.

`strideStudy(time, mode)` offers forward, sideways and diagonal 20-second travel loops, a 20-second **one-shot** 360-degree turn and a six-second independent suspension loop. Body heading stays fixed during crab/diagonal travel. Turning uses per-wheel tangent headings and path lengths. Named studies and durations are in the manifest. The turn stops after one revolution rather than resetting wheel roll at its boundary. These are kinematic studies, not navigation, terrain or force simulation.

## CUP / suction transport

CUP has a compact four-wheel base, 360-degree arm base yaw, 0.64 m upper arm, 0.60 m forearm and a counter-rotating wrist. `applyCup(CUP_ROOT, {target, vacuum, travel})` aims at a crate-top contact point in robot-root metres, compresses the four rubber bellows by up to 18%, and keeps the head level and square. Metal rods and the spreader remain rigid. `CUP_SHOULDER_PITCH` and `CUP_ELBOW_PITCH` rotate local X; `CUP_WRIST_LEVEL` cancels both pitch and base yaw. The adapter rejects unreachable targets.

Four `CUP_PAD_{id}_COMPRESS` controls sit at X=±0.16 / Z=±0.12 m. `SOCKET_CUP_PAD_*` describes each lip contact; all face −Y and stay coplanar. `SOCKET_CARGO_GRIP` is the centre of that plane. Attach a crate there with local translation (0, −0.36, 0) and identity rotation. Rubber compression changes the lip offset from 0.22 to 0.1984 m; the solver compensates to keep contact fixed. The base wheels have a 0.18 m rolling radius. Reserve **2.8 × 2.8 m** for the arm's operating area, plus pallet stations.

`cupTransferPose(time)` is a **24-second looping pick–transfer–release study**. Each 12-second half hovers, lowers to the lid, establishes suction, lifts, sweeps to the opposite pallet, lowers, releases only after support and retracts. The second half returns the same crate, closing the loop without teleporting. Pallets are centred at X=±0.95 / Z=1.05; the two exchange cells are X=±0.65 / Z=0.80. Cargo lifts to a 0.94 m lid height, giving its bottom 60 mm clearance above neighbouring 0.52 m-high cargo during the sweep. The other six crates remain stationary. The moving crate follows the grip only after sealing and is supported before release. Manual inspection adjusts yaw, horizontal reach, contact height and seal compression.

CUP is a pressurized-bay handling concept, following the reference. Seal geometry, grip state and motion are modelled; pressure, leakage, payload strength, robot balance and general collision/force behaviour are not simulated. The arm moves cargo between pallets; independent wheeled base driving/navigation is not part of this transfer study.

## Measured exports

| Module | Tier | Triangles | Draws | Plain bytes | Meshopt bytes |
| --- | --- | ---: | ---: | ---: | ---: |
| pallet | LOD0 | 3,284 | 1 | 220,608 | 53,988 |
| pallet | LOD1 | 1,012 | 1 | 75,068 | 21,744 |
| pallet | LOD2 | 372 | 1 | 32,404 | 11,184 |
| stride | LOD0 | 18,084 | 25 | 999,964 | 162,184 |
| stride | LOD1 | 6,988 | 25 | 467,316 | 95,624 |
| stride | LOD2 | 2,572 | 1 | 164,400 | 55,440 |
| crate | LOD0 | 792 | 1 | 68,736 | 19,396 |
| crate | LOD1 | 716 | 1 | 62,232 | 17,876 |
| crate | LOD2 | 372 | 1 | 32,572 | 10,132 |
| cup | LOD0 | 16,472 | 13 | 774,084 | 143,628 |
| cup | LOD1 | 5,944 | 13 | 341,888 | 75,512 |
| cup | LOD2 | 2,164 | 1 | 110,424 | 35,180 |

Pallet/crate game tiers meet the 1.5k-triangle / five-draw base-piece target. STRIDE and CUP meet the 25k articulated-unit triangle target. Their 25 / 13 game draws retain the separate moving mechanisms. All distance exports meet 3k triangles / one draw / 250 KB. No FPS or phone-performance improvement is claimed. Game STRIDE is above the separate landmark byte reference; the contract specifies no unit byte cap.

## Viewer, validation and handoff

Open `pallet-cargo/`; `?module=cup-loading` selects CUP's two-pallet station and `?module=cup` isolates the loader. Seven configurations, three tiers, two encodings, full-circle individual wheel controls, per-wheel suspension, five STRIDE motion studies and CUP grip/transfer controls are included. Static distance disables motion. Downloads, sockets, wireframe, cameras, fullscreen, desktop/mobile layouts and shared Workshop navigation remain. The repeatable detailed source is `tools/asset-pipeline/pallet-cargo-shape.mjs`.

Build with `node tools/asset-pipeline/build-pallet-cargo.mjs`. Validate with `node tools/asset-pipeline/validate-pallet-cargo.mjs`; browser checks use `node tools/asset-pipeline/test-pallet-cargo-viewer.mjs` with a repository server and local Playwright/Chromium paths. `validation-report.json` covers all 24 plain/decoded exports, 756 STRIDE poses and 5,764 CUP poses: zero glTF errors/warnings, finite nondegenerate geometry, tier bounds/frames/names, independent steering, planted wheel centres, rigid rod overlap, four level seals, supported cargo transfer and stored-cargo AABB clearance. `viewer-validation.json` covers 42 configuration/tier/encoding combinations, manual/motion controls, downloads and desktop/mobile framing. General arm-versus-scene self-collision is not certified.

Use LOD0 for close recording, LOD1 before articulation, and LOD2 for static loading/map use. Proposed thresholds remain game inside 150 m / distance beyond 170 m; tune in the consuming game. Plain GLBs are authoritative; compressed copies, static merged surfaces and previews are derived. Hand off the **containing commit plus `assets/pallet-cargo/`**, pinning manifest hashes. Credit: **Models by jelaludo**. The received collaboration contract and Nih-Dairia assets are unchanged.

Completed: STRIDE's diagonal/omnidirectional stance, compact suspension, CUP model and suction transfer, all tiers, preserved originals, viewer and measured validation. Pending: visual acceptance, physical locks/suction/load rating, STRIDE pallet pickup/drop-off, arbitrary terrain/traction/collision, damage D1–D3, consuming-game r160/release packing and phone acceptance. STEP and the return rack remain future variants.
