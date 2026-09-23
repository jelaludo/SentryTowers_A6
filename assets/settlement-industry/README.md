# Frontier industry / ISAO–MÖRK–KORP lineage

Original models by jelaludo. Five intact industrial modules extend the same manufacturer language as ISAO, the MÖRK tank and KORP gunship: petrol/slate chamfered armor, pale inset panels, recessed cyan instrumentation, black mechanical cavities and restrained amber service marks. No new corporate name or third-party model is introduced.

## Story and asset roles

- **BOR-01 automated bore rig:** three stabilizing feet, a folding twin-rail mast, continuous helical auger, spare rod magazine and swinging ore chute. Extracts local mineral feed for the settlement.
- **TRK-01 planetary hauler:** six treaded wheels, protected sensor head, replaceable wheel modules, a slotted cargo deck and telescoping rear loading forks. Transports the same cassette supplied by the drill.
- **HEL-01 hexagonal heliostat:** an uninterrupted reflective face, narrow armored rim, sparse rear supports and yaw/pitch tracking. Seven share the same geometry in the settlement scene. These are ground heliostats; orbital frames, deployment hardware and station-keeping are future assets.
- **CRU-01 solar crucible:** an elevated receiver facing the mirror field, shielded process body, radiator housings and extraction hatch. Represents early solar process heat, not a thermal or ore-processing simulation.
- **CAS-01 ore cassette:** common lift interface, corner protection, service cap and a live cyan capacity gauge. It fits the truck without rescaling.

The larger progression is extraction → transport → processing → fabrication → orbital assembly. The first planetary panels establish a manufactured visual vocabulary for later stellar collectors; a Dyson structure is not supplied in this delivery.

## Export measurements

Plain GLB files are the source of truth. The optional files under derived/meshopt/ are explicitly derived, not alternate masters. No external textures, buffers or images. D0 only; damage states D1–D3 have not been authored and must never be inferred from LOD numbers.

| Module | Tier | Triangles | Draws | Plain bytes | Meshopt bytes |
| --- | --- | ---: | ---: | ---: | ---: |
| drill | LOD0 | 4,944 | 8 | 187,308 | 62,108 |
| drill | LOD1 | 2,380 | 8 | 95,064 | 37,304 |
| drill | LOD2 | 1,372 | 1 | 58,568 | 21,656 |
| hauler | LOD0 | 7,728 | 10 | 363,376 | 64,672 |
| hauler | LOD1 | 4,284 | 10 | 204,012 | 39,928 |
| hauler | LOD2 | 1,552 | 1 | 73,960 | 26,768 |
| mirror | LOD0 | 648 | 3 | 32,140 | 14,680 |
| mirror | LOD1 | 296 | 3 | 18,036 | 10,488 |
| mirror | LOD2 | 192 | 1 | 10,652 | 5,848 |
| furnace | LOD0 | 1,536 | 2 | 73,232 | 25,156 |
| furnace | LOD1 | 800 | 2 | 42,100 | 15,884 |
| furnace | LOD2 | 432 | 1 | 22,944 | 9,372 |
| cassette | LOD0 | 616 | 2 | 34,032 | 12,804 |
| cassette | LOD1 | 204 | 2 | 14,756 | 7,488 |
| cassette | LOD2 | 204 | 1 | 13,944 | 6,144 |

Each module meets its declared game budget. Every distance export is one mesh/material/draw. The complete game-tier demonstration uses 9,740 triangles and 43 model draws (seven mirrors, one of each other module); floor, grid, shadows and optional optical guides are not included. Seven mirrors share loaded geometries/materials via clones; they are not yet GPU-instanced. These counts are not FPS measurements.

## Coordinates, docking and LOD selection

Metres, +Y up, +Z forward. Roots remain at the ground-level plot centre across tiers. The manifest records measured bounds, plot sizes, sockets and operating envelopes. Truck/drill reservations include the deployed loading mechanism and ore output; colliders are not supplied.

CAS-01 attaches by aligning its root/SOCKET_CARGO with the carrier SOCKET_CARGO. In the scene it begins at (-4.4, 0.12, 0), supported by the parked truck forks under the drill chute. Cargo reaches the truck's SOCKET_BED at (0, 1.84, -1.05) in truck-local coordinates. Deck slots admit the forks, the ore chute swings clear before lifting and the right-hand anchor feet clear the cassette footprint. Preserve this sequence; arbitrary control combinations have not been collision-certified.

LOD0 is the recording/close-shot master. LOD1 preserves all engine-driven articulation. Landmark loading may use the provisional contract 150 m approach threshold with 20 m hysteresis; tune in the consuming game. Keep LOD1 on active haulers. LOD2 is only a static parked/map/loading representation: the named lookup hierarchy survives, but its controls cannot move the merged visible mesh. Distance mirrors retain their authored rest orientation and a pale opaque face, not tracked specular optics. The cassette's distance gauge is frozen at its initial reading.

Do not switch an active pickup to LOD2 and assume pose matching. Damage, inventory and detail selection are independent states.

## Engine controls and demonstration

No baked GLB clips: all clips arrays are empty by design. The source adapter runtime.js supplies a deterministic **Extraction_Collection**, a **32-second one-shot**, for the supplied scene. It does not advance a clock, loop, dispatch game inventory events or implement navigation/physics. The manifest records intended event times.

| Time | Visible action |
| --- | --- |
| 0–10 s | Drill feeds/spins and cassette gauge fills |
| 10–11 s | Ore chute swings clear; drill retracts |
| 11–15 s | Cargo forks raise the cassette |
| 15–19 s | Loading carriage slides into the bed |
| 19–21 s | Cargo secured pause |
| 21–29 s | Truck travels eight metres with rotating wheels |
| 29–32 s | Delivery stop, awaiting refinery unloading |

Engine pivots are stable, unique and dot-free across tiers. BOR: MAST_FOLD, ANCHOR_1/2/3, DRILL_FEED, DRILL_SPIN, ORE_CHUTE_SWING. TRK: six SUSPENSION/STEER/WHEEL groups, SENSOR_YAW, CARGO_SLIDE, CARGO_LIFT, LIFT_TELESCOPE. HEL: MIRROR_YAW/PITCH. CRU: CRUCIBLE_HATCH. CAS: CASSETTE_LEVEL. Socket positions and normals are enumerated per export in manifest.json. In the demonstration, truck steering/suspension, mast folding, anchor retraction and furnace hatch remain in their rest poses; pivots exist for subsequent game controls, without a claim of terrain adaptation or deployment choreography.

applyDemo(THREE, models, seconds, lod) expects the supplied drill/hauler/cassette arrangement with scene-level roots; its truck path is an example, not a generic vehicle controller. demoState(seconds) returns normalized inventory and timeline state. aimMirror(THREE, root, sunDirection, receiverPosition) computes the bisector normal for an individual articulated heliostat. Sun direction points toward the sun. Optical guides are explanatory lines, not diegetic laser beams. The furnace receiver faces the field; thermal output and material recipes are game-defined.

## Viewer and source

Local viewer: http://localhost:8765/settlement-industry/

Select the complete scene or an individual module; switch master/game/distance or plain/Meshopt; play, pause, reset and scrub the one-shot; inspect wireframe and optical guides; choose perspective/map; enter fullscreen where supported; download the selected module. Motion is paused initially. The layout places the stage above controls on narrow screens. The download selector remains independent in the full scene.

Procedural source: tools/asset-pipeline/settlement-industry-shape.mjs and build-settlement-industry.mjs. Editable detailed Blender assembly: source/blender/settlement-industry.blend. Preview renders live in previews/ and assets/workshop/settlement-industry.jpg. The Blender assembly is derived from the original procedural detailed exports and includes review lights/camera/ground; these review objects are not part of the module GLBs.

Rebuild with node tools/asset-pipeline/build-settlement-industry.mjs. Validate with node tools/asset-pipeline/validate-settlement-industry.mjs and node tools/asset-pipeline/test-settlement-industry-viewer.mjs. Render with Blender --background --factory-startup --python tools/blender/render_settlement_industry.py. Run python3 tools/build-workshop-docs.py and python3 tools/validate-workshop-navigation.py after documentation/routes change.

## Cassette geometry correction / 23 September 2026

The four pale corner strips stand 20 mm proud of the nominal side-wall plane, fixing the coplanar shimmer reported in the Workshop. Overall bounds, sockets, names and geometry counts remain unchanged. The validator checks visible strip/wall separation on all three plain and decoded Meshopt tiers.

## Validation and remaining review

validation.json records all 15 plain and 15 decoded Meshopt exports: hashes, byte/triangle/draw counts, glTF Validator errors/warnings, nondegenerate geometry, grounded and consistent bounds, stable hierarchy/socket transforms and category budgets. Sampled runtime checks cover uninterrupted cargo attachment, bed docking, lift-before-slide order, mirror reflection direction/ground clearance and static distance behavior. Viewer regression checks exercise real model graphs with mocked DOM/WebGL: startup, seven-mirror composition, playback, scrub/reset, stale downloads, tier/time restoration, individual truck controls, wireframe and load retry.

Blender renders provide visual review. A live browser was unavailable (browser provider absent and Safari window unavailable), so live GPU/browser/mobile review remains pending. The consuming game still needs Three.js r160 integration, release gltfpack validation, physics/terrain, inventory and refinery unloading, final LOD thresholds and reference-phone measurements. No FPS claim. D1–D3, orbital mirror variants and stellar construction modules remain future authoring work.

Hand-off: pin the delivery commit plus folder assets/settlement-industry/, including manifest.json and runtime.js. Optional derived/meshopt/ may be omitted if the game repacks the plain files. Credit: Models by jelaludo.
