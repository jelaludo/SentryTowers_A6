# KESTREL / Frontier EVA

An original workshop astronaut by **jelaludo**. The tailored silhouette combines a narrow technical-textile body, separate ceramic guards, flexible joint seals, an opaque dark visor, compact life-support cartridges, protected controls, hip utility fittings, articulated gloves and treaded boots. No visible face or imported character geometry is used.

The model has **248,808 triangles**, **20 joints**, eight material slots and four embedded 1024 × 1024 original wear textures. Fine surface variation, grime and sparse scuffs are authored procedurally in the Blender builder. This is the high-detail character edition; the station crew remains the lightweight personnel collection.

## Animation

Seven clips: Idle, Walk, Run, Kneel, Scared, Point and Lie. Walk/run are in-place cycles, suitable for game-controlled locomotion. The [viewer](../../animation-tests/) provides **Circle travel** for those clips, using the same preview helper as [station crew](../../station-crew/). The 2.2 m radius path is continuous, begins at the current origin, and rotates the character tangent to the circle. Disabling travel or choosing another clip returns to the centered preview. This path is a viewer feature, not baked root motion.

The humanoid hierarchy shares joint names and animation logic with the crew. KESTREL has its own narrower rest proportions, so cross-character retargeting must respect the rest pose. Suit pieces use rigid weights with overlapping joint seals; this is an articulated suit rig rather than a cloth simulation. Grounding is computed from component bounds and checked against the exported skinned mesh. Pose transitions and game-side movement remain under engine control.

Units: meters. GLB: +Y up, +Z forward. Blender: Z up, −Y forward. The opaque visor uses no transparency or transmission. All texture images are embedded in the GLB.

## Build and validation

```sh
blender --background --python-exit-code 1 --python tools/blender/build_kestrel.py
node tools/asset-pipeline/validate-kestrel.mjs
```

Editable source: `source/blender/a6-kestrel.blend`. Original rig helpers: `tools/blender/character_rig.py`. Shared preview travel: `workshop/circular-travel.js`.

Reuse with attribution to **jelaludo** under the [workshop model reuse notice](../../ASSET-LICENSE.md).
