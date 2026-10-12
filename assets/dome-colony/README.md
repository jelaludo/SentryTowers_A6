# Planetary dome colony / Elevated defense study

Six 28 m shell dome roles (biosphere, fabrication, habitat, research, power and logistics), plus elevated 20 m and 52 m hallway spans. The original two-dome viewer remains a clearance study; the expanded city is at `../../dome-city/`. This is a D0 scale study, not a finished production family. Original assets and the received collaboration contract are unchanged. The procedural source is `tools/asset-pipeline/dome-colony-shape.mjs`; LOD0 is the detailed blockout master. `source/blender/dome-colony-blockout.blend` is the editable assembled review scene, derived from these GLBs and the unchanged canonical unit references; rebuild it with `tools/blender/render_dome_colony.py`. The viewer is at `../../dome-colony/`.

## Placement and connections

Metres, +Y up, +Z forward, origin at ground/plot centre. Place biosphere at (-24, 0, 0), fabrication at (24, 0, 0), bridge at (0, 0, 0). Each dome reserves 30 × 30 m; the bridge reserves 22 × 4.4 m including support feet. These are flat-datum reservations, not certified spherical game plots.

Dome link sockets E/W/N/S are 14 m from centre at y=9.7 m. Bridge end sockets are x=±10 m, y=9.7 m. Socket local +Z points out of the port. The bridge's outward socket normals oppose the connected dome normals. In LOD0/1 hide `PORT_CAP_E` on the biosphere and `PORT_CAP_W` on fabrication for this assembly. Other caps remain closed. Hallway and mezzanine walking surfaces are at y=7.9 m. The central core represents a future lift; no lift motion is authored.

Bridge underside is y=7.5 m. Support columns leave 19 m clear above their 0.3 m-high feet; the feet leave 18 m clear. Vehicle driving follows world +Z through x=0. No terrain following or collision solver is included. Four box sleeves establish connection envelopes; pressure seals, airlocks, articulated/telescopic joints and final shell transitions remain unmodelled.

Every dome now carries a thin 4.4 m-diameter, 0.18 m-thick platform at y=32 m, on a 1.3 m-diameter mast. This replaces the original broad pad at y=13.78 m (preserved in commit `e52f1ffcb646683a5ab2fdc5150137fcc7eef8e9`). A yawing fork lifts a tilting cradle another 3.6 m; `SOCKET_SENTRY_00` is at (0, 35.6, 0) in the parked pose. Its local +Z socket-normal convention still points along local +Y at rest. The cradle supports the complete canonical Railgun T3 without altering its asset or internal pivots. The biosphere mount remains empty in the viewer.

Drive `MOUNT_YAW.rotation.y` for bearing and positive `CRADLE_PITCH.rotation.x` for depression (0–70 degrees). Attach the sentry ROOT directly to `CRADLE_PITCH`, with zero local translation and rotation; do not apply the socket quaternion to an upright +Y-up asset. Keep the sentry's internal YAW/PITCH at zero for this mounting mode. The whole sentry and its support tray tilt together, avoiding the original broad-pad obstruction. Use `defense.js` as the pose/trace adapter. No aiming motion is baked into clips. The bridge is static at every tier.

## Tiers and runtime

Measurements exclude the separately composed canonical MÖRK and Railgun references.

| Module | Tier | Triangles | Draws | Plain bytes |
| --- | --- | ---: | ---: | ---: |
| Biosphere | LOD0 | 12,184 | 8 | 665,996 |
| Biosphere | LOD1 | 6,344 | 8 | 362,524 |
| Biosphere | LOD2 | 2,192 | 1 | 110,316 |
| Fabrication | LOD0 | 10,904 | 8 | 519,864 |
| Fabrication | LOD1 | 5,704 | 8 | 289,352 |
| Fabrication | LOD2 | 2,192 | 1 | 110,316 |
| Bridge | LOD0 | 1,428 | 2 | 68,632 |
| Bridge | LOD1 | 756 | 2 | 39,240 |
| Bridge | LOD2 | 740 | 1 | 36,800 |
| habitat | LOD0 | 11,496 | 8 | 557,108 |
| habitat | LOD1 | 5,880 | 8 | 298,756 |
| habitat | LOD2 | 2,304 | 1 | 116,820 |
| research | LOD0 | 11,816 | 8 | 551,252 |
| research | LOD1 | 6,232 | 8 | 304,036 |
| research | LOD2 | 2,304 | 1 | 116,820 |
| power | LOD0 | 11,768 | 8 | 560,248 |
| power | LOD1 | 6,248 | 8 | 309,384 |
| power | LOD2 | 2,304 | 1 | 116,816 |
| logistics | LOD0 | 11,496 | 8 | 556,892 |
| logistics | LOD1 | 6,168 | 8 | 321,004 |
| logistics | LOD2 | 2,304 | 1 | 116,820 |
| bridge_long | LOD0 | 1,988 | 2 | 94,032 |
| bridge_long | LOD1 | 1,060 | 2 | 53,892 |
| bridge_long | LOD2 | 1,044 | 1 | 51,448 |

Habitat contains apartment pods, research contains sample vessels and consoles, power contains accumulator/cooling banks, and logistics contains cargo racks. Habitat and research default to clear shells; power and logistics default to opaque. The new roles share the existing 30 × 30 m plot, four connection sockets and elevated sentry mount. The long bridge reserves 54 × 4.4 m including feet; end sockets are x=±26 m, y=9.7 m, with support columns at x=−26, −10, 10, 26 m.

All exports have zero baked clips. Dome LOD0/1 mounts have engine-driven yaw and depression pivots. LOD0/1 retain separate `SHELL` and `PORT_CAP_*` meshes for inspection. Opaque fabrication retains simple workbench blockouts for the cutaway review; remove unseen interiors from a finalized opaque runtime variant. Shell appearance controls are viewer material overrides, not additional GLB variants. LOD2 merges opaque exterior geometry into one mesh/material and omits interiors and cap meshes; semantic names remain lookup-only empties. Its open port silhouettes are deliberate simplifications; use LOD1 before a close port inspection. Do not hide shells/caps or drive mount pivots on LOD2. The viewer parks the mount and disables firing-angle controls on that tier.

The suggested 150 m approach / 20 m hysteresis threshold follows the library convention and remains provisional. All LOD1/2 landmark budget targets pass. Values count exported primitives, not renderer-specific transparency passes. No FPS measurement or claim. Plain GLB is the source of truth. No compressed derivative is supplied; release compression and decoded validation remain game-owned.

## Clearance evidence and limits

`validation-report.json` records geometry/hash/budget checks and conservative transformed-mesh AABB sampling of canonical low-poly D0 MÖRK. At 0.55 m nominal hover with level gun: top 3.566 m, headroom 3.934 m. Across yaw −180° to +180° and pitch −5° to +25°, both sampled every 5°: maximum top 6.595 m, minimum headroom 0.905 m, minimum side margin to columns 0.809 m. This is a sampled broad-phase envelope, not continuous collision certification. Earlier 6 m/15 m concept targets failed this sweep and were superseded by 7.5 m/19 m.

### Downward firing measurements

`defense-report.json` measures the revised assembly using the actual LOD0 building triangles and canonical Railgun T3 LOD1 muzzle. Transparent and visually hidden cutaway shells remain solid obstructions. Each shot checks nine parallel rays sampling a 0.10 m projectile radius, from the muzzle to flat ground. Yaw is sampled every 5 degrees; depression every 0.25 degrees over 35–70 degrees. Exact target-ring depressions use a binary solve. This is a sampled straight-shot envelope, not continuous swept-volume or ballistic certification.

| Direction / target | Downward angle | Ground distance outside 14.6 m foundation | Result |
| --- | ---: | ---: | --- |
| Open diagonal, yaw 45 degrees | 68.00 degrees | 0.894 m | Nearest clear sampled shot; 68.25 degrees is blocked |
| Hallway entrance, yaw 0 degrees | 61.00 degrees | 6.311 m | Nearest clear sampled shot; 61.25 degrees is blocked |
| Target ring, radius 16 m | 67.311 degrees | 1.4 m | Clear on 52/72 sampled bearings (72.2%) |
| Target ring, radius 22 m | 59.695 degrees | 7.4 m | Clear on 69/72 sampled bearings (95.8%) |
| Toward bridge/neighbour, yaw 270 degrees | 35–70 degrees | Varies | Every sampled shot blocked |

Angles are measured below horizontal. Yaw 0 faces +Z; yaw 90 faces +X; the other dome is at yaw 270 from the fabrication mount. The report contains disjoint clear-angle bands at every bearing: a single maximum angle is NOT a general fire permission. Near the other dome, obstruction can also occur at shallower angles. The amber viewer boundary joins nearest-clear samples only where they exist; it does not assert that everything beyond it is visible.

For this canonical muzzle offset, ground radius is `R = (35.6 cos(d) + 1.03) / sin(d)` metres, with depression `d`; the 3.12 m barrel length cancels because the ground intercept lies on its axis. Triangles decide whether that line is actually clear. Live green/red guides and the collision marker are recalculated per pose. A game integration must require a fresh `firingTrace(...).clear === true` before firing, include its current world collision geometry, and add its weapon/target rules. The viewer shows an eligibility result; it does not shoot or modify Stalheart's firing logic.

The complete gun and tilting tray stay at least 0.950 m vertically above the highest deck marking across the sampled 0–70 degree range. Fork shaft inner faces leave 0.04 m lateral tray clearance; bearing collars intentionally meet the tray at the hinge. No structural-load calculation is claimed. Steep firing is supplied by the new external cradle, not a newly claimed capability of the stock Railgun's internal elevation mount.

Raising the platform cannot remove the shadows underneath elevated hallway entrances or the bridge. Immediate foundation contact (the 15 m target ring) remains blocked at every sampled bearing. Protecting those remaining areas requires complementary perimeter/crossfire placements; this study does not claim full base coverage.

Power-on overshoot, suspension/recoil motion, tank hull pitch/roll, uneven terrain, curvature and side approaches are not certified. Spherical placement must align each root with local radial up and resolve actual adjacent socket transforms; reject spans whose slopes, lengths or swept ground clearance fail. This blockout does not add gameplay code to Stalheart.

## Viewer and rebuild

Controls: LOD0/1/2, native/clear/opaque/cutaway shells, tank crossing play/pause and position, tank gun pitch and turret yaw, sentry bearing/depression and visibility, live firing path/collision point and sampled ground boundary, envelope guides, wireframe, four camera presets and per-module GLB downloads. Tank translation is a viewer demonstration at 3 m/s and is not an exported clip. Existing aiming pivots are driven directly; no unit animation was baked.

```sh
node tools/asset-pipeline/build-dome-colony.mjs
node tools/asset-pipeline/measure-dome-defense.mjs
node tools/asset-pipeline/test-dome-defense.mjs
node tools/asset-pipeline/validate-dome-colony.mjs
python3 tools/build-workshop-docs.py
```

Validation checks all 24 plain files, hashes, bytes, triangle/draw counts, budgets, zero glTF errors/warnings, degenerate triangles, unique dot-free names, required nodes, socket transforms, cross-tier socket/bounds parity, zero baked building clips, sampled tank envelopes, stale defense-report hashes, all-tier mount/socket transforms, clear/blocked firing regressions, solid cutaway shells and mechanical deck clearance. Desktop Safari review covers rendering, crossing play/pause, aiming, LOD switching, disabled distance-tier shell controls and detailed cutaway inspection. The Blender preview was inspected. Mobile and in-game review remain pending.

Future work: art refinement, role-specific machinery, bridge seals and articulating modules, terrain/planet integration, D1–D3 damage states, construction animations, broader sentry compatibility and game-camera/reference-device profiling. Hand off this folder with the containing Git commit; generated GLBs are reproducible from the authored builder. Credit: Models by jelaludo.
