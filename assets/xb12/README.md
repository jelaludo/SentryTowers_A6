# XB-12 / Terrain Scout

Separate four-wheel D0 design prototype based on the R-47X visual language. The original R-47X model, generator, exports and runtime are unchanged. XB-12 uses its own source, namespaced root, exports, viewer and articulation adapter.

## Design and controls

Four independent lateral swing arms with chassis-fixed upper damper mounts and sliding piston rods. Wheel steering and spin are separate transforms. The sensor sphere is a truncated octahedron with eight hexagonal faces and six square faces: four lower radar panels, two upper-front camera apertures and an upper-rear lidar aperture, all integrated into hexagonal faces without round lenses or a top cap. Its yaw and pitch are independent of the chassis. The sensors are visual representations; this prototype does not simulate sensing.

Open `/xb12/` for play/pause, a four-second timeline, articulation/landing/manual modes, common compression plus four independent offsets, ±30° front steering, sensor yaw, wireframe, damper mount markers, three camera views, LOD and plain/Meshopt selection. The floor is lowered in the suspension test stand to show full droop. Wheel contact, vehicle forces and driving are not simulated.

## Measured exports

| Tier | Triangles | Mesh draws | Materials | Plain bytes | Derived Meshopt bytes |
| --- | ---: | ---: | ---: | ---: | ---: |
| LOD0 detailed master | 10,604 | 19 | 1 | 600,076 | 125,172 |
| LOD1 game prototype | 5,868 | 19 | 1 | 365,252 | 86,240 |
| LOD2 static distance | 2,268 | 1 | 1 | 130,168 | 43,456 |

Counts describe asset mesh submissions, excluding viewer ground, overlays and lighting. No FPS claim. LOD1 is under the collaboration contract's 25k-triangle unit target. LOD2 is an optional static map/loading representation, not an animated gameplay replacement. Use LOD1 before motion is readable; no automatic distance threshold has been certified. LOD0 adds armor fasteners, wheel bolts, denser split tread blocks, protective rails, antennas, vents and higher radial detail for close views. The revised muted olive-gray body uses connected armored wheel shoulders, layered maintenance panels, guarded lamps and recovery fittings.

## Runtime contract

Metres, +Y up, +Z forward, root at the ground-centred plot origin; reserve a 4 × 4 m plot. `-X` is left and `+X` right in rover coordinates. Nominal hubs are X ±1.20 m, Y 0.50 m, Z ±1.18 m. Swing arms are 0.70 m long. Positive compression moves the hub upward: range −0.12 to +0.14 m. This intentionally uses an explicit compression sign rather than the R-47X's old travel sign. Steering is parallel front-wheel steering, not an Ackermann solver.

Import `applyXB12` from `runtime.js` and call it with the loaded scene and `{compression:{FL,FR,RL,RR}, steerDeg, spinRad, sensorYaw, sensorPitch}`. Compression is in metres, steering in degrees, the other angles in radians. Sensor pitch clamps to ±0.25 rad. The game should supply solved physics state; `demoPose(time, mode, bias)` is an art-directed preview helper. Do not stack its oscillations on game physics. Pass finite numeric inputs. The loaded scene must carry `userData.static=true` for LOD2, as the viewer does using the manifest.

Per-wheel hierarchy: `SUSP_PIVOT_*` → `UPRIGHT_*` → `WHEEL_STEER_*` → `WHEEL_SPIN_*` → `WHEEL_*`. The upright inherits swing-arm camber; it is not a double-wishbone or compensated upright. `SOCKET_DAMPER_UPPER_*` stays chassis-fixed, `SOCKET_DAMPER_LOWER_*` follows the arm, `DAMPER_AIM_*` aims at it and `DAMPER_ROD_*` slides to the lower endpoint. Barrel and rod are each 0.44 m long. Sampled damper lengths are 0.605–0.762 m, retaining at least 0.118 m overlap. Engine-facing names and rest sockets match across tiers. LOD2 names are lookup-only: its mesh cannot articulate.

`SENSOR_YAW`, `SENSOR_PITCH`, `SOCKET_CAMERA_L/R`, four `SOCKET_RADAR_*`, `SOCKET_LIDAR` and `SOCKET_PAYLOAD` provide integration points. Socket positions and parents are recorded in `manifest.json`. This revision relocates camera and lidar sockets into the hexagonal faces; radar sockets also follow the revised flush faces. Socket names are preserved, but consumers must refresh their pinned manifest. The shallow peaked hull revision raises the sensor assembly by 0.24 m and moves the payload socket onto the new rear deck at Y 1.31 m. Suspension rest positions are unchanged. No production clips are baked (`clips: []`); the preview articulation and landing cycles each last four seconds.

## Sources and validation

- Procedural authoring source: `tools/asset-pipeline/xb12-shape.mjs`.
- Build: `node tools/asset-pipeline/build-xb12.mjs`.
- Validate: `node tools/asset-pipeline/validate-xb12.mjs`.
- Editable derived Blender review assembly: `source/blender/xb12.blend`; regenerate with `tools/blender/render_xb12.py`. This includes review lights, camera and ground, and is not the source of truth.
- Plain GLBs are source-of-truth exports. `derived/meshopt/` files are optional compressed derivatives. Game release compression remains game-owned.

The validation report covers all three plain and three decoded Meshopt files, zero glTF errors/warnings, no degenerate triangles, hashes, triangle/draw counts, stable dot-free names, socket parity, and 60 sampled travel/steering poses across articulated exports. Samples check finite transforms, positive-compression hub movement, upper/lower attachment and piston overlap. Desktop Safari checks cover visible animation, pause, camera views and export/tier selection. The Blender preview was visually inspected.

Pending: continuous tire/fender/chassis clearance certification, game physics/contact and independent wheel speeds, full radar/lidar coverage assessment, D1–D3 and localized damage, mobile/game-camera profiling and consuming-game acceptance. D0 is the only authored damage state; do not inherit R-47X damage mappings. This is an animated design prototype, not a claim of production physics readiness.

Hand-off: use the commit containing this folder together with `assets/xb12/`; pin that commit and the hashes in `manifest.json`. Credit: Models by jelaludo.

The original XB-12 prototype is preserved in commit `64f1612eaa1d444dab0638c8d287c112f66d6f1d`. The rugged revision follows the two user-supplied R-47X orthographic references for visual character, not their inconsistent dimension annotations.

Hull profile: a shallow longitudinal peak at Y 1.48 m, Z 0, sloping toward the front and rear at approximately 16.7°. Wheel shoulders slope outward toward the ends at approximately 12.4°. Deck panels and rails follow these slopes. The prior armor revision is preserved in commit `55823e0`.
