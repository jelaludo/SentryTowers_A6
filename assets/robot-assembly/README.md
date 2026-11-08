# AUREL-03 / Robotic anatomy kit

A separate adult-proportioned mechanical frame built around a tapered thoracic cage: twelve paired metal ribs, a narrow sternum, clavicles, scapular supports, curved spine and exposed conduits. An open pelvis, distinct arm/leg segments and compact bearings establish the silhouette before adding armor. Two heads share a neck interface: an open cranial frame and a sensor crown. This is a lean adult design study, not a population-average anatomical specification.

Local viewer:

http://localhost:8788/robot-assembly/

Public route after publishing this commit:

https://jelaludo.github.io/SentryTowers_A6/robot-assembly/

The viewer has assembled/exploded states, independent part inspection, both heads, orthographic front/side/back and three-quarter views, proportion guides, an assembly sequence, a joint study, hand opening, seeking, playback speeds, wireframe, fullscreen, PNG capture and selected-model downloads. The complete assembly download follows the chosen head. The separate original Hand Lab and Foot Lab remain unchanged.

## Complete animation download

[Animation kit and import notes](animation-kit/README.md) provide a single ZIP with complete rigged skeleton + muscle GLBs, both heads, game/master tiers, the target rest-pose map and muscle adapter. Use this package for Kimodo/MotionBricks retargeting experiments. The original individual GLB links remain available.

https://jelaludo.github.io/SentryTowers_A6/assets/robot-assembly/animation-kit/aurel03-animation-kit.zip

## Optional muscle layer

`muscles/` adds 66 charcoal muscle bodies with braided tendon ends as a separate, removable layer. The viewer now switches between skeleton, muscles and both, with the original joint and assembly controls. All original GLBs and rig sources remain unchanged. Layer exports, combined budgets and integration notes are in [muscles/README.md](muscles/README.md). Original `validation-report.json`, `viewer-validation.json` and previews describe the skeleton-only baseline at `f2ab7a8`; `muscles/viewer-validation.json` verifies the current viewer.

## Files and measured budgets

The authoritative assets are **plain self-contained GLBs**. `manifest.json` records byte sizes, SHA-256, bounds, required names, sockets, draw calls, triangles and credit for all 42 exports. Each `parts/<module>/` folder has its own manifest with filenames relative to that folder. No compressed upstream copies are included; consuming-game release packing and decoded validation remain pending.

| Complete assembly | Tier | Triangles | Draws | Plain bytes |
| --- | --- | ---: | ---: | ---: |
| Open frame | LOD0 | 343,032 | 11 | 11,765,620 |
| Open frame | LOD1 | 23,576 | 11 | 915,000 |
| Open frame | LOD2 | 2,794 | 1 | 162,452 |
| Sensor crown | LOD0 | 344,308 | 11 | 11,807,440 |
| Sensor crown | LOD1 | 23,692 | 11 | 919,084 |
| Sensor crown | LOD2 | 2,788 | 1 | 162,092 |

There are six complete-assembly exports, plus twelve individual modules in three tiers each: rib cage, pelvis, left/right arms, left/right legs, left/right hands, left/right feet, open head and sensor head. LOD0 retains the full source extremity geometry with one shared finish per component. LOD1 uses the existing economical articulated extremities and keeps every body, finger and toe pivot. LOD2 is a simplified **static rest pose** with one merged surface; named nodes survive only as lookup markers. Distance geometry and review screenshots are marked derivatives. Damage is D0 only; D1–D3 are not authored.

The game assemblies meet the 25,000-triangle articulated-unit target. Their eleven material draws and approximately 0.9 MB size are reported rather than treated as compliance with the separate stationary-landmark targets. Both distance assemblies meet 3,000 triangles, one draw and 250 KB. No frame-rate improvement is claimed.

## Proportions and coordinates

Metres, +Y up, +Z forward. The complete assembly and all standalone parts use a **common ground datum below the body centre**, so separate files overlay in their correct assembled positions. A detached arm is intentionally located at shoulder height, not recentered onto the floor. The same origin and placement are preserved across its tiers. A 1.4 × 1.0 m reservation is metadata for the neutral unit, not a collision envelope for the exploded viewer.

| Design landmark / segment | Metres |
| --- | ---: |
| Nominal crown | 1.800 |
| Shoulder centres | Y 1.475; X ±0.190 |
| Hip centres | Y 0.945; X ±0.090 |
| Knee centres | Y 0.525 |
| Ankle centres | Y 0.140 |
| Upper arm / forearm | 0.300 / 0.255 |
| Thigh / shin | 0.420 / 0.385 |
| Nominal cranial envelope | 0.230 |
| Rib basket width, excluding clavicles | approximately 0.306 |

The game surface reaches approximately Y 1.8006 m; resting soles retain the source foot's approximately 3.5 mm clearance. Exact measured bounds are in the manifest. Master/game tiny detail extrema differ, while all rig frames match. Each distance export preserves its game surface bounds. Head-unit numbers in the manifest describe the nominal design canon, not an anatomical measurement or universal rule.

## Original hands and feet

Hands reuse the original AUREL-01 geometry at uniform **0.82×** scale, with all 23 axes. Feet reuse original AUREL-02 geometry at **1×**, with all 22 axes. Source geometry is assigned to the left limbs; right geometry, winding and bone frames are reflected, with corresponding motor signs corrected. Resting palms face inward, thumbs forward and great toes medially. The loose hand curl comes from `assets/hand-lab/biped.js`. Imported Hand Lab reference models are not included.

The assembly palette combines each extremity's source material groups into one vertex-color finish. It retains detailed surfaces in LOD0 and the economical geometry in LOD1; original standalone hand/foot exports, palettes, references and source files remain untouched. Source module hashes are pinned in the family manifest.

## Assembly and mounting

Use either complete assembly GLB for the simplest integration. Skinned surfaces are **scene-root siblings** of `AUREL_03_ROOT`, not descendants of it. Move or clone the entire loaded scene inside an instance wrapper. Use `SkeletonUtils.clone` for independently posed instances. Moving only the named rig root or copying only its subtree omits the skins.

The separate modules can also reconstruct that same assembly. Keep their root-level skinned meshes under the instance scene. Reparent only each `PART_*` hierarchy with `host.attach(part)` after updating world matrices, preserving its common-datum world transform. Do not reparent its skin under the host or replace the bind matrices. The validation reconstructs the character from the standalone GLBs and compares every posed vertex with the complete export at four articulation times.

| Child module hierarchy | Host node | Mating sockets |
| --- | --- | --- |
| `PART_PELVIS` | `AUREL_03_ROOT` | Body root / fixed |
| `PART_RIBCAGE` | `PELVIS_FRAME` | `SOCKET_LUMBAR` / `SOCKET_RIBCAGE_ATTACH` |
| `PART_ARM_L`, `PART_ARM_R` | `RIBCAGE_SPINE` | `SOCKET_SHOULDER_L/R` / `SOCKET_ARM_L/R_ATTACH` |
| `PART_LEG_L`, `PART_LEG_R` | `PELVIS_FRAME` | `SOCKET_HIP_L/R` / `SOCKET_LEG_L/R_ATTACH` |
| `PART_HAND_L`, `PART_HAND_R` | `ARM_L_WRIST`, `ARM_R_WRIST` | `SOCKET_WRIST_L/R` / `HAND_L/R_SOCKET_WRIST_ATTACH` |
| `PART_FOOT_L`, `PART_FOOT_R` | `LEG_L_ANKLE`, `LEG_R_ANKLE` | `SOCKET_ANKLE_L/R` / `FOOT_L/R_SOCKET_ANKLE_ATTACH` |
| `PART_HEAD` | `RIBCAGE_SPINE` | `SOCKET_HEAD` / `SOCKET_HEAD_ATTACH` |

The slash notation in the table expands to separate names, e.g. `HAND_L_SOCKET_WRIST_ATTACH`. Socket local +Z is the outward connection normal. Mating socket positions coincide and their normals oppose. Arm and head articulation occurs below the fixed module attachment; lumbar yaw carries the shoulder and neck connections with it.

To substitute a head in a custom composition, remove the old `PART_HEAD` hierarchy **and** its `HEAD_GEOMETRY` scene-root skin, then attach the new head hierarchy and add its skin as above. The provided `assembly_sensor` files already perform that substitution and avoid runtime swapping work.

## Runtime

Import `createRig`, `MOTIONS`, `DIM` and `assemblySpread` from `runtime.js`, including its sibling Hand Lab/Foot Lab dependencies when copying the family. Call `createRig(completeScene).pose({spread, articulation, time, openHands})`. `spread` and `openHands` are 0–1; `time` is seconds. The adapter restores rest transforms, applies the selected mechanical study and updates all skeletons. Call it on the complete assembly, not an isolated component. Use the hand/foot runtimes and the documented prefixes when controlling components independently.

| Runtime motion | Duration | Behaviour |
| --- | ---: | --- |
| `Anatomy_Assembly_Cycle` | 20 s, loop | Exploded hold, eased convergence, assembled hold, separation |
| `Anatomy_Articulation_Cycle` | 12 s, loop | Lumbar/head turn, shoulder/elbow movement and a right-leg flexion study |

These are named **runtime** cycles; the GLBs contain no baked clips. Engine-driven axes remain editable. The body pivots are `RIBCAGE_SPINE`, `HEAD_YAW`, `HEAD_PITCH`, `ARM_L/R_SHOULDER`, `ARM_L/R_ELBOW`, `ARM_L/R_WRIST`, `LEG_L/R_HIP`, `LEG_L/R_KNEE`, `LEG_L/R_ANKLE`. Hand and foot axes have `HAND_L_`, `HAND_R_`, `FOOT_L_`, `FOOT_R_` prefixes on the original component names. Bind geometry is authored in the displayed rest pose; the runtime uses absolute joint values relative to the preserved local frames.

The assembly motion is an exploded mechanism study. The joint cycle is kinematic, not walking, balance, force-based suspension or collision solving. Small tubes and shafts belong rigidly to their segment; no soft-hose simulation is implied. Production gait, armor variants, arbitrary-pose self-collision, engineering loads and manufacturing tolerances remain future work.

Suggested LOD metadata starts with LOD2 and uses LOD1 inside 30 m with 8 m hysteresis, subject to the consuming camera. **Keep LOD1 for visible motion, interaction or assembly**. Return to this rest pose before a static swap. LOD0 is intended for close shots and recordings. This is provisional selection guidance, not measured device performance.

## Validation, sources and hand-off

`validation-report.json` covers all 42 plain GLBs, zero glTF errors/warnings, unique dot-free names, finite nondegenerate geometry, skin weights, matching frames, socket normals, bounds, module reconstruction and 642 kinematic samples. `viewer-validation.json` verifies six assembled head/tier combinations against actual unculled renderer counts, eleven isolated modules, downloads, motion controls, static lockout and desktop/mobile layout. Screenshots in `previews/` are derived renders of the exported assets.

Rebuild and check from the repository root:

```sh
node tools/asset-pipeline/build-robot-assembly.mjs
node tools/asset-pipeline/validate-robot-assembly.mjs
node tools/asset-pipeline/test-robot-assembly-viewer.mjs
python3 tools/build-workshop-docs.py
```

The browser check accepts `ANATOMY_LAB_BASE`, `PLAYWRIGHT_MODULE` and `CHROMIUM_PATH`. The source is `tools/asset-pipeline/robot-assembly-shape.mjs`; all procedural geometry is original Workshop work. Thoracic arrangement was checked against OpenStax's account of the sternum and twelve rib pairs, including the final two floating pairs. No source images, passages or mesh data were copied:

https://openstax.org/books/anatomy-and-physiology/pages/7-4-the-thoracic-cage

Credit **jelaludo** under the workshop's original-model reuse terms. Hand off the containing commit hash plus `assets/robot-assembly/`, its original hand/foot runtime dependencies and the procedural source. The received `docs/ASSET-COLLABORATION.md` is unchanged. Remaining: visual acceptance, future module/armor designs, production locomotion and contact, D1–D3, consuming-game r160/release gltfpack validation and reference-device profiling. This change does not retroactively certify older robot families.
