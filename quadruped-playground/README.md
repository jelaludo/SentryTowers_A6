# CHASE / K9 × C-07 × K0-TECH-01

A continuous compound animation: RECKON K9, C-07 and K0-TECH-01 follow one irregularly moving orange ball, accelerate after its bursts, give each other room and jump three low hurdles. The ball slows when the pack falls behind. The smaller K0 has the fastest catch-up pace, quickest response and quicker hurdle pounce. All three retain their own proportions, gait and landing performance. K0 uses the revised industrial face; its pursuit settings are unchanged.

https://jelaludo.github.io/SentryTowers_A6/quadruped-playground/

This is a **derived procedural scene**, using original plain GLBs without modifying or duplicating them. It is not a new baked animation export. Models, animation and scene by **jelaludo**.

## Hand-off and placement

Hand off the commit containing this scene plus `quadruped-playground/`, `assets/reckon-k9/`, `assets/mechanical-cheetah/` and `assets/k0-tech-01/`. The model inputs are pinned to `1be374f4a2f1a97f8737b9e21f49bca5388f4d6c`; `manifest.json` records their SHA-256 hashes, exact bytes, sockets, bounds, clips and source totals. Workshop navigation is a shared presentation dependency.

Metres, +Y up, +Z local forward. The course is centered at world origin and reserves 16 × 32 m, with 2.5 m vertical clearance. The decorative floor is at Y = −0.01 m; paw targets use the original approximately +0.003 m sole height for K9/C-07 and +0.00141 m for K0. Each actor retains its original metre scale and ground root. The flat stadium course has 16 m straights and 5.5 m bend radius. Its three rails are 0.14, 0.18 and 0.20 m high, 4.8 m wide and 0.10 m deep; end posts extend another 0.05 m vertically.

`RECKON_K9_ACTOR`, `C07_CHEETAH_ACTOR` and `K0_TECH_01_ACTOR` wrap each complete source scene, including the skinned meshes and skeleton. Resolve original bone/socket names within the respective actor, because separate rigs use common semantic names. The controller drives wrapper position/yaw, `CHASE_BALL` and `PLAYGROUND_HURDLES`. Source `MOTION` translation is neutralized after clip evaluation and incorporated once into scene placement. Do not apply source root travel again in an engine adapter. No engine-owned source pivots or clips are rebaked.

## Motion composition

- `simulation.js` is a dependency-free deterministic 120 Hz controller. A seeded schedule alternates 0.55–1.65 m/s cruise with 3.4–3.9 m/s bursts, a small lateral weave and catch-up pauses. Manual bursts use the same generator.
- All three actors pursue a preferred ball distance. K0 starts behind the others, catches up quickly and aims closest to the lure. Smoothed perception and bounded ground acceleration/braking govern the response. Every actor checks every other actor; stable passing sides keep K9 left, C-07 right and K0 in the centre, with forward-gap braking when lateral space is insufficient. This is behavior on an authored course, not navigation through arbitrary scenery.
- Gait phase advances by actual world distance divided by the source stride (`speed_mps × duration_s`). K9 selects walk/trot/gallop/sprint; C-07 and K0 select feline walk/gallop. Faster travel therefore speeds up the feet. Existing idle clips cover stops.
- `actor.js` blends clip changes over 0.18 s for K9/C-07 and 0.10 s for K0, and corrects ground contacts with rigid two-bone rotations. It preserves limb lengths and mechanical armor scale, releases unreachable anchors, and applies a small common lift if blended soles would pass below the floor.
- K9 and C-07 brake 1.5 m before each hurdle and cross 3 m; K0 prepares 1.6 m before it and crosses 3.2 m. The 2.0 s K9 `Jump` plays at 1.05×, C-07's 3.2 s `Pounce` at 1.25×, and K0's 3.2 s `Pounce` at 1.8×: approximately 1.90, 2.56 and 1.78 s of scene time. Source leap travel (K9: 2.4 m, C-07: 3 m, K0: 1.6 m) is preserved; extra range is applied only between the last paw release and first touchdown. K0 adds a smooth 0.16 m sin-squared lift only inside that all-air window to clear the same rails at its smaller scale. Position and vertical velocity return to zero at both ends. Each `root_motion_profile` separates the original push/settle path from the added flight travel: K9 0 + 2.4 m, C-07 1.2 + 1.8 m and K0 0.528 + 1.072 m. `sourceJumpTravel` reconstructs that profile before adding the remaining scene range, preventing doubled displacement or sliding planted paws. These are kinematic trajectories, not force-based jump solutions.

| Chase tuning | K9 | C-07 | K0-TECH-01 |
| --- | ---: | ---: | ---: |
| Target top ground speed (m/s) | 4.43 | 5.6 | 6.8 |
| Ground acceleration (m/s²) | 2.1 | 2.8 | 6.4 |
| Ground braking (m/s²) | 3.5 | 3.5 | 7.0 |
| Speed perception time constant (s) | 0.333 | 0.333 | 0.100 |
| Maximum heading response (rad/s) | 2.3 | 2.3 | 4.6 |
| Lateral acceleration (m/s²) | 1.5 | 1.5 | 3.8 |

These are scene-authored robot behavior settings, not biological measurements. World-speed targets account for lane radius; acceleration-limited transitions between curves and straights can briefly exceed those targets. Airborne crossing speed is separate. K0's source gallop remains 2.688889 m/s; distance-driven playback reaches about 2.53× at 6.8 m/s without modifying the source clip. All tuning lives in `ACTORS` in `simulation.js` and is mirrored in the manifest.

Source clip names and explicit durations remain in the scene manifest. Sit, roll and give-paw remain available in each individual model viewer; the chase selects locomotion, idle and obstacle actions automatically.

## Tiers and measured cost

The default is articulated **LOD1 / game**. **LOD0 / detailed** is available for close inspection and recordings. Source LOD2 files are static distance/loading tiers and are intentionally excluded while these characters perform. Switching detail restarts the chase at the current seed. Damage state remains D0 in both tiers.

| Source | Tier | Triangles | Mesh draws | Plain GLB bytes |
| --- | --- | ---: | ---: | ---: |
| RECKON K9 | Game LOD1 | 9,732 | 6 | 1,631,432 |
| C-07 | Game LOD1 | 12,760 | 6 | 1,537,544 |
| K0-TECH-01 | Game LOD1 | 14,526 | 7 | 1,824,924 |
| All three | Game LOD1 | 37,018 | 19 | 4,993,900 |
| RECKON K9 | Detailed LOD0 | 25,884 | 6 | 2,118,904 |
| C-07 | Detailed LOD0 | 62,720 | 6 | 2,974,820 |
| K0-TECH-01 | Detailed LOD0 | 67,654 | 7 | 3,573,464 |
| All three | Detailed LOD0 | 156,258 | 19 | 8,667,188 |

The game units individually remain within the contract's 25k-triangle unit target. The course repeats one shared box geometry for nine instanced hurdle parts and another for 66 lane marks. It uses no external textures. Sampled browser rendering with hurdles reports **38,800 triangles / 28–32 draws** at game detail and **158,040 triangles / 28 draws** in the detailed review frame. Trail draw counts depend on whether histories have enough points. These are renderer counters, including the transparent halo's passes, not GPU timings, FPS or network-transfer totals. Source Meshopt copies remain optional derivatives in the original asset folders; this scene loads authoritative plain files.

## Viewer controls

Pause / Space, manual ball sprint, replay current seed, new seed, 0.35×–1.5× playback, follow/ground/whole-course/free cameras, game/detailed tier, hurdle visibility/behavior and motion trails. Drag or zoom switches to free orbit; selecting a follow camera restores tracking. The pack camera fits animated skeleton extents, including the Cheetah's tail and airborne poses. `?seed=104` opens a repeatable alternate chase.

Hurdles off removes future obstacle triggers; an already started jump completes. Camera/tier controls do not alter the original GLBs. The orange ball's displayed speed is its forward course speed; animal telemetry is actual ground-plane world speed, including airborne travel. “Jumps” counts completed recoveries.

## Validation and limits

- `behavior-validation.json`: three seeded two-minute runs at 120 Hz, 11–12 completed hurdles per actor per seed, no overlap of conservative whole-animal ground capsules across any of the three pairs; minimum tested gap 0.3009 m. K0 reaches 6.51–6.80 m/s and is fastest in every run. In isolated, identical straight-line ball-acceleration tests, K0 reaches 3.5 m/s in 0.867 s, versus C-07's 1.125 s and K9's 1.383 s. Seed repeatability and disabled obstacles are checked.
- `rig-validation.json`: actual plain GLBs in both animated tiers, pinned hash/byte checks and 32 s per tier. The reconstructed source root profiles are checked against actual GLB motion. 5,760 sampled rig poses in total; full geometry is checked every 0.2 s and every 1/30 s during jumps against a rail slab expanded by 0.20 m for sampling travel. Minimum sampled rail clearance is 0.1247 m overall and 0.1738 m for K0, with zero colliding sampled vertices. Minimum mesh Y is +0.000939 m, above the scene floor. Minimum paw Y is +0.001410 m; maximum rigid segment-length error is below 0.001 mm and retained-anchor error below 1.92 mm. Unreachable anchors are released instead of stretching the rig.
- `viewer-validation.json`: Chromium WebGL desktop/mobile controls, animated tiers, jumps, camera bounds, overflow and page errors. `preview.png` is a derived capture of the detailed scene, not a separate model.

Run from repository root with a local HTTP server on port 8788:

```sh
node tools/asset-pipeline/test-quadruped-chase.mjs
node tools/asset-pipeline/validate-quadruped-chase-rigs.mjs
node tools/asset-pipeline/test-quadruped-playground-viewer.mjs
python3 tools/validate-workshop-navigation.py
```

The browser test accepts `PLAYWRIGHT_MODULE`, `CHROMIUM_EXECUTABLE` and `BASE_URL`. It captures review PNGs under `/tmp` and refreshes the committed scene preview/report.

This scene validates authored pursuit and low-hurdle sequences on one flat course. It does not establish general terrain solving, arbitrary obstacle clearance, physical dynamics, consuming-game r160/release-gltfpack compatibility or reference-phone performance. The original asset folders retain their plain/decoded-compressed validation and independent readiness notes. The collaboration contract remains unchanged.
