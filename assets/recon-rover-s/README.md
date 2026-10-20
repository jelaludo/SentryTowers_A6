# R-47X-S / Six-wheel swing-arm reconnaissance rover

Separate derivative of the R-47X, with XB-12-style boxed swing arms and endpoint-driven telescopic dampers at all six wheels. The original R-47X and XB-12 are preserved. Includes D0–D3 physical damage, 19 localized damage zones, eight gimbaled cold-gas nozzles, sensor mast and four onboard displays.

## Files and coordinates

12 plain GLBs are authoritative. The 12 files in `derived/meshopt/` are optional compressed derivatives, validated after decoding. Metres, +Y up, +Z forward, root at ground / plot centre; reserved plot 6 × 8 m. `R47XS_ROVER_ROOT` identifies this family. Existing R-47X wheel, thruster, display and connection names are retained within the new family. Left is -X, right is +X. Sockets and exact bounds are in `manifest.json`.

Detailed LOD0 is the recording master. LOD1 preserves all engine-driven pivots. LOD2 is a single static mesh/material in the authored rest pose, with lookup nodes preserved; do not animate it or swap individual damage zones. Load distance first, approach at 140 m with 20 m hysteresis (provisional); use LOD1 before articulation. Damage levels are independent of LOD.

## Suspension and animation

Six stations: FL, FR, ML, MR, RL, RR. `SUSP_PIVOT_{id}` rotates about local Z with a 0.50 m hub arm. `WHEEL_STEER_{id}` and `WHEEL_SPIN_{id}` remain independent. Front steering supports ±34 degrees; wheel radius is 0.48 m.

Each `SOCKET_DAMPER_UPPER_{id}` follows the chassis; `SOCKET_DAMPER_LOWER_{id}` follows its swing arm. `DAMPER_AIM_{id}` points local +Y from upper to lower. `DAMPER_ROD_SLIDE_{id}` translates along local Y by endpoint distance. Both barrel and rod are 0.34 m long; rod diameter never scales. Call `solveDampers(root)` after custom chassis/suspension transforms, or use `applyRover(root,time,lod,options)` which calls it automatically. The adapter retains the original R-47X convention: positive suspension travel lowers the hub, unlike the XB-12 adapter. Travel clamps to -0.12…+0.14 m. Do not substitute XB-12 command signs directly.

No baked clips. `Low_Gravity_Recon_Jump_Cycle` is a 16-second looping runtime demonstration, not a physical terrain solver. The solver was checked across 960 decoded plain/compressed poses, including travel biases, chassis pitch/roll and hop motion. Minimum measured piston overlap: 0.0507 m; all endpoints remain attached.

D0 intact and D1 battered retain suspension movement. D2 affected wheel drive is 45%, travel 40%, steering limited to ±17 degrees; its arms buckle and dampers expose scorched/copper surfaces. D3 wheels are disabled and suspension parks in the inherited wreck posture. Upper and lower socket coordinates remain stable in authored exports. `applyLocalizedDamage` swaps wheel/arm/barrel/rod geometry together from a preloaded D0–D3 bank; use matching zone states in `applyRover`. Existing leak, debris and telemetry behavior is retained. This is an artistic rig, not a mechanical engineering simulation.

## Measured exports

| State | Tier | Triangles | Draws | Materials | Plain bytes | Meshopt bytes |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| D0 | LOD0 | 10,332 | 49 | 5 | 759,324 | 193,056 |
| D0 | LOD1 | 5,084 | 49 | 5 | 419,656 | 139,996 |
| D0 | LOD2 | 2,748 | 1 | 1 | 218,860 | 82,072 |
| D1 | LOD0 | 10,296 | 49 | 5 | 756,952 | 214,956 |
| D1 | LOD1 | 5,048 | 49 | 5 | 417,792 | 153,372 |
| D1 | LOD2 | 2,712 | 1 | 1 | 216,312 | 85,480 |
| D2 | LOD0 | 9,640 | 49 | 5 | 711,752 | 210,852 |
| D2 | LOD1 | 4,928 | 49 | 5 | 409,104 | 154,428 |
| D2 | LOD2 | 2,592 | 1 | 1 | 206,884 | 84,016 |
| D3 | LOD0 | 8,672 | 49 | 5 | 642,676 | 194,264 |
| D3 | LOD1 | 4,904 | 49 | 5 | 407,672 | 154,408 |
| D3 | LOD2 | 2,640 | 1 | 1 | 211,288 | 85,496 |

LOD1 meets the collaboration contract's articulated-unit triangle target of 25k. Its 49 draws include six separate moving barrel/rod pairs and the original individually addressable damage/display/thruster pieces. D0 game bytes are 419,656, above the 400 KB landmark reference; this is a mobile unit, and no draw/FPS improvement is claimed. LOD2 meets the 3k triangle / one draw / 250 KB distance reference.

## Viewer, validation and hand-off

Route: `/recon-rover-s/`. Select damage preset or individual zone, LOD, plain/Meshopt encoding, pause/scrub, drive speed, steering, suspension travel bias, sensor orientation and thrusters. **Isolate suspension & wheels** reveals the moving mechanism; disabled for static distance. Downloads are whole-rover damage variants; mixed localized damage lives in the viewer/runtime only.

Generator: `tools/asset-pipeline/recon-rover-s-shape.mjs`. Build with `node tools/asset-pipeline/build-recon-rover-s.mjs`; validate with `node tools/asset-pipeline/validate-recon-rover-s.mjs`; run behavior tests with `node tools/asset-pipeline/test-recon-rover-s.mjs`. `validation-report.json` covers all 24 files, decoded compressed validation, hashes, stable names/sockets, zero degenerate triangles, geometry metrics and damper motion. `source/blender/recon-rover-s.blend` is a derived editable review assembly; regenerate with `tools/blender/render_recon_rover_s.py`. Plain GLBs remain authoritative.

Hand off the repository commit containing this README plus `assets/recon-rover-s/`; the manifest includes per-file SHA-256. Credit: **Models by jelaludo**. Game/mobile acceptance, physical ground contact and continuous collision clearance remain pending. Original R-47X reference art and damage brief remain in `research/recon-rover/` and are not new S-variant concept art.
