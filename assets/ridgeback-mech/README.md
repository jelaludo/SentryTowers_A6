# MX-06 Ridgeback / Six-legged mech prototype

Original game-oriented model based on the user-supplied military exploration mech concept. Exactly six articulated hydraulic legs (three per side), with three hardened spike claws per foot; one rotary minigun, one laser cannon and two six-tube missile pods. Sand/graphite vertex-color armor, protected hose segments, layered panels, joint guards, reconnaissance optics and restrained amber details. No reference image or external texture is embedded. This is a geometric prototype, not a photoreal texture reproduction.

## Authoritative package and coordinates

`assets/ridgeback-mech/` contains 12 plain source-of-truth GLBs and 12 optional derived Meshopt copies. Each is self-contained. Metres, +Y up, +Z forward, ground-centred `MX06_ROOT`, 8 × 8 m reserved plot. Root, articulated node names and sockets match across all damage states and tiers. Socket rest coordinates match across tiers within a damage state; the D3 collapsed pose deliberately lowers body-mounted sockets. Exact bounds, hashes, sockets, clip names, durations and collider notes are in `manifest.json`.

LOD0 is the detailed close-shot/recording master; LOD1 retains the complete walking and weapon rig. LOD2 is one static mesh and one material, parked in the appropriate damage pose, with named lookup objects retained. It has no clips and must not be animated. Initial load may use LOD2, approaching at 140 m with 20 m hysteresis (provisional); keep LOD1 while moving or seen closely. Damage and LOD are separate axes.

## Damage states

| State | Geometry and appearance | Capability |
| --- | --- | --- |
| D0 | Intact layered armor and limbs | Full 0.8 m foot travel, 0.32 m lift |
| D1 | Dented front-left armor and scuffed surfaces | Full gait and aiming |
| D2 | Breached/dented front-left hull, buckled left-front shin, darkened damaged components | 0.36 m travel, 0.15 m lift, half weapon bearing sector |
| D3 | Lowered/spread wreck posture, missing flank panels, short damaged aerial, sagged laser and darkened armor | No walking clip, movement, barrel spin or aiming; weapons offline |

Damage is whole-machine; localized damage swapping and detached fragments are not implemented in this prototype. All six legs and 18 spike sockets remain addressable in every state.

## Walk and hydraulic rig

`Walk_Cycle` is a four-second, looping, in-place GLB clip in D0/D1 at LOD0/1. D2 uses `Damaged_Walk_Cycle`, also four seconds. D3 and LOD2 have no baked clips. The clips drive only leg and hydraulic nodes. Weapon aiming, rotary barrel spin and sensors remain engine-driven.

Alternating tripods are FL/MR/RL and FR/ML/RR. A 60% stance phase gives overlap between support tripods. Each leg has `HIP_YAW_{id}`, `HIP_PITCH_{id}`, `KNEE_{id}`, `ANKLE_{id}`; upper and lower links measure 1.15 and 1.65 m. Ankle counter-rotation holds the claw orientation fixed during stance. `SOCKET_FOOT_{id}` is the ground-level foot centre; `SOCKET_CLAW_{id}_{1..3}` are the actual spike tips.

Choose one gait source:

- Use the exported clip with an animation mixer. After its update, call `solveHydraulics(root)` for exact piston alignment between baked keyframes.
- Or call `applyMech(root, timeSeconds, {mode:'walk', damage, aimYaw, aimPitch, barrelAngle})` from `runtime.js`. Use `mode:'park'` for all six feet planted. Angles are radians. This controller is procedural visual IK, not terrain/contact physics.

The gait contains no root translation. For a level-ground forward walk at playback rate 1, move the root along +Z by 0.333333 m/s in D0/D1 or 0.15 m/s in D2 (stride / 2.4 s). Scale root speed and playback rate together. Root turns, slopes, uneven ground, obstacle negotiation and footstep events require game-side integration.

`SOCKET_HYDRAULIC_UPPER_{id}` and `SOCKET_HYDRAULIC_LOWER_{id}` are the piston endpoints. `HYDRAULIC_AIM_{id}` points local +Y toward the lower endpoint; `PISTON_SLIDE_{id}` translates by endpoint distance. Barrel and rod are each 0.54 m long. Piston diameter never scales. Sampled lengths: 0.5927–0.9255 m, with minimum overlap 0.1545 m. These are visual mechanisms, not engineered actuators.

## Weapons, sensors and collision

Engine-driven pivots: `MINIGUN_YAW`, `MINIGUN_PITCH`, `MINIGUN_SPIN`, `LASER_YAW`, `LASER_PITCH`, `MISSILE_ELEVATION`, `SENSOR_YAW`. Preview bearing is ±36°, elevation approximately −6.9° to +31.5°. Positive user elevation produces negative local X rotation for +Z-pointing guns. The minigun spins about local Z. `SOCKET_MINIGUN_MUZZLE_1..6`, `SOCKET_LASER_MUZZLE`, `SOCKET_MISSILE_L_1..6`, `SOCKET_MISSILE_R_1..6`, `SOCKET_CAMERA` and `SOCKET_PAYLOAD` are explicit connection nodes. Weapon muzzle axes are local +Z. Exported gait does not touch these pivots.

No projectile, missile guidance, hit detection or firing simulation is included. The manifest supplies a prototype hull box and named foot contacts. Game-side articulated collision, terrain response, aiming/firing clearance and mobile profiling remain pending. No FPS claim or production acceptance claim.

## Measured exports

One shared vertex-color material. Draw counts reflect authored meshes, excluding viewer grid/contact markers.

| State | Tier | Triangles | Draws | Plain bytes | Derived Meshopt bytes |
| --- | --- | ---: | ---: | ---: | ---: |
| D0 | LOD0 | 19,748 | 38 | 1,159,236 | 195,460 |
| D0 | LOD1 | 7,888 | 38 | 663,856 | 128,988 |
| D0 | LOD2 | 2,920 | 1 | 199,480 | 73,756 |
| D1 | LOD0 | 19,748 | 38 | 1,159,996 | 276,396 |
| D1 | LOD1 | 7,888 | 38 | 664,648 | 169,776 |
| D1 | LOD2 | 2,920 | 1 | 199,476 | 94,572 |
| D2 | LOD0 | 19,840 | 38 | 1,165,032 | 287,452 |
| D2 | LOD1 | 7,948 | 38 | 668,344 | 176,552 |
| D2 | LOD2 | 2,964 | 1 | 202,408 | 96,632 |
| D3 | LOD0 | 19,676 | 38 | 962,952 | 184,176 |
| D3 | LOD1 | 7,892 | 38 | 474,836 | 113,184 |
| D3 | LOD2 | 2,908 | 1 | 198,156 | 74,760 |

Game tiers are under the 25k articulated-unit triangle target. Their 38 independently animated meshes and approximately 0.66 MB animated plain exports are reported explicitly; they do not meet the separate landmark 10-draw/400 KB reference. Distance tiers meet 3k triangles, one draw and 250 KB. The game can apply its own release-time gltfpack compression to the plain sources.

## Viewer and validation

Open `/ridgeback-mech/`. Select D0–D3, detailed/game/distance, plain or Meshopt, procedural walk/exported clip/park, pause or scrub, weapon bearing/elevation, rotary barrel preview, 18 claw-contact markers, wireframe and three camera views. D3 and LOD2 disable animation/aiming controls. Downloads match the selected state/tier/encoding.

`validation-report.json` records 24 validated exports, zero glTF errors/warnings (compressed copies validated after decoding), unique dot-free node names, node/socket tier parity, measured geometry/bytes/hashes, nondegenerate triangles, 1,296 procedural pose samples and 384 decoded clip samples. At least three feet stay planted; all spike tips remain level and fixed during stance when root motion is applied. Maximum sampled clip foot error versus procedural IK: 1.30 mm. D3 ignores motion commands.

Build: `node tools/asset-pipeline/build-ridgeback-mech.mjs`.
Validate: `node tools/asset-pipeline/validate-ridgeback-mech.mjs`.
Render: Blender `--background --python tools/blender/render_ridgeback_mech.py`; optionally `-- --damage 1`, `2`, or `3`.

`source/blender/ridgeback-mech.blend` is a derived editable parked review assembly. Detailed GLBs retain the walk clips for animation/recording. The preview and D1–D3 images are renders of actual exported geometry. Generator: `tools/asset-pipeline/ridgeback-mech-shape.mjs`.

Hand-off: the repository commit containing this README plus folder `assets/ridgeback-mech/`; use manifest SHA-256 values for lock files. Credit: **Models by jelaludo**. Original rovers, sentries and extractor assets are preserved.
