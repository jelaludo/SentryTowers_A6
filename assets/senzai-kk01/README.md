# Senzai-KK01 / Developer edition

The former LATENT experience, upgraded with the Senzai-KK02 model and all its organic motion: independent foraging, breeze, extension and withdrawal, sudden collective attention, fifteen-tip examination, swift travel and dormancy. Original models, animation, code and concepts by **Jelaludo**. Attribution is required for all reuse and adaptations; see LICENSE.md and ATTRIBUTIONS.md.

http://localhost:8788/senzai-kk01/

The previous http://localhost:8788/latent-field/ address opens this edition. Senzai-KK02 remains the animation study.

## Run the downloadable package

Unzip the complete developer package. From the extracted directory, start a static server:

```sh
python3 -m http.server 8789
```

Then open:

http://localhost:8789/senzai-kk01/

The package includes the required Three.js modules and license. Rendering and animation work without internet after extraction; Workshop navigation links lead to the online library. Use HTTP rather than opening index.html as a file, because JavaScript modules and GLB loading need an HTTP origin.

## Viewer controls

The right panel launches Living cycle, Foraging, Focus Lock, Examining, Following and Dormant. Foraging, Focus Lock, Examining and Following are named entry cues into the performance, including their anticipation, hold and release; they continue into the living cycle afterward. Dormant persists until another behavior is chosen. Starting a behavior from the static distance tier switches to the animated game tier.

Drag to orbit; scroll to approach. Living field and Fiber macro change the view. Pause, Restart, timeline and time scale support inspection. Next focus previews the next shared acquisition. Settings controls LOD, chamber, camera follow, atmosphere and glow. Cinema/Escape hides/restores the panel and overlays. Save image exports a PNG. Reduced-motion preference starts paused; an explicit behavior click starts that response.

The lore card introduces the being and development directions. LORE.md expands those ideas and distinguishes implemented motion from proposed game systems.

## Models and budgets

| File | Role | Triangles | Model draws | Bytes |
| --- | --- | ---: | ---: | ---: |
| senzai_kk01_d0_lod0.glb | Detailed master / close shots and recordings | 204,576 | 2 | 7,011,448 |
| senzai_kk01_d0_lod1.glb | Animated game study | 23,088 | 2 | 791,484 |
| senzai_kk01_d0_lod2.glb | Static distance / loading proxy | 2,904 | 1 | 140,796 |

These are explicitly derived, geometry-identical derived copies of the KK02 source GLBs at `6312e75`, with KK01 filenames and embedded Jelaludo attribution in each GLB asset header. Plain GLB is the source of truth. All tiers retain 151 unique dot-free node names, matching coordinate and socket conventions. The internal source-family metadata still identifies KK02; do not rename engine-facing nodes to match the display label.

Game exceeds the landmark targets of 8k triangles / 400 KB, while remaining within the 25k unit triangle reference. Distance meets 3k triangles / one draw / 250 KB. The full companion presentation adds fine lines, points, chamber and postprocessing; source-model counts are not full scene cost. See browser-report.json for measured presentation draws. No FPS claim. No upstream compressed copy is shipped; consuming-game gltfpack output still requires decoded validation.

## Runtime integration

- Metres, +Y up, +Z forward; ground plot-center origin. Reserve 100 × 100 m horizontally and 64 m vertically. Nominal field diameter is 32 m, but examining strands reach well beyond it. Transform the entire scene when placing the asset.
- `SENZAI_ROOT` owns `FLOAT_FRAME`. Move the latter through the runtime. `FIBER_ROOT_01`–`FIBER_ROOT_48` are fixed local origins. `EYE_01`–`EYE_48` follow curve tips and point local +Y along the tangent. `SOCKET_FIELD_CENTER` and `SOCKET_EYE_01`–`SOCKET_EYE_48` provide attachment frames. Sockets in the manifest describe time zero.
- `createRig(scene)` from runtime.js deforms `LIVING_ATTENTION`. Call `rig.pose(seconds, {awake:1, hdr:false})` each frame. Time is reversible and modulo 72 s. Fade awake between 0 and 1 for dormancy. There are no baked GLB clips; a generic GLB viewer shows time zero. Do not also bake or mixer-drive these engine-controlled frames.
- Preserve `_FIBERID`, `_ALONG`, `_OFFSET`, `_LOCALNORMAL`, `_GLOW`, normals and vertex colors through conversion. GLTFLoader exposes custom attributes in lowercase. Colors and vertex buffers are mutable; clone them for independent instances.
- Add `createFibers(lod).group` and `createAttention().group` from the companion effects.js under `rig.frame`; update them with the returned pose state. Add createSpace().group alongside the loaded scene. The supplied viewer demonstrates lights, fog, bloom and camera follow. The fine living surface/chamber are companion renderer effects, not baked GLB geometry.
- LOD2 is a static time-zero proxy. Retained names are lookup markers only. Provisional game-entry/distance-return thresholds are 130/160 m; retain game detail when movement is visible. LOD0 is for close shots and recordings.
- Only d0 exists. Focus, examination and dormancy are runtime states, not damage or LOD levels. D1–D3, collision, target AI and navigation remain future work.

### Launch a behavior in your engine

```js
import {createRig} from './runtime.js';
import {behaviorCue} from './behaviors.js';
const rig = createRig(gltf.scene);
const cue = behaviorCue('examining', currentSeconds);
currentSeconds = cue.time;  // enters just before the gathering gesture
awake = cue.awake;
// Advance currentSeconds with your clock, then update each frame:
const state = rig.pose(currentSeconds, {awake, hdr:false});
```

Cues are deterministic timeline entry points, not a target-selection AI or independent baked clips. `duration_s` describes the cue interval before the viewer returns its selection to Living cycle. The example uses the authored three focus points; adapting them to arbitrary live targets requires a controller and revised target logic. The controller should preserve a fixed world-space examination target while the body approaches.

## Motion vocabulary

`Senzai_Attention_Cycle` lasts 72 s. Five broad events at 8, 19, 40, 47 and 65 s recruit 21–24 tendrils. At 27 s, exactly fifteen converge around Echo at [-38,24,20] m, close over 0.8 s plus individual delay, hold through 31.1 s, then release over 2.4 s. Their maximum measured diameter during the hold is 2.037 m. Background activity stays at 27–46 awake strands; the field continues to sway during dormancy. Whole-body shifts occur at 10–11.5, 29–30.6, 49–50.5 and 67–69 s.

## Reproducibility and handoff

manifest.json records source hashes, file costs, nodes, sockets, motion reservation, behavior cues, attribution and LOD metadata. validation-report.json checks decoded exports, names, bounds, fixed roots, motion, loop continuity and the fifteen-tip cluster. The repository's browser-report.json checks controls, downloads, rendering, alias navigation and mobile layout. Its package-report.json records the ZIP hash and contents; the package is a derived distribution.

Repository tools:

```sh
node tools/asset-pipeline/build-senzai-kk01.mjs
node tools/asset-pipeline/validate-senzai-kk01.mjs
python3 tools/package-senzai-kk01.py
node tools/asset-pipeline/test-senzai-kk01.mjs
```

Handoff: the containing commit plus assets/senzai-kk01/ and senzai-kk01/. The package contains the model, runtime and viewer sources needed for integration; the repository additionally contains the authoring/build history. Pending: visual acceptance, consuming-game shader/release decode, LOD thresholds, device profiling, target AI and damage states.
