# STALHEART / From builder to settlement

Models by jelaludo. A separate **144-second animated diorama** using the existing under-beam-wheel STALHEART-KIDOU, ISAO, MÖRK and Dome City habitat. Open `../../stalheart-diorama/`.

## Story and controls

`ISAO_STALHEART_Settlement_Sequence` is a deterministic runtime one-shot, clamped at 144 seconds. The viewer starts automatically; looping is optional. It is a composed browser animation, not a newly baked GLB clip or video file.

| Time | Action |
| --- | --- |
| 0–6 s | Original-size ISAO flies into the assembly site. |
| 6–13 s | ISAO prints the left wheel base and tower, bottom to top. |
| 13–15 s | ISAO flies to the right base with its print beam off. |
| 15–22 s | ISAO prints the right wheel base and tower; the completed left leg stays visible. |
| 22–24 s | ISAO moves above the completed supports, with its beam off. |
| 24–26 s | The upper span connects the two legs from left to right. |
| 26–28 s | ISAO finishes the roof and silos upward. |
| 28–30 s | The suspended carriage, feed and arm finish downward from the supported top. |
| 30–34 s | The complete gantry wireframe holds for inspection. |
| 34–44 s | Original STALHEART materials appear from bottom to top. |
| 44–50 s | ISAO clears the bay; STALHEART positions its arm. |
| 50–72 s | The arm prints a full-scale MÖRK in cyan wireframe. |
| 72–78 s | The tool rises, leaving the completed wireframe tank. |
| 78–98 s | The eight wheels roll 52 m along +Z to the second site. |
| 98–104 s | The gantry positions its arm over the habitat foundation. |
| 104–132 s | A half-scale Dome City habitat grows in green wireframe. |
| 132–144 s | The camera opens out to both completed builds. |

Pause/play, restart, a full timeline scrubber, ten chapter buttons, ½×/1×/2×/4× playback, optional loop, cinematic/overview/gantry/ISAO/tool cameras, free orbit, two detail selections, fullscreen and PNG capture are available. Scrubbing backward reconstructs the same state without replaying earlier frames. The camera follows the small ISAO at close range during assembly; its model is not enlarged. MÖRK and the habitat remain wireframes at the endpoint.

“Surface finish” reveals the donor model's original materials and vertex colours. No new bitmap texture is added to the gantry. The tank and habitat solids are used only to derive linework and are never added to the visible scene. Line geometry is merged into one `LineSegments` draw for each build. The gantry uses per-vertex construction times; the tank and habitat use height clipping. Each has a bright advancing edge. It is derived review geometry, not an authored replacement for the source mesh.

## Frames, scale and motion

Metres, +Y up, +Z forward. `STALHEART_DIORAMA_ROOT` sits at the first site, on the ground. The presentation platform is 92 × 132 m, centered at [0, 0, 26]. STALHEART and ISAO retain original scale. The tank origin is [0, 0, 2.6]; the second gantry origin is [0, 0, 52]; the dome origin is [0, 0, 54.6]. Wrappers namespace source assets; canonical pivots and socket names inside them remain unchanged.

The habitat is uniformly scaled to **0.5×**, including its mast and empty sentry cradle. Its measured envelope is **14.6000 × 14.6000 × 17.9250 m** (width × length × height). It has 6.8 m lateral clearance to each inner side-beam edge, 2.1 m longitudinal margin inside the 24 m chassis envelope, and 7.075 m below the conservative 25 m working-height limit. These checks establish placement in the bay; they are not a general mechanical self-collision certification. The scaled dome is a diorama instance, not a revision to the city module's connection socket standard.

`runtime.js` calls the canonical KIDOU adapter for wheel contact, rigid swing arms, dampers and material-feed hoses. Wheel rotation follows actual root displacement at the existing 1.82 m nominal tire radius. Its separate print pose drives the preserved carriage, lift, base yaw, shoulder, elbow and wrist pivots. A two-link solve preserves the 6 m / 5.6 m arm dimensions and counter-rotates the wrist to keep the nozzle vertical. The nozzle remains at least 0.8 m above the current print layer, with a visible fabrication beam covering the gap. The layer path uses bounds sampled from the derived wire geometry. Carriage and arm poses blend continuously at chapter boundaries.

Revision 2 divides the gantry linework into left support, right support, connecting span, roof and hanging mechanism. Edges crossing the 28 m support boundary, 33.2 m roof boundary or centre plane are split before assigning `buildAt` and `buildPart` attributes. This prevents a partly revealed edge from exposing another section early while retaining one line draw. The original `STALHEART_ASSEMBLY_WIREFRAME` lookup remains unchanged. `layout.json` records section bounds, counts and timings. Transfers and the complete-wireframe hold switch the assembly beam off.

ISAO reuses `Rotor_Cycle`, `Emotion_Working` and `Tool_Fabricate` through an AnimationMixer. Its assembly beam follows samples of the active section's construction frontier. Its root flight path, the gantry's transfer and the cinematic camera are presentation choreography. Production navigation, load/force simulation, extrusion physics, real robot joint limits and general collision engineering remain outside this scene.

## Sources and tiers

`layout.json` pins every source by SHA-256 and bytes, from source revision `acb8221`. All four source families remain byte-for-byte unchanged. Plain GLB is the source of truth; there is no merged diorama GLB and no new compressed export. Hand off the containing commit plus this folder, `stalheart-diorama/`, and the four referenced source folders listed in the layout. Each entry records D0, source LOD, bounds, triangles, draws, sockets, clip durations and credit.

| Selection | Source GLB bytes | Source mesh triangles | Source primitive draws | Generated wire segments |
| --- | ---: | ---: | ---: | ---: |
| Detailed / LOD0 | 12,562,744 | 240,924 | 221 | 155,768 |
| Game / LOD1 | 2,734,600 | 45,431 | 171 | 26,839 |

Source counts include the tank and dome meshes used to generate linework and all ISAO expression meshes, including hidden states. They are not simultaneous rendered-scene counts. Actual model-only renderer measurements at six story times are recorded separately in `viewer-validation.json`; scenery, labels and stage lighting are excluded from those passes. Shader clipping still submits full line buffers, even when only part of the build is visible. The detailed selection is intended for close shots/recording, and the reduced selection is the default. No FPS claim or new per-module budget-compliance claim is made for this multi-asset composition.

At the final overview camera (144 s), the measured model-only pass is 32,809 triangles / 96 draws / 11,364 line segments for the game selection and 205,448 triangles / 146 draws / 27,306 line segments for the detailed selection. Counts change with the camera frustum and active build effects; these are actual submitted render primitives, not the full source totals above.

There is no automatic LOD swap. Static donor distance proxies retain their canonical parked poses and cannot reproduce the final raised print arm, so they are deliberately not presented as an animated scene tier. The source families' separate loading/distance exports remain available to the game. Damage states and LOD are separate; this diorama demonstrates D0 only. Release gltfpack packing/decoded validation, game-camera review and reference-device measurements remain pending if the scene is integrated into gameplay.

## Validation and rebuild

`validation.json` records **578 sampled frames**, plus 24 section-order samples across both detail selections: source preservation, finite matrices, wire-only products, dome fit, deterministic random seeking, continuous chapter and ISAO flight boundaries, left-before-right-before-top visibility, beam-off transfers, active-section targeting, rigid links, downward tool direction, nozzle-layer clearance, wheel contact/rolling and hose endpoints. Maximum sampled print horizontal residual is below 0.0001 mm; link-length residual is below 0.001 mm. This is kinematic evidence, not a physical simulation claim.

`viewer-validation.json` records browser playback, phase visibility, backward scrubbing, chapters, speeds, pause, endpoint clamping/looping/restart, camera modes, fullscreen, image capture, shared navigation, mobile layout and measured renderer counts. Previews are derived browser captures.

Rebuild source pins and line metrics with `node tools/asset-pipeline/build-stalheart-diorama.mjs`. Run `node tools/asset-pipeline/validate-stalheart-diorama.mjs`, followed by `test-stalheart-diorama-viewer.mjs` with Playwright and Chromium available. Rebuild shared navigation and the website Devlog with `python3 tools/build-workshop-docs.py` after documentation or route changes.
