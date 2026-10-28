# B-REK43 / Long-stride Recon

A separate B-REK variant from the C-07 Mechanical Cheetah manufacturer, developed from the same user-supplied B-REK37 image. The requested direction is elegant and clearly non-human despite being bipedal: longer splayed legs, compact split mechanical hooves, two small spherical hips on a thin cross tube, long curved grippers, a raised hexagonal thorax and a small radio backpack. B-REK37 and all earlier families remain unchanged.

Navy ceramic, graphite mechanisms, ivory service panels, titanium bearings and blue compound optics retain the manufacturer language. The shoulders have curved double-skin armor mounted on radial brackets. Finger links taper into hooked mechanical tips. The radio receiver has controls, a status window, protected antenna root and whip.

Open the viewer:

http://localhost:8788/b-rek43/

## Hand orientation correction / 28 October 2026

Neutral palms now face inward, thumbs point forward and fingers curl into the palm. The armor stays on the outside of each hand. The raised right hand rolls and straightens for a palm-forward halt signal. This corrects the earlier finger flexion toward the dorsal armor.

Hand and tool socket positions follow the corrected palm side; names and parent relationships are preserved across all tiers. For attachment orientation, the palm normal in the HAND node's rest frame is −X on the left and +X on the right. Transform that vector by the posed hand rotation. Bone lookup names remain unchanged.

`hand-scope-validation.json` compares the corrected detailed/game exports with original commit `7f9598bee3ecd702908a2f3e9f4ddf2478475219`. Per tier, 33 non-hand bind nodes and 360 non-hand animation tracks are unchanged; 64,180 detailed and 15,816 game body vertices retain their positions, normals and material assignments. Original source and exports remain available at that pinned commit. `validation-report.json` additionally checks both thumbs forward, relaxed finger curl into the palms throughout motion, and the raised palm forward.

## Proportions and scale

Nominal height is a provisional 2.7 m authoring choice; the reference has no scale annotation. Measured master dimensions are 0.998 m wide × 2.709 m high × 0.479 m deep, from a 6 mm ground clearance to the 2.715 m antenna tip.

| Bind-pose measurement | B-REK37 | B-REK43 |
| --- | ---: | ---: |
| Hip center above ground | 1.38 m | 1.70 m |
| Hip → knee → ankle chain | 1.184 m | 1.471 m |
| Foot/hoof support length | 0.34 m | 0.24 m |
| Ankle spacing | 0.41 m | 0.55 m |
| Hip height / antenna height | 56.9% | 62.6% |

The leg chain is 24.2% longer, while the hoof support is 29.4% shorter. `proportions.json` measures the actual game GLBs and pins both file hashes. The B-REK37 scale checkbox shows the earlier robot standing beside this one at true size.

## Exports and measured budgets

Plain self-contained GLBs are authoritative. Optional Meshopt copies in `derived/meshopt/` are derived. Six palette materials in the animated tiers; one vertex-color material in the static tier. No external images or buffers.

| Tier | Triangles | Mesh draws | Plain bytes | Meshopt bytes | Clips |
| --- | ---: | ---: | ---: | ---: | ---: |
| Detailed / LOD0 | 114,942 | 6 | 4,817,368 | 1,141,808 | 6 |
| Game / LOD1 | 21,238 | 6 | 1,571,988 | 463,992 | 6 |
| Static distance / LOD2 | 2,806 | 1 | 220,748 | 66,824 | 0 |

LOD1 meets the unit target of 25k triangles with articulated pivots. LOD2 meets 3k triangles, one draw and 250 KB. Use LOD0 for close inspection and recordings, LOD1 throughout animated gameplay. LOD2 is an unskinned static map/loading silhouette with the same named lookup hierarchy, no clips. Initial LOD2, 30 m approach and 8 m hysteresis are suggested inspection values awaiting game-camera review; never swap a moving character to static distance.

## Rig and runtime contract

Metres, +Y up, +Z forward, origin on ground beneath the standing pelvis. Standing plot: 1.3 × 1.0 m. Use per-clip envelopes from `validation-report.json` for animated culling. D0 intact only; D1–D3 are not authored and are independent of LOD.

63 rigid joints and 66 unique dot-free nodes, consistent across all three tiers. Every vertex has a single bone weight. Main path: `ROOT` → `BREK43_RIG` → `MOTION` → `PELVIS` → `WAIST` → `CHEST` → `NECK` → `HEAD` → `SENSOR_YAW`. Each hand has four three-link fingers (`FINGER_L1_01` through `_03`, and corresponding left/right digits), plus a two-link opposed thumb. The spherical hips belong to `HIP_L/R`; the transverse tube belongs to `PELVIS`. Each cloven pair shares its ankle/toe carrier; its halves do not have independent terrain compliance.

Place the complete glTF scene inside an instance wrapper. `ROOT` is a skeleton lookup, while the skin is a scene sibling. Use `SkeletonUtils.clone` for skinned instances. All locomotion clips are in place; move the wrapper along +Z at the declared `speed_mps` times playback rate. No root displacement is baked.

`SENSOR_YAW` is excluded from clips and remains engine-driven about local Y (glTF up). Survey animates `HEAD` and the torso. Twelve sockets retain names, parents and bind positions across tiers: `SOCKET_SENSOR`, `SOCKET_BACK`, `SOCKET_HAND_L/R`, `SOCKET_TOOL_L/R`, `SOCKET_SOLE_L/R`, `SOCKET_HEEL_L/R`, `SOCKET_TOE_L/R`. They have no redundant animation tracks. The hoof sockets mark the centerline of the paired contact plane at 6 mm above ground; heel/sole/toe names preserve the contact convention despite the compact cloven shape.

## Recon motion

The six B-REK37 performances are adapted to the longer leg chain, new hoof pivot locations and third finger joints. Analytic two-bone IK preserves leg lengths. Heel placement, flat support and toe roll remain anchored; patrol uses 66% stance, stealth 78%. Arms counter-swing, the torso counter-rotates and the pelvis transfers weight laterally. These are authored flat-floor kinematics, not captured motion or a force simulation.

| Clip | Duration | Mode | Behavior |
| --- | ---: | --- | --- |
| `Recon_Idle` | 4 s | Loop | Planted stance, quiet balance corrections and a slow optical check. |
| `Patrol_Walk_Cycle` | 1.5 s | Loop | 80 steps/min · 0.70 m/s. Heel placement, weight transfer and opposing arm swing. |
| `Stealth_Walk_Cycle` | 2.4 s | Loop | 50 steps/min · 0.28 m/s. Lowered stance, short quiet steps and extended double support. |
| `Survey_Scan` | 6 s | One-shot | Feet remain planted while the head and upper torso sweep the surroundings. |
| `Crouch_Observe` | 5 s | One-shot | Drop the pelvis 43 cm, hold a low observation position, then return. |
| `Signal_Halt` | 4 s | One-shot | Raise an open right hand, hold a silent halt signal, then return. |

## Viewer and verification

Eight views: three-quarter, front, side, rear, optics, hips, grippers and hooves. Six motion controls, playback speed, replay, scrub, contact timelines and phase jumps, ground travel, skeleton, wireframe, contact markers, repeated one-shots, fullscreen and B-REK37 comparison. Drag to orbit, scroll to zoom, Space to pause. Grid: 50 cm. Selected plain/Meshopt GLB and Blender source downloads are available. `design-sheet.png`, `detail-sheet.png` and `gait-study.png` are derived studio reviews; `review-images.json` lists their source and generators.

Six plain/decoded exports and 11,016 geometry samples at 120 Hz pass validation: no glTF errors or warnings, finite/nondegenerate geometry, unique naming and cross-tier socket parity, explicit durations, unbaked sensor control, loop/return seams, intermediate-key rigid arm/leg/finger lengths, compact hoof support, world-space contact anchors and decoded pose agreement. Minimum sampled floor clearance: 5.07 mm. Maximum contact drift: 1.62 mm. Maximum rigid-segment length error: 0.128 mm. Reports: `validation-report.json` and `viewer-validation.json`.

Chromium WebGL checks cover all six clips and tier/encoding combinations, desktop/390 px mobile framing, close-ups, controls, travel and true-scale comparison with zero page errors. No FPS claim. Repository status: **Contract candidate**. Consuming-game r160/release gltfpack, transitions, general self-collision, terrain/physics, game cameras and reference-phone acceptance remain pending. The received collaboration contract is unchanged.

## Rebuild and hand-off

Editable master: `source/blender/a6-b-rek43.blend`. Geometry and adapted performance sources: `tools/blender/build_b_rek43.py` and `b_rek43_motion.py`. Material/mesh helpers share the C-07 family. The private reference remains outside the repository; its original B-REK37 filename and hash are recorded in the manifest. Models and original animation by jelaludo.

From the repository root:

```sh
/Applications/Blender.app/Contents/MacOS/Blender -b -t 2 --python-exit-code 1 --python tools/blender/build_b_rek43.py
node tools/asset-pipeline/pack-b-rek43.mjs
node tools/asset-pipeline/validate-b-rek43.mjs
node tools/asset-pipeline/validate-b-rek43-hand-scope.mjs
node tools/asset-pipeline/measure-b-rek43-proportions.mjs
/Applications/Blender.app/Contents/MacOS/Blender -b -t 2 --python-exit-code 1 --python tools/blender/render_b_rek43.py
/Applications/Blender.app/Contents/MacOS/Blender -b -t 2 --python-exit-code 1 --python tools/blender/render_b_rek43.py -- --gait-study
node tools/asset-pipeline/render-b-rek43-sheets.mjs
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs node tools/asset-pipeline/test-b-rek43-viewer.mjs
python3 tools/build-workshop-docs.py
python3 tools/validate-workshop-navigation.py
```

The browser test expects port 8788; override `BREK43_VIEWER_URL` if needed. `--distance-only` after Blender's `--` can rebuild LOD2 while preserving the detailed source and existing animated exports; repack and revalidate afterward. Pin the delivered commit plus `assets/b-rek43/`, using manifest hashes. Include source and procedural files for authoring. The game repacks plain GLBs with `gltfpack -cc -kn -km -ke` at release time.
