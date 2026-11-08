# AUREL-03 / Animation kit for the 4090 workstation

Start with **`assets/robot-assembly/animation-kit/models/aurel03_frame_lod1.glb`** in the extracted ZIP. It is the complete rigged robot with the skeleton and muscle layer in one file. No repo clone or assembly of separate parts is required. The `_sensor_` files use the alternate head; `_lod0` files contain the detailed recording master. The original source assets remain unchanged.

Download the complete kit:

https://jelaludo.github.io/SentryTowers_A6/assets/robot-assembly/animation-kit/aurel03-animation-kit.zip

Viewer:

https://jelaludo.github.io/SentryTowers_A6/robot-assembly/

## First import

1. Extract the ZIP. Keep its `assets/` folder structure so the included runtime imports resolve.
2. Import `models/aurel03_frame_lod1.glb` from the animation-kit folder into your animation tool. The file is self-contained glTF 2.0, metres, +Y up, +Z forward, 1.80 m tall in the neutral pose. Actor-left is +X. In Blender, let the glTF importer perform the coordinate conversion; do not add a second manual rotation or unit conversion.
3. Use `rig-map.json` to identify the **target** pelvis, spine, shoulders, elbows, hips, knees, ankles and head. It includes every target node's authored local/rest-world frame. Retain unweighted mount nodes, existing skin weights, mirrored extremity frames and muscle driver scales. The authored pose has arms down, not a standard T-pose.
4. Generate motion in your existing Kimodo/MotionBricks environment, then retarget it to this character with rest-pose and limb-length correction. Source joints and representations depend on the chosen model. AUREL is a custom target, not a SOMA or G1 skeleton. `rig-map.json` is a target-side semantic guide, **not an automatic retargeting solution**.
5. Animate the original body drivers first; update the muscle adapter afterward. For Blender/FBX/native clips, recreate the supplied endpoint-follow calculations or bake the resulting muscle transforms into the exported clip. A plain GLB stores meshes, bones and weights, but does not run the JavaScript muscle constraints by itself.

The package contains no model weights, generated AI motion, credentials or CUDA environment. GPU inference and retarget quality have not been tested on the 4090 by this export task. The included preview exercises our existing joint study only.

## Package contents

| Model, relative to the animation-kit folder | Triangles | Draws | Plain bytes |
| --- | ---: | ---: | ---: |
| `models/aurel03_frame_lod1.glb` | 42,320 | 17 | 1,749,504 |
| `models/aurel03_sensor_lod1.glb` | 42,436 | 17 | 1,753,588 |
| `models/aurel03_frame_lod0.glb` | 628,416 | 17 | 21,850,100 |
| `models/aurel03_sensor_lod0.glb` | 629,692 | 17 | 21,891,920 |

Both tiers are articulated and use the same named control frames. No frozen distance tier is included in this animation package. They are derived compositions of the preserved skeleton and muscle GLBs. The full underlying skeleton remains present; combined game geometry exceeds the 25k unit triangle target. Master is for close shots and recordings. D0 only; no damage variants. No performance improvement is claimed.

- `character.js`: adapter for either combined model; follows external body animation without resetting it.
- `rig-map.json`: target joint semantics, parent hierarchy, local TRS and world rest matrices.
- `manifest.json`: provenance, hashes, sockets, measured costs and per-file details.
- `validation-report.json`: export, preservation and posed-surface checks.
- `example.html`: small import/animation smoke test, including both heads, both detail levels and layer controls.
- `assets/robot-assembly/muscles/specs.js`: all 66 origin/insertion definitions and muscle shapes.
- Included anatomy, muscle, hand and foot runtime files: all local JS dependencies, preserving their directory layout.
- `SHA256SUMS.json` at the archive root: per-file integrity hashes.

For the browser smoke test, serve the extracted directory over HTTP. For example, run `python -m http.server 8788` from the archive root and open:

http://localhost:8788/

The preview loads Three.js 0.180.0 from jsDelivr, so it needs internet for that library. The GLBs are self-contained and import into an editor offline.

## Retargeting and muscle update order

`AUREL_CHARACTER` is a common placement node above the two rig hierarchies. All skinned surfaces remain at the GLB scene root for glTF compatibility; retain the **entire loaded scene**, not just the placement node. `AUREL_HOST` contains the original body bones and `AUREL_MUSCLES` contains the independent muscle drivers. Their surface nodes carry `aurel_layer: "skeleton" | "muscles"` extras.

Use one owner for actor travel. If the controller owns horizontal travel, drive `AUREL_CHARACTER` and keep the body clip in place. If a clip owns full root motion, do not add the same travel again. `PELVIS_FRAME` sits below a mount at 0.945 m: its local translation is a pose offset, not absolute hip height. Keep host and layer placements together.

There is one thoracic driver, `RIBCAGE_SPINE`; source spine segments need consolidation. There are no independent clavicle pivots. Use the original hand/foot joints for optional finger/toe detail, and leave them in their rest pose when the source does not predict them. Do not treat `MUSCLE_*`, `TENDON_*` or `SOCKET_*` nodes as human retarget joints.

```js
import {createCharacter} from './assets/robot-assembly/animation-kit/character.js';

const gltf = await loader.loadAsync('./assets/robot-assembly/animation-kit/models/aurel03_frame_lod1.glb');
scene.add(gltf.scene);                    // Keep all scene-root skins.
const character = createCharacter(gltf.scene);
const mixer = new THREE.AnimationMixer(gltf.scene);
// Bind your already-retargeted, native-node animation tracks to this mixer.

function animate(dt) {
  mixer.update(dt);                      // 1. Original body pose.
  character.updateAfterAnimation();      // 2. Muscle endpoint follow + bulging.
}
character.setLayers('both');             // 'both', 'skeleton', 'muscles'
```

Do **not** call `studyPose()` or the original `createRig().pose()` after your retargeter/mixer: those demo drivers restore the original rest transforms. The muscle-only update never resets the host. Endpoint distance sets length and bounded radial bulging; tendon radius stays fixed. `MUSCLE_<id>`/`TENDON_<id>` drivers and `SOCKET_<id>_ORIGIN/INSERTION` retain their source names. The GLBs contain no baked clips and this layer has no arbitrary-pose collision/tendon-wrapping solver.

## Notes for the animation agent on the 4090

Use the combined game GLB as the target. Read `rig-map.json`, preserve the original geometry and rest frames, and create a separate retarget adapter. Start with idle, walk, turn and arm-raise tests. Compare foot contacts, pelvis height, shoulder volume and tendon attachments before building a larger moveset. Apply the same native driver animation to the master only after the game target is working. Export motions as new derived files with named clips, explicit durations, root-motion policy and generator/model/seed provenance. Include the muscle driver tracks when baking a standalone animated GLB.

Official references checked on 9 November 2026: MotionBricks' SOMA engine requires retargeting for another joint layout/proportion set. Kimodo lists the RTX 4090 among its extensively tested GPUs; your installed model/version still determines the source rig and environment requirements.

https://github.com/NVlabs/motionbricks/blob/main/docs/runtime_api.md

https://github.com/nv-tlabs/kimodo

## Provenance and rebuild

Original models and adapter by **jelaludo / Model Workshop**. Credit `Models by jelaludo — https://jelaludo.github.io/SentryTowers_A6/` in a reused project. The Workshop's original-model reuse terms apply. No third-party motion or model weights are redistributed.

Source revision: `dffaad650cd7fb4ea7ec5ba51caf2d500ff36caa`. This package is a derived handoff; source hashes are pinned in the manifest. Use the containing repository commit plus `assets/robot-assembly/animation-kit/` and its packaged runtime dependencies for a reproducible handoff.

```sh
node tools/asset-pipeline/build-aurel-animation-kit.mjs
node tools/asset-pipeline/validate-aurel-animation-kit.mjs
python3 tools/asset-pipeline/package-aurel-animation-kit.py
node tools/asset-pipeline/test-aurel-animation-kit.mjs
```

Pending: actual GPU generation and retargeting, visual acceptance of resulting motion, production contact/collision, composite geometry optimization, consuming-game release packing/decoded validation and device performance measurements.
