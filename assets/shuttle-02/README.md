# SHUTTLE-02 / Industrial VTOL shuttle

Second shuttle in the series, based on the supplied 8 November industrial concept: a long armored spine, split nose channel, low control blister, layered side shields, exposed trunnions and two independently rotating thruster pods. An unchanged orbital station receives the same ventral interface used by SHUTTLE-01. The first shuttle and station exports remain unchanged.

Local viewer: http://127.0.0.1:8788/shuttle-02/

Public route after deployment: https://jelaludo.github.io/SentryTowers_A6/shuttle-02/

## Measured exports

Plain self-contained GLBs are authoritative. D0 only; damage levels are separate from LOD levels. There are no bitmap textures, external buffers or baked clips. The procedural source is the editable detailed master; reduced tiers and browser previews are derived.

| File | Role | Triangles | Draws | Materials | Plain bytes |
| --- | --- | ---: | ---: | ---: | ---: |
| `shuttle_02_d0_lod0.glb` | Detailed / recordings | 17,852 | 11 | 2 | 511,400 |
| `shuttle_02_d0_lod1.glb` | Articulated game unit | 8,372 | 11 | 2 | 256,560 |
| `shuttle_02_d0_lod2.glb` | Frozen hover / loading proxy | 2,693 | 1 | 1 | 120,108 |

These decoded counts also match unculled model-only browser rendering. Ground, station, plumes and shadow passes are excluded. Game meets the 25k articulated-unit triangle target; it exceeds the stricter stationary-landmark references of 8k triangles / 10 draws, and fits their 400 KB byte reference. Distance meets 3k / one draw / 250 KB. No FPS improvement is claimed. The two articulated materials are a shared vertex palette and dark canopy; distance combines both into one material.

## Placement and LOD contract

Metres, +Y up, +Z forward. `SHUTTLE_02_ROOT` is at the horizontal plot centre, on the stowed docking seal plane Y=0. Neutral hover bounds are 25.200 m wide × 42.000 m long × 7.650 m high. Reserve a 26 × 43 m plot in the neutral pose. The sampled engine-tilt envelope reaches Y=7.8203 m; deployed docking extends to Y=-1.2 m. Root movement, roll, flight clearance and exhaust are additional runtime reservations.

Names, local hierarchy, transforms, socket frames and neutral dimensions agree across tiers within 1 mm. Keep LOD1 for active flight or docking. LOD0 is for close shots and recordings. LOD2 is one frozen neutral-hover mesh with static lookup markers; those groups do not move its visible geometry. Use it for distant background, maps or loading, and switch before visible articulation. The 150 m approach / 170 m retreat metadata is provisional for static background traffic, not a measured performance threshold.

## Rotating engines

Call `poseShuttle(root, {tiltL, tiltR, extension, hatch, lock})` from `runtime.js`. Thruster values are degrees, clamped to 0–90; the other values are normalized 0–1. The adapter returns the effective clamped pose and updates matrices. It is self-contained and does not import the SHUTTLE-01 runtime.

| Driven node | Motion |
| --- | --- |
| `THRUSTER_L_TILT` | X rotation 0 to π/2, centre [-7.2, 4.5, 0] m |
| `THRUSTER_R_TILT` | X rotation 0 to π/2, centre [7.2, 4.5, 0] m |
| `DOCK_EXTEND` | Y from 0 to -1.2 m; keep authored Z=-2 m |
| `BELLY_HATCH_L`, `BELLY_HATCH_R` | X from 0 to -1.45 / +1.45 m; keep Y/Z |
| `CAPTURE_N`, `CAPTURE_E`, `CAPTURE_S`, `CAPTURE_W` | Z rotation from 0 to 0.55 rad in radial frames |

At 0° the exhaust points down (-Y). At 90° it points aft (-Z). Both complete nacelles turn, including their nozzles and exhaust sockets. Fixed braces and trunnion supports remain attached to the hull. Rear bridges sit above the exhaust path. The conservative rotation cylinders clear non-interface fixed geometry by at least 0.5081 m; designed axle/bearing contact within 1.38 m radius is excluded. The fully open docking assembly remains at least 2.690 m outside either pod's axial slab at every tilt angle. Exhaust centrelines clear the fixed hull for 9 m at every integer tilt degree; this is not a thermal or plume-volume certification.

## Shared underbelly interface

The collar has a 1.7 m seal radius, 1.2 m stroke and 2.5 m clear passage diameter. Two leaves slide apart above it; any nonzero hatch request holds the collar fully extended. Four capture latches retain independent pivots. The fixed bore and moving sleeve retain 40 mm nominal radial clearance and 130 mm overlap at full stroke. The two leaves meet at the centre seam and clear the opening when retracted. The inner bulkhead remains closed.

All socket local +Z axes point outward:

| Socket | Neutral position (m) | Outward normal |
| --- | --- | --- |
| `SOCKET_BELLY_DOCK` | [0, 0, -2] | -Y |
| `SOCKET_EXHAUST_L` | [-7.2, 0.28, 0] | -Y |
| `SOCKET_EXHAUST_R` | [7.2, 0.28, 0] | -Y |
| `SOCKET_NOSE` | [0, 2.07, 21] | +Z |
| `SOCKET_CENTRE_OF_MASS` | [0, 3.1, -1] | +Y |

Exhaust frames are children of their pod pivots and follow tilt. The centre-of-mass marker is an authored gameplay reference, not a density calculation.

The original orbital station's `SOCKET_DOCK_E` is [30.8, 15, 0], normal +X. Extend the collar fully and set the shuttle root to [32, 15, 2], Euler XYZ [0, 0, -π/2]. Its belly socket then exactly matches the port, with opposing normals. Thruster rotation does not alter that docking frame or obstruct the opened hatch. The station's GLBs remain byte-identical, including their sealed inner pressure cap. This is an external coupling and outer-airlock demonstration, not a walkable crew/cargo transfer.

## Named runtime sequences

Engine-driven pivots are not baked. State functions support deterministic seeking; placement adapters apply them to the loaded root.

| Sequence | Duration | State function / adapter |
| --- | ---: | --- |
| `Shuttle_VTOL_Transition_Cycle` | 24 s | `vtolState(t)` / `applyVTOL(root,t)` |
| `Shuttle_Orbital_Docking_Cycle` | 72 s | `dockingState(t)` / `applyDocking(root,t)` |

VTOL: 0–5 s lift, 5–11 transition to aft thrust, 11–15 cruise attitude, 15–21 return to vertical thrust, 21–24 settle into hover. The loop has matching position and tilt endpoints. The presentation demonstrates a 5 m lift and tilt conversion, with no force-based flight solver.

Docking revision 2 overlaps the arrival motions: forward approach runs 0–18 s, the 90° belly roll starts at 2 s and completes at 14 s, lateral closure runs 3–30 s, and the collar extends during 12–20 s. Quintic easing gives each arrival channel zero velocity and acceleration at its endpoints. The shuttle keeps moving through alignment instead of stopping to rotate; peak roll rate is about 14.06°/s. Chapters mark the dominant action, so their boundaries do not separate those overlapping motions.

The remaining sequence stays at 30–32 s capture, 32–35 open hatch, 35–42 hold, 42–45 close, 45–47 unlock, 47–54 retreat, 54–57 retract, 57–63 level and 63–72 depart. Thrusters are parked at 90° in the demonstration, but the mechanical interface is tested across independent left/right tilt combinations. Opening follows capture; closure precedes release. The final docking frame, VTOL cycle and all GLBs are unchanged from revision 1.

## Viewer and verification

The viewer offers manual independent thruster sliders, paired Hover/Cruise shortcuts, collar/hatch/latch controls, both animation sequences with independent durations and chapter menus, reversible scrubbing, pause/reset/loop, ½× / 1× / 2× speeds, three detail levels, camera presets/free orbit, wireframe, plumes, fullscreen, PNG capture and selected GLB downloads. Static tier motion controls are disabled. Shared navigation, the Workshop card and cross-links connect both shuttles and the station.

`validation.json` records zero glTF errors/warnings, finite nondegenerate geometry, unique dot-free names, frame/socket parity, bounds, budgets, aperture rays, 1,442 docking-cycle states, 722 independent docked tilt combinations, full swept-cylinder separation, exhaust direction/centreline checks and 482 VTOL states. Arrival regression checks cover continuous forward/lateral travel, an early rolling approach and velocity/acceleration continuity at all arrival joins. During mating the socket error is zero. Non-coupling shuttle meshes stay at least 1.440 m beyond the station's X bounding plane during the standard cycle. Contact interfaces are excluded from that check; general structural/thermal/flight certification is not claimed.

`viewer-validation.json` records desktop/mobile checks and actual model render counts. `preview.png` and `previews/` are derived captures, including hover, cruise, engine transition, open hatch, station coupling and mobile layout.

```sh
node tools/asset-pipeline/build-shuttle-02.mjs
node tools/asset-pipeline/validate-shuttle-02.mjs
node tools/asset-pipeline/test-shuttle-02-viewer.mjs
python3 tools/build-workshop-docs.py
```

Authoring sources are `tools/asset-pipeline/shuttle-02-shape.mjs` and `shuttle-docking-kit.mjs`. The browser test accepts `PLAYWRIGHT_MODULE`, `CHROMIUM_EXECUTABLE` and `SHUTTLE02_URL`. Builds reuse the pinned concept hash if the local reference image is unavailable. No upstream compressed copies are included; the consuming game owns gltfpack release packing and decoded r160 validation.

Hand-off: this change's Git commit plus `assets/shuttle-02/`, with the unchanged station folder for the optional docking demo. Pending: visual acceptance, further shuttle designs, crew/cargo interiors, game flight/navigation/collision, damage states D1–D3, release decode acceptance and reference-device/game-camera profiling. This adds no compliance claim about older assets.

Models by jelaludo. The supplied concept path/hash and rights limits are in `reference-provenance.json`. No third-party mesh, animation or texture was incorporated. Original SHUTTLE-01 and Space Elevator files are preserved.
