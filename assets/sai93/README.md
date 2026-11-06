# SAI-93 / Long chassis mineral recovery

SAI-93 is the separate, headless SAI-92 variant by jelaludo. The raised optical head, pedestal and `SENSOR_YAW` pivot are removed in every tier. Fixed sensor apertures sit flush in the hull and flat service deck. The ore tank is narrower and longer; the legs and thruster booms have revised mounting locations. Circular joints, thruster bells, augers and shock rods retain their proportions. No nonuniform root scaling is used.

Open `sai93/` from a repository-root HTTP server. It opens in **Unit inspection**. Use the **Side / long chassis** and **Top view** cameras to review the new proportions. **Dispatch SAI-93** switches to the live mission: select a seam, fly there, land, anchor, mine, return, offload ore, refill gas and recharge. The unit then waits for another command. The original SAI-92 model and viewer are preserved.

## Dimensions and measured exports

Metres, +Y up, +Z forward; origin at ground level at the plot centre. Dimensions below are neutral landed surface bounds, X width / Y height / Z length.

| Dimension | SAI-92 | SAI-93 |
| --- | ---: | ---: |
| Overall width | 6.3172 m | 5.6600 m |
| Overall height | 3.9945 m | 3.5750 m |
| Overall length | 4.5792 m | 5.7316 m |
| Ore tank width | 3.1200 m | 2.7500 m |
| Ore tank length | 2.0500 m | 2.8900 m |

The complete landed unit is **10.4% narrower and 25.2% longer**, with a 0.4195 m lower top envelope. The ore tank is 11.9% narrower and 41.0% longer. Reserve a **6 × 6 m** neutral plot; collision and moving-unit clearance remain game-owned. Every corresponding tier preserves root placement, bounds, socket frames and lookup names.

| Module / tier | Triangles | Draws | Plain bytes |
| --- | ---: | ---: | ---: |
| Unit / detailed LOD0 | 52,420 | 41 | 1,075,008 |
| Unit / articulated game LOD1 | 18,988 | 41 | 662,832 |
| Unit / static distance LOD2 | 2,496 | 1 | 201,200 |
| Shared bay / detailed LOD0 | 5,040 | 5 | 285,032 |
| Shared bay / live game LOD1 | 3,928 | 5 | 246,664 |
| Shared bay / static distance LOD2 | 2,000 | 1 | 138,692 |

The unit game tier meets the 25k articulated-unit triangle target. The shared bay meets the landmark 8k / 10 draws / 400 KB game targets. Both distance tiers meet 3k / one draw / 250 KB. All models use one vertex-colour palette material without textures; repeated geometry/accessors are deduplicated. Draw counts include articulated surfaces; model-only browser render measurements are recorded in `viewer-validation.json`. No FPS improvement is claimed.

Plain self-contained GLBs are authoritative. LOD2 is a derived simplification frozen in a neutral landed, half-ore pose. Its named lookup hierarchy is preserved but cannot articulate or change gauges. Keep active units on LOD1; LOD0 is for close inspection and recordings. Optional map/loading enter/return thresholds of 150/170 m are provisional metadata, not measured game recommendations. Only D0 is authored. Damage, LOD and mission state are independent. No compressed copies were generated; release packing with gltfpack belongs to the game.

## Shared service bay and provenance

The three `sai93_bay_d0_lod*.glb` files are **byte-identical copies** of the corresponding SAI-92 exports, bundled to keep this folder portable. They retain `SAI92_BAY_ROOT`, original node names and the SAI-92 sign. Their source paths, hashes and source commit are recorded in `manifest.json`. They are reused originals, not newly authored SAI-93 bay geometry. The service pad remains 10 × 9 m, 3.405 m tall, with landing datum Y 0.215 m.

`mission.js` is also copied byte-for-byte from SAI-92. Its optional `scan` telemetry remains available for compatibility but does not drive a head or sensor pivot on SAI-93. `reference-provenance.json` records the original concept image hashes and the user's variant direction. The source images remain unchanged outside the repository; no additional reference-image rights are claimed.

## Runtime mechanisms

There are **no baked GLTF clips**. Every actuator is engine-driven; names are unique, meaningful and dot-free. The SAI-93 unit uses `SAI93_ROOT`; the shared bay uses `SAI92_BAY_ROOT`.

- `BODY_HEAVE`: nominal Y 1.7 m, landing compression and flight pitch/bank.
- `LEG_{FL,FR,RL,RR}_YAW`: fixed diagonal mounts at X ±1.30 / Z ±1.30 m. The outward direction is X ±0.68 / Z ±0.733212. `HIP` and `KNEE` solve rigid 0.95 m upper and nominal 1.35 m lower links. `SHOCK_ROD` slides inside a 0.64 m barrel with a 1.08 m chrome rod; `FOOT` counter-rotates to meet the ground. `ANCHORS` lowers three spikes per foot by up to 0.16 m. Ground penetration is intentional during anchoring.
- `THRUSTER_*_GIMBAL`: four cold-gas pods, mounted at X ±2.28 / Z ±1.24 m. Jets are viewer effects connected to exhaust sockets.
- `MINING_LIFT`, `MINING_FOLD`: lower and unfold the extraction assembly, mounted 0.42 m farther forward than SAI-92. `AUGER_L_ROLL` / `AUGER_R_ROLL` counter-rotate mirrored helices; `INTAKE_SCREW_ROLL` turns the transfer screw. Three laser sockets drive mining effects.
- `ORE_WINDOW_MASK` and `ORE_GAUGE_FILL`: normalized quantity indicators. Ore behind the window is static geometry revealed from bottom to top, not particle packing.
- `OFFLOAD_STAGE_1` / `OFFLOAD_STAGE_2`: rigid telescoping, open-bore tubes. Each now travels **0.69 m**, retaining the original fully extended outlet position despite the longer hull.
- Shared bay: `BAY_ORE_LEVEL`, `BAY_GAS_LEVEL`, `BAY_POWER_LEVEL` follow inventory, gas and battery. There is no `SENSOR_YAW` or `SENSOR_SURFACE` in any SAI-93 tier.

Principal neutral unit sockets:

| Socket | Root-frame position metres | Use |
| --- | --- | --- |
| `SOCKET_ORE_OUT` | 0, 2.04, 1.80 | +Z outlet; full extension reaches Z 3.18 |
| `SOCKET_GAS_IN` | −0.66, 1.57, −1.72 | −Z refill |
| `SOCKET_CHARGE` | 0.66, 1.57, −1.72 | −Z charging |
| `SOCKET_CARGO` | 0, 2.68, 0 | Ore inventory |
| `SOCKET_FOOT_*` | Measured in manifest | Ground contacts |
| `SOCKET_EXHAUST_*` | Measured in manifest | Gimballed −Y exhaust |
| `SOCKET_LASER_L/R/C` | Measured in manifest | Moving mining beams |

Bay sockets are unchanged: `SOCKET_LANDING` at 0, 0.215, 0; `SOCKET_RECEIVER` at 0, 1.87, 3.30; `SOCKET_GAS_SUPPLY` at −2.3, 1.78, −3.20; `SOCKET_POWER_SUPPLY` at 2.3, 1.78, −3.20. Place the unit at the landing datum facing +Z. The extended outlet is 0.4033 m from the receiver marker and drops ore into its open hopper. Gas and charging hoses attach to the updated unit sockets. The viewer locates the bay at X −13 / Z −10; that layout is not baked into either GLB.

```js
import { applySai93, applyBay } from './runtime.js';
unit.position.set(worldX, altitude, worldZ);
unit.rotation.y = heading;
applySai93(THREE, unit, {
  time: elapsedSeconds, fold, anchor, deploy, offload,
  fill: cargo / capacity, drillAngle,
  compression, bank, pitch, grounded,
  terrain: (x, z) => worldGroundHeight(x, z)
});
applyBay(bay, { ore: stored / capacity, gas: gasFraction, battery: chargeFraction });
```

Pass the consuming game's Three.js instance and finite inputs. Fold/anchor/deploy/offload/fill are normalized. `grounded=true` queries terrain beneath the nominal feet; airborne posing uses the unit ground datum. The runtime caches named nodes, drives rigid kinematics and updates indicators. It does not implement force-based suspension, flight forces or inventory transfer. Mild heightfields within leg reach are supported; ledges, collision, friction and loads require game-side handling.

## Mission, viewer and verification

The bundled mission retains explicit `dispatch(id)`, safe `recall()`, `addSite(x,z,amount)` and `tick(dt)` with finite 0–1 second steps. Default seams contain 120, 90 and 160 normalized ore units. Unit capacity is 80, receiver capacity 600, gas and battery capacities 100. Mining transfers 6 units/s; unloading 10/s; flight consumes 1.3 gas and 0.35 battery units/s; mining uses 0.65 battery units/s; service replenishes 12 gas and 10 battery units/s. These are illustrative game-balancing values, not physical engineering estimates.

The first default mission takes approximately 55.78 simulated seconds, delivers 80 ore, leaves 40 at seam 01, restores gas/battery to 100 and waits for another command. Inventory is conserved. Empty seams cannot dispatch; a full receiver holds cargo. Takeoff requires retracted anchors and mining tools; drilling requires planted anchors and a lowered tool. The demo uses a direct elevated flight path without obstacle avoidance, navigation or network authority.

Viewer controls include destination/map placement, dispatch, return, pause/reset, 1×/2×/4×, master/game/static, ore inspection, wireframe, fullscreen and PNG capture. Cameras include the new side profile, top, front, mining tools, legs, service bay, full field and free orbit. Inspection modes show the neutral body, folded flight, anchored drilling and landing shocks. Paused views render on demand. Static mode locks live actuation and gauges. Shared Workshop navigation and a 390 px layout are included.

`validation.json` checks six plain GLBs with zero validator errors/warnings, hashes, finite nondegenerate triangles, identical tier bounds/frames/sockets, budgets, absent head/pivot geometry, measured shape changes versus SAI-92 and byte-identical shared bay copies. Its 1,122 kinematic samples cover the mission, folding, impact compression, foot contacts, rigid links and shock overlap (minimum 0.61 m). It also covers finite inventory, partial loads, four recall phases, field corners, pause, invalid sites, full storage and operating interlocks.

`viewer-validation.json` records Chromium WebGL checks of the complete cycle, jets/lasers, actual hose endpoints, augers/gauges/shocks, tier counts, cameras, wireframe/fullscreen, downloads and narrow layout. `preview.png` and `previews/` are derived browser captures. These checks do not certify load engineering or collision-free mechanisms on arbitrary terrain.

Rebuild: `node tools/asset-pipeline/build-sai93.mjs`. Validate: `node tools/asset-pipeline/validate-sai93.mjs`. Browser checks: `node tools/asset-pipeline/test-sai93-viewer.mjs`, with optional `PLAYWRIGHT_MODULE`, `CHROMIUM_EXECUTABLE` and `SAI93_URL`. Run `python3 tools/build-workshop-docs.py` after docs/routes change. Rebuilding and regression validation also require the preserved SAI-92 sources; the exported SAI-93 folder and its runtime are portable.

Hand off the containing commit plus `assets/sai93/`, `sai93/` and the four `sai93` scripts in `tools/asset-pipeline/`. Pending: visual acceptance, collision/load engineering, physical flight/gas/energy balancing, consuming-game navigation/inventory/network integration, D1–D3, r160 renderer/release gltfpack checks and reference-phone/game-camera measurements. The received collaboration contract is unchanged.
