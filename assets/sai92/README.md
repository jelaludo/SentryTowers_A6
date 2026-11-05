# SAI-92 / 採掘

Original autonomous mineral-recovery gas hopper and service bay by jelaludo. The designation retains the user's goroawase play on “sai ku tsuu / 採掘”. The two supplied concept sheets inform its cream/graphite/amber construction, central ore tank, cold-gas propulsion, pressure bottles, shock-damped landing legs, anchor spikes and hybrid mining head.

Open `sai92/` from a repository-root HTTP server. **Select a seam and press Dispatch SAI-92.** The unit waits at home until commanded. It flies to the selected location, lands, anchors, drills, returns with ore, connects to the receiver, refills flight gas and recharges. It then waits for the next command; it does not silently dispatch itself again.

## Scale and authoritative exports

Metres, +Y up, +Z forward, origin at ground level in the reserved plot centre. Neutral landed unit bounds are **6.3172 × 3.9945 × 4.5792 m** (X/Y/Z); reserve **7 × 5 m**. The service bay occupies **10 × 9 m**, is 3.405 m tall and has a landing datum at Y **0.215 m**. Source dimensions, sockets and neutral transforms agree across corresponding tiers.

| Module / tier | Triangles | Draws | Plain bytes |
| --- | ---: | ---: | ---: |
| Unit / detailed LOD0 | 54,152 | 42 | 1,094,620 |
| Unit / articulated game LOD1 | 18,992 | 42 | 641,160 |
| Unit / static distance LOD2 | 2,500 | 1 | 203,320 |
| Bay / detailed LOD0 | 5,040 | 5 | 285,032 |
| Bay / live game LOD1 | 3,928 | 5 | 246,664 |
| Bay / static distance LOD2 | 2,000 | 1 | 138,692 |

The unit game tier meets the 25k articulated-unit triangle target. The bay game tier meets the landmark 8k / 10 draws / 400 KB targets. Both distance tiers meet 3k / one draw / 250 KB. Measurements include rendered repeated parts, not only unique mesh definitions. Each model has one vertex-colour palette material and no textures; repeated geometry/accessors are deduplicated. The master adds finer circular surfaces, helices, radiator fins, bellows and fittings for close shots and recordings.

Plain self-contained GLBs are the source of truth. No compressed copies were generated; release gltfpack packing is game-owned. LOD2 geometry is a derived simplification with matching bounds, frozen in its neutral landed/half-ore pose. Lookup hierarchy is preserved, but static adapters never articulate it or update its gauges. Keep active units on LOD1; LOD0 is an explicit recording/inspection choice. Optional map/loading thresholds of 150 m / 170 m are provisional. No FPS improvement is claimed.

Only intact damage D0 is authored. Health, LOD, landing configuration, ore quantity, gas and battery are separate state dimensions. No original asset families were changed.

## Moving mechanisms

There are **no baked GLTF clips**. Mission timing and every operating pivot are engine-driven; no animated part is baked into the game surface. Unit and bay names are unique, meaningful and dot-free.

- `SAI92_ROOT`: world position and yaw. `BODY_HEAVE`: nominal Y 1.7 m, landing compression and flight bank/pitch.
- `LEG_{FL,FR,RL,RR}_YAW`: fixed diagonal mounting frames. `HIP` and `KNEE`: two-link inverse kinematics with a 0.95 m upper member and nominal 1.35 m lower member. `SHOCK_ROD` translates inside a 0.64 m barrel; its rigid chrome rod is 1.08 m long. `FOOT` counter-rotates to remain level when planted. `ANCHORS` lowers three spikes per foot by up to 0.16 m. Spikes intentionally penetrate the mining ground; they are retracted before thrust.
- `THRUSTER_*_GIMBAL`: four cold-gas pods with jointed booms and exhaust sockets. Gimbal compensation follows flight bank/pitch. Jet plumes are viewer effects, not GLB geometry or a propulsion simulation.
- `SENSOR_YAW`: independent scanning turret with three forward optics.
- `MINING_LIFT`, `MINING_FOLD`: lower/unfold the head for extraction and tuck it away for travel. `AUGER_L_ROLL`, `AUGER_R_ROLL`: counter-rotate mirrored helix geometry; `INTAKE_SCREW_ROLL` turns the visible transfer screw. Three named laser sockets support the viewer's mining beams.
- `ORE_WINDOW_CONTENT`: static irregular ore geometry behind `ORE_WINDOW_MASK`. The mask reveals the window from bottom to top; `ORE_GAUGE_FILL` drives the adjacent segmented indicator. Both follow the same normalized cargo input. The window is a readable quantity proxy, not a particle-packing simulation.
- `OFFLOAD_STAGE_1`, `OFFLOAD_STAGE_2`: two rigid telescoping tubes, 0.9 m travel each, with open bores and a cage window. The outlet projects above the receiving hopper during service.
- Bay: `BAY_ORE_LEVEL`, `BAY_GAS_LEVEL`, `BAY_POWER_LEVEL` follow receiver inventory, flight-gas fraction and battery charge. Vessel status lights and rear battery-pack detailing on the unit are fixed presentation details; authoritative gas/charge are in the mission and live bay/HUD indicators.

## Sockets and placement

Exact neutral positions for every tier are measured in `manifest.json`. Principal unit sockets, in the unit's neutral root frame:

| Socket | Position metres | Direction / use |
| --- | --- | --- |
| `SOCKET_ORE_OUT` | 0, 2.04, 1.38 | +Z, retracted ore outlet; full extension moves it to Z 3.18 |
| `SOCKET_GAS_IN` | −0.66, 1.57, −1.30 | −Z, gas refill |
| `SOCKET_CHARGE` | 0.66, 1.57, −1.30 | −Z, electrical service |
| `SOCKET_CARGO` | 0, 2.68, 0 | Ore inventory anchor |
| `SOCKET_FOOT_*` | Measured in manifest | Ground contact at each sole |
| `SOCKET_EXHAUST_*` | Measured in manifest | Local −Y, follows the pod gimbal |
| `SOCKET_LASER_L/R/C` | Measured in manifest | Mining beams, follow deployed head |

Bay sockets: `SOCKET_LANDING` at **0, 0.215, 0**; `SOCKET_RECEIVER` at **0, 1.87, 3.30**; `SOCKET_GAS_SUPPLY` at **−2.3, 1.78, −3.20**; `SOCKET_POWER_SUPPLY` at **2.3, 1.78, −3.20**. Place the unit at the bay landing socket, facing +Z. Its extended ore outlet is 0.4033 m from the receiver's opening marker, with a short gravity drop into the open hopper. Gas and power hoses bind the actual named sockets, and fully connected endpoints are checked in the browser.

The viewer puts the bay at X −13 / Z −10. This is scene layout, not baked into either model. Foot terrain queries include the elevated pad. The flight route clears the bay at a nominal ground-origin height of 6.4 m before crossing the field.

## Runtime adapter

```js
import { applySai92, applyBay } from './runtime.js';
unit.position.set(worldX, altitude, worldZ);
unit.rotation.y = heading;
applySai92(THREE, unit, {
  time: elapsedSeconds, fold, anchor, deploy, offload,
  fill: cargo / capacity, drillAngle, scan,
  compression, bank, pitch, grounded,
  terrain: (x, z) => worldGroundHeight(x, z)
});
applyBay(bay, {
  ore: receiverInventory / receiverCapacity,
  gas: flightGas / gasCapacity,
  battery: charge / batteryCapacity
});
```

Pass the consuming game's existing Three.js instance. Inputs must be finite; fold/anchor/deploy/offload/fill are normalized fractions. The adapter caches node references and computes rigid leg geometry; it neither consumes fuel nor transfers ore. `grounded=true` queries the world's height at the nominal foot positions and plants the soles. Airborne posing uses the unit ground datum instead. The terrain/contact solver assumes mild heightfield variation within leg reach; large ledges, tilt, friction, load capacity and general self-collision require game-side handling.

## Command and mission contract

`mission.js` is renderer-independent. `createMission()` seeds three finite seams (120, 90, 160 units); `{seed:false}` starts an empty field. `addSite(x,z,amount)` creates a site in X −3…18 / Z −2…18 m, at least 4.5 m from other sites, with up to 200 units and at most 12 sites. `selected` sets the next destination. `dispatch(id)` explicitly starts a cycle. `recall()` requests a return through safe tool/anchor retraction. Set `running=false` to pause. Call `tick(dt)` with finite 0–1 second steps; the viewer subdivides to at most 20 ms. `events` records phase changes.

The sequence is preflight → lift → outbound → locate → land → anchor → deploy → mine → retract → release → return lift → inbound → home landing → connect → service → disconnect → ready. Takeoff never applies thrust with anchors or the head deployed. Drilling requires planted anchors and a fully lowered head. Recall works during flight, approach, deployment and extraction. A selected finite remainder can be retrieved on the next command; empty sites cannot be dispatched.

Demonstration balancing: ore capacity **80**, receiver capacity **600**, gas and battery capacity **100**. Mining moves 6 ore units/s into the hold; offloading transfers 10/s into the receiver. Flying consumes 1.3 gas and 0.35 battery units/s, mining consumes 0.65 battery units/s. Service restores gas at 12/s and battery at 10/s, concurrently with offloading. These are illustrative normalized units, not estimates of real gas impulse, energy, ore mass or engineering feasibility. Flight duration uses distance / 4.8 with eased endpoints, not a force-based flight model.

The default first trip takes approximately **55.78 simulated seconds**, transfers **80 units**, leaves **40** at seam 01 and returns with gas and battery restored to 100. Lowest sampled values are 67.188 gas and 82.495 battery. The second trip can recover the remaining 40. Ore is conserved through both trips. A full receiver stops transfer without losing cargo; production inventory systems can free capacity. The unit remains docked until service completes.

Flight is a direct elevated trajectory in this open demonstration field. Obstacle avoidance, game navigation, atmosphere/gravity, landing-site evaluation, traffic, network authority and inventory persistence are not implemented. No claim is made that compressed gas can perform this mission under arbitrary real-world gravity or mass assumptions.

## Viewer, validation and handoff

Controls include destination selection, explicit dispatch, pause, recall, reset, 1×/2×/4×, numeric/map/3D-ground site placement, master/game/static detail, inspection ore level, wireframe, fullscreen and PNG capture. Inspection modes show neutral hardware, folded flight, anchored drilling and landing shocks. Cameras cover the unit, full field, front tank, mining tools, landing gear, service bay and top view; orbit/zoom is available throughout. Inspection preserves and pauses mission advancement. Paused views render on demand; unchanged site geometry, route lines and connected hoses are reused. Static mode disables live fill/actuation and shows the 50% reference pose. All views use shared Workshop navigation and responsive desktop/mobile layout.

`validation.json` covers six plain exports with zero errors/warnings, finite nondegenerate geometry, identical tier frames/sockets/bounds, budget checks and **1,122** kinematic samples. Foot/link errors are at floating-point precision; minimum sampled shock overlap is 0.61 m. It also checks conserved ore, full/partial loads, four recall phases, all allowed field corners, pause, invalid sites, full receiver and takeoff/drill interlocks. These are kinematic checks, not load/force/collision certification.

`viewer-validation.json` records real Chromium WebGL checks: the complete cycle, exact gas/power hose attachment, visible jet/laser interlocks, custom sites, recall, moving augers/gauges/shocks, frozen distance tiers, actual per-model triangle/draw counters, cameras, fullscreen, downloads and 390px layout. Browser captures in `previews/` are derived. Source images are hash-recorded in `reference-provenance.json` and remain unchanged outside this repository.

Rebuild with `node tools/asset-pipeline/build-sai92.mjs`, validate with `node tools/asset-pipeline/validate-sai92.mjs`, and run `node tools/asset-pipeline/test-sai92-viewer.mjs` with Playwright available. `PLAYWRIGHT_MODULE` and `CHROMIUM_EXECUTABLE` can select a local installation. Run `python3 tools/build-workshop-docs.py` after editing docs/routes.

Hand off the containing commit plus **`assets/sai92/`**, **`sai92/`** and the `sai92-shape`, build, validation and viewer-test scripts under `tools/asset-pipeline/`. Pending: visual acceptance; general mechanism collision/load engineering; physical flight/gas/energy balancing; game navigation, resource/network integration; D1–D3; consuming r160 renderer/release gltfpack and game-camera/reference-phone measurements. The received collaboration contract remains verbatim.
