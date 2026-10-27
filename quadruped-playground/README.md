# CHASE / K9 × C-07

A continuous compound animation: RECKON K9 and C-07 follow one irregularly moving orange ball, accelerate after its bursts, give each other room and jump three low hurdles. The ball slows when the pair falls behind. Both characters retain their own gait, jump and landing performance.

https://jelaludo.github.io/SentryTowers_A6/quadruped-playground/

This is a **derived procedural scene**, using original plain GLBs without modifying or duplicating them. It is not a new baked animation export. Models, animation and scene by **jelaludo**.

## Hand-off and placement

Hand off the commit containing this scene plus `quadruped-playground/`, `assets/reckon-k9/` and `assets/mechanical-cheetah/`. The model inputs are pinned to `ab4642deb90836628ee5f7c8b0049ec9a7b5dfae`; `manifest.json` records their SHA-256 hashes, exact bytes, sockets, bounds, clips and source totals. Workshop navigation is a shared presentation dependency.

Metres, +Y up, +Z local forward. The course is centered at world origin and reserves 16 × 32 m, with 2.5 m vertical clearance. The decorative floor is at Y = −0.01 m; paw targets use the original approximately +0.003 m sole height. Each actor retains its original metre scale and ground root. The flat stadium course has 16 m straights and 5.5 m bend radius. Its three rails are 0.14, 0.18 and 0.20 m high, 4.8 m wide and 0.10 m deep; end posts extend another 0.05 m vertically.

`RECKON_K9_ACTOR` and `C07_CHEETAH_ACTOR` wrap each complete source scene, including the skinned meshes and skeleton. Resolve original bone/socket names within the respective actor, because separate rigs use common semantic names. The controller drives wrapper position/yaw, `CHASE_BALL` and `PLAYGROUND_HURDLES`. Source `MOTION` translation is neutralized after clip evaluation and incorporated once into scene placement. Do not apply source root travel again in an engine adapter. No engine-owned source pivots or clips are rebaked.

## Motion composition

- `simulation.js` is a dependency-free deterministic 120 Hz controller. A seeded schedule alternates 0.55–1.65 m/s cruise with 3.4–3.9 m/s bursts, a small lateral weave and catch-up pauses. Manual bursts use the same generator.
- Both actors pursue a preferred ball distance. Smoothed perception and bounded ground acceleration/braking prevent instantaneous ground-speed changes. Preferred leading position alternates. Nearby actors separate laterally; a following actor gives way until there is passing space. This is behavior on an authored course, not navigation through arbitrary scenery.
- Gait phase advances by actual world distance divided by the source stride (`speed_mps × duration_s`). K9 selects walk/trot/gallop/sprint; C-07 selects feline walk/gallop. Faster travel therefore speeds up the feet. Existing idle clips cover stops.
- `actor.js` blends clip changes over 0.18 s and corrects ground contacts with rigid two-bone rotations. It preserves limb lengths and mechanical armor scale, releases unreachable anchors, and applies a small common lift if blended soles would pass below the floor.
- Each hurdle has a 1.5 m preparation offset and a 3 m crossing. Animals brake, prepare, play their distinct `Jump`/`Pounce`, land and recover before pursuing again. Playback rates are 1.05× for the 2.0 s K9 jump and 1.25× for the 3.2 s feline pounce: approximately 1.90 s and 2.56 s of scene time respectively. The source pounce's 1.2 m travel is retained; additional crossing distance is applied only between the last paw release and first touchdown. K9's source jump is in place. This authored airborne displacement is kinematic, not a force-based jump solution.

Source clip names and explicit durations remain in the scene manifest. Sit, roll and give-paw remain available in each individual model viewer; the chase selects locomotion, idle and obstacle actions automatically.

## Tiers and measured cost

The default is articulated **LOD1 / game**. **LOD0 / detailed** is available for close inspection and recordings. Source LOD2 files are static distance/loading tiers and are intentionally excluded while these characters perform. Switching detail restarts the chase at the current seed. Damage state remains D0 in both tiers.

| Source | Tier | Triangles | Mesh draws | Plain GLB bytes |
| --- | --- | ---: | ---: | ---: |
| RECKON K9 | Game LOD1 | 9,732 | 6 | 1,630,292 |
| C-07 | Game LOD1 | 12,760 | 6 | 1,537,756 |
| Both | Game LOD1 | 22,492 | 12 | 3,168,048 |
| RECKON K9 | Detailed LOD0 | 25,884 | 6 | 2,117,768 |
| C-07 | Detailed LOD0 | 62,720 | 6 | 2,975,032 |
| Both | Detailed LOD0 | 88,604 | 12 | 5,092,800 |

The game units individually remain within the contract's 25k-triangle unit target. The course repeats one shared box geometry for nine instanced hurdle parts and another for 66 lane marks. It uses no external textures. Sampled browser rendering with hurdles reports **24,274 triangles / 21–24 draws** at game detail and **90,386 triangles / 21 draws** in the detailed review frame. Trail draw counts depend on whether histories have enough points. These are renderer counters, including the transparent halo's passes, not GPU timings, FPS or network-transfer totals. Source Meshopt copies remain optional derivatives in the original asset folders; this scene loads authoritative plain files.

## Viewer controls

Pause / Space, manual ball sprint, replay current seed, new seed, 0.35×–1.5× playback, follow/ground/whole-course/free cameras, game/detailed tier, hurdle visibility/behavior and motion trails. Drag or zoom switches to free orbit; selecting a follow camera restores tracking. The pack camera fits animated skeleton extents, including the Cheetah's tail and airborne poses. `?seed=104` opens a repeatable alternate chase.

Hurdles off removes future obstacle triggers; an already started jump completes. Camera/tier controls do not alter the original GLBs. The orange ball's displayed speed is its forward course speed; animal telemetry is actual ground-plane world speed, including airborne travel. “Jumps” counts completed recoveries.

## Validation and limits

- `behavior-validation.json`: three seeded two-minute runs at 120 Hz, 11 completed hurdles per actor per seed, no overlap of conservative whole-animal ground capsules, minimum tested gap 0.289 m. A separate manual-burst test confirms both animals accelerate within 1.2 s. Repeatability and disabled obstacles are checked.
- `rig-validation.json`: actual plain GLBs in both animated tiers, pinned hash/byte checks and 32 s per tier. 3,840 sampled rig poses in total; full geometry is checked every 0.2 s and every 1/30 s during jumps against a rail slab expanded by 0.13 m for sampling travel. Minimum sampled rail clearance is 0.1426 m, with zero colliding sampled vertices. Minimum mesh Y is −0.00283 m, above the scene floor. Minimum paw Y is +0.00231 m; maximum rigid segment-length error is below 0.001 mm and retained-anchor error below 1.89 mm. Unreachable anchors are released instead of stretching the rig.
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
