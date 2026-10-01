# A6 Missile Factory

A 20 × 10 m intact factory with four side-by-side construction stations: bare shell, motor and fins, guidance installation, and finished missile. Three open cases reserve four slots each. The authored starting inventory is six missiles; the Workshop viewer can preview zero to twelve. Inventory count is a presentation variable and is independent of damage and LOD.

## Exports

| Tier | Triangles | Draw calls | Plain GLB bytes | Meshopt bytes | Motion |
| --- | ---: | ---: | ---: | ---: | --- |
| LOD0 detailed master | 13,800 | 123 | 399,616 | 173,652 | Static posed arms |
| LOD1 game | 4,368 | 30 | 344,328 | 62,808 | `Missile_Assembly_Cycle`, 8 s loop |
| LOD2 distance | 2,936 | 1 | 216,408 | 75,732 | Static |

LOD0 reuses the exact geometry of `assets/assembly-line/robotic_arm_d0.glb` and `assets/missile-kit/needle.glb`; the staged projectiles omit parts until their station is complete. LOD1 derives simpler missile and articulated arm forms; its two arm chains retain named waist, shoulder, elbow and wrist pivots. LOD2 is a static merged vertex-colour mesh; its arm names are lookup-only. Three `STORAGE_CASE_*` nodes and twelve `CASE_*_MISSILE_*` inventory slots exist in LOD0/LOD1. The first six have normal scale; the remaining six have near-zero scale for runtime reveal. LOD2 freezes the six-missile starting inventory. All three tiers use one vertex-colour material and no textures.

The game tier meets the triangle and plain-byte landmark targets but **exceeds the ten-draw target** because two movable arm chains, four independent construction stations and individually addressable case slots remain separate meshes. The detailed master is intended for recordings and close review. The distance tier meets all three distance targets. No FPS improvement is claimed.

## Runtime contract

- Coordinates: metres, +Y up, +Z forward, origin at ground in the plot centre. Reserve 20 × 10 m.
- Sockets: `SOCKET_PARTS_IN` at the left feed; `SOCKET_POWER` at the rear; `SOCKET_CASE_OUT` at the right output; `SOCKET_SERVICE` at the front. Exact positions and normals are in `manifest.json`.
- LOD selection suggestion: load LOD2 for the initial/map view, switch to LOD1 within 150 m, with 20 m hysteresis. Tune with the consuming game camera.
- `Missile_Assembly_Cycle` loops over 8 seconds on LOD1. The engine may instead drive the named arm pivots. LOD0's original detailed arms are static posed geometry in this factory export; the reusable arm source remains untouched.
- To set inventory in LOD0/LOD1, scale `CASE_01_MISSILE_01` through `CASE_03_MISSILE_04` in numeric slot order to 1 when occupied or 0.0001 when vacant. Do not use case inventory to represent structural damage. LOD2 is a static snapshot and does not change inventory.
- Only D0 intact is authored. D1–D3 are pending design and should not be inferred from the LODs.

Plain GLBs are the source of truth. Optional `.meshopt.glb` files are transport derivatives and are decoded by validation. Rebuild from `tools/asset-pipeline/build-missile-factory.mjs` and validate with `tools/asset-pipeline/validate-missile-factory.mjs`. Render the catalog preview with `tools/blender/render_missile_factory.py`. Source hashes and exact export measurements are in `manifest.json`.

Hand off the commit hash containing this folder plus `assets/missile-factory/`; the referenced arm and missile source folders are identified by SHA-256 in the manifest. Game-camera appearance, release gltfpack, inventory integration and reference-phone performance remain pending review.
