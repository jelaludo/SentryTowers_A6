# B-REK37 / Recon Biped

A new reconnaissance humanoid following the user-supplied B-REK37 reference: compact asymmetric multi-aperture sensor head, exposed cervical link, broad shoulders over a narrow open waist, long legs, slim three-toe feet and articulated hands. The C-07 Mechanical Cheetah manufacturer language appears in floating ceramic panels, ivory service inserts, graphite seals, titanium axle caps, exposed actuators and blue-coated optics. This unit uses a navy field livery.

Nominal scale is an authoring assumption of 2.4 m; the reference did not specify dimensions. Measured standing master is 1.060 m wide × 2.419 m high × 0.492 m deep. The antenna reaches 2.425 m above ground. No weapons, payload or damage variants are included.

Open the viewer:

http://localhost:8788/b-rek37/

## Files and measured budgets

Plain self-contained GLBs are authoritative; optional Meshopt files under `derived/meshopt/` are derived. Vertex/material colors only, no external textures or buffers. Detailed and game tiers use six shared palette materials; static distance uses one vertex-color material. Preserve all original families.

| Tier | Triangles | Mesh draws | Plain bytes | Meshopt bytes | Clips |
| --- | ---: | ---: | ---: | ---: | ---: |
| Detailed / LOD0 | 119,082 | 6 | 5,250,964 | 1,177,156 | 6 |
| Game / LOD1 | 19,438 | 6 | 1,519,136 | 431,252 | 6 |
| Static distance / LOD2 | 2,092 | 1 | 170,048 | 52,176 | 0 |

The unit game tier is below the 25k-triangle target. The static map/loading tier meets 3k triangles, one draw and 250 KB. Detailed LOD0 is for close shots and recordings. Use LOD1 for animated gameplay and retain it while moving. LOD2 is an unskinned static standing silhouette with the same named lookup hierarchy; it cannot play clips. The manifest's initial LOD2, 30 m approach and 8 m hysteresis are suggested workshop values pending game-camera acceptance, not measured selection thresholds.

## Rig and placement

Metres, +Y up, +Z forward. Origin is ground beneath the standing hip center. Reserve a 1.2 × 1.0 m standing plot; moving limbs need the per-clip culling envelopes in `validation-report.json`. D0 is intact. D1–D3 are not authored, and damage is independent of LOD.

55 named rig joints, 58 unique dot-free lookup nodes, identical across all tiers. Main hierarchy: `ROOT` → `BREK37_RIG` → `MOTION` → `PELVIS` → `WAIST` → `CHEST` → `NECK` → `HEAD` → `SENSOR_YAW`, plus shoulders, arms, hands, four two-link fingers and two-link thumbs, hips, knees, ankles and toe carriers. Armor is rigidly weighted to one joint per vertex. Axle caps, panel edges and hand articulation remain in LOD1; small bolts and collars are reduced.

Place the **complete glTF scene** in an instance wrapper. `ROOT` is the skeleton lookup, not the only top-level object; the skinned mesh is a scene sibling. Use `SkeletonUtils.clone` for animated instances. Locomotion is in place: translate the instance along +Z at the clip's `speed_mps` multiplied by playback rate. No root displacement is baked.

`SENSOR_YAW` remains engine-driven and is excluded from all animation tracks. Its local Y is glTF up. The authored survey turns `HEAD` and the torso; the independent optical pod can still track a target. Do not simultaneously replace those authored head transforms without an explicit blend policy.

`SOCKET_SENSOR` mounts at the optical pod; `SOCKET_BACK` at the dorsal electronics. `SOCKET_HAND_L/R` are grasp references and `SOCKET_TOOL_L/R` face forward. `SOCKET_SOLE_L/R`, `SOCKET_HEEL_L/R` and `SOCKET_TOE_L/R` describe the foot contact plane at 6 mm above ground. Sole contact is planted during flat support; heel and toe rolls rotate about their matching socket. All sockets preserve names, parents and bind transforms across tiers, and have no redundant baked tracks.

## Authored recon motion

| Clip | Duration | Mode | Behavior |
| --- | ---: | --- | --- |
| `Recon_Idle` | 4 s | Loop | Planted stance, quiet balance corrections and a slow optical check. |
| `Patrol_Walk_Cycle` | 1.5 s | Loop | 80 steps/min · 0.70 m/s. Heel placement, weight transfer and opposing arm swing. |
| `Stealth_Walk_Cycle` | 2.4 s | Loop | 50 steps/min · 0.28 m/s. Lowered stance, short quiet steps and extended double support. |
| `Survey_Scan` | 6 s | One-shot, returns to idle | Feet remain planted while the head and upper torso sweep the surroundings. |
| `Crouch_Observe` | 5 s | One-shot, returns to idle | Drop the pelvis 38 cm, hold a low observation position, then return. |
| `Signal_Halt` | 4 s | One-shot, returns to idle | Raise an open right hand, hold a silent halt signal, then return. |

Patrol uses 66% stance and stealth 78%, with alternating left/right touchdown. Analytic two-bone IK preserves thigh and shin lengths. Shoulder/arm counter-swing, torso counter-rotation and a small lateral pelvis shift accompany foot placement. This is independently authored flat-floor kinematic animation, not captured reference motion or a force simulation. Terrain IK, collision avoidance, transitions and physics belong to game integration.

## Inspection and evidence

Viewer controls: six actions, play/pause, replay, quarter-to-double speed, timeline scrub, four gait phase jumps, contact tracks, floor travel, skeleton, wireframe, foot markers, repeated one-shots, five cameras, fullscreen, and C-07 at actual scale. All three tiers have plain/Meshopt downloads. Drag to orbit, scroll to zoom, Space to pause; grid spacing is 50 cm.

`validation-report.json` records six plain/decoded exports and 11,016 complete-geometry samples at 120 Hz: no glTF errors or warnings; finite, nondegenerate geometry; exact node/socket parity; explicit clip durations; engine sensor exclusion; loop/return seams; intermediate-key rigid segment lengths; ground clearance; support anchors; and decoded motion agreement. Minimum sampled geometry clearance is 5.38 mm, maximum stance drift 1.14 mm and maximum segment-length error 0.176 mm.

`viewer-validation.json` records actual Chromium WebGL desktop and 390 px mobile checks of six clips, all tier/encoding combinations, contact phase controls, timeline/playback, static-tier disabling, ground travel, camera bounds, C-07 comparison and zero page errors. This is not an FPS measurement.

`design-sheet.png`, `gait-study.png` and individual studio PNGs are derived reviews rendered from the Blender master. `review-images.json` lists their generators and provenance. The private reference image remains outside the repository; its filename/hash are recorded in the manifest without a third-party licensing assertion. Models and original animation by jelaludo.

Repository status: **Contract candidate**. Pending: consuming-game Three r160 and release `gltfpack -cc -kn -km -ke`, animation transitions, general self-collision, terrain/physics, game cameras/LOD thresholds and reference-phone performance. The received collaboration contract is unchanged.

## Rebuild and hand-off

Editable master: `source/blender/a6-b-rek37.blend` at repository root. Procedural sources: `tools/blender/build_b_rek37.py` and `b_rek37_motion.py`. Low-level hard-surface helpers are shared with C-07; existing family exports are unchanged.

From the repository root:

```sh
/Applications/Blender.app/Contents/MacOS/Blender -b -t 2 --python-exit-code 1 --python tools/blender/build_b_rek37.py
node tools/asset-pipeline/pack-b-rek37.mjs
node tools/asset-pipeline/validate-b-rek37.mjs
/Applications/Blender.app/Contents/MacOS/Blender -b -t 2 --python-exit-code 1 --python tools/blender/render_b_rek37.py
/Applications/Blender.app/Contents/MacOS/Blender -b -t 2 --python-exit-code 1 --python tools/blender/render_b_rek37.py -- --gait-study
node tools/asset-pipeline/render-b-rek37-sheets.mjs
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs node tools/asset-pipeline/test-b-rek37-viewer.mjs
python3 tools/build-workshop-docs.py
python3 tools/validate-workshop-navigation.py
```

The browser test expects the repository served on port 8788; override `BREK37_VIEWER_URL` if necessary. Pin the delivered commit plus `assets/b-rek37/`, using manifest SHA-256 values. Include the editable master and procedural sources for authoring. Derived compression is optional; the consuming game repacks the authoritative plain GLBs at release time.
