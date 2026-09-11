# Scalable foundation slab

**Models by jelaludo**

`foundation_slab.glb` is a self-contained, texture-free glTF 2.0 asset: **28 triangles, 3,592 bytes, two meshes and two named materials**, no animation or damage states.

- `ROOT`: origin at the plot centre, on the top surface.
- `SLAB`: flat, unmarked top at Y=0; bounds X/Z = −20…+20 m. `Slab / concrete` material. The rim has a 0.12 m edge and a 0.15 m horizontal bevel ending at Y=−0.28 m; all rim geometry lies below the top.
- `SKIRT`: inset by 0.15 m, sides from Y=0 to Y=−1.2 m, closed bottom. `Skirt / carbon` material. The upper side section is behind the concrete rim.
- `SUPPORT`: empty at (0, −1.2, 0).

No sockets, grid, labels, texture images, scenery or shader progress variants are embedded. Material names are preserved for the game's tint pass. The existing individual 4 × 4 m foundation remains available as `foundation_flat_d0.glb`.

## Scale to an island

Set the instance scale to **(width / 40, 1, depth / 40)**. Set its position/orientation to the island's tangent pad. Keeping Y scale at 1 preserves the 1.2 m fill skirt; the top remains at the pad height. Draw the 4 m logical grid in the game's world-position shader. Rim width stretches in X/Z with the slab, as allowed in the brief.

| Island | Footprint | Instance scale X, Y, Z | Triangles |
| --- | --- | --- | ---: |
| Landing site | 16 × 16 m | 0.4, 1, 0.4 | 28 |
| Rotor socket | 8 × 8 m | 0.2, 1, 0.2 | 28 |
| Armored gate | 12 × 8 m | 0.3, 1, 0.2 | 28 |
| Solar complex | 20 × 20 m | 0.5, 1, 0.5 | 28 |
| HUGIN arm | 40 × 40 m | 1, 1, 1 | 28 |
| Stalheart | 48 × 56 m | 1.2, 1, 1.4 | 28 |

The Stalheart footprint would require 168 individual 4 × 4 tiles: **20,160 triangles** using the lightweight tiles, versus **28** for one slab. Batch the SLAB and SKIRT meshes separately with a shared material for each: two instanced color-pass draws can cover all islands. Preserve each mesh's local transform when composing instance matrices.

`foundation-slab.lock.json` records the SHA-256, exact source commit and immutable raw download URL. The lock references the commit containing the GLB, rather than a moving branch. Pin/update your story project's own asset lock from this record. The attribution string is exactly **Models by jelaludo**.

## Review and regeneration

The base-kit viewer has **Scalable island slab** and six footprint presets. Both 8 × 8 and 48 × 56 m previews have been visually checked in Safari. The automated validator samples the top across every preset at an arbitrary 7.25 m pad height, verifies skirt depth, footprint, material names, checksum when the lock exists, budget and GLB self-containment.

```sh
blender -b --python-exit-code 1 --python tools/blender/build_foundation_slab.py
node tools/asset-pipeline/validate-foundation-slab.mjs
```

Editable source: `../../source/blender/foundation-slab.blend`. Rebuilding may change binary checksums even if the appearance is unchanged; update the lock only after committing the intended asset revision.

The GLB was also loaded with Three.js r160 and its scaled top-height invariant checked.

The Stalheart story application's `npm run assets:check`, sphere placement and shader-grid integration are downstream checks; this repository does not contain that application.
