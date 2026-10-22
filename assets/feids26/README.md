# FEIDS-26 / Fusiform Expendable Interplanetary Delivery System

Expendable interplanetary cargo shell, designed as a projectile launched between planets. A tapered tail and rounded ceramic nose form an approximately 14.3 m long, 7.5 m maximum-diameter fusiform body. The four curved quarters separate radially to release cargo. This prototype presents terminal deployment; it does not simulate launch energy, interplanetary navigation, atmospheric aerodynamics or thermal protection performance.

Two intact MX-06 Ridgebacks at 0.75 scale fit in tandem, with folded hydraulic legs. The cinematic uses two capsules for four mechs. Cargo remains separate and references the original Ridgeback files; no source mech export is modified. Healthy detailed/game cargo fits inside the inner shell with at least 0.247 m sampled vertex clearance and 0.313 m conservative longitudinal separation. Dented/breached shell states are visual damage alternatives, not certified transport clearances.

## Runtime contract

Plain GLB is the source of truth. Coordinates: metres, +Y up, +Z nose/forward. Root is on the ground below the shell centre; geometric axis is Y = 3.8 m. Socket roots: `SOCKET_CARGO_1` at (0, 2.05, -2.2), `SOCKET_CARGO_2` at (0, 2.05, 2.2). Apply 0.75 cargo scale to wrappers, preserving original rig nodes. `SOCKET_CENTER` identifies the shell axis.

`SHELL_QUADRANT_1` through `SHELL_QUADRANT_4` are independently driven engine pivots. `Shell_Separate` is a four-second one-shot translating quarters outward by 6 m and slightly aft, with a small roll. Play the clip OR call `applyShell(root,time)`, never both. D0–D2 detailed/game tiers include it; D3 and LOD2 are static. All original node/socket names remain present across tiers and damage states; lookup-only nodes in LOD2 cannot animate its merged mesh. Keep original coordinates when instancing.

LOD0 is the recording master (D0 18,400 triangles, five draws, 888,964 bytes). LOD1 is the articulated game shell (4,848 triangles, five draws, 280,584 bytes). LOD2 is a static closed distance/loading shell (880 triangles, one draw, 63,420 bytes). Fetch distance first; swap near 150 m with 20 m hysteresis and always swap before shell separation. No measured phone FPS or speedup claim. Manifest contains all per-state measurements and source hashes; Meshopt copies are derived and validated after decoding.

Damage is independent from LOD: D0 intact; D1 scorched ceramic; D2 dented quadrant; D3 breached shell without deployment animation. The viewer defaults to D0 and prevents D3 playback. Broad collider suggestion: closed fusiform envelope from the profile in `runtime.js`; disable it before cargo release and use separate shell-quarter colliders. Collision response and debris cleanup belong to the game.

## Linked scene

Open `../../feids26/` for two-capsule deployment, packed cargo cutaway, or split-shell inspection. The packed cutaway hides quadrant 2 for inspection only. Scene `FEIDS_Deployment` lasts 15 seconds: entry first, splitting from 4–7 s, release at 7/7.4 s, then leg unfolding, short braking jets and touchdown at 9.65/10.05 s. Cargo sockets hold the folded rigs until release. Shell debris disperses separately. Ground cracks, smoke, hot trails, camera shake and star/sky transition are presentation VFX.

`feids26/timeline.js` owns cargo folding/landing and scene trajectories; `runtime.js` owns only shell separation. Original mech weapon axes remain engine-driven. This is a deterministic scene, not a new baked cargo-motion GLB. Scene controls retain the compact top-right HUD and native fullscreen on Play/Replay. `?play=1` starts an unobstructed full-viewport autoplay presentation; native fullscreen requires user interaction.

Build: `node tools/asset-pipeline/build-feids26.mjs`. Validate: `node tools/asset-pipeline/validate-feids26.mjs`. Render derived review: `node tools/asset-pipeline/feids-review.mjs`, then Blender with `tools/blender/render_feids26.py`. `source/blender/feids26-review.blend` is a derived exploded assembly, not the source model. Validation report covers all plain/decoded Meshopt exports, names, finite/nondegenerate triangles, clip samples, healthy cargo packing and planted landing contacts. It does not certify continuous full-scene collision. Blender review render inspected; live browser cinematic review pending.

Credit: Models by jelaludo. Hand-off: commit hash plus `assets/feids26/`, `feids26/`, and unchanged referenced `assets/ridgeback-mech/` and `ridgeback-drop/effects.js`.
