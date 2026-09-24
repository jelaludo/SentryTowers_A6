# LIT-01 / Chip manufacturing unit

Original intact planetary-industry laser writer; provisional development designation. Models by jelaludo. Matches the ISAO/MÖRK/KORP palette. Four folding mirrors route a cyan preview beam through an open focusing collar to a patterned wafer on a moving XY stage. Two front cassette ports represent wafer input and chip output. This is an open inspection model and art-directed process demonstration, not a complete cleanroom or physical semiconductor fabrication simulation.

## Runtime contract

- Plain self-contained GLBs in `lod0/`, `lod1/`, `lod2/` are authoritative. Optional `derived/meshopt/` exports are marked derived. No textures or external buffers. Preserve originals; the consuming game packs plain files with gltfpack `-cc -kn -km -ke` at release.
- Metres, +Y up, +Z forward, origin on ground at plot centre. Reserve 9 × 7 m. Base is 8 × 6 m; top deck 0.76 m. Wafer centre rests at [1.5, 1.8, -0.6]. Moving stage travel is ±0.4 m X, ±0.35 m Z, inside the plot.
- D0 only at all three tiers. D1–D3 are unauthored, not represented by lower LODs.
- LOD0 is the detailed recording master. LOD1 retains `MIRROR_1_PIVOT` through `MIRROR_4_PIVOT`, `WAFER_STAGE`, `WAFER_CHUCK` and hideable `LASER_PATH`. Mirror local +Z is the optical normal. Default normals satisfy the folded specular path; do not independently animate the mirrors without recomputing the beam.
- `runtime.js` exports `applyWrite(root, time, lod, showBeam)` and `writeState(time)`. `Wafer_Write_Cycle` is an unbaked, 12-second looping engine demonstration: 0–1 s align; 1–10 s six serpentine write rows with laser blanking during row indexing; 10–12 s return. Named baked clips: none (`clips: []`). The engine owns the pivots. `WAFER_CHUCK` follows `WAFER_STAGE`; use either the supplied stage controller or your own, not both.
- `SOCKET_POWER`, `SOCKET_WAFER_INPUT`, `SOCKET_CHIP_OUTPUT`, `SOCKET_BEAM_FOCUS` have identical transforms across tiers; see manifest for positions/normals and kinds. The focus socket is the wafer substrate surface datum. Raised decorative die traces extend slightly above it. Inventory transfer and actual chip production remain game integration work.
- LOD2 is one static mesh/material at rest with lookup-only placeholders for original nodes; no separate hiding, articulation or animation. Its cyan optical path is merged. Load first at distance, provisionally switch to LOD1 within 150 m, return beyond 170 m. Keep LOD1 active during writing. LOD0 is manual only.

## Measured export budgets

| Tier | Triangles | Mesh draws | Plain bytes |
| --- | ---: | ---: | ---: |
| Detailed / LOD0 | 8,144 | 8 | 346,540 |
| Game / LOD1 | 3,712 | 8 | 163,124 |
| Static distance / LOD2 | 2,152 | 1 | 81,776 |

Counts cover the exported model, excluding viewer ground, lighting and additional render passes. Game and distance satisfy landmark targets. No FPS claim is made. SHA-256, exact bounds, compressed bytes, sockets, names, credits and selection metadata are in `manifest.json`.

## Rebuild, inspect and validate

Run `node tools/asset-pipeline/build-chip-manufacturing.mjs`, then `node tools/asset-pipeline/validate-chip-manufacturing.mjs`. The validator checks all three plain exports and all three decoded Meshopt copies: glTF errors/warnings, hashes, measured geometry, nondegenerate triangles, budgets, node names, socket transforms, hierarchy, mirror reflection and beam-on-wafer travel. `validation-report.json` records results.

Procedural master: `tools/asset-pipeline/chip-manufacturing-shape.mjs`. The Blender scene in `source/blender/chip-manufacturing.blend` is an editable review derivative imported from the detailed GLB; stage, lights and camera are not game exports. Rebuild it and the preview images with `blender -b --python tools/blender/render_chip_manufacturing.py`.

Viewer route: `chip-manufacturing/`. Tier and encoding selectors, play/pause, timeline, reset, beam toggle, wireframe, unit/optical/top cameras and selected-export download. Beam hiding is disabled for static LOD2. Blender renders reviewed; live browser/mobile review is pending because no browser was available in the authoring session. Consuming-game Three.js r160, release gltfpack, gameplay/resource hooks, final LOD selection and reference-phone acceptance remain pending.

Hand-off: the commit containing this directory plus `assets/chip-manufacturing/`; pin each authoritative file using its manifest SHA-256. Refer to the git commit hash supplied with delivery. Do not identify this candidate as game-reviewed.
