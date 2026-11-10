# Senzai-KK02 / Living attention

A separate evolution of **LATENT v1**: the 32 m dark fiber field now breathes, bends and directs emerald tendrils toward three spatial signals. It shifts swiftly between listening positions while large projected four-dimensional frames, folded grids and suspended dust move slowly around it. Two-metre reference posts and camera parallax establish scale. This is a visual interpretation of higher-dimensional space, rendered as a three-dimensional scene.

Open http://localhost:8788/senzai-kk02/

LATENT remains at http://localhost:8788/latent-field/

## Motion and presentation

`Senzai_Attention_Cycle` is a deterministic, seamless **72-second engine-driven cycle**. Initial listening gives way to three 1.5–1.6 s shifts, followed by a slower two-second return. The attention direction changes before the body travels. The curve field trails during motion, then settles; illuminated fibers bend toward the selected focus and carry traveling light pulses. Sampled peak shift speed is 26.2301 m/s. Forty-eight candidate strands provide 11–18 visibly awake eyes across the cycle.

| Time | Action |
| --- | --- |
| 0–10 s | Listening drift; attention anticipates Signal |
| 10–11.5 s | Swift shift toward Signal |
| 11.5–29 s | Attend Signal; begin anticipating Echo at 27 s |
| 29–30.6 s | Swift shift toward Echo |
| 30.6–49 s | Attend Echo; begin anticipating Trace at 47 s |
| 49–50.5 s | Swift shift toward Trace |
| 50.5–67 s | Attend Trace, then begin looking home |
| 67–72 s | Return, settle and loop |

The dimensional chamber uses actual 4D vertex rotations followed by perspective projection into 3D. Three nested tesseracts, gently warped 8 m spatial grids, 650 dust points and eighteen 2 m reference posts provide the companion setting. It is presentation geometry, not a collision room or a new GLB module. The field and curved filaments remain the visual focus.

Drag to orbit, scroll to approach. Pause, timeline, Restart and time scale control the cycle. **Next focus** starts just before the next attention shift. **Fiber macro** follows the field closely and hides the chamber; **Living field** restores the spatial composition. Dormant fades and retracts the emerald attention while retaining drift. Settings provides detail tiers, chamber visibility, optional camera follow, fog and bloom. Cinema/Escape hides/restores overlays. Save image exports a clean PNG. Reduced-motion preference starts paused.

## Plain GLB exports

| File | Role | Triangles | Model draws | Bytes |
| --- | --- | ---: | ---: | ---: |
| `senzai_kk02_d0_lod0.glb` | Detailed master / recordings | 204,576 | 2 | 7,011,280 |
| `senzai_kk02_d0_lod1.glb` | Animated game study | 23,088 | 2 | 791,336 |
| `senzai_kk02_d0_lod2.glb` | Static distance / loading proxy | 2,904 | 1 | 140,628 |

All are self-contained, texture-free, plain GLBs with vertex colors, 151 stable dot-free names, matching axes, plot and socket conventions. LOD1/2 are explicitly derived; detailed source is preserved. The game model fits the 25k articulated-unit triangle reference, but exceeds the 8k triangle / 400 KB landmark targets. Distance meets its 3k triangle / one draw / 250 KB targets. This remains an animated spatial study, not an accepted game integration.

With chamber, fine fibers and postprocessing enabled, browser measurements are **36 render calls** for master/game and 31 for distance. Game presentation renders 24,352 triangles, 221,625 line segments and 18,698 points; master renders 205,840 triangles, 581,625 segments and 36,698 points. These include the setting and postprocessing and must not be confused with model-only cost. Counts are functional SwiftShader evidence, not device benchmarks or FPS claims.

## Runtime contract

- Metres, +Y up, +Z forward. Origin is the ground plot center. The field begins at `[-8,25,3]` m and moves within a **100 × 100 m plot, 64 m high**. No floor/collision mesh is part of the model. The nominal dormant radius is 16 m; curved and extended attention tips require the larger reserved bounds. Scene grids extend beyond the plot and are presentation only.
- Transform the entire loaded scene when placing the asset. `SENZAI_ROOT` owns `FLOAT_FRAME`. This frame drives translation; `FIBER_ROOT_01`–`FIBER_ROOT_48` mark fixed local curve origins. `EYE_01`–`EYE_48` follow tip positions and point local +Y along the curve tangent. `SOCKET_FIELD_CENTER` and `SOCKET_EYE_01`–`SOCKET_EYE_48` provide attachment frames.
- Import `createRig` from `runtime.js`, construct `const rig = createRig(gltf.scene)`, then call `rig.pose(seconds, {awake: 1, hdr: false})`. Returned state includes centre, velocity, focus, per-strand illumination and active count. `awake` accepts 0–1; interpolate it for fading dormancy. Time is reversible and modulo 72 s. There are **no baked GLB clips**: a generic GLB viewer shows the exported time-zero pose.
- `LIVING_ATTENTION` is a merged mesh whose vertices/normals/colors are deformed by the helper. Preserve `_FIBERID`, `_ALONG`, `_OFFSET`, `_LOCALNORMAL`, `_GLOW` and vertex colors through conversion. GLTFLoader exposes these custom attributes in lowercase. No skinning dependency is needed. `KHR_materials_unlit` is used for the emerald attention. Optional viewer HDR colors drive bloom.
- The plain mesh includes curved dormant fibers and runtime-deformable attention strands. The **fine living surface**, tip halos, fog, bloom and dimensional chamber are companion renderer effects in `senzai-kk02/effects.js`, `space.js` and `viewer.js`, not baked into the GLB. The many companion dormant strands bend on the GPU; the darker supporting GLB fiber mesh retains its authored curved shape. Copy the companion shaders or adapt them to obtain the full presentation in another engine.
- Add `createFibers(lod).group` and `createAttention().group` under `rig.frame`; feed both helpers the state returned from `pose`. Place `createSpace().group` in world space alongside the model. See the viewer for the complete light, fog, follow-camera and composer setup. Clone geometry/colors for independent instances; mutable vertex buffers cannot be shared between different attention states.
- LOD2 is a **static time-zero proxy** with a deliberately coarse filament silhouette. Retained names are lookup markers; do not animate them. Provisional game-entry/distance-return thresholds are 130/160 m; keep LOD1 whenever motion is readable. LOD0 serves close shots and recordings. The viewer selects tiers manually.
- Only `d0` is authored. Awake/dormant and focus changes are runtime states, not damage states or LOD identifiers. D1–D3 are pending.

## WebKit rendering fix / 10 November 2026

The fiber shader clamps its along-fiber and rim-light inputs before fractional powers. WebKit line interpolation could previously undershoot zero and produce NaN colors, which bloom spread into a large black rectangle. The same native-WebKit setup reproduces the prior defect and renders the corrected version without non-finite scene/bloom pixels in 30 cases across display scales 1/2, all three tiers, field/macro cameras and motion phases. See `webkit-report.json`; run `node tools/asset-pipeline/test-senzai-kk02-webkit.mjs --baseline` to compare against the original shader at `1628143`. Browser module cache versions were advanced; model files, geometry, motion, export counts and v1 remain unchanged.

## Validation and preservation

`manifest.json` provides file hashes, source fingerprints, measurements, reserved bounds, sockets, tier policy and the hashes of all fourteen LATENT asset/viewer files. **LATENT at commit `d8cc09d` is byte-identical.** Its source builders are also unchanged. KK02 is a new family with no changes to v1's route, models, runtime or visual defaults.

`validation-report.json` records all three GLBs with zero validator errors/warnings and no degenerate triangles; informational empty nodes are intentional attachment/lookup frames. It checks 151-name parity, hashes, custom attributes, actual decoded runtime deformation, tip attachments, finite geometry, bounds, static behavior, loop geometry/colors and 720 temporal samples. Maximum sampled curve departure from its straight chord is 2.0186 m; minimum sampled attention clearance is 9.1758 m. The 100 × 100 × 64 m reservation is also checked against decoded model geometry at motion and hold poses. This is not a general collision solver.

`browser-report.json` records all tiers, rendered counts, matching GLB downloads, curve/field movement, projected-space motion, controls, PNG capture and 390 px layout. Visual review covers anticipation, swift travel, each focus, macro, dormant and mobile views. No compressed copy is shipped; consuming-game gltfpack output still requires decoded validation, especially custom-attribute retention.

Rebuild and validate:

```sh
node tools/asset-pipeline/build-senzai-kk02.mjs
node tools/asset-pipeline/validate-senzai-kk02.mjs
node tools/asset-pipeline/test-senzai-kk02.mjs
```

The browser script uses the local Chromium/Playwright installation. Handoff is the **containing commit plus `assets/senzai-kk02/`**, with `senzai-kk02/` for the companion scene and `tools/asset-pipeline/*senzai-kk02*` for reproducibility. Pending: visual acceptance, consuming-game shader/packing adapter, decoded release checks, camera thresholds, device profiling and damage behavior.

Original geometry, shaders, animation and scene by **jelaludo / Model Workshop**. Derived from the separately preserved LATENT design and its user-supplied concept; no reference image pixels or third-party meshes are embedded. Original Workshop reuse and attribution terms apply.
