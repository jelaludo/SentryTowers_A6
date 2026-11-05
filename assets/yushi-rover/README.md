# YūshiRover / Biomass Recovery

Original six-wheel autonomous biomass recovery rover by jelaludo, based on the supplied cream/graphite/amber recovery-rover concept. Root rake → moving cleated conveyor → processor → twin cylindrical storage tanks → Yūshi045 Bio-Pearl inlet. Open the `yushi-rover/` viewer from a repository-root HTTP server.

## Scale and exports

Metres, +Y up, +Z forward, ground origin at the centre of a reserved 6 × 11 m plot. All tiers measure **5.42762 m wide × 3.53200 m high × 10.29500 m long**. MÖRK is 5.82548 m wide × 3.01625 m high × 13.28050 m including its gun; the rover has comparable vehicle scale, with a projecting harvesting head. The viewer compares both at their original metre scale. The original MÖRK and Bio-Pearl GLBs/runtime are unchanged and hash-pinned in the manifest.

| Tier | Purpose | Triangles | Draws | Plain bytes |
| --- | --- | ---: | ---: | ---: |
| LOD0 | Detailed master, close shots and recordings | 40,596 | 61 | 988,636 |
| LOD1 | Articulated active unit | 21,036 | 61 | 677,544 |
| LOD2 | Derived frozen map/loading model | 2,497 | 1 | 219,648 |

One vertex-colour palette material, zero textures, shared duplicate geometry/accessors. Draws count rendered moving parts, not unique mesh definitions. LOD1 meets the 25k articulated-unit triangle target. LOD2 meets 3k / one draw / 250 KB. The detailed model has finer cylinders, tread construction, fittings and fasteners. The static model is frozen at 50% cargo, with matching bounds and lookup frames; its small simplification-bound adjustment is baked into derived geometry. Never animate its lookup nodes or use its reference gauge as live inventory.

Plain GLB is authoritative. No compressed copies were generated; release gltfpack packing remains game-owned. Only intact damage D0 is authored. Operating modes, tank capacity and LOD are separate from damage. This is a kinematic prototype, not a certified load-bearing mechanism or production navigation system. No FPS improvement is claimed.

## Motion and interfaces

There are **no baked GLTF clips**. Conveyor, suspension, steering, wheels, tank indicators and valves are engine-driven, with continuous procedural inspection controls. No locomotion or cargo transfer is hidden in an animation clip. Source: `tools/asset-pipeline/yushi-rover-shape.mjs`; repeatable exporter: `build-yushi-rover.mjs`.

- `YUSHIROVER_ROOT`: world position/yaw, ground datum. `CHASSIS_SUSPENSION`: terrain-following heave/pitch/roll; its local Z offset is −0.4675 m so the complete footprint is centred.
- `SUSPENSION_{L1…L3,R1…R3}_SWING`: six rigid one-metre swing arms. `UPRIGHT` counter-rotates wheel carriers. `DAMPER` aims its barrel at the axle; `ROD` slides a rigid 950 mm rod into a 650 mm sleeve. Wheel radius is 760 mm at the tread. Indices run rear to front.
- `WHEEL_*_STEER`, `WHEEL_*_ROLL`: independent steering and rolling. The mission derives per-wheel velocities from forward speed and yaw rate, including low-speed turns.
- `CONVEYOR_SLAT_00…23`: rigid repeated cleats following a continuous stadium-shaped loop. `BELT_LOWER_ROLL`, `BELT_UPPER_ROLL`, `PICKUP_ROTOR_ROLL`: rotating drums/rake. Upper run carries visible viewer biomass; lower run returns empty. At collection end the belt clears before travel resumes.
- `TANK_0_ISOLATOR`, `TANK_1_ISOLATOR`: small vibration isolation movement. `TANK_*_GAUGE_NEEDLE` rotates from +2.3 to −2.3 rad as cargo fills. `TANK_*_LEVEL` grows along local Z, independently of the rigid mechanism geometry. Both tanks share the supplied inventory fraction. `TANK_*_VALVE` opens during offloading.
- `SOCKET_OFFLOAD`: binder outlet, local −X normal, at **−2.14, 1.93, −3.9175 m** in the neutral root frame. Other lookups: `SOCKET_INTAKE`, `SOCKET_CARGO`, `SOCKET_BEACON_SENSOR` and six `SOCKET_WHEEL_*`. Exact neutral positions are measured in `manifest.json`.

Names are unique and dot-free. Corresponding parents, neutral local transforms, socket positions, coordinate system and overall bounds agree across all tiers. Static LOD2 retains the hierarchy as lookup-only nodes. Keep the unit at LOD1 during active simulation; LOD0 is for close inspection/recording. Optional preview/loading thresholds of 150 m / 170 m are provisional, not measured game recommendations.

```js
import { createRoverController } from './runtime.js';
const rover = createRoverController(THREE, gltf.scene);
rover.root.position.set(worldX, 0, worldZ);
rover.root.rotation.y = heading;
rover.update({
  time: elapsedSeconds, distance: totalTravelMetres,
  beltDistance: accumulatedBeltMetres,
  fill: cargo / capacity, harvesting, unloading,
  terrain: (worldX, worldZ) => groundHeight,
  // Optional per-wheel arrays, order L1 L2 L3 R1 R2 R3:
  wheelTravel, wheelSteer
});
const outletWorld = rover.socket('SOCKET_OFFLOAD');
```

Pass the game's existing Three.js instance. The adapter never changes inventory or advances the mission. Terrain contact is a kinematic numerical solve, not tire collision or traction physics. It assumes gently varying heightfield terrain and the available suspension travel; discontinuities and extreme slopes require game-side constraints. Unit steering/rolling, hull response and visible tank vibration are presentation models, not force simulation.

## Beacon collection and docking

`mission.js` is a renderer-independent deterministic mission controller. `createMission()` starts with three editable demonstration sites; `createMission({seed:false})` starts with none. `addBeacon(x,z,amount)` adds finite inventory in the marked field. Call `tick(dt)` with finite 0–1 second steps; the viewer subdivides time into at most 20 ms. Set `running=false` to pause. `recall()` returns the rover early. `events` records arrivals and cargo transfer states.

The sequence is navigate → align rake → harvest → clear conveyor → next site or return → dock → connect → unload → disconnect → resume. The visibility-graph path planner avoids a 7.5 m inflated circle around Bio-Pearl. It handles this single known depot on an open field; general terrain obstacles, traffic, network authority and a game navigation mesh remain game work.

Demo balancing: rover capacity 100 biomass units, Bio-Pearl capacity 400, initial container inventory 40, each default beacon 60. Harvest rate 9 units/s, transfer rate 16 units/s. Three sites yield 180 units in two visits, leaving 220 in Bio-Pearl and zero aboard after approximately 117.26 simulated seconds. Inventory is conserved continuously. Full storage stops transfer without discarding cargo. These are illustrative units: the production biomass-to-binder recipe, physical volume and tank mass are game-defined.

Depot origin: −15, 0, −12 m. Dock root: −23, 0, −15.9175 m, facing π radians. The rover's world outlet connects to the **actual** unchanged Bio-Pearl `SOCKET_FILL` at −16.41, 1.9, −12 m (plus the local terrain datum). The viewer supplies the flexible hose, flow markers and exact endpoint attachment; its existing Bio-Pearl controller receives transferred storage fractions. Original Yūshi045 shoulder/sight indicators update from that same inventory. No textures or viewer terrain/particles/hose are baked into the rover GLBs.

## Viewer and review

- Pause/play, 1×/2×/4×, return home, reset default route.
- **New route** clears the demonstration and resets inventory; click the outlined map field or use X/Z inputs to create your own sites. The target button enables one-click placement on the 3D ground. Sites are separated by at least 4 m, limited to 12, inside X −7…18 / Z −1…18 m.
- Mission, conveyor/tank inspection, six-pad suspension test and true-scale MÖRK comparison.
- Master/game/static selection, follow/overview/intake/tanks/suspension/top cameras, free orbit, wireframe, fullscreen, PNG capture and GLB download. Distance mode is explicitly frozen and disables the live fill control.
- Desktop and mobile layouts, shared Workshop navigation. Inspection pauses mission advancement while preserving its state. Play/pause also controls inspection motion.

`validation.json` records zero GLB errors/warnings, actual geometry checks, tier/socket parity, original hashes, 480 terrain poses, rigid links, ≤1.48 µm sampled wheel-height error and ≥225 mm sampled damper overlap. These are numerical kinematic checks, not a general self-collision or engineering certificate. `viewer-validation.json` records real Chromium WebGL checks, three measured model-only render passes, custom routes, full collection/offloading, gauge updates, controls and 390px layout. Previews are derived browser captures.

Rebuild with `node tools/asset-pipeline/build-yushi-rover.mjs`, validate with `node tools/asset-pipeline/validate-yushi-rover.mjs`, and run `node tools/asset-pipeline/test-yushi-rover-viewer.mjs` with Playwright available (`PLAYWRIGHT_MODULE` / `CHROMIUM_EXECUTABLE` can select the local installation). Rebuild navigation/docs using `python3 tools/build-workshop-docs.py`.

Hand off the containing commit plus **`assets/yushi-rover/`**, **`yushi-rover/`** and the procedural source/build/validation scripts. Include existing `assets/yushi045/` for the depot and `assets/hover-tank/customization/models/lod1/mork_d0.glb` for optional comparison. Pending: visual acceptance, general collision/traction/terrain physics, production navigation/inventory integration, D1–D3, r160 renderer and release gltfpack validation, game-camera/reference-phone measurements. Original models and the received collaboration contract remain unchanged.
