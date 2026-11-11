# Red Witness / Optical helmet

The original Red Witness optical helmet as the fourth Helmet Lab entry. Its layered steel shell, cables, red optics, blue connectors and ivory respirator retain their source appearance.

Models and adaptations by **Jelaludo**. Reuse requires attribution to Jelaludo. See LICENSE.md and ATTRIBUTIONS.md.

## Measured exports

| Tier | Triangles | Model draws | Bytes |
| --- | ---: | ---: | ---: |
| LOD0 / master | 18,565 | 1 | 15,002,772 |
| LOD1 / game | 5,600 | 1 | 3,914,216 |
| LOD2 / static distance | 2,999 | 1 | 94,676 |

Plain self-contained GLB is the source of truth. Metres, +Y up, +Z forward, original ground datum. `d0` means intact authored finish; d1–d3 damage states are not authored. The declared plot is 0.4 × 0.4 m. Model draw counts exclude viewer lighting, shadows, floor, ruler and comparison geometry.

## Integration

The authored helmet is a single mesh and material. Exploded/module controls are disabled because the source does not contain separable helmet modules. Half section, wireframe, plain gray, cameras, turntable, screenshots and selected-tier downloads remain available. Head-fit overlays are proportion references, not human-fit certification.

Names: `RED_WITNESS_HELMET_ROOT`, `PART_SHELL`, `DISTANCE_SURFACE`, `SOCKET_NECK`, `SOCKET_HEAD`, `SOCKET_OPTICS`. The original neck-ring ground datum is retained. Height is 0.3401 m, width 0.2648 m and depth 0.3002 m for the master. `SOCKET_NECK` is the origin. All frames match across tiers; source decimation changes bounds by a few millimetres.

Master is source LOD0; game is source LOD2. Distance uses source LOD3 as a derived static single-mesh silhouette using vertex colors sampled from the original texture, without textures or active emission. Initial 12/16 m switching thresholds remain provisional.

AUREL adapter: `../../robot-assembly/helmet-fit/runtime.js`, id `red-witness`. The helmet is uniformly scaled to 0.8 and mounted under `HEAD_PITCH`, with the same 1.785 m crown datum as the other fitted helmets. The original head is hidden/removed on the loaded copy. The joined basal collar below local y=0.075 m is omitted in this derived fit to clear AUREL's neck; standalone GLBs and the full Red Witness figure retain it. This produces an open mounting edge. All fit nodes use the `HELMET_` namespace. Sampled inspection poses pass triangle collision checks; arbitrary animation is not certified.

The original fully textured humanoid is in `../../red-witness/`.

## Materials and source preservation

The imported appearance intentionally retains authored PBR textures: master 4K, game 2K, embedded JPEG derived from the original PNG maps. Base color and emission are sRGB; OpenGL normal and ORM maps are linear. ORM channels are ambient occlusion, roughness, metallic. This is a documented textured import rather than the library's usual palette-only export. The texture-heavy game file exceeds the 400 KB landmark reference; the unit triangle target is met. No FPS claim or phone certification is made. Distance meets the 3k / one-draw / 250 KB target.

The external `red_witness_helmet` source project, PNG bakes, four original LODs and Blender files are unchanged. `provenance.json` records the exact input hashes; originals remain in that authoring project. This package contains adapted GLBs and runtime, not the original Blender project or its 4K PNG bakes. Master preserves source geometry except documented hygiene and coordinate/pivot normalization; texture encoding is derived.

Rebuild: set RED_WITNESS_SOURCE to the original project root and run `node tools/asset-pipeline/build-red-witness.mjs` from the Workshop repository. Validate with `node tools/asset-pipeline/validate-red-witness.mjs` and `node tools/asset-pipeline/test-red-witness-viewer.mjs`. There is no upstream compressed copy; the consuming game's gltfpack release and decoded output still need validation.

## Handoff

Pin the containing Git commit plus `assets/helmet-lab/red-witness/`, manifest and SHA-256 hashes. This is an imported contract candidate, not consuming-game acceptance. Remaining work: visual review, production motion/deformation and collision, texture policy/device profiling, release decode, camera thresholds and damage states.
