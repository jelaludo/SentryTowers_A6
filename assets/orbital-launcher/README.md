# ARC-01 / Curved orbital mass driver

Original models by jelaludo. ARC-01 and SEED-01 are provisional development designations for the owner's curved electromagnetic orbital-launcher request. The assembly shares the ISAO/MÖRK/KORP manufacturer language: chamfered petrol/slate housings, pale armor caps, black recesses, cyan operational lights and amber service markings.

## Role and visual design

ARC-01 launches small collector satellites manufactured on the planet as contributions to the eventual Dyson structure. A continuous pair of upward-curving rails rises from a loading apron through sixteen acceleration cassettes, on seven braced supports. Two four-unit capacitor banks supply the visual power system. The rail uses a 40 m curve radius, 1.05 rad sweep (42 m curved length), a 6 m loading tail and a 4.5 m straight recovery extension. These dimensions are art direction, not engineering evidence that a short launcher achieves orbit.

SEED-01 packs six hinged hexagonal reflective petals around a compact satellite bus. The petals unfold after release; the rear insertion-stage plume is optional demonstration geometry. The same clean mirror language connects planetary solar machinery to a future stellar collector network. A complete Dyson sphere, orbital transfer solver and real electromagnetic/atmospheric launch simulation are not included.

## Measured exports

Plain self-contained GLB is the source of truth. The optional files in derived/meshopt/ are explicitly derived; the game still applies its own release gltfpack pipeline. D0 only, with damage states independent of LOD. No embedded textures or external buffers.

| Module | Tier | Triangles | Mesh draws | Plain bytes | Meshopt bytes |
| --- | --- | ---: | ---: | ---: | ---: |
| launcher | LOD0 | 11,784 | 6 | 678,100 | 204,236 |
| launcher | LOD1 | 5,768 | 6 | 326,140 | 104,064 |
| launcher | LOD2 | 2,952 | 1 | 165,380 | 51,944 |
| satellite | LOD0 | 1,824 | 8 | 82,368 | 23,108 |
| satellite | LOD1 | 1,128 | 8 | 55,676 | 18,792 |
| satellite | LOD2 | 840 | 1 | 39,548 | 17,444 |

Launcher LOD1 meets the landmark 8k-triangle / 10-draw / 400 KB target. Both static distance modules meet 3k triangles, one draw and 250 KB. The complete game assembly is 6,896 triangles and fourteen mesh primitives, including the collapsed optional plume. Counts exclude viewer floor/grid, shadow passes and environment. No FPS claim.

## Coordinates, sockets and detail

Metres; +Y up; +Z along the initial launch direction. ARC_ROOT is the ground-level plot centre within a 15 × 58 m reservation. SEED_ROOT is the bottom of the packed docking envelope; COLLECTOR_BODY retains the measured vertical offset that puts its stowed exterior on this datum. The manifest lists exact bounds, sockets/normals, engine nodes and hashes. The detailed recovery-cap bevel reduces the maximum height by 22.4 mm relative to the simplified tiers (26.996 m versus 27.019 m); plot, roots and sockets are unchanged. Bounds exclude the collapsed optional plume. No authored collision meshes.

SOCKET_LOADING marks the payload datum at (0, 3.03, -24). LAUNCH_SLED begins at (0, 2.6, -24). Its SOCKET_PAYLOAD at local (0, 0.43, 0) meets satellite SOCKET_LAUNCH_ATTACH without scale changes. SOCKET_RAIL_EXIT stores the exit tangent; SOCKET_POWER and SOCKET_SERVICE address external systems. The satellite supplies SOCKET_THRUSTER and SOCKET_OPTICAL_AXIS.

LOD0 is the detailed close-shot/recording master; LOD1 preserves moving sled, clamps, six petal hinges and optional plume. LOD2 retains named lookup nodes while merging visible rest geometry to one mesh/material per module. It is docked/packed, cannot animate and is not a deployed-or-flight pose. Keep LOD1 throughout active launch and collector deployment. The provisional static loading/approach policy is 150 m with 20 m hysteresis; consuming-game camera review must set final thresholds.

## Runtime demonstration

No baked GLB clips: engine-driven pivots remain unbaked. runtime.js provides **Collector_Launch**, a deterministic **30-second one-shot**. Feed seconds explicitly to applyLaunch(THREE, launcherScene, satelliteScene, seconds, lod). Either model can be omitted for isolated inspection. Inputs use the supplied scene-level coordinate frame; adapt transforms when integrating into other parent hierarchies.

| Time | Action |
| --- | --- |
| 0–4 s | Sled and attached payload advance from the loading dock to the curve |
| 4–8 s | Capacitor/accelerator lights brighten |
| 8–12 s | Sled accelerates along the curve; clamps release just before exit |
| 12–16 s | Payload separates; sled brakes within the straight recovery extension |
| 16–18 s | Sled reverses out of recovery section |
| 17–21 s | Six collector petals unfold |
| 18–26 s | Empty sled returns down the curve |
| 21–26 s | Optional insertion-stage plume appears |
| 26–29 s | Sled returns to loading dock |
| 29–30 s | Hold the deployed collector and recovered launcher |

The display flight slows to a held inspection pose 35 m beyond the exit. It is not ballistic or orbital motion. railPose(u), extensionPose(distance) and launchState(seconds) expose the art-directed path and sequence. Clamps, sled, lights, launch VFX and satellite inventory need consuming-game integration. Replaying explicitly resets the same demonstration payload; it does not spawn or count real satellites.

The six PETAL_n_HINGE nodes rotate around their local X axes from +π/2 packed to 0 deployed. LAUNCH_SLED follows rail tangent rotation around local X; CLAMP_L/R slide in local X. INSERTION_PLUME is zero-scale initially; omit or replace it with game-side VFX. Distance lookup transforms must not be used to animate the merged mesh.

## Viewer, source and checks

Local preview: http://localhost:8765/orbital-launcher/

The viewer has full assembly/individual modes, three tiers, plain/decoded Meshopt, play/pause/reset/scrub, payload-follow camera, perspective/side/map presets, a deployed Collector shortcut, wireframe, fullscreen and per-module downloads. Motion begins paused. A direct paint on load, resize and controls prevents a blank preview when Safari defers its animation callback; a watchdog services intentional playback if frames are delayed. Model URLs use manifest hashes to avoid stale cached geometry.

Source geometry: tools/asset-pipeline/orbital-launcher-shape.mjs; shared original geometric primitives/palette are imported from settlement-industry-shape.mjs. Editable detailed assembly: source/blender/orbital-launcher.blend, derived from the original GLBs with review-only floor/lights/camera. Preview images are in previews/ and assets/workshop/orbital-launcher.jpg.

Rebuild: node tools/asset-pipeline/build-orbital-launcher.mjs. Validate: node tools/asset-pipeline/validate-orbital-launcher.mjs and node tools/asset-pipeline/test-orbital-launcher-viewer.mjs. Render: Blender --background --factory-startup --python tools/blender/render_orbital_launcher.py. After documentation/routes change, regenerate and validate shared Workshop navigation.

All six plain and six decoded Meshopt exports pass glTF Validator, hashes/counts/budgets, nondegenerate geometry, ground/bounds and node/socket parity checks. Runtime samples check payload attachment, packed clamp clearance, continuous position at phase boundaries, delayed petal deployment, sled recovery/reset and static-tier behavior. Viewer regression tests use real model graphs with mocked DOM/WebGL for loading/races, controls, follow camera, tier switching and failure/retry. Blender renders and Safari live plain/decoded collector inspection provide visual evidence; they do not constitute reference-phone or game-camera acceptance.

Sustained live playback review was interrupted when the Safari window became unavailable; static/plain/decoded and direct-control inspection succeeded.

Remaining review: sustained browser playback, game integration (including Three.js r160 and release gltfpack), reference-phone performance, final thresholds, gameplay resource wiring, complete collision/structural analysis, terrain placement, mobile browser review and authored D1–D3. Real launch/orbit mechanics are outside this asset demonstration.

Hand-off: pin this delivery commit plus assets/orbital-launcher/, including manifest.json and runtime.js. Plain GLBs are authoritative; optional compressed copies and the Blender review assembly are derivatives. Credit: Models by jelaludo.
