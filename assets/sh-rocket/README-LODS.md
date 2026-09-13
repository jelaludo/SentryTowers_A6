# SH02 landing-island distance tier

`sh02_landing_island_d0_lod2.glb` is the static map, orbit, loading and far-view representation of the intact deployed SH02 on the documented 16 × 16 m landing-site slab. The preserved animated `sh_rocket.glb` and `source/blender/sh-rocket.blend` remain the approach/authoring sources. Plain GLB is the hand-off source of truth; the Meshopt file is an optional transport derivative decoded during validation.

| Asset | Triangles | Draw calls | Plain bytes | Meshopt bytes | Clips |
| --- | ---: | ---: | ---: | ---: | ---: |
| Animated approach source | 23,502 | 107 | 1,587,456 | — | 5 |
| Static landing-island LOD2 | 2,154 | 1 | 52,424 | 22,512 | 0 |

These are export measurements, not an FPS claim.

## Runtime contract

- The composite origin is the landing-island top centre at Y=0. The slab is exactly 16 × 16 m, with its skirt extending to Y=-1.2 m. The deployed rocket remains 21.4 m tall.
- Load LOD2 first for map/loading views. The candidate manifest requests the standard 150 m approach swap with 20 m hysteresis; confirm both in the actual map/game cameras and on the reference phone.
- Swap to `sh_rocket.glb` before leg deployment/retraction, landing shock, top-door motion or editable markings must read. The distance tier is deliberately static and omits SH02 lettering below readable size.
- `CARGO_CAPTURE_SOCKET` remains at its source transform. `SH_ROCKET`, `REUSABLE_BOOSTER`, `CARGO_CAPSULE`, `TOP_DOOR_HINGE`, `MARKINGS`, all three landing-leg root/hip/knee/ankle chains and the cargo socket remain as dot-free lookup nodes. They do not articulate the merged LOD2 geometry; move the complete `ROOT` only.
- The manifest includes conservative island and rocket-body collider metadata. Use dedicated engine collision/navigation geometry rather than the rendered mesh.

The current SH02 approach asset authors only intact D0. No D1–D3 files are claimed. The older HUGIN flight wreck belongs to a separate legacy family and is not silently relabeled as SH02 damage. When SH02 damage states are designed, they must be delivered at every intended tier with the same origin, hierarchy and socket transforms.

Manifest: `assets/sh-rocket/manifest-lods.json`.

Rebuild and validate from the repository root:

```sh
node tools/asset-pipeline/build-sh02-landing-lod.mjs
node tools/asset-pipeline/validate-sh02-landing-lod.mjs
blender --background --python tools/blender/render_sh02_landing_lod.py
```

Validation checks the original animated source, exact hashes and bytes, plain and decoded Meshopt geometry, one-draw/material construction, zero textures/skins/animations, finite non-degenerate geometry, unique dot-free names, local hierarchy parity, cargo socket parity, island corners/skirt, rocket-only elevated silhouette, transfer and triangle budgets. Separate perspective and map renders compare the source composition with LOD2.

Status: **contract candidate; map-camera and reference-phone review pending**.
