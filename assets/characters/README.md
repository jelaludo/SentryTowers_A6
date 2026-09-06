# Mercenary Astronaut optimization

| Variant | Download size (decimal MB) | Texture limit | Triangles |
| --- | ---: | ---: | ---: |
| Original (kept in Downloads) | 111.89 | 1024 px | 704,714 |
| Balanced | 9.49 | 512 px | 156,953 |
| Compact | 4.16 | 256 px | 95,679 |

The compact export is 96.3% smaller than the supplied GLB. The source contains **67 embedded images**, including 65 at 1024×1024 and two at 128×128. Images alone occupy 64.32 MB. Resizing a single texture would not address its geometry cost.

Both exports preserve the 72 unique skeleton joints and the original `Mixamo Walk`, `Mixamo Idle`, and `Mixamo Running` clips. Optimization welds/deduplicates vertices, simplifies geometry with an error limit, resamples redundant animation keys, downsizes textures, and applies WebP plus meshopt compression. Normal maps use lossless WebP after resizing. Texture and geometry reduction are lossy overall. Quantization creates per-mesh skin bindings referencing the same 72 joints; these are not extra skeletons.

## Game integration

These GLBs require **EXT_meshopt_compression**, **KHR_mesh_quantization**, and **EXT_texture_webp** support. The shared Three.js viewer includes `MeshoptDecoder`. Check the target engine's importer for these extensions, or use the generator without the final `meshopt(...)` transform and export PNG textures for a larger, conventional GLB.

Download size is different from runtime memory and rendering cost. WebP reduces transfer size but expands into image data when loaded; it is not GPU block compression. The compact version still has 22 materials and about 96k triangles. For many simultaneous units, the next steps are a purpose-built lower-poly LOD, texture atlasing/material consolidation, and target-engine GPU texture compression. Those changes are not included in this export.

Original scale and animation coordinates are preserved in the files. The viewer applies a display-only parent transform to normalize height to 2 m. Shelly and the astronaut do not share a skeleton or retargeted clips.

## Validation

Both variants loaded in the browser and rendered all three original clips. Checks verified source joint names, clip durations, normalized skin weights, and texture dimension limits. Decoded assets passed the Khronos glTF validator with zero errors; 51 non-root skinned-mesh hierarchy warnings remain. Preview inspection covered the rendered running pose; final quality and performance should be assessed at the intended game camera distance.

## Attribution

**Mercenary Astronaut** by **Peter_D**: https://sketchfab.com/3d-models/mercenary-astronaut-7fd399d488ae4576a0fc62715892956c . Supplied GLB metadata specifies **CC BY 4.0**: https://creativecommons.org/licenses/by/4.0/ . Changes: reduced geometry, resized/re-encoded textures, quantized/compressed buffers and resampled animation keys. Original attribution remains embedded in both files.

## Reproduce

From `tools/asset-pipeline`, run `npm install`, then:

```sh
node optimize.mjs /path/to/mercenary_astronaut.glb ../../assets/characters
```

The original is deliberately excluded from the public repository. Exact measurements and settings are in `astronaut-report.json`.
