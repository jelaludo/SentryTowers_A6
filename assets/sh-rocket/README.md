# SH rocket — articulated standalone vehicle

Model by **jelaludo**. Reuse terms: `../../ASSET-LICENSE.md`.

`sh_rocket.glb` contains only the rocket, its tripod legs, cargo capsule and markings. No launch infrastructure or HUGIN lettering is included. Editable source: `../../source/blender/sh-rocket.blend`.

| Independent clip | Duration | Motion |
| --- | --- | --- |
| `Legs_Deploy` | 2.4 s | Stowed alongside hull → planted tripod |
| `Legs_Retract` | 2.4 s | Planted tripod → stowed |
| `Landing_Shock` | 2.0 s | Fast 1.1 m compression, rebound and damped settling |
| `Top_Door_Open` | 1.8 s | Hinged nose cap opens 112° to expose cargo well |
| `Top_Door_Close` | 1.8 s | Nose cap returns to closed position |

The two-link legs have separate HIP, KNEE and ANKLE nodes. Both load-bearing joints bend during landing; ankle compensation keeps the broad pads level and planted. Telescoping dampers follow the lower arms. Animation is baked to object transforms, with no runtime IK dependency. This is authored mechanical motion, not a physical suspension simulation.

Play clips once and hold their last frame. Deploy before landing. Avoid simultaneously blending a leg deployment clip and the shock clip because they control the same joints. Door clips affect only `TOP_DOOR_HINGE`, so they can run alongside leg motion. `Landing_Shock` moves `REUSABLE_BOOSTER` down relative to `SH_ROCKET`; place the root at the touchdown ground plane and let the clip supply compression. Add approach/descent movement to an external parent. Units are metres, glTF is +Y up, default deployed ground plane is Y=0. Feet retain the original 4.7 m radial stance; vehicle height is 21.4 m.

## Change or hide SH02

The `MARKINGS` node contains both identifiers. Hide/show its entire subtree at runtime. For example, in Three.js:

```js
rocket.getObjectByName('MARKINGS').visible = false; // true to restore
```

In Blender, `MARKING_BODY` and `MARKING_CARGO` remain editable text objects. Edit their text to SH03 (or another identifier), or hide the MARKINGS hierarchy. The reproducible builder exposes the same options:

```sh
blender -b --python-exit-code 1 --python tools/blender/build_sh_rocket.py -- --label SH03
blender -b --python-exit-code 1 --python tools/blender/build_sh_rocket.py -- --no-label
```

Each rebuild replaces this SH asset's GLB, Blender source, still previews and manifest. Default is SH02. The earlier HUGIN flight sprites and launchpad assets are retained separately.

## Review and validation

`legs.gif`, `landing.gif` and `door.gif` preview the independent motions. `poses.png` compares stowed, deployed, maximum compression and open door at a fixed camera scale. Studio cameras/lights are in the Blender source only, not the GLB.

In the Blender source, animation is stored in named NLA tracks on the animated objects. Tracks are muted by default to show the deployed, closed rest pose. To preview, enable the matching track name across the relevant objects, mute other tracks, and play frames 0–72 for legs, 0–60 for shock, or 0–54 for the door at 30 fps.

```sh
node tools/asset-pipeline/validate-sh-rocket.mjs
blender -b --python-exit-code 1 --python tools/blender/render_sh_motion.py
python3 tools/blender/pack_sh_previews.py # requires Pillow
```

The validator checks all five exported clips, forward/reverse leg consistency, stationary feet throughout landing, independent door channels, branding removal and glTF validity.
