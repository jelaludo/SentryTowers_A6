# Robotic assembly-line contract LOD candidates

These derived exports cover the complete `robotic_assembly_line` family across D0–D3. The preserved detailed plain GLBs and `source/blender/a6-assembly-line.blend` remain the authoring sources. Plain GLB is the runtime hand-off source of truth; `.meshopt.glb` files are optional transport derivatives and have been decoded during validation.

## Measured exports

| State | Tier | Triangles | Draw calls | Plain bytes | Meshopt bytes | Motion |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| D0 intact | LOD1 | 4,982 | 1 | 388,676 | 72,776 | `Assembly_Cycle`, 8.0 s, 36 tracks |
| D0 intact | LOD2 | 2,934 | 1 | 81,236 | 31,196 | Static |
| D1 damaged | LOD1 | 4,978 | 1 | 389,384 | 72,992 | `Assembly_Cycle`, 8.0 s, 36 tracks |
| D1 damaged | LOD2 | 2,938 | 1 | 81,316 | 31,268 | Static |
| D2 critical | LOD1 | 4,192 | 1 | 129,876 | 41,344 | Static |
| D2 critical | LOD2 | 2,890 | 1 | 78,728 | 30,292 | Static |
| D3 destroyed | LOD1 | 4,198 | 1 | 129,732 | 42,580 | Static |
| D3 destroyed | LOD2 | 2,190 | 1 | 67,624 | 27,012 | Static |

All files use one vertex-colour material and zero textures. These are export measurements, not an FPS claim.

## Runtime behavior

- LOD1 D0/D1 is one rigid-weighted skinned mesh. Its 45-joint skeleton consists of `ASSEMBLY_RIG_ROOT` plus the eight robot root/waist/shoulder/elbow/wrist chains and the two authored gripper pairs. The 36 retained animation tracks reproduce the useful robot motion from the detailed source.
- The original clip's 180 individually animated treads and 12 roller targets are intentionally omitted. If belt travel must read, drive a material/shader offset or one engine-side belt control instead of restoring hundreds of animated objects.
- LOD1 D2/D3 and every LOD2 file are static. Their stable arm controls and sockets remain lookup nodes, but they do not deform the merged geometry.
- LOD2 uses authored robot and gantry silhouettes rather than indiscriminate global decimation. D1 marks one service arm in warning red; D2 preserves upright columns without intact crossbeams; D3 preserves broken conveyor rails and its tallest wreck remnant.
- Keep damage selection independent from LOD selection. Never use a lower LOD as a damage state.

The candidate manifest requests LOD2 for initial/map/loading views, LOD1 inside 150 m, and 20 m hysteresis. Those values match the collaboration contract but remain subject to the actual game camera and reference-phone test. Use the detailed originals only for close recordings or further authoring.

## Stable integration data

All tiers retain `ROOT`, `SOCKET_CONVEYOR_OUT`, `SOCKET_CONVEYOR_IN`, `SOCKET_HUMAN_ACCESS`, `SOCKET_POWER`, the complete arm-control name set and the original collider metadata. Units are metres, +Y is up, +Z is forward, and the origin remains ground-centred on the 20 × 32 m plot. Engine-facing names are unique and dot-free.

Manifest: `assets/assembly-line/manifest-lods.json`.

Rebuild and validate from the repository root:

```sh
node tools/asset-pipeline/build-assembly-line-lods.mjs
node tools/asset-pipeline/validate-assembly-line-lods.mjs
blender --background --python tools/blender/render_assembly_line_lods.py
```

Validation checks exact hashes, bytes, triangles, draw/material/texture counts, glTF errors and warnings, decoded Meshopt geometry, required names, socket transforms, rigid skin weights, clip duration and targets, sampled source-motion parity, source silhouette bounds, damage distinction and contract budgets. The rendered D0–D3 × LOD1/LOD2 pass is a separate visual review.

## Review status

Status: **contract candidate; game-camera and reference-phone review pending**. Confirm projected size, the 150 m swap, 20 m hysteresis and measured frame behavior in the consuming game before changing this label to game-ready.
