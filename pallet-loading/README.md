# Load / Go — STRIDE × CUP

An engine-driven, 22-second one-shot: STRIDE arrives with an empty P-01 pallet, CUP swiftly places four crates, and STRIDE leaves loaded. Open from a repository HTTP server:

http://127.0.0.1:8788/pallet-loading/

## Playback

Autoplays once. Pause/play, replay, speed, scrubbing and seven chapter shortcuts; director, overview, loading close-up, follow, plan and free orbit cameras; game/master selection, wireframe and fullscreen. Drag enters free orbit. Space pauses outside form controls. The final loaded pose is held until replay.

| Time | Action |
| --- | --- |
| 0–3.4 s | STRIDE arrives empty and settles beside CUP. |
| 3.4–6.4 s | First package: descend, seal, lift, transfer, place, release, retract. |
| 6.4–9.4 s | Second package, completing the far row. |
| 9.4–10.7 s | STRIDE indexes 600 mm sideways with two packages supported; wheel steering changes while stationary. |
| 10.7–13.7 s | Third package, beginning the near row. |
| 13.7–16.7 s | Fourth package, completing the 2 × 2 pallet. |
| 16.7–22 s | CUP remains clear, STRIDE settles and drives 4.6 m away. |

The conveyor indexes the queue after the picked crate clears it. Each pick takes three seconds. Custody changes from conveyor to CUP after sealing, then to STRIDE after deck support. Four slots use x ±0.30 / z ±0.25 m. Scrubbing is pure time evaluation with no accumulated parenting state. `timeline.js` exports `state(time)`, `DURATION`, `LAYOUT`, `LOADS` and `CHAPTERS`.

## Sources and integration

Plain GLBs are authoritative. Reuse `assets/pallet-cargo/` STRIDE, CUP, pallet, crate and `runtime.js` at source commit `b9f027199645634a1686f6c87bdb0caa2308dadf`; all twelve tier GLBs and that runtime remain byte-identical. Dependency hashes/metrics are in `manifest.json`. Existing optional Meshopt copies and archived originals are untouched. This scene adds no compressed exports; the game can pack plain files at release time.

The three `station_d0_lod{0,1,2}.glb` files are self-contained static fixtures with one vertex-colour material each. Master is for close shots/recording; reduced game is default; reduced static distance is for loading/map views. D0 only. Names, sockets, root transforms and fixture heights agree across tiers. No baked clips: named runtime study `Pallet_Load_And_Depart`, 22 seconds, one-shot. Preserve original pivots in animated units; do not animate PCS distance models.

Metres, +Y up, +Z forward, ground origin at plot centre. Reserve 11 × 13 m. One floor slab has top Y=0, underside −0.06 m, edge trim to −0.12 m; avoid a coplanar floor. Markings sit 1 mm above it. CUP root (−1.18, 1.10, 0) sits on the elevated dock. Its underside is 1.06 m; the empty pallet deck passes underneath at 0.97 m with 90 mm clearance. Loaded rows stay clear. Rollers support crate roots at Y=1.55 m; pick position (−1.83, 1.55, 0.60). Transfer lid height 2.12 m clears CUP’s chassis envelope, including its beacon, by at least 107.5 mm. Original arm dimensions remain unchanged.

`LOADING_STATION_ROOT` contains `STATION_SURFACE` and stable lookups `SOCKET_CUP`, `SOCKET_FEED`, `SOCKET_DOCK_FIRST`, `SOCKET_DOCK_SECOND`, `SOCKET_ARRIVAL`, `SOCKET_EXIT`. Coordinates appear in the manifest. Resolve imported node names within each actor group, never globally across repeated crate instances. Crates share geometry/material buffers and can be instanced by the game. The viewer uses four draws for independent crates; static fixtures are merged into one.

## Measured exports

| Asset | Triangles | Model draws | Plain bytes |
| --- | --- | --- | --- |
| Station master | 6,044 | 1 | 273,704 |
| Station game | 2,372 | 1 | 114,436 |
| Station distance | 852 | 1 | 59,056 |
| Whole master scene | 47,052 | 44 | 2,337,096 unique GLB bytes |
| Whole game scene | 19,180 | 44 | 1,060,940 unique GLB bytes |

Scene totals include one station, STRIDE, CUP, pallet and four crates; bytes count the shared crate file once. Model-pass counts exclude shadows. Unit draw counts follow the existing PCS family. New station game/distance meet the contract’s landmark targets. Proposed station swap distances: game below 150 m, static above 170 m with hysteresis, pending game tuning. No FPS claim.

## Validation and reproduction

Run `node tools/asset-pipeline/build-pallet-loading.mjs`, then `node tools/asset-pipeline/validate-pallet-loading.mjs`. Browser: `node tools/asset-pipeline/test-pallet-loading-viewer.mjs` with a running server; set `PLAYWRIGHT_MODULE`, `CHROMIUM_EXECUTABLE` and optionally `LOADING_VIEWER_URL` as needed. Shared navigation/website Devlog: `python3 tools/build-workshop-docs.py`.

`validation.json`: zero glTF errors/warnings for three new exports, finite nondegenerate geometry, tier/socket parity, exact original hashes, and 5,282 master/game poses at 120 Hz. Checks cover arm reach/rigid links, four coplanar suction contacts, grounded wheel centres, rolling/steering, pallet locks, cargo custody/support, package AABB separation, dock and CUP chassis/wheel/turntable envelope clearance, phase continuity and deterministic reverse scrubbing. Minimum package separation: 40 mm. Empty pallet/dock clearance: 90 mm. This is a kinematic scene; arbitrary arm self-collision, forces and traction remain unverified.

`viewer-validation.json`: measured model-pass counts, 46 milestone poses across both animated tiers, controls, desktop/mobile framing, downloads and zero browser errors. `preview.png` and `previews/` are derived renders, not source models.

Completed: arrival → four suction transfers → departure, dock/conveyor tiers, controls, gallery, documentation and validation. Pending: user visual acceptance, general collision/force/terrain solving, suction/lock/load engineering, consuming-game r160/release packing and reference-phone measurements. Handoff: containing commit plus `pallet-loading/` and pinned `assets/pallet-cargo/` dependency. Credit: Models and choreography by jelaludo. The received collaboration contract remains verbatim.
