# R-47X / 6x6 Unmanned Reconnaissance Rover

A next-generation unmanned military reconnaissance rover engineered for extreme planetary terrain and low-gravity reconnaissance hops. Models by jelaludo. Built around a low-slung wedge-shaped titanium and graphite-composite armored hull (`4.66 m` length × `2.36 m` width across hubs × `1.58 m` mast height), six massive chevron-treaded off-road wheels on independently articulated wishbone arms with twin exposed hydraulic shock absorbers, and an **8-thruster multi-axis gimbaled cold-gas jump system** (4 recessed ventral lift thrusters on the undercarriage and 4 lateral vectoring thrusters on the flanks) fed by four cylindrical high-pressure COPV nitrogen tanks. No weapons are fitted; the dorsal spine carries a 360° EO/IR + LiDAR optical reconnaissance turret and rear modular payload rails.

## Runtime contract

- Plain GLBs in `lod0/`, `lod1/`, `lod2/` are authoritative. `derived/meshopt/` provides optional preview compression; release packing (`gltfpack -cc -kn -km -ke`) remains game-owned. Files are self-contained and vertex-colored with zero external textures or buffers.
- Metres, `+Y` up, `+Z` forward. `R47X_ROVER_ROOT` sits on the ground at `(0, 0, 0)` at the centre of a `6 × 8 m` plot.
- Intact `D0` only. Damage states `D1–D3` are not authored yet; damage state remains independent of detail tier.
- Unbaked engine pivots under `R47X_ROVER_ROOT`:
  - `ROVER_CHASSIS_JUMP` at `(0, 0.56, 0)` drives hydraulic pre-jump crouch, short airborne low-gravity cold-gas jump arcs (`+1.42 m` apex) and touchdown shock absorption.
  - `SUSPENSION_BOGIE_L` / `SUSPENSION_BOGIE_R` pitch the left and right articulated suspension arms and twin exposed hydraulic dampers (`SUSPENSION_ARMS_L`, `SUSPENSION_ARMS_R`).
  - `WHEEL_DRIVE_L` / `WHEEL_DRIVE_R` control vertical wheel droop and travel for the six rugged chevron-treaded wheels (`WHEEL_SET_L`, `WHEEL_SET_R`).
  - `THRUSTER_GIMBAL_VENTRAL` vectors the 4 recessed undercarriage cold-gas lift nozzles (`VENTRAL_THRUSTER_CLUSTER` at `SOCKET_THRUSTER_V_FL`, `SOCKET_THRUSTER_V_FR`, `SOCKET_THRUSTER_V_RL`, `SOCKET_THRUSTER_V_RR`).
  - `THRUSTER_GIMBAL_LATERAL` vectors the 4 flank-mounted lateral cold-gas thrusters (`LATERAL_THRUSTER_CLUSTER` at `SOCKET_THRUSTER_L_FL`, `SOCKET_THRUSTER_L_FR`, `SOCKET_THRUSTER_L_RL`, `SOCKET_THRUSTER_L_RR`).
  - `COLD_GAS_PLUMES` controls the 8 translucent nitrogen expansion cones during pre-jump purge, airborne boost and retro-landing burn phases.
  - `SENSOR_MAST_YAW` (`+Y`) and `OPTICS_HEAD_PITCH` (`+X`) articulate the dorsal EO/IR + LiDAR reconnaissance head (`SENSOR_MAST_HEAD`, `SOCKET_SENSOR_MAST`).
- All 33 engine and socket lookup names (`ENGINE_NODES`) are preserved without dots across `LOD0`, `LOD1` and `LOD2`. `LOD2` merges geometry into a single static mesh and material (`ROVER_STATIC_BODY`, 1 draw call) while retaining every pivot and socket as a non-articulating lookup node at its rest transform.
- Suggested LOD policy: load `LOD2` beyond `140 m`, swap to `LOD1` inside `140 m` with `20 m` hysteresis, retain `LOD1` while jumping or scanning, and use `LOD0` for close inspection, suspension/thruster engineering cutaways and recordings.

## Measured exports

| Tier | Triangles | Draws | Plain bytes | Decoded Meshopt bytes |
| --- | ---: | ---: | ---: | ---: |
| LOD0 detailed | 9,628 | 9 | 651,796 | 184,708 |
| LOD1 game | 5,508 | 9 | 381,172 | 119,068 |
| LOD2 static distance | 2,436 | 1 | 175,540 | 55,180 |

Both `LOD1` (≤ 8,000 triangles, ≤ 10 draws, ≤ 400 KB plain) and `LOD2` (≤ 3,000 triangles, 1 draw, ≤ 250 KB plain) meet the collaboration contract budget targets. Exact SHA-256 hashes, bounds, colliders and socket coordinates are recorded in `manifest.json`. No FPS claim is made.

## Source, validation and hand-off

Rebuild with `node tools/asset-pipeline/build-recon-rover.mjs`. Source geometry is in `tools/asset-pipeline/recon-rover-shape.mjs`; runtime choreography is in `assets/recon-rover/runtime.js`. Validate plain and decoded Meshopt files with `node tools/asset-pipeline/validate-recon-rover.mjs` and run unit tests with `node tools/asset-pipeline/test-recon-rover.mjs`. The interactive viewer is at `recon-rover/` and concept documentation is in `research/recon-rover/concept-01.png`. Hand-off is the delivery commit hash plus `assets/recon-rover/`.
