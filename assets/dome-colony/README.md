# Planetary dome colony / First scale blockout

Two 28 m shell domes (biosphere and fabrication) and one elevated 20 m hallway span. This is a D0 scale study, not a finished production family. Original assets and the received collaboration contract are unchanged. The procedural source is `tools/asset-pipeline/dome-colony-shape.mjs`; LOD0 is the detailed blockout master. `source/blender/dome-colony-blockout.blend` is the editable assembled review scene, derived from these GLBs and the unchanged canonical unit references; rebuild it with `tools/blender/render_dome_colony.py`. The viewer is at `../../dome-colony/`.

## Placement and connections

Metres, +Y up, +Z forward, origin at ground/plot centre. Place biosphere at (-24, 0, 0), fabrication at (24, 0, 0), bridge at (0, 0, 0). Each dome reserves 30 × 30 m; the bridge reserves 22 × 4.4 m including support feet. These are flat-datum reservations, not certified spherical game plots.

Dome link sockets E/W/N/S are 14 m from centre at y=9.7 m. Bridge end sockets are x=±10 m, y=9.7 m. Socket local +Z points out of the port. The bridge's outward socket normals oppose the connected dome normals. In LOD0/1 hide `PORT_CAP_E` on the biosphere and `PORT_CAP_W` on fabrication for this assembly. Other caps remain closed. Hallway and mezzanine walking surfaces are at y=7.9 m. The central core represents a future lift; no lift motion is authored.

Bridge underside is y=7.5 m. Support columns leave 19 m clear above their 0.3 m-high feet; the feet leave 18 m clear. Vehicle driving follows world +Z through x=0. No terrain following or collision solver is included. Four box sleeves establish connection envelopes; pressure seals, airlocks, articulated/telescopic joints and final shell transitions remain unmodelled.

Every dome has `SOCKET_SENTRY_00` at (0, 13.78, 0), with local +Z directed along building +Y. This normal convention is for socket lookup; upright +Y-up sentry placement uses the building rotation, not the socket quaternion directly. The roof platform radius is 4.5 m. The viewer places the canonical Railgun T3 at this position on fabrication; the biosphere platform stays empty. The core supports the platform down to the foundation. Sentry and MÖRK are separate existing assets, excluded from these exports and measurements.

## Tiers and runtime

| Module | Tier | Triangles | Draws | Plain bytes |
| --- | --- | ---: | ---: | ---: |
| Biosphere | LOD0 | 11,576 | 6 | 625,220 |
| Biosphere | LOD1 | 5,992 | 6 | 337,108 |
| Biosphere | LOD2 | 1,936 | 1 | 93,812 |
| Fabrication | LOD0 | 10,296 | 6 | 479,080 |
| Fabrication | LOD1 | 5,352 | 6 | 263,932 |
| Fabrication | LOD2 | 1,936 | 1 | 93,812 |
| Bridge | LOD0 | 1,428 | 2 | 68,632 |
| Bridge | LOD1 | 756 | 2 | 39,240 |
| Bridge | LOD2 | 740 | 1 | 36,800 |

All building tiers are static with zero clips. LOD0/1 retain separate `SHELL` and `PORT_CAP_*` meshes for inspection. Opaque fabrication retains simple workbench blockouts for the cutaway review; remove unseen interiors from a finalized opaque runtime variant. Shell appearance controls are viewer material overrides, not additional GLB variants. LOD2 merges opaque exterior geometry into one mesh/material and omits interiors and cap meshes; semantic names remain lookup-only empties. Its open port silhouettes are deliberate simplifications; use LOD1 before a close port inspection. Do not hide shells or caps on LOD2.

The suggested 150 m approach / 20 m hysteresis threshold follows the library convention and remains provisional. All LOD1/2 landmark budget targets pass. Values count exported primitives, not renderer-specific transparency passes. No FPS measurement or claim. Plain GLB is the source of truth. No compressed derivative is supplied; release compression and decoded validation remain game-owned.

## Clearance evidence and limits

`validation-report.json` records geometry/hash/budget checks and conservative transformed-mesh AABB sampling of canonical low-poly D0 MÖRK. At 0.55 m nominal hover with level gun: top 3.566 m, headroom 3.934 m. Across yaw −180° to +180° and pitch −5° to +25°, both sampled every 5°: maximum top 6.595 m, minimum headroom 0.905 m, minimum side margin to columns 0.809 m. This is a sampled broad-phase envelope, not continuous collision certification. Earlier 6 m/15 m concept targets failed this sweep and were superseded by 7.5 m/19 m.

Railgun T3 LOD1, level gun and rest recoil, sampled every 5° yaw: swept radius 3.120 m, leaving 1.380 m to the platform edge. Other weapons, elevation, recoil animation, neighboring sightlines and placement of larger sentries remain pending.

Power-on overshoot, suspension/recoil motion, tank hull pitch/roll, uneven terrain, curvature and side approaches are not certified. Spherical placement must align each root with local radial up and resolve actual adjacent socket transforms; reject spans whose slopes, lengths or swept ground clearance fail. This blockout does not add gameplay code to Stalheart.

## Viewer and rebuild

Controls: LOD0/1/2, native/clear/opaque/cutaway shells, tank crossing play/pause and position, tank gun pitch and turret yaw, sentry yaw and visibility, envelope guides, wireframe, four camera presets and per-module GLB downloads. Tank translation is a viewer demonstration at 3 m/s and is not an exported clip. Existing aiming pivots are driven directly; no unit animation was baked.

```sh
node tools/asset-pipeline/build-dome-colony.mjs
node tools/asset-pipeline/validate-dome-colony.mjs
python3 tools/build-workshop-docs.py
```

Validation checks all nine plain files, hashes, bytes, triangle/draw counts, budgets, zero glTF errors/warnings, degenerate triangles, unique dot-free names, required nodes, socket transforms, cross-tier socket/bounds parity, zero building clips, sampled tank and sentry envelopes. Desktop Safari review covers rendering, crossing play/pause, aiming, LOD switching, disabled distance-tier shell controls and detailed cutaway inspection. The Blender preview was inspected. Mobile and in-game review remain pending.

Future work: art refinement, role-specific machinery, bridge seals and articulating modules, terrain/planet integration, D1–D3 damage states, construction animations, broader sentry compatibility and game-camera/reference-device profiling. Hand off this folder with the containing Git commit; generated GLBs are reproducible from the authored builder. Credit: Models by jelaludo.
