# C-08 / Industrial Worker

Original heavy biped from the same C-series design family as C-07: ochre ceramic guards, ivory service panels, graphite mechanisms, titanium axle caps and blue-coated optics. The recessed sensor mast, replaceable backpack packs, exposed trunk actuators, articulated hands and broad segmented feet follow the supplied industrial-worker reference. Approximately 2.3 m tall. D0 intact only.

## Authoritative files and budgets

Plain GLB is the runtime source of truth. `derived/meshopt/` contains optional generated copies, not replacement originals. The consuming game performs its own release packing with `gltfpack -cc -kn -km -ke`.

| Tier | Triangles | Mesh draws | Plain bytes | Meshopt bytes | Use |
| --- | ---: | ---: | ---: | ---: | --- |
| LOD0 | 70,696 | 6 | 3,380,960 | 783,524 | Detailed master, close shots and recordings |
| LOD1 | 15,828 | 6 | 1,387,476 | 385,084 | Articulated gameplay, same 55-joint rig and five clips |
| LOD2 | 1,896 | 1 | 154,448 | 48,664 | Static standing map/loading silhouette; no skin or clips |

Game geometry is below the 25k articulated-unit target. Distance is below 3k triangles, one draw and 250 KB. Six shared palette materials; no image textures. The static tier merges to one vertex-colored material. Draw counts above describe the asset primitives, not renderer totals including floor, shadows, markers or comparison models. No measured FPS claim.

## Placement and rig

Metres; +Y up and +Z forward in glTF. Origin is on the ground at the standing hip centre. Standing reserve: 1.6 × 1.3 m. Master rest geometry measures 1.534 × 2.286 × 0.746 m (width / height / depth), with floor clearance nominally 6 mm. Static geometry omits small fittings; origins, joint names, rest transforms and socket positions match the animated tiers.

Place the **complete glTF scene** inside an instance group and clone with `SkeletonUtils.clone`. Skin meshes and skeleton are siblings; do not reposition only `ROOT` or a mesh. `ROOT` is an unanimated skeleton lookup; `MOTION` does not bake forward locomotion. `PELVIS`, `WAIST`, `CHEST`, head, shoulders, hips, knees, ankles, toes, wrists, fingers and thumbs remain distinct rigid pivots. Engine-facing names are unique and dot-free.

`SENSOR_YAW` is intentionally excluded from clips: rotate its local Y axis for optical aiming. Socket nodes have no baked channels. The independent socket hierarchy is retained in static LOD2 even though its mesh cannot animate. Do not claim articulated behavior from the distance tier.

| Sockets | Role |
| --- | --- |
| `SOCKET_HAND_L`, `SOCKET_HAND_R` | Grasp references in each articulated hand |
| `SOCKET_TOOL_L`, `SOCKET_TOOL_R` | Forward accessory mounts |
| `SOCKET_BACK` | Backpack payload mount |
| `SOCKET_SENSOR` | Optical reference under the engine-driven sensor gimbal |
| `SOCKET_SOLE_L/R` | Flat-support reference at 6 mm above authored floor |
| `SOCKET_HEEL_L/R`, `SOCKET_TOE_L/R` | Rolling contact reference during heel placement / toe-off |

No cargo, weapons, terrain collider or collision proxy is embedded. Attach application-specific tools and loads at the named sockets. Carry is an authored braced posture, not a payload-mass simulation.

## Actions

| Clip | Duration | Playback | Translation |
| --- | ---: | --- | --- |
| `Standby_Idle` | 4.0 s | Loop | Stationary; both soles planted |
| `Heavy_Walk_Cycle` | 1.8 s | Loop | Engine supplies +Z at 0.55 m/s |
| `Carry_Walk_Cycle` | 2.4 s | Loop | Engine supplies +Z at 0.36 m/s |
| `Work_Inspect` | 5.0 s | One-shot | Stationary; raises the right hand and returns |
| `Crouch_Service` | 5.0 s | One-shot | Stationary; lowers hips 0.30 m and returns |

Gait timing uses alternate footfalls at phases 0 and 0.5, with 68% stance for normal walking and 74% for carrying. Normal cadence is 66.7 steps/min; carrying is 50 steps/min. Stance is heel placement → flat support → toe roll. The feet stay anchored in world space when the instance is translated at the declared speed. Double support, lateral hip shift, lowered hips, chest counter-rotation and lagging arms give the chassis its weight. Rigid two-bone leg IK keeps segment lengths constant.

Multiply world speed by playback rate. Do not separately advance the individual bones. There is no baked root travel to add. Blend/transition handling and uneven-ground IK belong to the consuming game. The source samples at 120 Hz; packing removes redundant keys. Read explicit clip metadata rather than guessing duration or naming conventions.

## LOD selection and culling

The viewer defaults to LOD0 for review. Suggested loading preview: LOD2 first, LOD1 by 30 m with 8 m hysteresis, subject to consuming-game camera review. Keep LOD1 during all visible motion. Units should not swap to static distance during gameplay; LOD2 is for stationary map/loading roles. LOD0 is opt-in for recordings. Use the measured `clip_envelopes` in `validation-report.json` for animated culling; raised hands extend beyond rest bounds.

## Evidence and remaining acceptance

All three plain and three decoded Meshopt files pass Khronos glTF validation with zero errors/warnings. The suite checks finite, nondegenerate triangles, unique names, cross-tier names/sockets, skins, explicit clips, engine-pivot exclusions, static budgets, rigid limb lengths, return poses, support topology and contact anchors.

8,756 full-geometry pose samples at 120 Hz: minimum floor clearance 4.635 mm, maximum support-anchor drift 0.967 mm, maximum segment-length deviation 0.069 mm, maximum sampled plain/decoded joint-coordinate difference 0.720 mm. Additional intermediate-key samples exercise runtime interpolation. See the machine-readable report for all envelopes and limits.

The viewer exposes five actions, scrub/playback rate, support timeline, heel/double/single/swing phase buttons, ground travel, skeleton, wireframe, foot markers, tier/encoding downloads and an actual-scale C-07 comparison. Blender stills and `design-sheet.png` / `gait-study.png` document the design and gait. `viewer-validation.json` records desktop/mobile WebGL controls and bounds checks.

Pending: consuming-game Three r160 and release gltfpack round-trip, selection thresholds, transitions, general self-collision, terrain/cargo physics, game-camera acceptance and reference-phone measurements. This is a repository contract candidate, not reviewed runtime acceptance.

## Source, provenance and reproduction

- Editable detailed master: `source/blender/a6-c08-worker.blend` from repository root. All five actions are retained as NLA tracks; standby is enabled in the saved master.
- Original geometry / motion: `tools/blender/build_c08_worker.py`, `tools/blender/c08_worker_motion.py`. Shared low-level construction helpers and the C-07 palette are reused; no C-07 mesh is copied into C-08.
- User-provided image `photo_2026-10-28 10.24.53.jpeg`, SHA-256 `60fb8ad29f4150ac9a6beefd0998bdc1a05ccf55281eaac5b30973df8a9e2cee`, is a design reference only and is not redistributed. No third-party license assertion is made. All exported geometry and motion are newly authored.
- The viewer's optional comparison loads the preserved C-07 game file separately at 1:1 scale. It is not included in C-08 exports or the counts above.

Rebuild with Blender 5.2.1, then run the Node packer and validator:

```sh
blender -b -t 2 --python-exit-code 1 --python tools/blender/build_c08_worker.py
node tools/asset-pipeline/pack-c08-worker.mjs
node tools/asset-pipeline/validate-c08-worker.mjs
blender -b -t 2 --python-exit-code 1 --python tools/blender/render_c08_worker.py
blender -b -t 2 --python-exit-code 1 --python tools/blender/render_c08_worker.py -- --gait-study
node tools/asset-pipeline/render-c08-sheets.mjs
python3 tools/build-workshop-docs.py
python3 tools/validate-workshop-navigation.py
```

Serve the repository, set `PLAYWRIGHT_MODULE` / `CHROMIUM_EXECUTABLE` for the local browser runtime and run `tools/asset-pipeline/test-c08-worker-viewer.mjs`. Default server is port 8788; override with `C08_VIEWER_URL`.

Hand-off: pin the delivered commit plus folder `assets/c08-worker/`, with `manifest.json` SHA-256 values. Editable source and generator tools travel with the same commit. Credit: Models by jelaludo.
