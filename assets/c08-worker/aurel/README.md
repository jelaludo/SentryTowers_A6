# C08 / AUREL-01 economical hands — first biped test

C08 now wears a left/right pair of Isao / Mechanism Atelier AUREL-01 economical hands. The original hand surfaces are removed, including their old wrist barrels. The replacement cuffs insert into the forearms. The original chassis, feet, body rig, five actions and legacy socket offsets remain unchanged. This is the first test fit for the requested biped rollout; the other bipeds have not yet been converted.

https://jelaludo.github.io/SentryTowers_A6/c08-worker/?variant=aurel&lod=1

The viewer defaults to this game version. **Hand equipment** switches back to the preserved original. **Hands** opens a following close-up; **Hand posture** offers action-following, natural curl, open, grasp, pinch and point. Inspect opens the right hand; Carry uses a loose two-handed grip. Static distance disables articulation.

## Exports and measured budgets

| Tier | Triangles | Material draws | Plain bytes | Meshopt bytes |
| --- | ---: | ---: | ---: | ---: |
| LOD0 / detailed chassis, economy hands | 57,992 | 8 | 2,770,648 | 703,712 |
| LOD1 / articulated game | 16,452 | 8 | 1,338,848 | 408,244 |
| LOD2 / static curled distance | 2,784 | 1 | 235,648 | 84,828 |

The complete game robot remains below the 25k unit target. Each articulated hand is exactly the 2,708-triangle economical surface, with one shared palette draw. The chassis keeps six materials; the two independently posed hand skins add two draws. Compared with original C08 game, the retrofit removes 4,792 old hand triangles and adds 5,416: a net 624 triangles and two draws. No FPS gain is claimed. LOD0 retains the detailed chassis and the requested economical hands; the separate original Hand Lab LOD0 remains the detailed hand master.

LOD2 keeps the original distance chassis with the new naturally curled hand silhouettes. The hand surfaces are simplified from the economical static source using Meshoptimizer, then the complete robot is merged to one vertex-colored material. Static simplification is explicitly recorded as a derived surface operation. LOD2 has no skin or clips. All plain GLBs are authoritative assembled exports; `derived/meshopt/` contains optional compressed derivatives. All files are self-contained, texture-free and D0 only. Original C08 and Hand Lab files remain intact.

## Frames and handedness

Metres, +Y up, +Z forward, original ground origin and 1.6 × 1.3 m standing reserve. All tiers retain the same **180 named nodes and 46 sockets**, with positive scales and dot-free, unique names. Animated exports have three skins, totaling 137 skin joints; the original 55-joint hierarchy includes legacy hand controls retained for clip compatibility.

The complete glTF scene belongs inside the robot instance wrapper. Clone with `SkeletonUtils.clone`, including all mesh and bone roots. The hand meshes `AUREL_L_GEOMETRY` and `AUREL_R_GEOMETRY` are scene roots, as required for portable glTF skinning. Their bones follow `HAND_L` / `HAND_R` through `AUREL_L_MOUNT` / `AUREL_R_MOUNT`.

Each adapter translates `[0, 0.045, 0]` m in its original C08 hand frame, rotates 180° around Z and scales uniformly by 1.3. Fingers point down and palms forward in the rest frame. The left/right surface assignments were swapped after the first visual fit review; the original assignment put the thumbs on the wrong hands. This is a C08-specific adapter, not a universal biped attachment offset.

The left C08 wrist now receives the source surface; the right wrist receives the reflected surface. Reflection changes local X positions/normals, reverses winding, conjugates all local transforms and inverse bind matrices, and reverses Y/Z motor signs. `HAND_ASSIGNMENT` records this explicitly; source Hand Lab side labels must not be used to infer the C08 wrist assignment. No negative runtime scale is used. New nodes use `AUREL_L_` and `AUREL_R_` prefixes; for example:

- `AUREL_R_WRIST_FLEX`, `AUREL_R_INDEX_MCP_FLEX`, `AUREL_R_THUMB_CMC_OPPOSITION` — independent motor axes.
- `AUREL_R_SOCKET_WRIST_ATTACH` — wrist attachment frame.
- `AUREL_R_SOCKET_PALM`, `AUREL_R_SOCKET_INDEX_CONTACT` — new geometry's grasp/contact references; corresponding left nodes also exist.
- `SOCKET_HAND_L/R` and `SOCKET_TOOL_L/R` — preserved legacy frames for compatibility. They are not recalibrated to the new palm surface.

Original `FINGER_*` / `THUMB_*` nodes and channels remain so existing clips and lookups still bind, but those old finger controls no longer drive visible hand geometry. Use the new namespaces for dexterity.

## Animation integration

The five original body clips retain their names, durations and animation data:

| Clip | Seconds | Playback |
| --- | ---: | --- |
| `Standby_Idle` | 4.0 | Loop |
| `Heavy_Walk_Cycle` | 1.8 | Loop, engine +Z travel at 0.55 m/s × playback rate |
| `Carry_Walk_Cycle` | 2.4 | Loop, engine +Z travel at 0.36 m/s × playback rate |
| `Work_Inspect` | 5.0 | One-shot, returns |
| `Crouch_Service` | 5.0 | One-shot, returns |

No new AUREL motor is baked into a clip. The exported articulated hands already have the natural curl in their default pose. For action-following fingers, run the optional adapter after updating the body mixer:

```js
import {sampleHands, applyHandPose} from './assets/c08-worker/aurel/runtime.js';

// clipTime is the current authored clip time, not accumulated locomotion time.
mixer.update(dt);
applyHandPose(gltf.scene, sampleHands(clipName, clipTime, 'auto'));
```

For independent poses pass `{L: leftAngles, R: rightAngles}`. Angles use the original Hand Lab convention; `applyHandPose` handles the reflected right-wrist sign conversion. Both wrists default neutral because C08's body clip already drives `HAND_L/R`; a consumer may additionally drive the two fine wrist axes if desired. `SENSOR_YAW` stays engine-driven and excluded from clips.

Loading policy: LOD2 for a stationary map/loading stand-in; LOD1 before visible motion, provisionally within 30 m with 8 m hysteresis. Keep LOD1 during gameplay motion. Settle the whole body to its authored standing frame and hands to `BIPED_REST` before a visible static swap; hand rest alone does not match a walking body. Static nodes are lookup metadata, not an animated rig. Use the new `validation-report.json` clip envelopes for culling. LOD0 is for recordings and close review.

## Evidence, source and handoff

All six plain/decoded Meshopt files pass glTF validation with zero errors and warnings. The full motion suite covers 8,756 geometry samples at 120 Hz: minimum floor clearance 4.635 mm, maximum stance-anchor drift 0.967 mm and maximum plain/decoded joint-position difference 0.720 mm. All actions close/return within the recorded tolerances. The quaternion check normalizes decomposed world orientations before comparing rotation angles, including uniformly scaled hand rigs.

`fit-validation.json` verifies all six original C08 file hashes, byte-identical body animation data, unchanged original frames through 610 samples, source-identical economical hand surfaces including the right-wrist reflection, wrist attachment, 194 posture/motor checks, independent left/right skeleton state, static frame parity and budgets. A separate check verifies the actual thumb-base offset in each C08 wrist frame for all six plain/decoded files: +54.6 mm on `HAND_L`, −54.6 mm on `HAND_R`, matching the requested pair swap. `viewer-validation.json` covers both equipment versions, all tier/encoding combinations, existing controls, posture selection, a following hand close-up, static lockout and desktop/mobile layouts. Review renders are derived previews.

Reproduce from the repository root:

```sh
node tools/asset-pipeline/build-c08-aurel.mjs
C08_AUREL=1 node tools/asset-pipeline/validate-c08-worker.mjs
node tools/asset-pipeline/validate-c08-aurel-fit.mjs
C08_AUREL=1 node tools/asset-pipeline/test-c08-worker-viewer.mjs
node tools/asset-pipeline/prepare-c08-aurel-review.mjs
```

The builder invokes Blender for original distance-chassis geometry using `export_c08_body.py`; `BLENDER` may override the executable. Browser tools accept `PLAYWRIGHT_MODULE` and `CHROMIUM_EXECUTABLE`. The preserved `source/blender/a6-c08-worker.blend` is the original chassis master, not a newly assembled retrofit Blender file. Editable retrofit assembly and mirroring are in `build-c08-aurel.mjs` with the original procedural hand source.

Hand off the containing commit plus **`assets/c08-worker/`** and the shared **`assets/hand-lab/runtime.js` / `biped.js`** for optional finger behavior. GLBs need no external geometry dependencies. Credit **jelaludo**. No third-party hand meshes are incorporated.

Pending: review of this first C08 fit before rollout to remaining bipeds; complete-body arbitrary-pose collision and object-specific grasp calibration; consuming-game Three r160/release gltfpack verification, transition policies, game-camera acceptance and phone measurements. Existing gait/contact checks are authored kinematics, not physical payload or grip-force simulation. The received collaboration contract is unchanged.
