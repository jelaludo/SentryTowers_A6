# A6 Missile Factory — gantry tip cell and sorted storage

The revised intact factory occupies a 20 × 10 m plot. A compact dual gantry places explosive tips on two empty shells; a completed round rests on the output cradle. Eight open crates form four labeled columns, with two crates per missile family and three rounds per crate. The families are DART, NEEDLE, TALON and CRUISE. The large CRUISE display source is shown at 0.27 scale inside the crate; the source asset is unchanged.

## Measured exports

| Tier | Triangles | Draw calls | Plain GLB bytes | Optional Meshopt bytes | Motion |
| --- | ---: | ---: | ---: | ---: | --- |
| LOD0 detailed master | 16,904 | 117 | 421,688 | 176,936 | `Tip_Installation_Cycle`, 6 s |
| LOD1 game | 5,092 | 5 | 385,852 | 141,452 | `Tip_Installation_Cycle`, 6 s |
| LOD2 distance | 2,988 | 1 | 233,224 | 88,460 | Static |

The detailed master contains the exact DART, NEEDLE and TALON meshes from `assets/missile-kit/` and the CRUISE display mesh from `assets/ammunition/`. No source original was overwritten. LOD1 is a five-draw, single-palette export: one merged static mesh and separately animated gantry head/tip geometry. LOD2 is one static mesh and one material, with stable lookup nodes. At distance each crate shows one missile silhouette as a visual summary of its three stored rounds. All tiers have no textures. Export measurements are counts and file sizes, not an FPS claim.

## Runtime contract

- Metres, +Y up, +Z forward, origin on the ground at plot centre. Reserve 20 × 10 m.
- `GANTRY_HEAD_1_SLIDE`, `GANTRY_HEAD_1_LIFT`, `GANTRY_HEAD_2_SLIDE` and `GANTRY_HEAD_2_LIFT` are the drive pivots. `EXPLOSIVE_TIP_1` and `EXPLOSIVE_TIP_2` move with the lifts. The six-second `Tip_Installation_Cycle` is a presentation loop; the engine may drive the pivots directly instead. LOD2 controls are lookup-only and static.
- `SHELL_A_EMPTY` and `SHELL_B_RECEIVING_TIP` identify the open-shell fixtures. `FINISHED_ROUND` identifies the output cradle. The head positions lower the separate tips to the shell noses during the cycle. Production completion and inventory updates are engine-owned events rather than baked state changes.
- `STORAGE_CRATE_01_DART` through `STORAGE_CRATE_08_CRUISE` carry `missile_family`, `capacity`, `filled_count` and `source_asset` metadata. There are three missile slots per crate in LOD0/LOD1. The distance tier holds the starting inventory visually as a static summary.
- Sockets: `SOCKET_PARTS_IN`, `SOCKET_POWER`, `SOCKET_CASE_OUT`, `SOCKET_SERVICE`; positions and normals are in `manifest.json`.
- Suggested LOD selection: LOD2 initially and for map/loading views, switch to LOD1 within 150 m with 20 m hysteresis. Tune against the consuming game camera and reference phone.
- Only D0 intact is authored. Damage states are separate from LOD and storage inventory.

The former long conveyor, robotic arms, four station nodes and twelve-slot inventory layout were intentionally retired in this revision. The manifest lists retired v2 lookup names; consumers pinned to the first factory commit need a mapping update. The four socket IDs and 20 × 10 m plot remain stable, though socket positions were revised for the compact layout.

Plain GLBs are the source of truth. Optional `.meshopt.glb` files are transport derivatives; validation decodes them. Rebuild with `node tools/asset-pipeline/build-missile-factory.mjs`; validate with `node tools/asset-pipeline/validate-missile-factory.mjs`; render the game-tier preview with `blender --background --python tools/blender/render_missile_factory.py`. Source hashes and precise metrics are in `manifest.json`.

Hand off the commit hash containing this folder plus `assets/missile-factory/`. Game-camera, live WebGL, release gltfpack, production/inventory logic and reference-phone performance remain pending review.
