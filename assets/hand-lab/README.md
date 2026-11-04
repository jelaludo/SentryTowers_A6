# Hand Lab / AUREL-01 / v1

**Biped variants:** choose “Biped / economy” for a second articulated game version (2,708 triangles / one draw) and a static version with naturally curled fingers. All original exports below are preserved. See `biped/README.md` and `docs/BIPED-EXTREMITIES.md` for measurements, pose matching and mounting notes.

An original futuristic right robotic hand, built from the supplied concept: ivory protective shells, dark tactile surfaces, recessed gold bearings, graphite internal links and a ribbed wrist collar. The lab combines a pose studio for this new design with two attributed source-model comparisons. AUREL-01 contains no geometry or implementation copied from those sources.

Viewer:

http://127.0.0.1:8791/hand-lab/

Public route after deployment:

https://jelaludo.github.io/SentryTowers_A6/hand-lab/

Start a server at the repository root to use the local address. Source notices and modifications are in `references/ATTRIBUTIONS.md`; exact revisions and original-file hashes are in `references/sources.lock.json`.

## What is in the lab

AUREL-01 has 23 controllable axes: four per long finger (spread, MCP flexion, PIP flexion and DIP flexion), five in the thumb (opposition, abduction, axial rotation and two flexion hinges), and two in the wrist. The thumb's extra axial rotation lets the soft fingertip face the index during precision opposition. All controls are engine-driven; the GLBs intentionally contain no baked clips.

The public references inform general design choices: anatomical proportions and palm volume, modular finger assemblies, separate opposition control and inspectable mechanisms. They remain independent models with separate licenses and provenance:

| Source | Included content | License and treatment |
| --- | --- | --- |
| LiberHand V1 / PPML-G | Preserved STEP original and static browser assembly | MIT notice included verbatim; tessellated, reduced and displayed at normalized scale |
| LibHand / Marin Šarić | Preserved articulated Blender original and static anatomical preview | Model: CC BY 3.0, with attribution, links and modification record; its software has a different license and is not used |
| Robot Hand Anatomy / salikshah | Outbound link and interaction-study description | The reviewed revision only provides a scoped rendering-toolkit license; hand-specific permission remains unclear, so no hand code, geometry or images are bundled |

https://github.com/PPML-Group/LiberHand_V1

https://github.com/libhand/libhand

https://github.com/salikshah/robot-hand-anatomy

The two reference previews are static and normalized to 25 cm high for visual comparison. This is a display transform, not a physical-scale or equivalent-kinematics claim. Their original files retain the upstream units and rig/CAD data. Pose controls affect AUREL-01 only.

## Measured original exports

| Tier | Triangles | Material draws | Plain bytes | Derived Meshopt bytes |
| --- | ---: | ---: | ---: | ---: |
| LOD0 / detailed master | 87,216 | 5 | 3,798,608 | 697,368 |
| LOD1 / articulated game | 14,392 | 5 | 579,840 | 134,516 |
| LOD2 / static distance | 2,604 | 1 | 102,720 | 40,372 |

Plain GLBs under `lod0/`, `lod1/` and `lod2/` are authoritative. Files in `derived/meshopt/` are optional derivatives. The detailed master has finer bevels and bearings, surface fasteners and small tactile dots. The game tier omits those dots and fasteners and reduces curved surfaces. The distance tier merges the open silhouette into one mesh and material. Five shared palette materials cover ceramic, graphite structure, gold/titanium, tactile elastomer and amber indicators. No image textures or external buffers are required.

The game tier is within the 25,000-triangle unit target. The distance tier is within 3,000 triangles, one draw and 250,000 bytes. Damage D0 is the only authored state; D1–D3 are not LODs. No FPS claim is made.

| Reference preview | Triangles | Draws | Plain bytes | Derived Meshopt bytes |
| --- | ---: | ---: | ---: | ---: |
| LiberHand CAD assembly | 112,350 | 1 | 8,090,448 | 2,995,356 |
| LibHand anatomical surface | 70,297 | 2 | 1,455,056 | 440,324 |

Reference previews are inspection assets, not game-tier replacements. Viewer floor/grid, lights and rig overlays are not part of these counts. The two original source files are 37,409,262 bytes for the STEP assembly and 10,564,732 bytes for the Blender hand.

## Coordinates, names and attachment

Metres, +Y up along the fingers, +Z out of the palm. The right-hand root `AUREL_01_ROOT` sits at the wrist attachment centre at ground height. Open-pose bounds are approximately 158.0 × 242.5 × 60.1 mm, including the wrist coupling. Scale is an authoring assumption. The nominal plot is 0.32 × 0.32 m; reserve `[-0.2,0,-0.2]` to `[0.2,0.4,0.2]` for the review poses. Attach the hand to a robot through an outer parent using `SOCKET_WRIST_ATTACH`.

All tiers preserve 59 required names: the root, 41 bones/frames and 17 sockets. The 41 bones comprise 23 joint axes, 16 shell-inspection controls and two fixed frames. Names are unique, meaningful and dot-free. Detailed and game tiers use rigid, single-bone weights; the wrist ribs are a visual enclosure detail, not a deformable seal simulation. Static LOD2 retains the same named lookup hierarchy but its geometry does not articulate.

| Nodes | Purpose |
| --- | --- |
| `WRIST_FLEX`, `WRIST_DEVIATION` | Wrist flexion about local X and deviation about local Z |
| `{INDEX,MIDDLE,RING,LITTLE}_MCP_SPREAD` | Finger ab/adduction about local Z |
| `*_MCP_FLEX`, `*_PIP_FLEX`, `*_DIP_FLEX` | Finger flexion about local X |
| `THUMB_CMC_OPPOSITION`, `THUMB_CMC_ABDUCTION` | Thumb base Y/Z axes |
| `THUMB_AXIAL_ROLL` | Rotation around the thumb metacarpal's local Y axis |
| `THUMB_MCP_FLEX`, `THUMB_IP_FLEX` | Thumb flexion hinges about local X |
| `PALM_DORSAL_SHELL`, `*_SHELL` | Inspection separation; reset for normal operation |
| `SOCKET_*_TIP` | Five distal link endpoints, normal along the distal link |
| `SOCKET_*_CONTACT` | Five soft fingertip contact frames, normal out of the fingertip |
| `SOCKET_*_PAD` | Five distal palmar-pad centres, normal out of the pad |
| `SOCKET_PALM`, `SOCKET_WRIST_ATTACH` | Grasp reference and wrist attachment |

Exact socket positions/normals, joint ranges and required names are in `manifest.json`. The thumb's 126° opposition allowance and axial rotation are design choices for this robotic study, not anatomical limits. The motor ranges do not imply that every simultaneous combination is collision-free.

LOD selection uses the library's provisional 150 m approach threshold with 20 m hysteresis. A hand this small should use the consuming game's screen-size and parent-robot policy; switch to articulated LOD1 before motion is visible, and use LOD0 for close inspection/recording. Keep coordinates, attachment and names when deriving further tiers.

## Pose adapter

```js
import {createRig, POSES, sampleMotion} from './runtime.js';

const rig = createRig(gltf.scene);
rig.pose(POSES.pinch);                  // A named static study
rig.pose(sampleMotion(seconds, 'ripple'));
rig.pose(customAngles, {explode: 0});   // Keys are the named axes; radians
```

`createRig` caches the rest transforms. `pose` restores them before each update, clamps every supplied axis to the manifest range, updates matrices/skeletons, and returns the applied `angles`. Use one adapter per loaded model. Never add a second skeletal-animation driver to the same pivots. Static LOD2 returns `{static: true}` without modifying its hierarchy.

`POSES` includes `relaxed`, `open`, `spread`, `fist`, `pinch` and `point`. `controlsPose` generates simple coupled flexion and spread. The authored pinch is calibrated at the **soft fingertip** contact frames, not the flat central pad centres: the opposed frames are 1.50 mm apart, with normal dot product approximately −1. The gap is deliberate clearance; no contact-force or object-grasp solver is implemented.

| Mode | Runtime name | Duration | Behavior |
| --- | --- | ---: | --- |
| `showcase` | `Dexterity_Showcase` | 28 s loop | Rest → open → spread → fist → open → pinch → point → rest, with eased transitions |
| `flex` | `Finger_Flexion_Cycle` | 6 s loop | Coupled open/close motion |
| `ripple` | `Independent_Fingers_Cycle` | 8 s loop | Separate phase offsets through the four fingers |
| `opposition` | `Thumb_Opposition_Cycle` | 10 s loop | Open-to-pinch opposition study |
| `wrist` | `Wrist_Gimbal_Cycle` | 8 s loop | Combined wrist flexion and deviation |

`explode: 0–1` separates the shell frames and joint links for inspection only; it changes dimensions and is not a working mechanical pose. Returning to zero restores the original interfaces. Manual axes and preset buttons select poses directly; the five continuous studies use their own smooth motion. No baked clips are added to the exported GLBs.

## Viewer controls and review images

Use the six pose buttons or Play with a selected continuous study. Scrub time, choose ½×/1×/2× playback, couple finger curl, change spread or oppose the thumb. The individual-controls panel offers per-finger curl and all 23 named joint axes. Separate the shells, hide armor/pads, inspect wireframe or show the joint rig. Camera buttons cover three-quarter, dorsal, palmar, side and thumb detail; drag/zoom remains available.

Detail and encoding choose the actual loaded file. **Download base GLB** downloads that neutral source/derived export. **Save current pose / JSON** saves `aurel01.pose/v1` with 23 applied angles in radians; load it with `rig.pose(saved.angles)`. The pose file does not change the GLB or include inspection separation.

The source selector loads either imported reference beside AUREL-01. Source cards provide repository and license links. Static distance selection disables animation/pose controls while keeping inspection and source comparison available.

`preview.png`, `previews/`, `design-sheet.jpg` and `motion-sheet.jpg` are derived review captures of the actual browser models. They are not separate geometry or concept images.

## Validation and reproduction

`validation-report.json` covers all six original-hand exports and four reference previews, including decoded Meshopt copies. All ten pass glTF validation with zero errors/warnings. The six hand files pass triangles/draws/bytes, nondegenerate geometry, normalized skin weights, named hierarchy/socket parity and static lockout checks. Across detailed/game plain and decoded files, 708 full-geometry pose samples cover the six poses, all five motion cycles and each joint's bounds individually. Minimum sampled floor clearance is 0.50 mm. Finger link lengths remain rigid to numerical tolerance. Pinch alignment, independent fingers and exact cycle closure pass. Every preserved source hash is verified.

These finite checks do not certify arbitrary combined-axis self-collision, pressure seals, service-cable routing, grip forces, object contact or manufacturability. `viewer-validation.json` records desktop/mobile controls, all tier/encoding combinations, source comparisons, camera framing, pose export, playback and zero page errors. SwiftShader is used for functional browser checks, not performance measurements. Consuming-game r160/release gltfpack and reference-phone acceptance remain pending.

The authoring source is `tools/asset-pipeline/hand-lab-shape.mjs` and `runtime.js`. Existing helper geometry code in the repository supplies primitives and material merging. Rebuild the hand with the existing asset-pipeline Node dependencies:

```sh
node tools/asset-pipeline/build-hand-lab.mjs
node tools/asset-pipeline/validate-hand-lab.mjs
python3 -m http.server 8791
# In another terminal; set PLAYWRIGHT_MODULE when Playwright is installed elsewhere:
node tools/asset-pipeline/test-hand-lab-viewer.mjs
node tools/asset-pipeline/prepare-hand-lab-review.mjs
python3 tools/build-workshop-docs.py
python3 tools/validate-workshop-navigation.py
```

Reference conversions use Blender 5.2 and Python with `cadquery-ocp==7.7.2`. The converter does not execute upstream code; Blender opens the original with auto-execution disabled. Temporary intermediate meshes live under `/tmp`:

```sh
python3 tools/hand-lab/fetch-sources.py
# With cadquery-ocp installed in the selected Python environment:
python tools/hand-lab/tessellate-liberhand.py
blender --background --disable-autoexec assets/hand-lab/references/libhand/source/hand.blend --python tools/hand-lab/export-libhand.py
node tools/asset-pipeline/import-hand-references.mjs
node tools/asset-pipeline/validate-hand-lab.mjs
```

`calibrate-hand-pinch.mjs` is an optional offline fitting aid that prints joint values against the actual fingertip contact frames. It does not modify the sources or replace validation.

Completed v1: original detailed/game/static hand, 23 axes, six poses, five continuous studies, inspection controls, pose export, two attributed reference imports, preserved originals and licenses, source catalog, viewer and review sheets. Pending: Robot Hand Anatomy hand-specific licensing clarification; force-based grasping, collision-aware pose solving, functional enclosure/cable design, damage states and consuming-game acceptance. The received collaboration contract remains unchanged.

Hand off the commit containing this README plus folder `assets/hand-lab/` and viewer `hand-lab/`. Preserve all source notices and clearly mark further converted or compressed models as derived.
