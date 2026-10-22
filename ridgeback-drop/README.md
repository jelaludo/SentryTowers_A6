# Heavy Rain / Ridgeback cinematic study

Separate, procedural 13-second one-shot `Heavy_Rain_Deployment`. One original KORP carries three D0 MX-06 Ridgebacks at 0.75 uniform scale. Source GLBs and their seven-second `Airdrop_Land` clips remain unchanged. This folder is a derived presentation scene, not a replacement asset family or a baked GLB clip.

Release times are 1.20, 1.55 and 1.90 seconds. Each unit drops from 180 m for five seconds to 15 m, then brakes for 0.65 seconds with short ventral pulses. Touchdowns occur at 6.85, 7.20 and 7.55 seconds. Different headings and airborne attitudes converge to upright contact. Original endpoint-driven leg IK produces 0.48 m of scaled body compression, rebound and damped settling. All 18 claw contacts remain planted on the level landing surface.

`timeline.js` exports `state(time,index)` and `pose(root,time,index)`. Pose accepts the full rig under a uniformly scaled wrapper; apply world position and rotation from state afterward. Engine weapon pivots remain available. Coordinate system: metres, +Y up, +Z forward; world origin is the landing formation centre. Landing coordinates are (-6,1), (0,-3), (6,2) in X/Z, with headings -0.32, 0.12, 0.46 radians. Keep each rig in its own wrapper when looking up shared engine node names.

`effects.js` owns bounded, deterministic pools: 45 additive heat sprites, 42 smoke sprites, two jet cones and one branching crack mesh per unit. The ventral jet adapts the existing Ridgeback additive plume. Re-entry heating is stylized cinematic VFX, not atmospheric or thermal simulation. Cracks are surface marks, not terrain deformation. No rocket texture dependency. All effects rewind cleanly by evaluating absolute time.

Use game meshes for normal review and detailed meshes for close shots/recordings. Static distance meshes are deliberately excluded from the animated scene; the original family still supplies them. D0 only in this presentation; D1–D3 remain available in the separate asset inspector. One mesh load is shared between three independently posed clones. Manifest lists source bytes, hashes and per-instance geometry metrics; the viewer displays actual rendered triangles/draw calls including effects. No phone FPS measurement or performance improvement claim.

Controls: Replay, pause, timeline scrub, Gunship/Freefall/Brake/Impact/Settled phase jumps, 0.35× slow motion, optional camera shake, detailed/game selector, and free orbit when Cinematic camera is unchecked. Camera and effects are scene-owned; the original asset has no cinematic camera baked into it.

Validation: `node tools/asset-pipeline/test-ridgeback-cinematic.mjs` samples both detail tiers and three units at 60 Hz, testing contact height, piston endpoints/overlap, trajectory continuity and final reset state. `validation-report.json` records results. Existing source GLBs and decoded Meshopt validation remain in `assets/ridgeback-mech/`; this scene consumes plain GLBs and does not create compressed exports.

Credit: models by jelaludo; derived cinematic arrangement, procedural staging and VFX authored in this repository. Hand-off: commit containing this folder, plus the referenced `assets/ridgeback-mech/` and `assets/korp/` folders.

Browser review limitation: Safari loaded the scene resources but displayed a blank content area for both this scene and the unchanged Ridgeback viewer; final camera/VFX visual review remains pending.
