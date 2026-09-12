# Solar Power: game export set

The original 16 detailed GLBs and their Blender source remain unchanged. Four modules (complex, six-rack array, rack and power station) each retain D0–D3 damage states at three geometry levels. **D0–D3 means damage, not LOD.**

- **LOD0 / detailed:** original geometry for close shots and recordings.
- **LOD1 / game:** continuous photovoltaic surfaces, no individual cell conductors or manufactured bevels, fewer cabinet details and simplified windings. Shared vertex-color material, meshes merged around each tracking pivot. Hidden cabinet internals are removed in intact/closed states. Tracking pivot nodes remain available for engine-driven rotation; the original kit has no baked solar animation clips.
- **LOD2 / distance/loading:** further removes panel frames, mounting rails, cabinet insets and cooling fins. All visible geometry is merged into one static mesh/material per module. Damage silhouettes, sockets and gameplay values remain; use LOD1 when moving trackers are visible.

Every variant has a plain GLB and a Meshopt-compressed GLB. Compression reduces transfer/storage bytes; selecting a lower LOD reduces geometry and draw work. They are independent choices. Meshopt files require an `EXT_meshopt_compression` decoder and `KHR_mesh_quantization` support. Plain GLBs are provided for importers without that support.

## Runtime contract

`manifest-lods.json` lists all 48 variants with `family`, `damage_level`, `lod`, `file` (plain), `meshopt_file`, `bytes`, `meshopt_bytes`, `triangles`, `draw_calls`, `tracking_pivots`, `sockets`, `colliders`, `output_capacity` and `functional`. Paths are relative to `assets/solar-power/`. +Y up, +Z forward, meters, matching root placements. Collider metadata is conservative blockout and is independent of visual LOD. D3 remains nonfunctional at every tier.

These are separate GLBs, not an embedded proprietary LOD extension. Select one geometry variant at a time for each module. The suggested screen-height policy starts with LOD2, promotes to LOD1 above 14% viewport height and demotes below 10%, avoiding constant switching near a threshold. The viewer approximates projected size from the reserved plot width. LOD0 is a deliberate cinematic choice. Tune these thresholds for your camera, resolution and scene; they are not measured performance guarantees.

The viewer can inspect all tiers and both encodings. Auto mode switches the game/distance tier while preserving the camera. Its live-grid sentry models are unchanged and excluded from the solar budget readout. An engine should cache shared meshes/materials and stream a replacement before removing the current LOD. Repeated static LOD2 racks are suitable for instancing; LOD1 trackers require separate instances for moving and fixed parts. No dense cell lines are modeled, avoiding their subpixel aliasing.

For Three.js, configure `GLTFLoader.setMeshoptDecoder(MeshoptDecoder)` before loading a compressed file. The viewer demonstrates this. Meshopt integration reference: https://github.com/KhronosGroup/glTF/blob/main/extensions/2.0/Vendor/EXT_meshopt_compression/README.md

## Rebuild

Run Blender in background mode with `tools/blender/build_solar_power.py -- --lod 1`, then `--lod 2`. Omitting the flag rebuilds the detailed master. Reduced Blender sources are `source/blender/a6-solar-power-lod1.blend` and `a6-solar-power-lod2.blend`.

With the existing pipeline dependencies installed, run `node tools/asset-pipeline/build-solar-exports.mjs`, then `node tools/asset-pipeline/validate-solar-lods.mjs`. Compression uses glTF Transform and Meshoptimizer with 16-bit positions. ZIP paths preserve the manifest's relative layout. Blender source files are separate downloads in the viewer.

## Measured intact-complex budgets

| Tier | Triangles | Draw calls | Plain GLB | Meshopt GLB |
| --- | ---: | ---: | ---: | ---: |
| LOD0 / detailed | 131,236 | 1,150 | 9,203,540 bytes | 466,996 bytes |
| LOD1 / game | 3,856 | 7 | 339,812 bytes | 51,132 bytes |
| LOD2 / distance | 2,752 | 1 | 237,088 bytes | 49,296 bytes |

Actual mesh comparison, game on the left and distance on the right: [preview](lod-comparison.jpg).
