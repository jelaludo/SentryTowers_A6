# A6 solar power kit

Four families in four structural states: **solar_power_complex**, **solar_array**, **solar_panel_rack**, **solar_power_station**. The complete installation contains six tracking racks / 24 panels, collection cables, combiner and inverter/battery station. Source: `source/blender/a6-solar-power.blend`. Preview: `solar-power/`.

D3 is equipment-specific. Every rack keeps jagged photovoltaic sheets with surviving cell grids and silver conductors, broken aluminum frames, snapped axle, detached tilt drive and bent mounting rails. The station retains transformer cores and copper windings, battery modules, a buckled access door, telemetry wreckage and the cooling-fin bank. These are authored wreck meshes, not generic rubble or a scaled intact model.

## Power behavior

`solar-power/power-grid.js` is a reusable deterministic game-logic module. Consumers bind to a source ID; a source supplies consumers within its radius, in descending priority and stable ID order, until its abstract capacity is exhausted. An unrelated source remains independent. `requestTowerFire` gates firing using the computed powered state.

Array outputs by D0–D3: 180, 120, 60, 0 abstract units. Station capacity: 180, 140, 80, 0. Available power is the smaller value; either D3 forces zero. The demonstration station has a 28 m radius and three nearby towers each demand 20 units. Thus D0–D2 can run all three and D3 on either component disables tracking, emissive materials and firing. Restoring both components to D0 restores the grid. These values are game tuning, not electrical engineering ratings. Battery geometry is part of the station; no separate backup source or discharge timer is modeled.

## Assembly

Meters, +Y up, +Z forward; common plot origins across destruction states. Place the station at `[0,0,8]` relative to the array. Array `POWER_OUT` at `[0,0.15,6]` meets the station's `ARRAY_IN` at local `[0,0.15,-2]` with opposing normals. The complete-installation GLB already contains both pieces. Do not render it alongside the separate pieces in the same location.

The live preview composes the separate array and station so damage can be applied independently. It imports the existing Needle, Plasma and Railgun tower GLBs unchanged. The graph lines are a power overlay, distinct from the modeled orange cabling. No global behavior is changed in the older tower viewer.

Collision boxes remain integration helpers; use state-specific engine collision and navigation when incorporating the assets into a game. Station coil details and panel grids are authored as separate meshes; batching, LODs and runtime fracture remain future work.

Build with `blender --background --python-exit-code 1 --python tools/blender/build_solar_power.py`. Validate with `node tools/asset-pipeline/validate-solar-power.mjs` after installing asset-pipeline dependencies.
