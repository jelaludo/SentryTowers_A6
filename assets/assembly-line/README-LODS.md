# Robotic assembly-line contract LOD candidates

These derived exports cover the complete `robotic_assembly_line` family across D0–D3. The preserved detailed plain GLBs and `source/blender/a6-assembly-line.blend` remain the authoring sources. Plain GLB is the runtime hand-off source of truth; `.meshopt.glb` files are optional transport derivatives and have been decoded during validation.

## Measured exports

| State | Tier | Triangles | Draw calls | Plain bytes | Meshopt bytes | Motion |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| D0 intact | LOD1 | 5,186 | 3 | 392,648 | 75,612 | `Assembly_Cycle`, 8.0 s, 36 tracks |
| D0 intact | LOD2 | 2,932 | 1 | 81,196 | 31,224 | Static |
| D1 damaged | LOD1 | 5,188 | 3 | 393,336 | 75,904 | `Assembly_Cycle`, 8.0 s, 36 tracks |
| D1 damaged | LOD2 | 2,932 | 1 | 81,196 | 31,228 | Static |
| D2 critical | LOD1 | 4,198 | 1 | 125,800 | 39,200 | Static |
| D2 critical | LOD2 | 2,896 | 1 | 78,852 | 30,388 | Static |
| D3 destroyed | LOD1 | 4,196 | 1 | 128,016 | 41,068 | Static |
| D3 destroyed | LOD2 | 2,074 | 1 | 60,264 | 25,440 | Static |

All files use one vertex-colour material and zero textures. Animated D0/D1 LOD1 use three render primitives so the skinned arms, continuous conveyor and gantry silhouettes remain independently robust; other tiers use one. These are export measurements, not an FPS claim.

## Runtime behavior

- LOD1 D0/D1 retains one rigid-weighted skinned arm mesh. Its 45-joint skeleton consists of `ASSEMBLY_RIG_ROOT` plus the eight robot root/waist/shoulder/elbow/wrist chains and the two authored gripper pairs. The 36 retained animation tracks reproduce the useful robot motion from the detailed source.
- Detailed rover workpieces and the six fragmented conveyor modules are intentionally omitted at reduced tiers. `CONVEYOR_BELT_LOD1` is one dark 2.05 × 0.22 × 23.9 m oblong, visually separating the belt from the arms and floor. The original 180 tread and 12 roller tracks remain omitted; apply one engine-side belt shader if travel must read.
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

Status: **contract candidate; game-camera and reference-phone review pending**. Confirm projected size, the 150 m swap, 20 m hysteresis and measured frame behavior in the consuming game before changing this label to Reviewed runtime.
