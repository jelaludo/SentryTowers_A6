# VER-01 / Greenhouse operation

Original futuristic cultivation module for the terraforming kit, in the ISAO/MÖRK/KORP manufacturer palette. Models by jelaludo; VER-01 is a provisional development designation. A faceted glazed envelope encloses two hydroponic beds with 24 leafy crop clusters, a central aisle and a traveling irrigation bridge. Roof collectors, rear water/nutrient tanks, a climate fan and sliding harvest-access doors complete the operation.

## Runtime contract

- Plain GLBs in `lod0/`, `lod1/`, `lod2/` are the authoritative, self-contained sources. Optional `derived/meshopt/` files are derivatives. No textures or external images/buffers. Game release compression remains gltfpack `-cc -kn -km -ke` from plain files.
- Metres, +Y up, +Z forward. Ground-centred root `GREENHOUSE_ROOT`; reserve 12 × 14 m. Foundation is 10 × 12 m, deck top 0.76 m, cultivation aisle 1.15 m, bed substrate 1.66 m. Entry steps reach the front threshold. Roof height is 5.35 m. Roots, sockets, resting poses and envelope match across tiers.
- D0 only. D1–D3 are future damage variants, independent of detail levels. LOD0 supplies close-shot foliage, fasteners, walkway treads and detailed tanks. LOD1 preserves articulation. LOD2 is one opaque static mesh/material with hidden crop/bed/gantry/fan internals omitted and lookup-only placeholders retained. Its envelope cannot be hidden independently and its doors cannot open.
- Engine-driven nodes: `IRRIGATION_GANTRY` translates along local Z from -2.9 to 3.5 m; `CLIMATE_FAN` turns about local Z; `DOOR_L` / `DOOR_R` slide outward by 1.04 m each. `IRRIGATION_MIST` is optional preview geometry. `CANOPY` hides the entire glazing for inspection; `CROP_CANOPY` can be hidden/replaced by the game. Do not animate the static tier.
- `runtime.js` exports `applyCultivation(root,time,lod,showMist,showCanopy)` and `cultivationState(time)`. `Cultivation_Service_Cycle` is an unbaked 20-second engine demonstration: 0–8 s outward irrigation, 8–16 s return, 16–18 s harvest access opens, 18–20 s closes. Motion is continuous through loop wrap. Mist blanks at the ends and throughout return/access. `clips: []` explicitly means no baked animation clips; do not simultaneously drive these pivots with another controller.
- `SOCKET_WATER`, `SOCKET_NUTRIENT`, `SOCKET_POWER`, `SOCKET_HARVEST` are fixed interfaces; `SOCKET_IRRIGATION` follows the bridge. Positions, outward normals and kinds are in the manifest. No automatic resource transfer, plant growth, harvest removal or climate simulation is implied.
- Glazing is alpha-blended, low-opacity, texture-free material. Its visual appearance and sorting need game-camera review. Mist uses a second alpha material. Mesh draw counts exclude shadow/depth passes and transparency overdraw.
- Provisionally load LOD2 first, approach-switch to LOD1 at 150 m and return to LOD2 beyond 170 m. Keep LOD1 for active service/harvest and any interior view. LOD0 is manual recording/close inspection only. Thresholds await game acceptance.

## Measured exports

| Tier | Triangles | Mesh draws | Plain bytes |
| --- | ---: | ---: | ---: |
| LOD0 / detailed | 8,494 | 9 | 326,728 |
| LOD1 / game | 5,014 | 9 | 202,000 |
| LOD2 / static distance | 1,250 | 1 | 62,968 |

Game and distance satisfy landmark targets. Exact hashes, compressed sizes, bounds, socket transforms, node names and credits are in `manifest.json`. No FPS improvement is claimed.

## Source and review

Procedural source: `tools/asset-pipeline/greenhouse-shape.mjs`. Rebuild exports with `node tools/asset-pipeline/build-greenhouse.mjs`; validate with `node tools/asset-pipeline/validate-greenhouse.mjs`. Six plain/decoded exports are checked for glTF errors/warnings, hashes, budgets, geometry hygiene, names/hierarchy, bounds, socket parity and runtime motion. The moving socket, mist visibility, door symmetry and continuous loop are checked. See `validation-report.json`.

`source/blender/greenhouse.blend` is an editable review derivative imported from the detailed GLB, including non-exported lights, camera and review ground. Rebuild with `blender -b --python tools/blender/render_greenhouse.py`. Full-envelope and interior renders accompany the family; both were visually reviewed.

Viewer: `greenhouse/`. Tier/encoding selection, play/pause, 20-second timeline, reset, mist and glazing toggles, wireframe, unit/crops/top cameras and selected-export download. Distance mode disables unsupported controls. `node tools/asset-pipeline/test-greenhouse-viewer.mjs` verifies viewer state transitions and loading races with real model data and a mocked renderer; this is not a live WebGL/browser acceptance test.

Game Three.js r160/release gltfpack, live browser/mobile appearance and transparency, gameplay inventory/harvest hooks, LOD thresholds and reference-phone acceptance remain pending. Hand-off: the delivered commit hash plus `assets/greenhouse/`; pin authoritative files using their manifest SHA-256. Preserve originals and mark subsequent derivatives.
