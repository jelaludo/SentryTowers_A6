# LATENT / Optic-fiber field

A suspended 32 m field of dark radial filaments, with emerald light traveling through a sparse set of extending strands. No solid ball is hidden under the fibers. The viewer adds fine glass lines, reflective tips, soft eye halos, atmospheric ray marching and bloom around the authored mesh.

Open http://localhost:8788/latent-field/

## Motion and controls

`Latent_Attention_Cycle` is a seamless **48-second engine-driven cycle**. Forty-eight candidate strands wake in staggered, spatially distributed pairs; 13–14 exceed the awake threshold at a time. They extend smoothly, pulse from root to tip, dim and retract into the field. The whole field bobs ±0.55 m and sways gently. The maximum sampled eye radius is 20.1546 m. There are no baked animation clips; a generic GLB viewer shows the exported time-zero pose.

Drag to orbit, scroll to approach; use Pause, Restart and the timeline to inspect the cycle. Whole field / Fiber macro change the camera. Dormant retracts and extinguishes the attention strands. Settings selects master/game/static distance, speed, fog and glow; it also downloads the selected plain GLB. Cinema hides controls (Escape restores them). Save image captures the canvas without interface overlays. Reduced-motion users start paused.

## Measured exports

All files are self-contained plain GLBs with vertex colors and no external textures. Master is authored source; the reduced tiers are explicitly derived. All preserve the same 199 unique, dot-free node names and coordinate system.

| File | Role | Triangles | Model draws | Bytes |
| --- | --- | ---: | ---: | ---: |
| `latent_field_d0_lod0.glb` | Detailed master / recordings | 200,640 | 2 | 8,054,628 |
| `latent_field_d0_lod1.glb` | Animated game study | 21,072 | 2 | 1,047,276 |
| `latent_field_d0_lod2.glb` | Static distance / loading | 2,976 | 1 | 183,324 |

Model draws were also measured in Chromium with companion effects hidden. With all viewer effects and postprocessing enabled, master/game each issue **21 render calls**, distance 16. Game adds 72,384 line segments and 24,048 points; master adds 144,384 segments and 48,048 points. These are separate from triangle totals. See `browser-report.json`; its SwiftShader review is functional evidence, not an FPS or reference-device measurement.

The game tier is within the 25k articulated-unit triangle reference, but this is an abstract VFX study, not an accepted game unit. It exceeds the landmark targets of 8k triangles and 400 KB. The static tier meets the 3k triangle / one draw / 250 KB distance targets. No compressed copy is shipped; the consuming game's gltfpack output still needs decoded validation, including custom attributes and skin behavior.

## Integration

- Metres, +Y up, +Z forward. Origin is ground plot center; neutral orb center is `[0,25,0]`. Reserve a **50 × 50 m plot and 50 m height**. No floor is included. The dense mesh radius is 16 m; viewer glass tips extend slightly beyond it. Reserve bounds include the extended eyes and floating motion.
- Add and transform the **entire loaded glTF scene** as a unit. `LATENT_ROOT` holds `FLOAT_FRAME`, the common skin-root bone. `ATTENTION_FIBERS` is a separate scene-root skinned mesh, deliberately outside the moving frame. Do not detach it or move only `LATENT_ROOT` to place the asset.
- `FLOAT_FRAME` drives bob and sway. `FIBER_01`–`FIBER_48` scale along local Y; `EYE_01`–`EYE_48` translate along local Y. Their mounts fix radial orientation. `SOCKET_FIELD_CENTER` and `SOCKET_EYE_01`–`SOCKET_EYE_48` are attachment frames. Socket positions in the manifest describe the exported time-zero pose, not invariant world positions.
- Preserve `_FIBERID`, `_GLOW`, `_ALONG`, vertex colors and skin weights when packing. Three's loader exposes the custom attributes as lowercase names. The supplied helper accepts those names and updates colors, pivots and bones deterministically. If custom attributes are stripped, illumination animation will be lost. `KHR_materials_unlit` supplies the attention material; HDR amplification is optional in the viewer.
- `runtime.js` has no Three.js import. Load the GLB with Three, then call `createRig(gltf.scene)` and `rig.pose(seconds, {awake: 1, hdr: false})` each frame. `awake` accepts 0–1; fade it for smooth dormancy. Do not also apply an animation mixer to these pivots. Clone geometries/colors and the skeleton for independently animated instances.
- `latent-field/effects.js` is the optional companion renderer. Add `createFibers(lod)` and `createAttention().group` under `rig.frame`; feed the attention helper the states returned by `pose`. The viewer shows integration of fog, lighting, bloom and exposure. Those effects are **not embedded in the GLB**; a plain source render intentionally has fewer visible fine filaments and no atmospheric glow.
- LOD2 is a merged **static time-zero surface**, with a coarse spoke silhouette intended for loading and distant views rather than close inspection. Its retained names are lookup markers only. The runtime freezes this tier. Provisional entry at 100 m / return at 120 m is metadata for review, not automatic viewer switching. Keep LOD1 whenever moving fibers are important. LOD0 is for close shots/recordings.
- Only damage state `d0` exists. Dormant versus awake is a runtime state, never a damage or LOD identifier. D1–D3 are not authored.

## Evidence and handoff

`manifest.json` records SHA-256 hashes, source fingerprints, counts, bounds, socket names, LOD policy, credit and runtime metadata. `validation-report.json` records zero GLB validator errors/warnings, zero degenerate triangles, name parity, finite geometry, 480 temporal samples, bounded eyes, loop continuity and frozen distance state. `browser-report.json` records all three rendered tiers, matching downloads, animation/controls, PNG capture and 390 px layout. Visual review includes whole-field, macro, multiple cycle phases and dormant views.

Rebuild with `node tools/asset-pipeline/build-latent-field.mjs`, validate with `node tools/asset-pipeline/validate-latent-field.mjs`, and run the local viewer review with `node tools/asset-pipeline/test-latent-field.mjs`. The browser script uses the locally installed Chromium/Playwright paths. The builder fingerprints the external user reference; that image must be present at its recorded path to rebuild provenance.

Handoff is the **containing git commit plus `assets/latent-field/`**, with `latent-field/` for the companion presentation and `tools/asset-pipeline/*latent-field*` for reproducibility. Pending: user visual acceptance, consuming-game shader/packing adaptation, decoded release validation, camera thresholds, device profiling and any damage behavior. No game performance claim is made.

Models, procedural effects and animation by **jelaludo / Model Workshop**. The user's concept image is fingerprinted in `reference-provenance.json` and remains external; no image pixels or third-party meshes are distributed. Workshop attribution/reuse terms apply to the original authored work.
