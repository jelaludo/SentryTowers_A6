# SHUTTLE-01 / Orbital lifting body

First shuttle in the series: a continuous ivory swept hull, long pointed nose, narrow dark canopy, paired recessed engines and a working underbelly docking mechanism. Original procedural geometry follows the user-supplied 8 November concept. The separate docking demonstration uses the existing Space Elevator orbital terminal at its original scale.

Local viewer: http://127.0.0.1:8788/shuttle-01/

Public route after deployment: https://jelaludo.github.io/SentryTowers_A6/shuttle-01/

## Measured exports

Plain GLBs are authoritative and self-contained. D0 only; damage states are separate from detail tiers. No bitmap textures, external buffers or baked animation clips. `manifest.json` records exact bounds, hashes, names, sockets and runtime metadata. Counts below are decoded model triangles and primitive draws, also verified with unculled model-only browser rendering; scenery, plumes and shadows are separate.

| File | Role | Triangles | Draws | Materials | Plain bytes |
| --- | --- | ---: | ---: | ---: | ---: |
| `shuttle_01_d0_lod0.glb` | Detailed recording master | 38,194 | 11 | 2 | 876,244 |
| `shuttle_01_d0_lod1.glb` | Articulated game unit | 9,282 | 11 | 2 | 233,396 |
| `shuttle_01_d0_lod2.glb` | Derived frozen cruise / loading proxy | 2,681 | 1 | 1 | 93,604 |

The game tier meets the 25k articulated-unit triangle target. It exceeds the stricter stationary-landmark references of 8k triangles and 10 draws; its bytes fit the 400 KB reference. The distance tier meets 3k / one draw / 250 KB. No FPS improvement is claimed. Materials use vertex colours, with a separate dark reflective canopy in the articulated tiers. The distance tier folds the canopy into the shared palette.

## Coordinate and placement contract

Metres, +Y up, +Z forward; `SHUTTLE_01_ROOT` is at the horizontal plot centre on the stowed seal's Y=0 datum. The closed envelope is 23.600 m wide × 37.205 m long × approximately 3.874 m high. Reserve a 24 × 38 m plot in the stowed pose; flight, docking roll and plume clearance are additional runtime reservations. The deployed collar extends down to Y=-1.2 m. Tessellation changes the maximum height by 0.115 mm; all tier bounds agree within 1 mm, and named local frames are identical.

Socket local +Z points outward. The dock socket is a child of `DOCK_EXTEND`, so its frame follows extension. A static LOD2 retains all lookup names and original local transforms, but its visible geometry is one merged stowed mesh. Do not articulate its lookup groups.

| Socket | Stowed position (m) | Outward normal |
| --- | --- | --- |
| `SOCKET_BELLY_DOCK` | [0, 0, -5.3975] | -Y |
| `SOCKET_EXHAUST_L` | [-3, 2, -18.6175] | -Z |
| `SOCKET_EXHAUST_R` | [3, 2, -18.6175] | -Z |
| `SOCKET_NOSE` | [0, 1.18, 18.6025] | +Z |
| `SOCKET_CENTRE_OF_MASS` | [0, 1.7, -3.3975] | +Y |

The centre-of-mass marker is an authored gameplay reference, not a density-derived mass calculation. Exhaust markers are just beyond the nozzle exit; viewer plumes are separate effects, not GLB geometry.

## Engine-driven articulation

Import `poseShuttle(root, controls)` from `runtime.js` after finding `SHUTTLE_01_ROOT` in the loaded scene. Pass normalized `extension`, `hatch`, `lock` values and a `gimbal` angle in degrees. No mixer is required. It returns the clamped effective pose and updates matrices. A requested nonzero hatch opening forces full collar extension.

| Driven node | Local motion |
| --- | --- |
| `DOCK_EXTEND` | Y from 0 to -1.2 m; keep authored Z |
| `BELLY_HATCH_L`, `BELLY_HATCH_R` | X from 0 to -1.45 / +1.45 m; keep Y/Z |
| `CAPTURE_N`, `CAPTURE_E`, `CAPTURE_S`, `CAPTURE_W` | Z rotation 0 to 0.55 rad inside radial parent frames |
| `ENGINE_L`, `ENGINE_R` | X rotation ±6°; fixed barrels remain in the hull |

The 1.7 m seal radius matches the station's amber seal. The internal passage has 1.25 m clear radius. Its moving sleeve has 1.48 m outer radius inside a 1.52 m fixed bore: 40 mm nominal radial clearance. At full stroke it retains 130 mm axial overlap. The sleeve stops at Y=1.65 m when stowed; the sliding leaves start at Y=1.75 m. Door pockets occupy the gap below the upper fixed well. These are authored clearances, not pressure-vessel or structural certification. The final inner bulkhead remains closed.

## Station mating and demonstration

The unmodified orbital terminal's `SOCKET_DOCK_E` is at [30.8, 15, 0], normal +X. With the collar fully extended, set the shuttle root to [32, 15, 5.3975] and Euler XYZ rotation [0, 0, -π/2]. The shuttle seal then lands exactly on the station socket with its normal opposing the port. The 90° roll presents the underbelly to the existing side-facing terminal.

`applyDocking(root, seconds)` is an optional deterministic placement adapter. `dockingState(seconds)` provides the same state without changing a model. `Shuttle_Orbital_Docking_Cycle` lasts 72 seconds:

| Time (s) | Action |
| --- | --- |
| 0–10 | Approach |
| 10–16 | Roll belly toward port |
| 16–20 | Extend collar |
| 20–30 | Close to capture |
| 30–32 | Engage four latches |
| 32–35 | Open outer hatch |
| 35–42 | Hold docked |
| 42–45 | Close hatch |
| 45–47 | Release latches |
| 47–54 | Back away |
| 54–57 | Retract collar |
| 57–63 | Level the hull |
| 63–72 | Depart |

This is a kinematic external coupling demonstration. The original station's inner pressure cap stays closed, and no walkable cabin, cargo transfer, navigation or force-based flight simulation is claimed. The source station GLBs are preserved byte-for-byte and pinned by hash in the manifest.

Use LOD1 for an active shuttle, including docking. LOD0 is for close shots and recordings. LOD2 is a frozen cruise representation for distant traffic, maps and loading; never swap to it during visible mechanism motion. The provisional 150 m approach / 170 m retreat thresholds are metadata for static background traffic, not a measured acceptance result.

## Viewer and verification

The viewer provides shuttle, belly, airlock, engine and docking cameras plus orbit controls; manual extension, hatch, latch and nozzle controls; reversible seeking through thirteen chapters; pause, restart, optional loop and ½× / 1× / 2× speeds; all three tiers; wireframe, plumes, fullscreen, PNG capture and the selected plain GLB download. Static tier articulation is disabled. Shared Workshop navigation and the library card link this family with the station.

`validation.json` covers all decoded plain exports, zero glTF errors/warnings, finite nondegenerate geometry, unique dot-free names, tier frames and sockets, bounds, budgets, aperture rays and 1,442 sampled cycle states. During the mated interval the socket error is zero; all non-coupling meshes remain at least 1.440 m beyond the station's X envelope through the cycle. Contact collar/latch geometry is excluded from that separation check. This does not certify all self-collisions or physical docking forces.

`viewer-validation.json` records the browser tests and actual model render counts. `preview.png` and `previews/` are derived captures of the GLBs, including the underbelly, open airlock, station coupling, master, distance and mobile layouts.

Build and validate from the repository root:

```sh
node tools/asset-pipeline/build-shuttle-01.mjs
node tools/asset-pipeline/validate-shuttle-01.mjs
node tools/asset-pipeline/test-shuttle-01-viewer.mjs
python3 tools/build-workshop-docs.py
```

The browser test accepts `PLAYWRIGHT_MODULE`, `CHROMIUM_EXECUTABLE` and `SHUTTLE_URL` environment overrides. The repeatable detailed master source is `tools/asset-pipeline/shuttle-01-shape.mjs`; LOD1 uses reduced tessellation and LOD2 merges and simplifies the stowed geometry. No upstream compressed files are included. The consuming game owns release-time gltfpack packing and decoded r160 validation.

Hand off this change's Git commit plus `assets/shuttle-01/`, with the unchanged station folder for the optional demonstration. Pending: visual acceptance, any additional shuttle designs, crew/cargo interiors, production navigation/collision/flight behaviour, D1–D3, release decode acceptance and reference-device/game-camera profiling. These do not retroactively change the status of existing assets.

Models by jelaludo. Concept path/hash and rights limits are in `reference-provenance.json`; the supplied image is preserved outside the repository. No third-party mesh, animation or texture was incorporated.
