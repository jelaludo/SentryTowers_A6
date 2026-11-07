# Space elevator / Surface + orbit

Models by jelaludo. Original procedural geometry guided by the supplied 7 November concept. Plain GLBs are authoritative; editable authoring is in `tools/asset-pipeline/space-elevator-shape.mjs`. The reference image is preserved in its original location; its hash and rights limits are in `reference-provenance.json`. No external textures or buffers. No compressed upstream copies were generated.

## Modules and scale

- `surface`: 60 × 60 m plot, 54 m tall. Interprets “about four small domes” as four standard 30 m Dome City plots in a 2×2 arrangement. Seven splayed ribs, tapered tether tower, service galleries, observation room, utilities and exactly one vehicle hangar with two sliding leaves.
- `orbital`: 61.76 × 72.40 m horizontal envelope, 32 m high in its rest pose. Annular pressure deck, eight trussed spokes, central hub, two sealed docking arms, four service vessels, two solar wings, a dish and fixed antennas. These are docking ports, not additional vehicle hangars.
- `climber`: 5.02 × 8 × 8.40 m envelope. A four-roller traction cage with an offset cabin and service cover. Shared by both station views.

Metres, +Y up, +Z forward. Surface origin: ground at plot centre. Orbital origin: centre of the lower tether collar at Y=0; this is an assembly datum because the orbital module has no ground. Climber origin: bottom of the traction cage on the tether axis. These frames and all lookup nodes are stable across tiers. Orbital plot reservation is 64 × 74 m; climber is 6 × 9 m. Check solar sweep clearance when placing other modules.

The bay clear volume is X −5.5…5.5, Y 0.54…6.4, Z 7.15…25.15 m. The floor is Y=0.54 m. The optional unmodified MÖRK is placed at `[0,0.54,14]` and fits with measured minimum margins of 2.590 m at either side, 2.844 m overhead, 2.224 m behind and 2.509 m in front. The reference vehicle and four full-scale dome instances are viewer-only and are not included in elevator GLBs.

## Runtime

Import `poseElevator` from `runtime.js`, pass the named module root, and update engine-driven nodes in LOD0 or LOD1. There are no baked clips. The viewer's procedural `Climber_Shuttle_Cycle` lasts 24 seconds and oscillates over 27 m at each station; this demonstrates local traction and docking, not actual orbital travel speed or altitude.

- Surface `HANGAR_DOOR_L/R`: initial X −2.75 / +2.75 m; translate outward by up to 5.65 m using `door: 0…1`. Both fully open leaves clear the single 11 m opening.
- Surface/orbital `DISH_YAW`: local Y angle via `dish` in degrees. `DISH_PITCH` retains its authored 0.55 rad tilt.
- Orbital `SOLAR_A_HINGE` and `SOLAR_B_HINGE`: local X angle via `solar`, clamped to ±35°. The sampled sweep clears the ring's outer radius.
- Climber `ROLLER_L_LOW`, `ROLLER_L_HIGH`, `ROLLER_R_LOW`, `ROLLER_R_HIGH`: local Z rotation derived from travel `distance` in metres and 0.5 m roller radius. Left/right sides counter-rotate. Contact planes are X ±0.55 m; viewer rails have their outer faces there. The cage clear frame is 2.8 m wide × 1.8 m deep.
- `CLIMBER_HATCH` is a service cover with 3.1 m vertical travel when the climber adapter receives `door: 1`. The cabin is a closed exterior shell; no accessible cargo interior is claimed. The viewer keeps this cover closed.

All sockets are recorded with world position and quaternion in `manifest.json`; local +Z is the connection normal. Place the climber root at orbital `[0,-8.2,0]` to align its `SOCKET_DOCK` with the orbital `SOCKET_TETHER_LOWER`, with the body below the collar. `SOCKET_CLIMBER_DOCK` identifies this root placement. The surface local demo starts at `SOCKET_CLIMBER_DEPART`, above the tower. Ground-to-cabin loading and interior transfer mechanisms remain game-integration work.

## Tiers and measurements

LOD0 is the detailed close-shot/recording master. LOD1 reduces radial subdivisions and tiny details, then simplifies while retaining moving parts. LOD2 freezes the closed/rest pose into one mesh/material; same-name marker nodes retain lookup transforms but **must not animate**. Switch to LOD1 before any visible mechanism motion. Suggested provisional distance thresholds: game below 150 m, return to static beyond 170 m; adjust for the actual game camera.

| Module | Tier | Triangles | Draws | Plain bytes |
| --- | --- | ---: | ---: | ---: |
| surface | LOD0 | 12,236 | 4 | 524,824 |
| surface | LOD1 | 6,128 | 4 | 261,076 |
| surface | LOD2 | 2,700 | 1 | 98,008 |
| orbital | LOD0 | 16,628 | 4 | 702,572 |
| orbital | LOD1 | 7,100 | 4 | 275,012 |
| orbital | LOD2 | 2,700 | 1 | 98,956 |
| climber | LOD0 | 1,760 | 6 | 50,360 |
| climber | LOD1 | 992 | 6 | 33,560 |
| climber | LOD2 | 600 | 1 | 34,360 |

Each module uses one palette material and vertex colours. Every game module meets the landmark targets of 8k triangles, 10 draws and 400 KB; every distance module meets 3k, one draw and 250 KB. The small climber's static file is slightly larger than its instanced game file, despite fewer triangles/draws; no transfer-size or FPS improvement is claimed. Counts exclude optional reference vehicles, domes, viewer tethers, ground and shadow passes.

LOD1/LOD2 and browser previews are derived. Only D0 is authored; D1–D3 are not interchangeable with LOD numbers. The received collaboration document is unchanged.

A separate 112-second connected-city journey is available at `elevator-city-diorama/`, with KORP, SOL-82 and SOL-88. It composes these unchanged GLBs; see `assets/elevator-city-diorama/README.md`.

## Viewer and checks

Open `space-elevator/` for paired independent station views or single-module inspection. Controls include four camera presets/free orbit, all three tiers, hangar doors, solar tilt, dish heading, local climber playback/scrubbing, four-dome comparison, MÖRK toggle, tether toggle, wireframe, image capture, fullscreen and per-module GLB downloads. The split views do not share an altitude scale. Tethers are viewer geometry, intentionally extended beyond the composition.

Build and validate from repository root:

```sh
node tools/asset-pipeline/build-space-elevator.mjs
node tools/asset-pipeline/validate-space-elevator.mjs
python3 tools/build-workshop-docs.py
```

`validation.json` records nine decoded exports, zero glTF errors/warnings, geometry finiteness/nondegeneracy, hash and byte checks, unique dot-free names, parent/TRS/socket parity, exact tier envelopes, all tier budgets, 98 sampled mechanism states, vehicle containment, solar sweep and climber docking. `viewer-validation.json` records actual model-only render counts and desktop/mobile UI checks. These do not certify structural loads, tether engineering, collision physics, orbital operations or game readiness. Production collision, interiors, transfer logic, damage, consuming Three r160/release gltfpack validation and reference-phone/game-camera measurements remain pending.

Hand-off: pin the commit containing this README and `assets/space-elevator/`, then verify the file SHA-256 values in the manifest. Original Dome City and MÖRK sources are preserved and pinned separately as viewer-only dependencies.
