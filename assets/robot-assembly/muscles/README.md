# AUREL-03 / Optional muscle layer

A removable hybrid of charcoal muscle bodies and braided tendon ends. Sixty-six bundles cover the torso, shoulders, arms, pelvis and legs. Fusiform limb bodies, broad chest fans, abdominal straps and overlapping shoulder caps add volume around the original metal skeleton. The detailed master has longitudinal fibre grooves and modeled helical tendon strands; the game tier simplifies those surfaces. “Carbon-like” describes the visual finish, not a claim that rigid carbon-fibre composite contracts like muscle.

The original 42 anatomy GLBs, original manifest/runtime and procedural rig sources remain byte-for-byte identical to parent commit `f2ab7a8aa9d85f461afd3ba81d25017ed62f9e57`. The new layer is loaded separately and never writes to the original skeleton transforms. Heads, hands and feet retain their original exposed mechanisms.

Local viewer:

http://localhost:8788/robot-assembly/

Original skeleton view:

http://localhost:8788/robot-assembly/?layer=skeleton

Choose **Skeleton + muscles**, **Original skeleton** or **Muscles only**. Part isolation, both head variants, assembled/exploded views, joint motion, wireframe and all three tiers remain available. Select the detailed master and isolate an arm to inspect the braided tendons. Skeleton and muscle downloads are separate; the muscle download always contains the complete layer, even when a single part is visible. Muscles-only selection returns to the complete layer when the selected head, hand or foot has no muscle surface.

## Complete robot download

For animation work, the [animation kit](../animation-kit/README.md) includes both layers already assembled in one GLB, both heads and game/master tiers, plus a target rig map, runtime dependencies and a preview. Kimodo/MotionBricks motion requires retargeting; the included muscle adapter runs afterward.

https://jelaludo.github.io/SentryTowers_A6/assets/robot-assembly/animation-kit/aurel03-animation-kit.zip

## Files and measured costs

Plain, self-contained GLBs are authoritative. Each uses one vertex-colour material, with no external textures or buffers. `manifest.json` includes source and parent hashes, dimensions, attachment specs, sockets, named nodes, clips, credits, measured costs and provisional LOD selection. D0 is intact; D1–D3 are not authored. Static meshes and preview PNGs are derived assets.

| File | Use | Triangles | Draws | Plain bytes |
| --- | --- | ---: | ---: | ---: |
| `aurel03_muscles_d0_lod0.glb` | Detailed, articulated | 285,384 | 6 | 10,065,424 |
| `aurel03_muscles_d0_lod1.glb` | Game, articulated | 18,744 | 6 | 815,440 |
| `aurel03_muscles_d0_lod2.glb` | Distance, static rest pose | 1,426 | 1 | 115,008 |

The source skeleton remains present underneath. Combined costs below include the original **open cranial frame** assembly and the complete layer, excluding the viewer floor, grid and guides:

| Tier | Combined triangles | Combined draws | Combined plain bytes |
| --- | ---: | ---: | ---: |
| LOD0 | 628,416 | 17 | 21,831,044 |
| LOD1 | 42,320 | 17 | 1,730,440 |
| LOD2 | 4,220 | 2 | 277,460 |

The layer alone is below 25k game triangles and the 3k/one-draw/250 KB distance targets. The **combined game exceeds the 25k unit target**, and combined distance exceeds the static targets. A production composite with hidden skeleton surfaces removed, merged surfaces and a new budget remains future work; this experiment deliberately retains the original complete skeleton. No frame-rate gain is claimed. No compressed upstream copies are included. Consuming-game gltfpack release packing and validation of the decoded result remain pending.

## Integration and runtime

Use metres, +Y up, +Z forward and the original ground-centred datum. The 1.80 m skeleton, joint lengths and attachment frames are unchanged; the muscle surfaces add width/depth to its silhouette. Use the manifest's measured `bounds`/`plot_m` for this layer. Game and static layers have matching neutral envelopes and all tiers preserve named driver/socket frames. Keep both files at identity under a common placement wrapper; translations, rotations and uniform scale of that wrapper are supported. Do not scale either layer independently or use nonuniform instance scale.

Load a complete original assembly and the matching muscle tier. The same layer works with either head. Its six scene-root skins correspond to `RIBCAGE`, `ARM_L`, `ARM_R`, `PELVIS`, `LEG_L` and `LEG_R`; each carries a `module` extra for visibility. These skins stay at scene root, alongside the `AUREL_03_MUSCLE_ROOT` hierarchy. Keep them together rather than parenting a skin beneath a moving bone.

```js
import {createRig} from './assets/robot-assembly/runtime.js';
import {createMuscleRig} from './assets/robot-assembly/muscles/runtime.js';

instance.add(skeletonScene, muscleScene);
const skeletonRig = createRig(skeletonScene);
const muscles = createMuscleRig(muscleScene, skeletonScene);

// Each frame: set the original pose first, then update the optional layer.
skeletonRig.pose({spread, articulation, time, openHands});
muscles.update({spread});
```

Copy `specs.js`, both runtime modules and the original runtime's Hand Lab/Foot Lab dependencies. To remove the layer, remove `muscleScene` and stop its update; the original rig needs no restoration. Visibility-only toggling can leave its driver loaded. The anatomy GLBs themselves are independent of this add-on.

Every bundle has `MUSCLE_<id>` and `TENDON_<id>` drivers beneath `MUSCLE_DRIVER_ROOT`. `SOCKET_<id>_ORIGIN` and `SOCKET_<id>_INSERTION` record authored host nodes and local coordinates. `specs.js` is the attachment source of truth. Endpoint distance drives length; a limited 0.82–1.28 radial scale approximates muscle volume preservation. Tendon radius stays fixed. The adapter removes source-module explosion offsets and applies the owning module's offset, so each bundle stays with its part in the exploded study.

There are **no baked animation clips**. Drivers follow the original `Anatomy_Assembly_Cycle` (20 s loop) and `Anatomy_Articulation_Cycle` (12 s loop), or engine-authored poses within their supported range. The runtime updates the layer's independent bones after the host skeleton. This is a kinematic design study; arbitrary-pose collision, tendon wrapping around obstacles, force production and soft-body mechanics are not solved.

LOD2 is a frozen rest-pose surface. Retained bone/socket names are **static lookup markers**, and the runtime refuses to animate them. Return the host to the original rest pose before switching both layers to LOD2. Start with LOD2 and select LOD1 inside a provisional 30 m with 8 m hysteresis; retain LOD1 for visible animation or part isolation. LOD0 is for close inspection/recordings. Consumer camera and device measurements must determine final thresholds.

## Validation and hand-off

`validation-report.json` verifies all three exports with zero glTF errors/warnings, finite nondegenerate geometry, rigid skin weights, matching names/frames and game/static bounds. It hashes all 42 original GLBs and original rig sources against the parent commit. Across 442 sampled poses it checks 31,812 endpoint attachments, non-mutating host transforms, contraction limits, fixed tendon radius, module separation, a transformed common wrapper and static lockout.

`viewer-validation.json` covers 18 head/tier/layer combinations against actual renderer counts, eleven isolated parts, both sequences, reversible layer controls, downloads, wireframe, screenshots and 390px layout. Chromium / SwiftShader reports no console errors. This is functional verification, not a reference-device performance measurement. The original sibling reports and previews remain the historical skeleton-only baseline.

From the repository root:

```sh
node tools/asset-pipeline/build-robot-muscles.mjs
node tools/asset-pipeline/validate-robot-muscles.mjs
node tools/asset-pipeline/test-robot-muscles-viewer.mjs
python3 tools/build-workshop-docs.py
```

The browser test accepts `ANATOMY_LAB_BASE`, `PLAYWRIGHT_MODULE` and `CHROMIUM_PATH`. It writes screenshots/reports only inside this layer folder. Avoid regenerating the preserved skeleton baseline just to test the new layer.

Original procedural geometry, adapter and derived review renders by **jelaludo / Model Workshop**, under the Workshop's original-model reuse terms. Hand off the containing commit hash plus `assets/robot-assembly/muscles/`, its parent anatomy family/runtime dependencies and `tools/asset-pipeline/robot-muscles-shape.mjs`. The received collaboration contract remains unchanged. Pending: visual acceptance, production composite budgets, gameplay locomotion/contact, D1–D3, consuming Three r160/release decode checks and reference-phone/game-camera profiling.
