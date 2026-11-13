# Red Witness / Humanoid

The original Red Witness humanoid, imported into the Workshop at its authored 2.082 m crown height. Graphite muscle bundles, an ivory frame, the red optical helmet and AUREL extremities retain their source appearance.

Models and adaptations by **Jelaludo**. Reuse requires attribution to Jelaludo. See LICENSE.md and ATTRIBUTIONS.md.

## Action showcase

The viewer now opens with ten baked movements supplied in the separate `../red-witness-action-showcase/` package: T-pose, crouch, walk, jog, run, jump and front/left/right/back ukemi. Select **Model inspection** to use the original tiers and joint controls described below. The existing GLBs and rigid runtime are unchanged. The new derived skin uses the textured game geometry; do not apply this family’s `rig.pose()` driver to that animated hierarchy. Animation controls, downloads, provenance and limitations are documented in `../red-witness-action-showcase/INTEGRATION.md`.

## Measured exports

| Tier | Triangles | Model draws | Bytes |
| --- | ---: | ---: | ---: |
| LOD0 / master | 95,523 | 17 | 40,618,416 |
| LOD1 / game | 21,032 | 17 | 10,206,588 |
| LOD2 / static distance | 2,850 | 1 | 78,212 |

Plain self-contained GLB is the source of truth. Metres, +Y up, +Z forward, original ground datum. `d0` means intact authored finish; d1–d3 damage states are not authored. The declared plot is 1.2 × 1 m. Model draw counts exclude viewer lighting, shadows, floor, ruler and comparison geometry.

## Integration

The game model combines the source body LOD3 with helmet LOD1. Seventeen separate rigid mesh parts use two materials; 17 draws are the cost of keeping all these parts independently movable. Master uses the original LOD0 geometry. Degenerate source triangles are removed and a zero-length decimation tangent is repaired. No skinning or baked animation is supplied.

Names: `RED_WITNESS_ROOT`; `PELVIS > SPINE > CHEST > NECK > HEAD`; `UPPER_ARM_L/R > FOREARM_L/R > HAND_L/R`; `THIGH_L/R > SHIN_L/R > FOOT_L/R`. Stable dot-free names persist across tiers. Hand and foot geometry is rebased to its wrist/ankle pivot without changing the rest shape: wrists at y=0.93 m, ankles at y=0.168 m. L/R follows the author's anatomical convention (+X is L).

`SOCKET_HELMET` follows HEAD; `SOCKET_HAND_L/R` follows each wrist; `SOCKET_FOOT_L/R` marks the sole datum under each ankle. Read world frames from the manifest or loaded hierarchy. The original hands and feet were already static AUREL biped LOD2 geometry at 1.2x; fingers and toes are not individually articulated.

`runtime.js` exports `createRig(scene)` and a reversible `pose({headYaw, armLift})` in radians. This is a restrained head/shoulder inspection, not locomotion, IK or collision certification. Muscles move rigidly with their assigned part; they do not stretch across joints. Bind a production rig and solve deformation before performing extreme poses. No clip is baked into engine-driven pivots.

Distance is a derived 16 mm voxel-union proxy, reduced in Blender and colored from the nearest source surface. Fine ribs, cables, finger separations and surface wear are intentionally omitted at distance. It is a frozen rest silhouette, one mesh/material with sampled vertex colors. It retains joint/socket frames as lookup markers only. Do not rotate its markers expecting the surface to deform. Switch back to game before visible motion. Initial 12 m game entry / 16 m distance return are provisional, not measured acceptance thresholds.

Viewer: orbit/zoom, five camera angles, head/arm controls, reset, wire/clay, a metre scale, true-scale original AUREL comparison, turntable, PNG and selected-tier downloads. The comparison is AUREL's original skeleton at its own scale, not a rescaled Red Witness.

Standalone helmet: `../helmet-lab/red-witness/`. The separate AUREL fit is a reversible viewer composition under `../robot-assembly/helmet-fit/`; it is not a combined optimized character GLB.

## Materials and source preservation

The imported appearance intentionally retains authored PBR textures: master 4K, game 2K, embedded JPEG derived from the original PNG maps. Base color and emission are sRGB; OpenGL normal and ORM maps are linear. ORM channels are ambient occlusion, roughness, metallic. This is a documented textured import rather than the library's usual palette-only export. The texture-heavy game file exceeds the 400 KB landmark reference; the unit triangle target is met. No FPS claim or phone certification is made. Distance meets the 3k / one-draw / 250 KB target.

The external `red_witness_helmet` source project, PNG bakes, four original LODs and Blender files are unchanged. `provenance.json` records the exact input hashes; originals remain in that authoring project. This package contains adapted GLBs and runtime, not the original Blender project or its 4K PNG bakes. Master preserves source geometry except documented hygiene and coordinate/pivot normalization; texture encoding is derived.

Rebuild: set RED_WITNESS_SOURCE to the original project root and run `node tools/asset-pipeline/build-red-witness.mjs` from the Workshop repository. Validate with `node tools/asset-pipeline/validate-red-witness.mjs` and `node tools/asset-pipeline/test-red-witness-viewer.mjs`. There is no upstream compressed copy; the consuming game's gltfpack release and decoded output still need validation.

## Handoff

Pin the containing Git commit plus `assets/red-witness/`, manifest and SHA-256 hashes. This is an imported contract candidate, not consuming-game acceptance. Remaining work: visual review, production motion/deformation and collision, texture policy/device profiling, release decode, camera thresholds and damage states.
