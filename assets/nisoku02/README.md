# NISOKU-02 / All-purpose humanoid

An original Isao / Mechanism Atelier humanoid, assembled with **AUREL-01 hands** and **AUREL-02 tactile feet**. The former NISOKU-02 foot is now AUREL-02; its existing `assets/foot-lab/` paths and engine identifiers remain compatible. The humanoid is a separate family.

https://jelaludo.github.io/SentryTowers_A6/nisoku02/

Ivory shell armor, a continuous dark visor, gold bearings, graphite flexible seals, layered abdominal plates and amber indicators follow the supplied concept and the AUREL manufacturer language. The master uses the original detailed hand and foot surfaces. Game uses the economical components, with their complete articulation. The chassis is original procedural geometry; third-party Hand Lab reference models are not included.

## Exports and selection

Plain GLB is authoritative. Optional `derived/meshopt/` copies are compressed derivatives. The static distance surface is a simplified derivative of the posed assembly. All six files are self-contained and texture-free; each file contains a complete robot. D0 means intact; D1–D3 are not authored.

| Tier | Triangles | Material draws | Plain bytes | Meshopt bytes | Purpose |
| --- | ---: | ---: | ---: | ---: | --- |
| LOD0 / master | 344,760 | 6 | 17,184,488 | 2,614,904 | Close shots and recordings; full AUREL components |
| LOD1 / game | 20,244 | 2 | 1,029,696 | 230,804 | Articulated chassis, economical hands and feet |
| LOD2 / distance | 2,498 | 1 | 172,588 | 84,520 | Frozen standby; no deforming skin |

Counts are surface/material draws, excluding extra viewer shadow passes. The master has intentionally much higher detail than game. No FPS benefit is claimed. Game meets the 25k unit triangle target; static meets the 3k / one-draw / 250k-byte distance targets.

Start with LOD2 for loading or distant background figures. A provisional 30 m game threshold with 8 m hysteresis is in the manifest. Retain LOD1 whenever motion is visible, regardless of distance. Swap a moving unit to static only at the matching standby pose. LOD0 is an explicit recording choice. Camera thresholds and phone performance need consuming-game acceptance.

## Assembly and runtime

Metres, +Y up, +Z forward, ground root at plot centre, 1.2 × 1.2 m nominal static plot. Standing height is approximately 1.90 m. The authored sole clearance above y=0 is 7.634 mm; foot contact frames are explicit sockets, not an inferred mesh bounding box. Runtime motion envelopes are in the validation report; travelling units need a clear path beyond the static plot. Use uniform instance scaling.

Move or clone the **complete glTF scene** inside one instance wrapper. `NISOKU_02_ROOT` carries the skeleton; `NISOKU_02_GEOMETRY` is its scene-root mesh sibling. Do not translate only the skeleton or only the surface. Clone articulated instances with Three's `SkeletonUtils.clone`, not a shallow Object3D clone. The glTF node names are unique, dot-free and consistent across tiers. Loader-created primitive objects are rendering details, not engine lookup names.

All articulated joints are engine driven: **no baked GLB clips**. The optional `runtime.js` provides seven named, explicitly timed looping studies:

| Mode | Motion name | Duration | Behavior |
| --- | --- | ---: | --- |
| `idle` | `Quiet_Standby_Idle` | 5 s | Gentle breathing and head survey; inward palms |
| `walk` | `Balanced_Walk_Cycle` | 1.8 s | Two-bone leg IK, planted stance, lateral weight shift, arm counter-swing, toe lift; 0.38 m/s |
| `greet` | `Open_Hand_Greeting` | 6 s | Raise and open the right hand, wave, return to relaxed inward curl |
| `inspect` | `Precision_Inspection` | 8 s | Bring the right hand forward, pinch, look down and return |
| `crouch` | `Service_Crouch_Cycle` | 7 s | Lower the pelvis 24 cm with both feet planted |
| `agility` | `Prehensile_Toe_Agility` | 8 s | Shift left, lift the right foot and articulate toes independently |
| `rail` | `AUREL_Foot_Rail_Grasp` | 14 s | Shift, lift, align great toe, reach, grip, hold, release and set down |

```js
import { createRig, sampleMotion, MOTIONS } from './runtime.js';
const rig = createRig(gltf.scene);
// time is elapsed simulation seconds, including playback-rate scaling.
rig.pose(sampleMotion(time, 'walk'));
instance.position.z = MOTIONS.walk.speed_mps * time;
```

Runtime imports also require `assets/hand-lab/runtime.js`, `assets/hand-lab/biped.js` and `assets/foot-lab/runtime.js`, keeping their relative paths. The GLBs themselves have no external dependencies. The viewer loops phase while accumulating travel. Mode changes reset into that study; crossfades between arbitrary gameplay states are not supplied. LOD2 rejects articulation and its bones/sockets are static lookup frames.

Body engine pivots: `PELVIS`, `WAIST`, `CHEST`, `NECK`, `HEAD`, and `SHOULDER_*`, `ELBOW_*`, `WRIST_*`, `HIP_*`, `KNEE_*`, `ANKLE_*` for L/R. The adapter updates every driven axis except NECK (available for the game). Source hand/foot names are namespaced `HAND_L_`, `HAND_R_`, `FOOT_L_`, `FOOT_R_`. All 23 hand and 22 foot axes per limb remain available. The source component shell bones remain named, though separate material hiding is not available in game.

The **left** limbs use source geometry and the **right** limbs use reflected geometry, winding, local frames and Y/Z motor signs. Runtime scale remains positive. Hands mount at 1×; feet at 1.15×. Hand adapters have opposing ±90° yaw after the 180° wrist inversion: palms point toward the body and thumbs forward. Source foot -X is medial; the left great toe points inward, and reflection gives +X medial on the right. Historical standalone “right” metadata must not determine placement. The measured socket directions establish the assembly.

`SOCKET_ROOT` is fixed at ground origin; `SOCKET_VISION` faces forward and `SOCKET_BACK` faces backward. Namespaced attachment, palm, fingertip, heel, arch, forefoot and tactile pad sockets are recorded in each asset manifest. The feet's `SOCKET_ANKLE_ATTACH` aligns with the body ankle pivot. Source hands' wrist coupling inserts 20 mm into the wrist adapter. Bone lengths, default transforms and socket frames match across tiers.

The rail fixture is **viewer-only**, exported as measurements in `PIPE_FIXTURE`: a horizontal X-axis metal pipe at approximately [-0.108, 0.1305, 0.3065] m, radius 0.03105 m and length 0.3335 m. The right foot's four lesser toes contact its front while the great toe opposes them behind. Five tactile frames are calibrated. This is a geometric grasp study, not a force-balanced climbing controller.

## Review and rebuild

Viewer controls: seven studies, pause/restart, time scrub, ½× / 1× / 2× speed, ground travel, wireframe, skeleton, three LODs, plain/Meshopt, seven camera views, orbit/zoom, fullscreen and GLB download. Close-up cameras follow head, hand or foot. Static mode locks motion controls. Derived `preview.jpg`, `previews/`, `design-sheet.jpg` and `motion-sheet.jpg` show actual model renders.

```sh
node tools/asset-pipeline/build-nisoku02.mjs
node tools/asset-pipeline/validate-nisoku02.mjs
PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node tools/asset-pipeline/test-nisoku02-viewer.mjs
node tools/asset-pipeline/prepare-nisoku02-review.mjs
python3 tools/build-workshop-docs.py
python3 tools/validate-workshop-navigation.py
```

The editable master is `tools/asset-pipeline/nisoku02-shape.mjs`, using the shared procedural hand/foot masters. Reference-image fingerprints are preserved if the private source images are absent on another machine. Validation checks plain and decoded compressed exports, budgets, triangle hygiene, stable hierarchy/socket frames, anatomical placement, all sampled vertices against the floor and pipe, rigid leg links, IK target reach, planted stance and cycle closure. Browser checks cover all six files, all studies, controls, framing and desktop/mobile layouts. Scope is finite authored motion; arbitrary self-collision, terrain adaptation, force simulation, release gltfpack/r160 integration, reference-phone testing and D1–D3 remain pending.

Handoff: **the containing commit plus `assets/nisoku02/`**, with the three shared runtime modules above for motion. Pin file SHA-256 values from `manifest.json`. Preserve standalone AUREL originals. The received `docs/ASSET-COLLABORATION.md` remains verbatim.
