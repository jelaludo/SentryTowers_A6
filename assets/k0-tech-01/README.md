# K0-TECH-01 / Felis

A lynx-point Siamese mechanical house cat with recessed blue-tinted optical lenses, warm beige and porcelain-white armor, taupe stripes on the lower legs/paws, white toes and a shorter ringed tail. The rounder skull, larger pointed ears, fuller rib cage/haunches and broader stance distinguish it from C-07. Whisker wires and the `K0 / TECH` shoulder marking are modeled in the articulated tiers.

https://jelaludo.github.io/SentryTowers_A6/k0-tech-01/

The viewer frames the full 1.6 m pounce in a fixed world camera with takeoff/landing ground marks, so the forward travel remains visible. It also exposes all eight feline actions, contact diagrams, four gallop phases, seven pounce landmarks, slow motion, scrubbing, camera presets, skeleton/wireframe, plain/Meshopt selection and downloads. **Cheetah scale reference** places the original standing C-07 distance model beside K0 at true metre scale. It resets K0 to paused watch for comparison; it is a size guide, not another interacting character.

## Optical assembly

The face uses shallow blue-coated glass surfaces seated inside tapered titanium barrels, carbon seals and angular taupe mounting plates. The detailed tier includes retaining-ring grooves and small slotted fasteners. The game tier keeps the lens/barrel/seal shape; the distance tier reduces it to dark mounts and flat blue faces within its existing vertex-color material.

`K0_Blue_coated_optical_glass` is non-emissive, with roughness 0.12, metallic 0.15 and a 0.65 clearcoat. `KHR_materials_clearcoat` supplies the outer reflection layer; the glass is rendered opaque, without transmission or transparent sorting. Highlights come from the scene lights/environment. There are no biological pupils or modeled white catchlights. The assembly is rigidly attached to `HEAD`, with no new animation controls or draw calls. `optics-detail.png` is a derived close-up from the editable master; the viewer's Head camera inspects it interactively.

## Size and family

Standing detailed bounds: **0.301 m wide × 0.420 m high × 1.048 m long**, including the tail and whiskers. That is **49.6% of C-07's height**, with a broader width-to-height ratio and a substantially shorter tail. The source C-07 bounds are 0.484 × 0.847 × 2.775 m. This is an intentionally more compact house-cat shape, not a uniform miniature Cheetah. The standing plot reserves **0.40 × 1.35 m**.

This is a separate D0-intact family. Damage states and LOD levels remain different concepts. The shared three-animal chase uses the same K0 exports at their original scale.

## Measured exports

| File | Role | Triangles | Draws / materials | Plain bytes | Derived Meshopt bytes |
| --- | --- | ---: | ---: | ---: | ---: |
| `k0_tech_01_d0_lod0.glb` | Detailed animation / recording master | 71,698 | 7 / 7 | 3,657,412 | 1,005,276 |
| `k0_tech_01_d0_lod1.glb` | Articulated game model | 14,906 | 7 / 7 | 1,805,320 | 608,120 |
| `k0_tech_01_d0_lod2.glb` | Static standing distance / loading silhouette | 2,972 | 1 / 1 | 244,156 | 77,080 |

The game tier is within the 25k-triangle unit target. The distance tier meets the 3k triangles, one draw and 250,000-byte targets. It merges the palette into vertex colors, simplifies rounded parts, removes whiskers and tiny mechanics, and paints stripe bands into existing surfaces. Triangle/draw counts are asset-only, excluding the viewer floor, lights, overlays and optional C-07 reference. No FPS improvement is claimed.

Plain GLBs are authoritative, self-contained and texture-free. Optional `derived/meshopt/` copies are compressed derivatives and are validated after decoding. `../../source/blender/a6-k0-tech-01.blend` is the editable detailed authoring master. The optical close-up, preview, action renders, motion/jump/social sheets and size comparison are derived review imagery.

## Runtime contract

- Metres, +Y up, +Z forward; ground origin beneath the torso, consistent in every tier. Blender authoring uses Z up / −Y forward and the exporter converts axes. The source sole sockets stand 1.41 mm above the authored floor.
- Place the **entire glTF scene** in an instance wrapper. The rigid skinned mesh is a sibling of the skeleton hierarchy; `ROOT` is a lookup frame, not the placement wrapper. Use `SkeletonUtils.clone` for independent instances.
- Keep articulated LOD1 for visible gameplay, interactions and animations. LOD0 is the close-shot/recording master. LOD2 has no skin or clips; it preserves the named hierarchy and seven socket transforms for standing map/loading use. The manifest's 18 m approach and 5 m hysteresis are review proposals, not accepted game-camera thresholds.
- `SENSOR_YAW` remains excluded from clips. Its sensor frame, mouth, payload and four paw sockets retain meaningful dot-free names. Look up nodes within this family's instance. `manifest.json` records the complete node list and measured socket positions.
- Locomotion is in place. Move the instance along +Z by the selected clip's `speed_mps × playbackRate`. `Pounce` contains **1.6 m** forward travel on `MOTION`: suppress extra locomotion during the action and transfer that displacement to the instance before returning to idle.
- Use `validation-report.json` clip envelopes for culling and placement clearance; moving poses extend beyond the standing plot. The game owns collision, terrain adaptation, navigation, transitions and events. This is authored kinematic animation, not physical dynamics.

## Rig and full move-set

51 joints retain the feline semantics: flexible lumbar/front/rear links, pelvis/chest, neck/head/jaw, ears, independent scapulae, three articulated segments per leg, paws/toes, eight tail sections and seven sockets. All armor vertices use one bone influence, so the plates remain rigid. The Blender master includes editable actions and NLA tracks; bones can be posed directly.

| Clip | Duration | Loop | Behavior / normal travel |
| --- | ---: | --- | --- |
| `Watch_Idle` | 3.0 s | Yes | Quiet head, ears and tail movement |
| `Feline_Walk_Cycle` | 1.6 s | Yes | Four-beat feline walk; 0.238333 m/s |
| `Stalk_Cycle` | 2.4 s | Yes | Low body and cautious steps; 0.089316 m/s |
| `Gallop_Cycle` | 0.4 s | Yes | Rotary contacts, gathered and extended flight; 2.688889 m/s |
| `Sit_Down` | 2.4 s | No | Fold hindquarters and hold seated pose |
| `Pounce` | 3.2 s | No | Crouch, hind push, tuck/reach, forepaw-first landing; 1.6 m root travel |
| `Roll_Over` | 5.6 s | No | Crouch, tuck, roll through flank/back and recover |
| `Give_Paw` | 4.4 s | No | Sit, offer/shake the left forepaw, lower it and stand |

The forward pounce retains the original 0.528 m push/settle profile and adds 1.072 m of horizontal travel during the all-air interval (0.815–1.340 s). This moves both the body and landing anchors without changing the airborne articulation or stretching the rig. The measured torso rise is 0.219 m, so forward travel is 7.32 times the rise. The full 3.2 s clip includes preparation and recovery. `root_motion_profile` records both travel components; do not reconstruct the entire trajectory by simply scaling the old root curve.

Names, durations and contact/event timing match C-07's eight authored actions. The adapter rebuilds torso/tail chains at K0 rest lengths and solves each limb again against adapted paw trajectories. The forward dimension uses 0.44 of C-07, vertical dimensions 0.47 and lateral dimensions 0.59, with an additional 0.78 tail-length factor. Added geometry establishes the distinct facial and armor shape. There is **no animated nonuniform bone scale**. Requested unreachable targets are clamped rather than stretching limbs; the largest authoring clamp is 0.708 mm during a tucked roll. The export validator independently checks actual limb lengths and contacts.

Walk/stalk contacts remain HR → FR → HL → FL with duty factors 0.60 / 0.78. Gallop contacts remain FL 0.00 → FR 0.08 → HR 0.48 → HL 0.56, with gathered flight at 0.26–0.48 and extended flight at 0.74–1.00. Pounce releases and touchdown ordering remain separate per paw. These are inherited authored motion settings adapted to the smaller rig, not biological speed measurements.

## Validation and regeneration

The family validator covers plain and decoded Meshopt exports, glTF errors/warnings, finite nondegenerate geometry, stable node/socket interfaces, budgets, all eight clips, floor clearance, stance drift, loop continuity, intermediate rigid lengths, two-flight gallop, pounce travel and supported sit/roll/hand poses. The browser test covers the eight clip controls, four gait landmarks, six tier/encoding combinations, static animation disabling, actual-scale comparison and desktop/mobile layout. Generated reports record the measured results and input file hashes.

The historical `optics-revision-validation.json` records the optical-only revision at `e15a12a7361256e4b44e651837b03b8c60ff3bd7` against `2f2b955d17941b5b9a3dd06ef77e6e35f3df5f4b`: all eight animation key arrays, node rest transforms and non-optical material parameters match exactly in all tiers. Standing dimensions and sockets remained unchanged in that revision.

`pounce-revision-validation.json` compares the current exports against `6fe8ac2d80629d89285973ed34a61bceb2ea988c`: geometry, rigid skin, rest nodes and the other seven clips are unchanged. The pounce travels monotonically to 1.6 m; relative articulation differs by less than 0.045 mm after root translation is removed.

All six exports pass with zero glTF errors/warnings. Across 11,072 full-geometry samples at 120 Hz, minimum floor clearance is 0.783 mm, maximum stance drift 0.679 mm, maximum rigid segment-length error 0.030 mm, and maximum pounce support-anchor drift 1.024 mm. Loop position error is below 0.005 mm; pounce travel quantization error is below 0.391 mm. Both flight phases, forepaw-first landing and the supporting paws during sit/hand are asserted separately. Blender pose sheets and Chromium desktop/390px mobile captures were visually reviewed.

Regenerate from the repository root:

```sh
blender -b --python-exit-code 1 --python tools/blender/build_k0_tech_01.py
node tools/asset-pipeline/pack-k0-tech-01.mjs
node tools/asset-pipeline/validate-k0-tech-01.mjs
blender -b --python-exit-code 1 --python tools/blender/render_k0_tech_01.py
blender -b --python-exit-code 1 --python tools/blender/render_k0_tech_01.py -- --optics
node tools/asset-pipeline/render-k0-motion-sheet.mjs
blender -b --python-exit-code 1 --python tools/blender/render_k0_tech_01.py -- --social-study
node tools/asset-pipeline/render-k0-social-sheet.mjs
blender -b --python-exit-code 1 --python tools/blender/render_k0_tech_01.py -- --jump-study
node tools/asset-pipeline/render-k0-jump-sheet.mjs
python3 tools/build-workshop-docs.py
python3 tools/validate-workshop-navigation.py
```

Serve the repository on port 8788, then run `tools/asset-pipeline/test-k0-tech-01-viewer.mjs` with `PLAYWRIGHT_MODULE` and optionally `CHROMIUM_EXECUTABLE` set to installed paths. The test writes review screenshots under `/tmp`, the derived size comparison and a viewer report here. Authoring dependencies and their hashes are in the manifest so future changes to shared C-07 helpers can be audited.

The hand-off is the committed revision plus `assets/k0-tech-01/`; include `k0-tech-01/`, the Blender master and the listed authoring dependencies for editing/review. Arbitrary terrain, self-collision, animation blending in the consuming game, Three r160/release gltfpack, game cameras and reference-phone acceptance remain pending. The collaboration contract is unchanged.

## Reference provenance

The user supplied `/Users/jela/Downloads/K0-TECH_01.jpeg`, 267,168 bytes, SHA-256 `261f924dc2c419e0cf5bf199ea2c35928170f0fef1bdbe78fe6530564da9a407`. It was observed for the lynx-point Siamese appearance, color scheme, blue eyes and striped paws/tail. Its creator/license were not supplied; the original stays outside this repository and is not redistributed or embedded.

The eight motion patterns and reusable mechanical primitives are original workshop C-07 work, preserved at `d8943b5e6bc4c76f189b8eb6a86e46fbb1c0cbb2`. The existing feline motion provenance remains in `../mechanical-cheetah/README.md` and `../../source/motion-patterns/quadruped-patterns.json`. No third-party geometry, rig, animation keys or textures are copied. Credit **Models by jelaludo**.
