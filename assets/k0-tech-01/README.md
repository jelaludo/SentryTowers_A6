# K0-TECH-01 / Felis

A compact feline robot with an angular industrial sensor head, warm beige and porcelain-white armor, taupe stripes on the lower legs/paws, white toes and a shorter ringed tail. Its fuller rib cage/haunches, articulated paddle antennas and broader stance distinguish it from C-07. The `K0 / TECH` shoulder marking and lynx-point body palette are retained.

https://jelaludo.github.io/SentryTowers_A6/k0-tech-01/

The viewer frames the full 1.6 m pounce in a fixed world camera with takeoff/landing ground marks, so the forward travel remains visible. It also exposes all eight feline actions, contact diagrams, four gallop phases, seven pounce landmarks, slow motion, scrubbing, camera presets, skeleton/wireframe, plain/Meshopt selection and downloads. **Cheetah scale reference** places the original standing C-07 distance model beside K0 at true metre scale. It resets K0 to paused watch for comparison; it is a size guide, not another interacting character.

## Industrial face and optical assembly

The face is a faceted structural case under a sloped ceramic armor hood. A recessed rectangular cassette carries one primary blue-coated camera, a smaller auxiliary camera and a compact range instrument. Unequal apertures, straight bumper rails, side service covers, vents, hex fasteners and a hinged flat lower guard establish the industrial design. Rounded cheek pads, whiskers, animal nose, brow stripes and the sculpted muzzle are removed. Detailed and game tiers retain the mechanical assembly; the distance tier reduces it to the case, armor, guard and two optical apertures within one vertex-color material.

`K0_Blue_coated_optical_glass` is non-emissive, with roughness 0.12, metallic 0.15 and a 0.65 clearcoat. `KHR_materials_clearcoat` supplies the outer reflection layer; the glass is rendered opaque, without transmission or transparent sorting. Highlights come from the scene lights/environment. There are no biological pupils or modeled white catchlights. The assembly is rigidly attached to `HEAD`, with no new animation controls or draw calls. `optics-detail.png` is a derived close-up from the editable master; the viewer's Head camera inspects it interactively.

The ear assemblies are now short modem-like paddle antennas: tapered beige frames, clipped flat tips, dark radome inserts with two subtle seams, ceramic hinge shoes and exposed metal pins. LOD2 retains the paddle silhouette, dark insert and base, omitting small hinge/seam details. They still use `EAR_L` / `EAR_R`, including the existing idle tilt and folding animation; no additional controls or materials were added.

## Size and family

Standing detailed bounds: **0.301 m wide × 0.414 m high × 1.045 m long**, including the tail. That is **48.9% of C-07's height**, with a broader width-to-height ratio and a substantially shorter tail. The source C-07 bounds are 0.484 × 0.847 × 2.775 m. This is an intentionally more compact house-cat shape, not a uniform miniature Cheetah. The standing plot reserves **0.40 × 1.35 m**.

This is a separate D0-intact family. Damage states and LOD levels remain different concepts. The shared three-animal chase uses the same K0 exports at their original scale.

## Measured exports

| File | Role | Triangles | Draws / materials | Plain bytes | Derived Meshopt bytes |
| --- | --- | ---: | ---: | ---: | ---: |
| `k0_tech_01_d0_lod0.glb` | Detailed animation / recording master | 68,102 | 7 / 7 | 3,602,548 | 993,288 |
| `k0_tech_01_d0_lod1.glb` | Articulated game model | 14,878 | 7 / 7 | 1,852,732 | 615,756 |
| `k0_tech_01_d0_lod2.glb` | Static standing distance / loading silhouette | 2,980 | 1 / 1 | 241,540 | 75,780 |

The game tier is within the 25k-triangle unit target. The distance tier meets the 3k triangles, one draw and 250,000-byte targets. It merges the palette into vertex colors, simplifies rounded parts, omits small fasteners and vents, and paints stripe bands into existing surfaces. Triangle/draw counts are asset-only, excluding the viewer floor, lights, overlays and optional C-07 reference. No FPS improvement is claimed.

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

The historical `pounce-revision-validation.json` records the forward-pounce export at `9a1eb5695704aadbdc95682fc8dbb1bdb16fe1d4` against `6fe8ac2d80629d89285973ed34a61bceb2ea988c`: geometry, rigid skin, rest nodes and the other seven clips are unchanged. The pounce travels monotonically to 1.6 m; relative articulation differs by less than 0.045 mm after root translation is removed.

The historical face revision at `1be374f` is scoped by `face-geometry-validation.json`: source polygon positions, materials and shading outside `HEAD`/`JAW` match `b918feb` at all three tiers. `face-rig-validation.json` confirms unchanged rest transforms, palette, sockets, clip metadata and 1,031 animation channels per articulated tier. The only regenerated channel is the automatic roll support height: up to 14.6 mm of vertical settling for the new shell, with the original articulation and horizontal motion preserved. The eight actions, timings, pounce trajectory and chase behavior retain their existing settings. The antenna follow-up compares against `8533fbb` in `antenna-geometry-validation.json` and `antenna-rig-validation.json`: only EAR_L/EAR_R source geometry changes, while all 1,032 animation channels per animated tier, rest nodes, sockets, palette and clip metadata match exactly.

All six exports pass with zero glTF errors/warnings. Across 11,072 full-geometry samples at 120 Hz, minimum floor clearance is 0.783 mm, maximum stance drift 0.679 mm, maximum rigid segment-length error 0.030 mm, and maximum pounce support-anchor drift 1.024 mm. Loop position error is below 0.005 mm; pounce travel quantization error is below 0.391 mm. Both flight phases, forepaw-first landing and the supporting paws during sit/hand are asserted separately. Blender pose sheets and Chromium desktop/390px mobile captures were visually reviewed.

Regenerate from the repository root:

```sh
blender -b --python-exit-code 1 --python tools/blender/build_k0_tech_01.py
node tools/asset-pipeline/pack-k0-tech-01.mjs
node tools/asset-pipeline/validate-k0-tech-01.mjs
blender -b --python-exit-code 1 --python tools/blender/validate_k0_face_scope.py -- --antennas
node tools/asset-pipeline/validate-k0-face-revision.mjs --antennas
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
