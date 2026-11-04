# NISOKU-03 / Refined enclosure study

A **separate duplicate family** of NISOKU-02, refined toward the supplied concept. NISOKU-02 remains intact for before/after review. The original height, head size, limb lengths, joint centres, articulation, AUREL-01 hands and five-digit AUREL-02 feet are preserved. The master/game bind matrices and hand/digit geometry signatures match the source exactly.

https://jelaludo.github.io/SentryTowers_A6/nisoku03/

The viewer opens in a matched neutral comparison on desktop. Choose Original, Refined, or Side by side; Front, Side and ¾ use the same orthographic camera and broad area lights for both robots. The bodies share the same pose. All seven previous motion studies remain available, with an eighth neutral review mode.

## What changed

- **Chest:** a curved, thin enclosure follows horizontal profiles, with a 34 mm crown over approximately 306 mm width (11.1%), 66 mm side returns, a lower profile recessed toward the waist and a small sloping collar surface. The rear enclosure also curves around the ribcage.
- **Abdomen and pelvis:** three individually curved scales wrap around a tapered seal. Their 65 mm heights and 58.5 mm spacing give 10% vertical overlap. Curved pelvic side and rear panels connect the body volumes while retaining dark articulation gaps.
- **Limbs:** front/rear elliptical clamshells have fuller upper profiles, tapered ends and narrow longitudinal seams. Their shape is defined by a rounded cross-section, not thickened flat strips. The joint endpoints remain fixed.
- **Shoulders and joints:** a wrapping shoulder housing replaces the shallow cap. Ivory socket rims surround recessed brass bearings and darker inset faces; the original pivot centres stay fixed.
- **Helmet:** the existing crown/rear geometry is satin charcoal; a darker glossy visor is separated by a narrow rim. Brass sensor rings and the original head bounds remain intact.
- **Feet:** original four forward toes and one medial great toe retain their exact geometry and joints. A fuller heel/midfoot fairing and dark heel pad improve the load-bearing silhouette. The review pose articulates the great toes inward, separating them from the forward row.
- **Finish:** curved surfaces have smooth normals with rounded shell perimeters, using three rim segments on master/game and a reduced static approximation. Off-white armor, rough graphite seals and glossy optics have separate finishes. Game shares the economical component palette and adds one rough body-seal material; it uses three draws.

Steps 1–3 were completed and inspected before the shoulder, helmet, foot and finish pass. The intermediate front/side/¾ captures are retained in `previews/stage123-*.png`.

## Matched views

https://jelaludo.github.io/SentryTowers_A6/assets/nisoku03/comparison-front.jpg

https://jelaludo.github.io/SentryTowers_A6/assets/nisoku03/comparison-side.jpg

https://jelaludo.github.io/SentryTowers_A6/assets/nisoku03/comparison-three-quarter.jpg

https://jelaludo.github.io/SentryTowers_A6/assets/nisoku03/comparison-sheet.jpg

The comparison is a runtime pose, not a bind-frame edit: shoulder abduction is 0.18 rad and ankle targets are X = ±0.155 m on **both** robots. This slightly wider stance provides great-toe clearance. NISOKU-02 keeps its -0.55 rad toe opposition; NISOKU-03 uses -0.92 rad in the neutral review pose. Existing authored action cycles, exported standby and frozen distance tiers retain their original narrow stance and calibrated foot angles. Use master/game for the arms-clear comparison; static tiers cannot adopt a different pose.

## Coordinates, rig and source preservation

The pre-edit `source-frame-audit.json` records local transforms, world axes and positive scales. Anatomical forward was confirmed as **+Z** from the vision socket and forward toe chains. Body geometry is authored in local bind frames; the exported standing knees already contain IK rotations. Hand mounts are rotated, feet have a positive 1.15× module scale, and the right components are reflected surfaces with corresponding motor signs. Do not infer a part's anatomical axes from global coordinates alone.

Metres, +Y up, +Z forward, ground origin, 1.2 × 1.2 m nominal plot. Height is approximately 1.90 m, matching NISOKU-02; authored sole clearance is 7.634 mm. `DIM` and all source bone transforms are unchanged. NISOKU-03 has 247 named nodes and 65 sockets at every tier. Body/hand/foot joint and socket names remain compatible. Only the family-level `NISOKU_02_*` root/geometry/scene identifiers become `NISOKU_03_*`.

Original source commit: `f7bf276955762f0dda94332da03a7049326c2e60`. No NISOKU-02, Hand Lab or Foot Lab geometry/runtime files are modified. `preservation-report.json` checks original file hashes, exact inverse bind matrices and joint transforms, unchanged head bounds, and triangle-coordinate/normal signatures for the hands and all five foot digits in master/game. `source-frame-audit.json` is an inspection record, not an alternative model.

## Measured exports

| Tier | Triangles | Material draws | Plain bytes | Meshopt bytes | Purpose |
| --- | ---: | ---: | ---: | ---: | --- |
| LOD0 / detailed | 359,256 | 6 | 17,529,104 | 2,686,184 | Close shots; full AUREL master geometry |
| LOD1 / game | 24,604 | 3 | 1,089,440 | 249,972 | All articulated pivots; economical AUREL components |
| LOD2 / static | 2,402 | 1 | 164,788 | 82,388 | Frozen authored standby; distance/loading only |

Counts exclude viewer shadow passes and the optional second robot. Game meets the 25k unit triangle target. Static meets the 3k / one-draw / 250k-byte distance targets. Plain GLB remains authoritative. Meshopt files are optional derived copies; the simplified static surface is a derivative. Original NISOKU-02 exports are independently preserved. No FPS gain is claimed.

LOD0 is an explicit recording choice. LOD1 remains active whenever motion is visible. A provisional 30 m distance threshold with 8 m hysteresis is recorded; game-camera acceptance is pending. Swap to LOD2 only in its matching standby pose, never during the neutral review or another visible motion. D0 is intact; D1–D3 are not authored.

## Runtime contract

Move/clone the **whole glTF scene** in one uniform-scale instance wrapper. The skeleton root and `NISOKU_03_GEOMETRY` are scene-root siblings. Use `SkeletonUtils.clone` for independent animated instances. No external textures or buffers are required by the GLBs.

All pivots are engine driven; there are **no baked GLB clips**. `runtime.js` supplies named loops and explicit durations: neutral review 5 s, standby 5 s, walk 1.8 s at 0.38 m/s, greeting 6 s, inspection 8 s, crouch 7 s, toe agility 8 s and rail grasp 14 s. These are kinematic studies, not a force or terrain solver. The neutral pose is static over its review loop. The old action trajectories are retained.

```js
import { createRig, sampleMotion, MOTIONS } from './runtime.js';
const rig = createRig(gltf.scene);
rig.pose(sampleMotion(time, 'walk'));
instance.position.z = MOTIONS.walk.speed_mps * time;
```

Keep the relative shared runtime paths: `assets/hand-lab/runtime.js`, `assets/hand-lab/biped.js`, and `assets/foot-lab/runtime.js`. Only the comparison viewer needs NISOKU-02's assets/runtime. The NISOKU-03 GLB and controller are usable independently of the old robot. Source limb controls retain 23 axes per hand and 22 per foot, with independent toes and the calibrated five-pad rail grip. The rail remains a viewer fixture; its coordinates are in `PIPE_FIXTURE`. Static lookup nodes reject articulation.

## Validation and rebuild

The six plain/decoded exports pass glTF validation without errors or warnings. All 3,168 sampled poses pass floor/rail clearance, finite vertex positions, reachable leg IK, rigid links, anchored stance, loop closure and five opposed rail contact frames. The preservation check independently confirms the original geometry/rig constraints. Browser checks cover comparison modes, matched neutral body joints, all views and motions, all six files, static lockout, wireframe/rig, playback, travel and desktop/mobile layout. Front/side/¾ master renders are tightly framed with matching camera, light and pose settings.

```sh
node tools/asset-pipeline/inspect-nisoku-frames.mjs
node tools/asset-pipeline/build-nisoku03.mjs
node tools/asset-pipeline/validate-nisoku03.mjs
node tools/asset-pipeline/validate-nisoku03-preservation.mjs
PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node tools/asset-pipeline/test-nisoku03-viewer.mjs
node tools/asset-pipeline/prepare-nisoku03-review.mjs
python3 tools/build-workshop-docs.py
python3 tools/validate-workshop-navigation.py
```

Editable source: `nisoku03-shape.mjs` plus `nisoku03-shells.mjs` in `tools/asset-pipeline/`. Private reference images are not redistributed; their fingerprints are retained. `NISOKU_STAGE123=1` limits an authoring build to game only; the final handoff is the complete three-tier set. The stored intermediate images document the actual first pass rather than being reconstructed from the final model.

Pending: user visual review, arbitrary pose/self-collision/force solving, terrain adaptation, gameplay crossfades, release gltfpack/r160 integration, camera thresholds, reference-phone measurements and damage states. Finite motion tests are not a manufacturing or universal collision certification. The received collaboration contract remains verbatim.

Handoff: the containing commit plus **`assets/nisoku03/`**, with the three shared runtime files above for optional movement. Pin hashes from `manifest.json`. Derived review images are in `previews/` and the four comparison JPGs.
