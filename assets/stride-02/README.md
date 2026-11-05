# STRIDE-02 / Transforming pallet

STRIDE-01’s original full-size legs and wheels, mounted directly to a powered pallet. Wheels turn flat, rigid links fold into four horizontal assemblies, and four carriages draw them under the deck. Packed size: **1,200 × 1,000 × 440 mm**. This is a deeper powered pallet, not the passive 160 mm P-01.

Viewer:

http://127.0.0.1:8788/stride-02/

## Operate

The viewer starts a 28-second retract/deploy study. Use **Retract legs** or **Deploy legs** to continue from the current pose; a complete transition takes 12 seconds, with proportional time for a partial transition. The packed slider is deterministic in either direction. Pause, reset, timeline, speed, four cameras, free orbit, cargo, transparent frame, packed-envelope guide, wireframe and fullscreen are included. Use **Underneath** to see the four folded link chains.

Choose detailed master for close shots/recording, game for articulation, or static distance for a frozen deployed/stowed configuration. Static disables motion. Export configuration chooses the initial pose/file, not a damage level; manual articulation can differ from the selected initial export. Model stats exclude optional cargo, ground, grid and shadow passes.

## Mechanism and runtime

`runtime.js` exports `applyStride02(root, {fold, steer, travel})`, `foldPose(fold)` and `studyPose(time, mode)`. `fold=0` is deployed and `fold=1` is fully stowed; steering and travel are radians/metres. Use this adapter for STRIDE-02; STRIDE-01’s adapter is incompatible with the new hierarchy. All joints remain engine-driven. No pivot motion is baked into GLB clips.

| Fold range | Motion |
| --- | --- |
| 0–0.13 | Four inboard parking feet extend and establish ground support. |
| 0.15–0.31 | Leg assemblies roll into a horizontal plane. A temporary 35 mm deck lift provides clearance over the rigid hip housings. |
| 0.32–0.46 | Packing gimbals turn the full-size wheels flat. |
| 0.47–0.63 | Hip yaw and knee angles curl the two rigid links into each storage bay. |
| 0.65–0.81 | Each hip carriage draws 400 mm inward. |
| 0.83–1.0 | The deck lowers from 830 to 440 mm while parking feet remain grounded. |

Reverse the path to deploy. Four parking supports sit at x ±0.10 / z ±0.44 m, inside the wheel paths. Each uses three rigid 160 mm nested sections, with up to 425 mm total extension and at least 18 mm overlap during the clearance lift. Original 300/340 mm leg links and 410 mm wheel diameter remain unchanged. The wheels do not shrink; every rigid-node scale stays one.

Named runtime studies: `Stride02_Retract` (12 s, one-shot), `Stride02_Deploy` (12 s, one-shot), `Stride02_Transform_Cycle` (28 s, loop with two-second endpoint holds). Steering is neutralized during the fold; this is stationary transformation, not a moving transformation or terrain solver. Optional cargo follows the level deck socket throughout the study; load capacity is unverified.

## Coordinates and engine handoff

Metres, +Y up, +Z forward, root on the ground at pallet centre. Reserve **2.8 × 2.2 m** for transformation; the sampled swept bounds are x ±1.32649 m, z ±0.88906 m, top Y=0.94 m. Packed geometry fits the 1.2 × 1.0 × 0.44 m box. Deployed deck height is 0.83 m, briefly reaching 0.865 m for clearance. Both configurations and all tiers retain the same root, node names, socket coordinates relative to the mechanism, D0 identifier and gameplay metadata. Corresponding frozen poses keep matching frames across tiers.

`STRIDE02_ROOT` contains `PALLET_LIFT`, the deck, four inboard `PARK_*` chains and four `LEG_*_CARRIAGE` chains. Source `LEG_*_SPLAY_YAW`, hip/knee/suspension/ankle and wheel yaw/roll names remain scoped within this new module. `LEG_*_PACK_ROLL`, `WHEEL_*_PACK_HINGE`, packing guides and rods are new. The ankle now counter-rotates the full packing orientation; do not assume STRIDE-01 rest frames or its ankle’s former single-axis role. Source suspension geometry/pivots are retained at their nominal length during folding.

`SOCKET_CARGO` is the deck origin. Four `SOCKET_CARGO_LOCK_*` lookups use the provisional PCS 1,060 × 860 mm lock pattern; crate centres use x ±0.30 / z ±0.25 m. `SOCKET_WHEEL_*` and `SOCKET_PARK_FOOT_*` provide contact lookups. Parent cargo at the cargo socket with identity rotation. Detailed positions, engine-node lists, plots, metrics and hashes are in `manifest.json`. The underbody contains stored mechanisms; conventional forklift access is not certified.

## Exports and provenance

Plain GLBs are authoritative. Six files cover deployed/stowed configurations at LOD0, LOD1 and LOD2. D0 only; deployed/stowed are configuration names, never damage states. LOD0/1 retain all pivots. LOD2 has one frozen mesh/material and retained lookup hierarchy; never animate it. Select the correct frozen configuration before swapping. Proposed loading/distance thresholds are game below 150 m and static above 170 m, with hysteresis, pending game tuning.

| Configuration | Tier | Triangles | Draws | Plain bytes |
| --- | --- | --- | --- | --- |
| Deployed | Master | 19,592 | 49 | 1,070,712 |
| Deployed | Game | 7,704 | 49 | 533,156 |
| Deployed | Static | 2,200 | 1 | 226,732 |
| Stowed | Master | 19,592 | 49 | 1,071,156 |
| Stowed | Game | 7,704 | 49 | 533,600 |
| Stowed | Static | 2,200 | 1 | 224,196 |

Game geometry meets the articulated-unit triangle target. Both distance tiers meet the 3k-triangle / one-draw / 250 KB targets. Draws are retained per moving surface group; all use a single shared vertex-colour palette and no textures. No FPS claim. Static tiers and preview renders are derived. No new compressed copies were authored; the game can compress authoritative plain files at release time.

The STRIDE-01 procedural source, runtime and three original GLBs remain byte-identical to `b9f027199645634a1686f6c87bdb0caa2308dadf`, with hashes recorded in the manifest. All 40 master/game upper-link, lower-link, rod, upright and wheel surfaces compare exactly to the original GLBs’ indices and vertex attributes. New parent transforms, pallet geometry, supports and packing hardware belong to STRIDE-02. Original P-01, CUP and the loading scene remain intact. Optional cargo uses existing `assets/pallet-cargo/crate_d0_lod{0,1}.glb` files unchanged.

## Reproduce and validate

Build: `node tools/asset-pipeline/build-stride-02.mjs`. Geometry/motion checks: `node tools/asset-pipeline/validate-stride-02.mjs`. Browser: `node tools/asset-pipeline/test-stride-02-viewer.mjs` with the repository server running; set `PLAYWRIGHT_MODULE`, `CHROMIUM_EXECUTABLE` and optionally `STRIDE02_URL` when needed. Navigation/docs: `python3 tools/build-workshop-docs.py`.

`validation.json` covers six plain exports with zero glTF errors/warnings, nondegenerate finite geometry, names/frames/sockets, original hashes, exact source surfaces and 1,202 master/game poses across the fold. Sampled checks preserve rigid links, level cargo sockets, parking-foot contact and section overlap; no model vertices penetrate the floor, and leg-surface vertices within the pallet plan clear its 40 mm top layer. Packed leg-to-roof clearance is at least 5 mm. Flat wheel-to-support clearance is at least 31 mm. Full arbitrary pairwise self-collision and production mechanism engineering remain unverified.

`viewer-validation.json` covers six tier/configuration combinations, 56 articulated poses, four cameras, partial-transform continuity, playback/inspection controls, cargo, static lockout, downloads, fullscreen, desktop/mobile framing and zero browser errors. Previews are in `previews/`.

Completed: STRIDE-02 model, retract/deploy mechanism, six tier/configuration exports, viewer, measured validation and Workshop handoff. Pending: user visual acceptance, actuator/bearing/load engineering, general self-collision/terrain/traction, D1–D3, consuming-game r160/release packing and reference-phone measurements. Handoff is the containing commit plus `assets/stride-02/` and `stride-02/`. Credit: Models by jelaludo. The received collaboration contract remains verbatim.
