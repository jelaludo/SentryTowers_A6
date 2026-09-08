# HUGIN / landing PoC flight vehicle

Original model by **jelaludo**. Retain `Model by jelaludo` in game credits or the asset attribution screen. Reuse terms: [ASSET-LICENSE.md](../../ASSET-LICENSE.md).

This set isolates the reusable booster and cargo capsule from HUGIN D0. The capsule is now a child of the booster. No launcher, catcher, apron, fueling umbilical, ground or scenery is included.

- `hugin_stowed.png` / `.glb`: engine off, three landing assemblies folded upward alongside the hull.
- `hugin_deployed.png` / `.glb`: engine off, original tripod landing stance.
- `hugin_wreck.png` / `.glb`: burned, torn pressure hull, bent rings/fins and damaged nose, retaining the same body reference. This is a registered damage sprite, not a scattered debris scene.
- `atlas.json`: dimensions, alpha bounds, shared pivot, per-pose geometry bounds and metre scale.
- [Editable Blender source](../../source/blender/a6-hugin-flight.blend): isolated deployed assembly, render camera and lighting. The generator exports the other static poses; no retraction animation is provided.

All PNGs are transparent RGBA, **384 × 512**, rendered with the same orthographic camera, lighting, scale and canvas origin. Engine exhaust is absent. The common pivot is **(192, 256)** in top-left-origin image pixels. Use that pivot when swapping full images. If trimming to the supplied alpha bounds, use `pivot_in_bounds_px` instead. Keep the atlas pixels-per-metre scale; do not fit each sprite independently to its visible bounds.

Measured deployed foot-sole-to-nose height is **21.4 m**, including the capsule. Use this instead of the previous approximate 24 m or assumed 22 m. Stowing the legs changes the visible height; each pose has its own bounds but shares the same scale and origin.

The shared center-of-mass reference is an **estimate**, not a measured physical COM: 75% dry mass at the booster hull center and 25% at the capsule center, giving original source Z = 13.75 m. No source mass distribution or fuel loading exists. The flight GLBs place this reference at their origin (+Y up); tune mass/inertia separately in the game. Pose changes deliberately do not move this pivot.

The stowed geometry is a static artistic fold, not a mechanically validated linkage simulation. Reconstruction launcher/drone assets are outside this initial landing-validation set.

Rebuild from the committed HUGIN launchpad GLB:

```sh
blender --background --factory-startup --python-exit-code 1 --python tools/blender/build_hugin_flight.py
```
