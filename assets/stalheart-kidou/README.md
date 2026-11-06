# STALHEART-KIDOU / Mobile fabrication gantry

Models by jelaludo. A separate mobile Stalheart variant based on the supplied concept: the original twin-tower gantry, material silos, catwalks, monitoring balconies and six-joint fabrication arm now ride on two long chassis beams and **eight independently steered XB-12 wheels**. The rail bed, sleepers, track fasteners, rail stops, flanged wheels and rail bogies are removed. Original Stalheart, XB-12 and MÖRK source files are preserved.

Open `stalheart-kidou/`. The scene starts parked with an actual MÖRK at its original scale beneath the arch. Choose straight travel, crab travel, pivot turn, suspension test stand or fabrication sweep. Travel modes raise the tool; parked/fabrication modes lower it over the MÖRK. This is an articulated, kinematic design prototype, not a force-based mobile factory simulation.

## Scale and measured exports

Metres, +Y up, +Z forward. Root `STALHEART_KIDOU_ROOT` is at the ground / plot centre. Neutral surface bounds are **42.128 × 38.2569 × 24.000 m** (X width / Y height / Z length), spanning Y 0.00310–38.26000 m. Reserve **48 × 28 m** around the moving root, rotating the reservation with the machine. World travel and turning require additional scene clearance.

The source Stalheart gantry is translated upward by 2.3 m without rescaling its towers, arm or silos. The original 32 m tower spacing remains. Each mobile side beam is 24 m long; wheel centres are X ±20.2 m at Z +9, +3, −3 and −9 m. The nominal rolling radius is **1.82 m**. XB-12 detailed wheel geometry is reused at uniform **3.6×** scale, with a simplified derivative in LOD1. Tires retain their source palette, split treads, rims and bolts. The radial tire envelope is slightly faceted; ideal contact sockets are authoritative for the kinematic demonstration.

| Tier | Triangles | Model draws | Plain bytes | Role |
| --- | ---: | ---: | ---: | --- |
| LOD0 / detailed | 159,924 | 45 | 7,633,692 | Close views, animation and recordings |
| LOD1 / game | 15,417 | 45 | 391,124 | Articulated mobile unit |
| LOD2 / distance | 2,759 | 1 | 131,912 | Frozen parked map/loading proxy |

Counts exclude the optional MÖRK, terrain, lights and viewer effects. Each KIDOU GLB uses one vertex-colour palette material, with repeated wheel geometry/accessors deduplicated. Static structures are merged within their motion frames. The source master has been consolidated into 45 articulated surface draws. The detailed tier adds the source gantry detail, wheel bolts and continuous damper coils; the game tier simplifies those surfaces while preserving moving pivots.

LOD1 meets the articulated-unit target of 25k triangles. It also fits the 400 KB landmark byte target, but **exceeds the stationary landmark targets of 8k triangles and 10 draws** because wheels, suspension, dampers, arm and hoses remain independently movable. LOD2 meets 3k triangles / one draw / 250 KB. These are measured exports, not FPS claims.

Plain GLBs are self-contained and authoritative. No compressed derivatives were produced; consuming-game gltfpack release packing remains pending. All KIDOU exports are derived from preserved library originals. LOD2 is a further simplified, static parked representation with lookup hierarchy retained; its adapter never animates the merged surface. Use LOD1 before motion becomes visible. Provisional map/loading thresholds are 150 m approach / 170 m return; these are not measured game-camera recommendations. Only D0 is supplied; damage and LOD are independent.

## Runtime and controls

No baked clips are supplied. Runtime demonstrations repeat every **16 seconds**; all actuators remain engine driven. `runtime.js` accepts the consuming game's Three.js instance.

```js
import { applyKidou, stateAt } from './runtime.js';
const state = stateAt(time, 'drive'); // park, drive, crab, turn, suspension, fabricate
unit.position.set(state.x, 0, state.z);
unit.rotation.y = state.yaw;
applyKidou(THREE, unit, {
  ...state,
  terrain: (x, z) => groundHeight(x, z)
});
```

The root owns world translation and yaw. `applyKidou` does not move the root. `stateAt` is a demonstration input generator: straight travel follows Z ±10 m, crab travel X ±8 m, pivot turn rotates the root once per cycle. `distance` is signed accumulated travel for straight/crab modes; `turnAngle` is accumulated yaw for the pivot demonstration. `vx`, `vz`, `omega` describe body-frame velocity and yaw rate. Wheel rotation is tied to those demonstrations' signed travel and radius. Arbitrary path following, combined turning/translation and independent wheel odometry belong to the game controller.

- `BODY_HEAVE`: chassis height. With a terrain callback, the body follows average sampled ground elevation; the tower stays vertical. Each wheel iterates its contact using the actual trailing-arm geometry. This supports smooth heightfields within the declared travel, not arbitrary steps or terrain forces. The adapter returns `maxContactError` for residual error when travel clamps.
- `SUSP_PIVOT_{L1…L4,R1…R4}`: pitch about local X. The rigid trailing arm is 3 m long, with neutral drop 2.4 m and longitudinal trail 1.8 m. Pivots are at Y 4.22 m and 1.8 m behind the nominal hub station. Positive compression raises the hub; travel is **−0.55…+0.55 m**.
- `UPRIGHT_*`: counter-rotates the arm pitch so wheels remain upright. `WHEEL_STEER_*` rotates about Y; `WHEEL_SPIN_*` rotates about X. Straight steering is parallel, crab steering is 90°, and pivot steering aligns each tire tangent to its orbit. Manual parked steering supports ±90°. This demonstrates steering geometry, not tire force/traction dynamics.
- `SOCKET_DAMPER_UPPER_*`: chassis-fixed. `SOCKET_DAMPER_LOWER_*`: follows the arm. `DAMPER_AIM_*` aims its local +Y at the lower mount. `DAMPER_ROD_*` slides along that axis; barrel length is 1.65 m and rod length 1.55 m. Rod diameter is never scaled. A robust basis avoids loss of endpoint accuracy when the damper is almost vertical.
- `SOCKET_CONTACT_*`: ideal tire-ground points under steering frames, independent of wheel spin. Tire polygons can differ slightly from the ideal circle.
- `GANTRY_TRAVEL_Y`: original legacy rail-control name retained, now **fixed at [0, 2.3, 0] m** relative to the mobile chassis. Do not play the original rail-travel clip on KIDOU.
- `CARRIAGE_TRAVEL_X`, `TOOL_LIFT_Z`, `J1_BASE_YAW` through `J6_TOOL_ROLL`, `EXTRUSION_TIP`: preserved arm control names and hierarchy. Legacy axis names originate in Blender Z-up; GLB coordinates are Y-up. KIDOU's runtime raises the lift to −2.4 m for travel and lowers it to −8.85 m for parked fabrication, relative to the carriage. The fabrication sweep moves the carriage ±1.45 m, varies lift height and slews the arm over the reference tank.
- `FEED_HOSE_1`, `FEED_HOSE_2`: procedural flexible mesh surfaces driven by the adapter. Their ends follow the carriage exactly. When the endpoint changes, the adapter replaces their tube geometry; material and names remain stable. They are not physically simulated hoses.

Pass finite inputs. `compression` is an optional per-wheel dictionary; `bias` adds common compression. Terrain contact takes precedence over manual compression. `steerDeg` supplies parked steering. The suspension test stand lowers the viewer ground for unimpeded droop; that mode does not claim tire contact. The arm sweep is a fabrication demonstration and does not create a finished tank inventory item.

## Sockets, sources and hand-off

Every export's exact socket frames are in `manifest.json`. Main connections are:

| Node | Neutral root position / purpose |
| --- | --- |
| `SOCKET_MATERIAL_INPUT` | [16, 4.4, −11.85] m; relocated from the old rail-side supply point |
| `SOCKET_FABRICATION_ORIGIN` | [0, 0, 2.6] m; working bay/reference tank origin |
| `EXTRUSION_TIP` | Approximately [0.0505, 3.2104, 2.6] m parked; follows the arm |
| `SOCKET_TOW_FRONT` | [16, 4, 12] m |
| `SOCKET_TOW_REAR` | [−16, 4, −12] m |
| `SOCKET_CONTACT_*` | X ±20.2, Y 0, Z +9/+3/−3/−9 m in neutral pose |

Root placement, socket transforms, engine-facing names and bounds agree across tiers. LOD2 names are lookup-only. The stand-alone GLBs contain no MÖRK or terrain. The viewer's optional MÖRK is `assets/hover-tank/mork_hover_tank_low_d0.glb` at original scale, with a 3.01595 m maximum height. It is a separate unchanged library asset.

`manifest.json` and `reference-provenance.json` pin source hashes for the detailed Stalheart, XB-12 wheel donor and MÖRK reference. The supplied concept image is hash-recorded and remains unchanged outside the repository. Its creator/license was not supplied; no additional reference-image rights are claimed.

Hand off the containing commit plus `assets/stalheart-kidou/`. For the viewer, also include `stalheart-kidou/`, shared Workshop navigation and the optional MÖRK source file. Rebuilding requires the preserved donor assets, the shape/utilities/build scripts and the pipeline dependencies. Original family exports and viewers remain unchanged.

## Validation and viewer

`validation.json` records zero errors/warnings in all three plain GLBs, finite/nondegenerate geometry, manifest hashes, unique dot-free names, tier bounds/frames/socket parity and a frozen static adapter. **780 kinematic samples** cover all six modes in detailed/game tiers. Maximum sampled contact error is below 0.001 mm, rigid arm-length error is at floating-point precision, and minimum damper overlap is 0.56265 m. Sampled tire vertices retain at least **0.2066 m lateral clearance** from the chassis side beams across ±90° steering and both travel endpoints. This is a specific tire/side-beam check, not general mechanical self-collision certification.

The sampled travel tool stays above 9.556 m over the demonstration ground. Fabrication tool height stays above 3.210 m, clearing the original MÖRK's overall height. Ground contacts, steering directions, rolling rates, damper endpoints and original source hashes are checked. Browser results in `viewer-validation.json` cover master/game modes, exact moving feed endpoints, individual wheel compression, uneven ground, frozen distance controls, actual model draw/triangle counters, pause, cameras, wireframe, fullscreen, downloads and a 390 px layout. Browser captures in `previews/` and `preview.png` are derived review artifacts.

Viewer controls include operation, play/pause/reset, 16-second timeline, playback speed, tier selection, eight camera views, uneven ground, MÖRK visibility, parked steering, per-wheel/common compression, wireframe, fullscreen and image capture. Neutral paused/parked views render on demand. Shared Workshop navigation is generated by the repository documentation tool.

Rebuild and check:

```sh
node tools/asset-pipeline/build-stalheart-kidou.mjs
node tools/asset-pipeline/validate-stalheart-kidou.mjs
node tools/asset-pipeline/test-stalheart-kidou-viewer.mjs
python3 tools/build-workshop-docs.py
```

The browser script accepts `PLAYWRIGHT_MODULE`, `CHROMIUM_EXECUTABLE` and `KIDOU_URL`. Pending: visual acceptance, structural loads and overturning stability, general self-collision, tire forces and drive power, production navigation/terrain limits, D1–D3, consuming Three r160 / release gltfpack validation, game-camera thresholds and reference-phone measurements. The received collaboration contract remains verbatim.
