# EVA-K7 / Hardsuit Astronaut

An original military-exploration hardsuit built from the user-supplied futuristic astronaut reference: a domed helmet with an opaque bronze-black visor, layered carbon-fibre plates over a mid-grey quilted pressure garment, brass seals and buckles, heavy strapped boots and one small air tank on the upper back feeding the helmet through a hose. Human proportions, 1.98 m to the helmet top. The lighter KESTREL frontier EVA in `animation-tests/` and all earlier families remain unchanged.

Open the viewer:

http://localhost:8788/eva-k7/

## Design

- Helmet: carbon dome, opaque visor patch with a steel frame, brow lip, jaw guard, side lamps, ear pods with brass rings, rear comm block and top ridge. Bellows collar with brass and steel locking rings and four latches.
- Torso: three skinned quilted sections (pelvis, waist, chest) with subtle quilting ridges; faceted chest plate with a crown, pectoral facets, central control module with a dark display and brass latches; abdominal plate carrying the `EVA-K7` marking; pelvis plate; side rib plates; clavicle guards; harness straps with buckles; belt with brass buckle, front pouches and side packs.
- Back: carbon back plate, bracket, steel tank with domed ends, two straps, brass valve and a hose into a brass helmet fitting. `SOCKET_BACK` marks the bracket for alternative packs.
- Arms: shoulder ball under a long pauldron and a layered lower plate; outer and front upper-arm plates; carbon elbow cap with a brass hinge ring; gauntlet plate; a wrist panel on the left forearm and a front plate on the right; brass wrist ring over a steel collar.
- Gloves: padded rubber palm, carbon back plate and knuckle guard, four three-link padded fingers with dorsal guards, two-link thumb. Palms face inward, thumbs forward.
- Legs: hip skirt plates, large front thigh plate, outer thigh plate, thigh strap with buckle, carbon kneecap cup over a knee ball with hinge rings, front shin guard and rear calf plate, carbon boot shaft with rubber cuff and brass ring, instep straps with buckles, heel counter and a thick rubber sole.

## Proportions and scale

Nominal height is an authoring choice of 1.98 m for a tall crew member in a hardsuit; the reference has no scale annotation. Measured master dimensions are 0.922 m wide × 1.960 m high × 0.496 m deep, from a 6 mm ground clearance to the 1.966 m helmet ridge. Hip centre is 1.00 m above ground; the hip → knee → ankle chain is 0.877 m; ankle spacing is 0.30 m; boot support length is 0.27 m.

## Exports and measured budgets

Plain self-contained GLBs are authoritative. Optional Meshopt copies in `derived/meshopt/` are derived. Six palette materials in the animated tiers; one vertex-colour material in the static tier. No external images or buffers.

| Tier | Triangles | Mesh draws | Plain bytes | Meshopt bytes | Clips |
| --- | ---: | ---: | ---: | ---: | ---: |
| Detailed / LOD0 | 75,711 | 6 | 3,253,588 | 782,344 | 6 |
| Game / LOD1 | 20,331 | 6 | 1,462,292 | 443,292 | 6 |
| Static distance / LOD2 | 2,742 | 1 | 221,352 | 67,864 | 0 |

LOD1 meets the unit target of 25k triangles with articulated pivots. LOD2 meets 3k triangles, one draw and 250 KB. Use LOD0 for close inspection and recordings, LOD1 throughout animated gameplay. LOD2 is an unskinned static map/loading silhouette with the same named lookup hierarchy and no clips. Initial LOD2, 30 m approach and 8 m hysteresis are suggested inspection values awaiting game-camera review; never swap a moving character to static distance.

## Rig and runtime contract

Metres, +Y up, +Z forward, origin on the ground beneath the standing hip centre. Standing plot: 0.9 × 0.7 m. Use per-clip envelopes from `validation-report.json` for animated culling (walk envelope 1.02 × 1.90 × 0.93 m). D0 intact only; D1–D3 are not authored and are independent of LOD.

50 rigid joints, 12 sockets and 65 unique dot-free nodes, consistent across all three tiers. Every vertex has a single bone weight. Main path: `ROOT` → `EVAK7_RIG` → `MOTION` → `PELVIS` → `WAIST` → `CHEST` → `NECK` → `HEAD`. Shoulders: `SHOULDER_L/R` carry the pauldrons and follow the chest; `UPPER_ARM`, `FOREARM` and `HAND` carry the sleeves, gauntlets and gloves. Each glove has four three-link fingers (`FINGER_L1_01` through `_03`, and corresponding left/right digits) plus a two-link thumb. Legs: `HIP`, `KNEE`, `ANKLE` and a `TOE` lookup; boots are rigid on `ANKLE`.

Place the complete glTF scene inside an instance wrapper. `ROOT` is a skeleton lookup, while the skin is a scene sibling. Use `SkeletonUtils.clone` for skinned instances. All locomotion clips are in place; move the wrapper along +Z at the declared `speed_mps` times playback rate. No root displacement is baked.

`HEAD` is animated inside the clips (idle glance, survey sweep within ±36° yaw) and may be overridden additively by an engine look-at; `SOCKET_VISOR` marks the visor centre, with +Z in the `HEAD` rest frame as the viewing normal. Twelve sockets retain names, parents and bind positions across tiers: `SOCKET_VISOR`, `SOCKET_BACK`, `SOCKET_HAND_L/R`, `SOCKET_TOOL_L/R`, `SOCKET_SOLE_L/R`, `SOCKET_HEEL_L/R`, `SOCKET_TOE_L/R`. They have no animation tracks. Hand and tool sockets sit on the palm side; the palm normal in the `HAND` rest frame is −X on the left and +X on the right. Foot sockets mark the 6 mm contact plane: flat support anchors the sole, heel placement and toe-off rotate about the heel and toe sockets.

## Motion

Six original performances on the workshop biped IK, adapted to human leg lengths, a 1.00 m hip height and 27 cm boot pivots. Analytic two-bone IK preserves leg lengths. Heel placement, flat support and toe roll remain anchored; walk uses 64% stance, cautious walk 76%. The torso counter-rotates, the pelvis transfers weight laterally and the arms swing with restraint. These are authored flat-floor kinematics, not captured motion or a force simulation.

| Clip | Duration | Mode | Behaviour |
| --- | ---: | --- | --- |
| `Suit_Idle` | 4 s | Loop | Planted stance, slow pressurised-suit breathing, weight shifts and a helmet glance. |
| `Walk_Cycle` | 1.3 s | Loop | 92 steps/min · 0.75 m/s. Heavy-boot heel placement, weight transfer and restrained arm swing. |
| `Cautious_Walk_Cycle` | 2.2 s | Loop | 55 steps/min · 0.32 m/s. Lowered stance, short careful steps and long double support. |
| `Survey_Scan` | 6 s | One-shot | Boots stay planted while the helmet and upper torso sweep the horizon. |
| `Kneel_Inspect` | 5 s | One-shot | Drop the hips 30 cm into a braced inspection crouch, hold, then stand. |
| `Signal_Halt` | 4 s | One-shot | Raise an open right glove, hold a silent halt signal, then lower it. |

## Viewer and verification

Nine views: three-quarter, front, side, rear, helmet, chest, gloves, boots and tank. Six motion controls, playback speed, replay, scrub, contact timelines and phase jumps, ground travel, skeleton, wireframe, boot markers, repeated one-shots, fullscreen and a true-scale B-REK37 comparison. Drag to orbit, scroll to zoom, Space to pause. Grid: 50 cm. Selected plain/Meshopt GLB and Blender source downloads are available. `design-sheet.png`, `detail-sheet.png` and `gait-study.png` are derived studio reviews; `review-images.json` lists their source and generators.

Six plain/decoded exports and 10,824 geometry samples at 120 Hz pass validation: no glTF errors or warnings, finite/nondegenerate geometry, unique naming and cross-tier socket parity, explicit durations, unbaked sockets, loop/return seams, intermediate-key rigid arm/leg/finger lengths, human stance and support length, helmet height, thumb-forward and inward finger curl through motion, the raised palm-forward halt, the survey yaw range, world-space contact anchors and decoded pose agreement. Minimum sampled floor clearance: 2.49 mm. Maximum contact drift: 0.69 mm. Maximum rigid-segment length error: 0.063 mm. Reports: `validation-report.json` and `viewer-validation.json`.

Chromium WebGL checks cover all six clips and tier/encoding combinations, desktop/390 px mobile framing, five close-ups, controls, travel and true-scale comparison with zero page errors. No FPS claim. Repository status: **Contract candidate**. Consuming-game r160/release gltfpack, transitions, general self-collision, terrain/physics, game cameras and reference-phone acceptance remain pending. The received collaboration contract is unchanged.

## Rebuild and hand-off

Editable master: `source/blender/a6-eva-k7.blend`. Geometry and performance sources: `tools/blender/build_eva_k7.py` and `eva_k7_motion.py`. Mesh helpers share the C-07 family toolkit. The private reference remains outside the repository; its filename and hash are recorded in the manifest. Models and original animation by jelaludo.

From the repository root:

```sh
/Applications/Blender.app/Contents/MacOS/Blender -b -t 2 --python-exit-code 1 --python tools/blender/build_eva_k7.py
node tools/asset-pipeline/pack-eva-k7.mjs
node tools/asset-pipeline/validate-eva-k7.mjs
/Applications/Blender.app/Contents/MacOS/Blender -b -t 2 --python-exit-code 1 --python tools/blender/render_eva_k7.py
/Applications/Blender.app/Contents/MacOS/Blender -b -t 2 --python-exit-code 1 --python tools/blender/render_eva_k7.py -- --gait-study
node tools/asset-pipeline/render-eva-k7-sheets.mjs
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs node tools/asset-pipeline/test-eva-k7-viewer.mjs
python3 tools/build-workshop-docs.py
python3 tools/validate-workshop-navigation.py
```

The browser test expects port 8788; override `EVAK7_VIEWER_URL` if needed and `EVAK7_SHOT_DIR` for screenshots. `--distance-only` after Blender's `--` can rebuild LOD2 while preserving the detailed source and existing animated exports; repack and revalidate afterward. Pin the delivered commit plus `assets/eva-k7/`, using manifest hashes. Include source and procedural files for authoring. The game repacks plain GLBs with `gltfpack -cc -kn -km -ke` at release time.
