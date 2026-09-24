# HEX-06 / Heptapod resource walker

A large six-legged extraction robot inspired by this library's Heptapod A6: suspended hexagonal hull, raised knee joints, long articulated lower legs, six dorsal process ports and cyan status lights. The underside laser burns mineral-bearing ground; optional ablation and rising-feedstock meshes demonstrate resource recovery into the upper process plant. Original newly authored geometry, not a rescaled legacy sentry. Models by jelaludo. HEX-06 is a provisional name.

## Tank passage

The normal-pose MÖRK reference (`assets/hover-tank/mork_hover_tank_low_d0.glb`) measures **5.819 m wide × 3.011 m high × 13.267 m long**. The walker reserves an **8 m-wide × 6.5 m-high straight corridor along Z**, providing approximately 1.09 m lateral margin on each side. This is checked against every solid triangle of each plain/decoded walker tier, including the posed skin. The tank reference hash is in the manifest.

Passage is for the parked walker in **traffic mode**, with the mining beam and recovery effects inhibited. The viewer shows the actual tank and moves it straight through when playing/scrubbing traffic mode. Enabling the tank selects traffic mode; selecting mining or walking hides the tank. The green corridor guide is optional. The guarantee covers the normal turret/antenna pose and straight path, not a turning tank, turret sweep, rough terrain, active laser or passage under a walking robot. Collision/navigation and occupancy enforcement must be integrated by the game.

## Runtime contract

- Metres; +Y up, +Z forward; root `EXTRACTOR_ROOT` on ground at plot centre. Reserve 22 × 22 m. Parked envelope approximately 18.594 × 12.700 × 12.817 m (X/Y/Z). Six shoes rest on ground. No foundation slab blocks the passage.
- Authoritative self-contained plain GLBs in `lod0/`, `lod1/`, `lod2/`; optional compressed copies in `derived/meshopt/`. No external buffers or textures. Preserve plain originals; release packing belongs to the game using gltfpack `-cc -kn -km -ke`.
- D0 only at all tiers. D1–D3 are unauthored damage states, independent of LOD. LOD0 is the close-shot/recording master. LOD1 keeps the complete bone hierarchy and engine pivots, with six legs sharing one skinned draw. Root naming and socket transforms remain stable.
- `LEG_RIG` holds six `LEG_01` through `LEG_06` chains, each with `_MOUNT`, `_HIP`, `_KNEE`, `_ANKLE`, and `_CONTACT` socket. Mount yaw and hip/knee/ankle pitch are unbaked. Upper/lower lengths are 4 / 9.6 m. `poseLeg` solves the two-link chain and levels each shoe. The demo alternates two tripods, moving feet ±0.6 m fore/aft and lifting them up to 0.65 m. This is an in-place gait preview, not locomotion, terrain IK, a balance simulation or a navigation controller.
- `LASER_YAW` and `LASER_PITCH` are independent aiming pivots. The supplied demonstration parks them vertically. `SOCKET_LASER` is their moving emitter datum. A custom aiming controller must also regenerate its beam/ground hit and preserve the traffic exclusion; do not simultaneously run it with the demo.
- `runtime.js`: `applyExtraction(root,time,lod,mode)` with `mode` = `mining`, `traffic`, or `walk`. `Extraction_Cycle` is a 16-second loop: survey/charge 0–2 s, burn/recover 2–12 s, cool/settle 12–16 s. Walking repeats an 8-second gait within that clock. Traffic mode parks all feet and inhibits all extraction effects. `clips: []`: no baked clips, so the engine owns all pivots.
- Optional effects: `LASER_BEAM`, `GROUND_EFFECT`, `RESOURCE_STREAM`. Preview feedstock uses a repeated upward motion; replace with game VFX. These demonstrate extraction, without changing terrain or awarding resources. The plain rest export contains the effect meshes; call the controller on load or hide them before displaying traffic mode.
- `SOCKET_RESOURCE_OUTPUT`, `SOCKET_POWER`, `SOCKET_TRAFFIC_ENTRY`, `SOCKET_TRAFFIC_EXIT` and six foot contacts are named stable interfaces. Positions/normals are in the manifest. The resource outlet is above ground and requires a game-specific transfer/collection mechanism.
- LOD2 is one static mesh/material, parked with laser/recovery effects omitted and original node names retained as lookup-only placeholders. No articulation or hiding individual pieces. Use only for map/loading/inactive distance; keep LOD1 for walking, mining, traffic interactions or close inspection. Provisional approach threshold 150 m, return beyond 170 m; manual LOD0 for recordings.

## Measured exports

| Tier | Triangles | Mesh draws | Plain bytes |
| --- | ---: | ---: | ---: |
| Detailed / LOD0 | 14,760 | 6 | 790,236 |
| Articulated game / LOD1 | 7,256 | 6 | 390,116 |
| Parked distance / LOD2 | 2,860 | 1 | 132,004 |

LOD1 is below the 25k-triangle articulated-unit target and voluntarily meets the tighter 8k/10-draw/400 KB landmark targets; LOD2 meets the distance target. Figures exclude the separate tank reference, grid and extra render passes. No FPS improvement is claimed. Exact hashes, sizes, bounds, credits, nodes and interfaces are in `manifest.json`.

## Rebuild and validation

- `node tools/asset-pipeline/build-heptapod-extractor.mjs`
- `node tools/asset-pipeline/validate-heptapod-extractor.mjs`
- `node tools/asset-pipeline/test-heptapod-extractor-viewer.mjs`
- `blender -b --python tools/blender/render_heptapod_extractor.py`

Procedural master: `tools/asset-pipeline/heptapod-extractor-shape.mjs`. `source/blender/heptapod-extractor.blend` is an editable imported review derivative; its MÖRK reference, ground, lights and camera are not walker exports. Full tank-scale and mining renders are supplied and visually reviewed. Original Heptapod and MÖRK assets are preserved unchanged.

Six plain/decoded files pass glTF validation without errors/warnings, geometry hygiene, budgets/hashes, stable hierarchy/socket checks, bounds parity, sampled foot placement and triangle-level corridor exclusion. The tank's real bounds are checked. Viewer tests use real models with a mocked renderer to verify initial paint, tank/laser interlock, walking, reset, loading races, distance controls, encoding, wireframe and playback. This does not replace live WebGL review.

Viewer route: `heptapod-extractor/`. Tier/encoding, mode, tank reference, corridor guide, timeline, play/pause/reset, wireframe, unit/underbody/top cameras and selected export download. Live browser/mobile, game Three.js r160/release gltfpack, navigation/collision, resource accounting, final LOD thresholds and reference-phone acceptance remain pending.

Hand-off: the delivered commit hash plus `assets/heptapod-extractor/`; pin plain files by their manifest SHA-256. Meshopt and Blender review copies are derived.
