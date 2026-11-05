# STRIDE-02 r2 / Original pallet size, miniature legs

STRIDE-02 now packs to the **exact P-01 dimensions: 1,200 × 1,000 × 160 mm**. It uses the original pallet body, including its runners, spacer blocks, deck and lock receivers. Smaller legs and wheels retract into the existing underside pockets. The former 440 mm design is superseded and preserved under `revisions/r1/`.

http://127.0.0.1:8788/stride-02/

The viewer opens stowed beside the original P-01 (left). Use **Deploy legs**, **Retract legs**, the packing slider or **Underneath** to inspect the miniature mechanism. The reference can be hidden. Partial transforms continue from the current pose; a complete transition takes 12 seconds. Reset exposes the 28-second retract/deploy study. Timeline, speed, cargo, transparent frame, envelope, wireframe, master/game/static tiers and fullscreen remain available.

## Dimensions and motion

| Item | Dimension |
| --- | --- |
| Packed outer envelope, L × W × H | 1,200 × 1,000 × 160 mm, matching P-01 |
| Deployed deck height | 250 mm |
| Temporary clearance lift | 40 mm; maximum deck height 290 mm |
| Upper / lower rigid link | 69 / 78.2 mm |
| Wheel diameter | 94.3 mm |
| Leg derivation | 23% of STRIDE-01, baked into vertices and rest offsets |
| Carriage travel | 55.1 mm inward per assembly |
| Parking supports | Four inboard jacks, each three rigid 50 mm sections |
| Support extension / minimum overlap | 130 mm total / at least 6.6 mm per section |

The legs stay the same size throughout animation. Wheels lift and turn flat, the short links fold horizontally, and the carriages draw into the original pockets. Parking feet keep the unit supported while the body returns to 160 mm. A temporary deck lift clears the gimbals during rotation. The entire transformation stays within the original 1.2 × 1.0 m plan footprint.

## Runtime and engine integration

Plain GLBs are authoritative. `runtime.js` exports `applyStride02(root, {fold, steer, travel})`, `foldPose(fold)` and `studyPose(time, mode)`. Fold 0 is deployed; fold 1 is stowed. Steering/travel use radians/metres. No engine-driven pivots are baked. Runtime studies are `Stride02_Retract` (12 s, one-shot), `Stride02_Deploy` (12 s, one-shot) and `Stride02_Transform_Cycle` (28 s, loop). This is stationary transformation; traction, arbitrary self-collision and load engineering are not simulated.

Metres, +Y up, +Z forward, root at ground/pallet centre. Reserve 1.2 × 1.0 m. Both configurations and corresponding tiers share root placement, names, D0 identifiers, sockets and metadata. The original cargo-lock pitch is 1,060 × 860 mm; quarter-pallet crate centres are x ±0.30 / z ±0.25 m. `SOCKET_CARGO` follows the level deck. The miniature mechanisms occupy fork pockets, so conventional forklift entry is not certified.

Revision 2 keeps the r1 engine identifiers but changes physical dimensions, joint offsets, packing travel and support stroke. Deploy the r2 GLBs and r2 runtime together; do not mix either with r1 or STRIDE-01’s adapter. `LEG_*_CARRIAGE_SURFACE` and `PARK_HOUSINGS_SURFACE` are new surfaces. `STRIDE02_ROOT`, `PALLET_LIFT`, `LEG_*`, `WHEEL_*`, `PARK_*`, wheel/foot lookups and cargo socket names retain their roles. All moving-node scales are one; the permanent 0.23 derivation is already in the exported geometry.

LOD0 is the detailed master for close shots, animation and recording. LOD1 retains all pivots for game use. LOD2 merges each configuration into a single static surface/material while retaining lookup hierarchy; never animate it. Select the correct deployed/stowed static configuration before swapping. Proposed game/static distances remain 150/170 m with hysteresis, pending game tuning. Configurations are not damage levels; only D0 exists.

## Measured exports

| Configuration | Tier | Triangles | Draws | Plain bytes |
| --- | --- | --- | --- | --- |
| Deployed | Master | 21,316 | 54 | 1,233,352 |
| Deployed | Game | 8,452 | 54 | 590,672 |
| Deployed | Static | 2,200 | 1 | 212,868 |
| Stowed | Master | 21,316 | 54 | 1,233,728 |
| Stowed | Game | 8,452 | 54 | 591,052 |
| Stowed | Static | 2,200 | 1 | 211,968 |

Stats count the STRIDE-02 module only, excluding the optional P-01 reference, cargo, ground/grid and shadows. Game geometry meets the articulated-unit triangle target; static tiers meet 3k triangles / one draw / 250 KB. All surfaces share a vertex-colour palette with no textures. Static tiers and previews are derived. No new compressed files and no FPS claim; the consuming game may pack the authoritative plain files at release time.

## Preservation and validation

Original P-01 and STRIDE-01 source/runtime/exports are unchanged, pinned to `b9f027199645634a1686f6c87bdb0caa2308dadf`. Master/game P-01 body indices, normals, colours and vertices are retained (only its local deck-relative offset changes). Forty leg surfaces retain the original topology/normals/colours, with vertex positions verified at exactly 23% of the originals. Prior STRIDE-02 r1 is preserved byte-for-byte in 29 files under `revisions/r1/`, pinned to `7b539417eb3e59763de164d4f36ac50720c9f613`; this includes its exports, source snapshots, runtime, previews and reports. P-01, STRIDE-01, CUP and the loading scene remain intact.

`validation.json` verifies six plain GLBs with zero glTF errors/warnings, finite nondegenerate geometry, tier frame/socket parity, original/r1 hashes and exact packed-envelope matching against the original P-01 at all three tiers. Across 1,202 master/game poses, links remain rigid, scales stay one, wheels/parking feet maintain ground contact, and no vertices penetrate the floor. Every miniature leg triangle stays inside the convex plan boundaries of its original underside pocket and below the deck. Minimum pocket-plan clearance is 8.59 mm; packed leg-to-deck clearance is 3.35 mm. General mechanism self-collision and engineering certification remain pending.

`viewer-validation.json` covers six configuration/tier combinations, 56 fold poses, exact P-01 comparison, partial-transform continuity, controls, downloads, static lockout, fullscreen and desktop/mobile framing. Previews are derived renders in `previews/`.

Rebuild with `node tools/asset-pipeline/build-stride-02.mjs`; validate with `node tools/asset-pipeline/validate-stride-02.mjs`. Browser checks: `node tools/asset-pipeline/test-stride-02-viewer.mjs` with the repository server running; set `PLAYWRIGHT_MODULE`, `CHROMIUM_EXECUTABLE` and optionally `STRIDE02_URL` as needed. Shared navigation/Devlog: `python3 tools/build-workshop-docs.py`.

Completed: corrected exact-size pallet, miniature legs, internal retraction, preserved r1, six exports, comparison viewer and measured validation. Pending: visual acceptance, actuator/bearing/load engineering, general self-collision/traction/terrain, D1–D3, consuming-game r160/release packing and reference-phone measurements. Handoff: containing commit plus `assets/stride-02/` and `stride-02/`. Credit: Models by jelaludo. The received collaboration contract remains verbatim.
