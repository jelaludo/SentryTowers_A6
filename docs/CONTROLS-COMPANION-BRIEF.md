# Controls companion / build brief

**Date:** 30 October 2026. **Status:** proposed companion application; implementation pending. **Working code name:** CONTROL ATLAS, provisional. This document is the hand-off to a separate coding CLI, not a claim that the application already exists.

## Instruction to the implementing CLI

Build a standalone companion to the SentryTowers_A6 Model Workshop: an interactive history of video-game controls, a practical control laboratory, and a shared vocabulary for specifying how our assets should behave in future games.

Use this brief as the product specification. Inspect the available workspace, record implementation decisions, then build and verify the application through the milestones below. Deliver working experiments, researched lessons and reusable control profiles. The final result must go beyond a landing page, a glossary or a model viewer.

Default to a separate sibling project, `control-atlas/`, with its own dependencies and Git history. Treat `/Users/jela/Dev/SentryTowers_A6` as a read-only asset/reference repository; allow its location to be configured through `WORKSHOP_SOURCE_DIR`. If the receiving workspace already contains the companion, continue there. Keep the provisional display name configurable. The user has requested this brief here; application implementation belongs to the separate CLI session.

## Project code names

These are creative proposals; availability and trademark checks have not been performed.

| Code name | Suggested folder | Why it fits |
| --- | --- | --- |
| **CONTROL ATLAS — recommended** | `control-atlas` | A navigable history, vocabulary and map of control possibilities. |
| INPUT ARCADE | `input-arcade` | Emphasizes playful experiments and the nostalgia of learning by playing. |
| PILOT LIGHT | `pilot-light` | An inviting teaching space with a vehicle-control association. |
| QUARTER TURN | `quarter-turn` | Suggests arcade coins, steering, orientation and changing perspective. |
| CONTROL DECK | `control-deck` | Fits a collection of instruments, presets and test stations. |
| DEADZONE | `deadzone-lab` | Memorable, technically relevant and strongly associated with controller tuning. |
| MOTION GRAMMAR | `motion-grammar` | Emphasizes precise language for turning player intentions into motion. |

## Purpose and audience

The owner wants to understand the design choices behind controls, feel their differences, and describe them precisely when commissioning future games using Workshop assets. The app should welcome a curious player while serving as a practical reference for a designer or developer.

The central loop is **learn → try → compare → name → export**. Each historical example should explain a design problem; each experiment should reveal a meaningful tradeoff; each useful result should become a portable specification.

Success looks like replacing “make this dog control like that old game” with: “Camera-relative ground movement, analog speed, body facing travel direction, bounded yaw rate, in-place gait animation, and a third-person follow camera with manual orbit and optional recentering.” Historical examples remain useful references, but the actual behavior is stated explicitly.

Do not present control history as a simple progression from bad old controls to good modern ones. Explain constraints, intentions, habits, accessibility, genre and context. A deliberately awkward or constrained scheme may serve a particular experience well.

## Product structure and visual direction

1. **Museum:** a browsable timeline and themed exhibits. Each card includes a short lesson, original control diagram, glossary links, sources and a “Try the principle” action.
2. **Lab:** a large playable stage, actor and movement selectors, camera controls, live input visualization and a small set of clearly explained tuning controls. Advanced settings expand on demand.
3. **Compare:** save A and B, inspect their configuration differences, run the same task, replay and compare measurements alongside personal notes.
4. **Lexicon:** searchable terms with definitions, aliases, distinctions, examples and links directly into an experiment.
5. **Notebook:** saved local profiles and observations; export JSON plus a readable Markdown control specification for another developer or CLI.

Use the warmth of illustrated game manuals, arcade instruction cards and flight-test instruments. Combine restrained paper/ink colors with a clear modern 3D stage and legible telemetry. Use nostalgia through content, diagrams and typography; keep tiny pixel text, mandatory CRT effects and decorative clutter out of the main workflow. Optional period styling must remain readable and respect reduced-motion settings.

The landing screen should offer one immediate experiment and a short guided tour. A visitor should reach a playable scene without configuring every parameter. Keep the museum enjoyable without requiring 3D support or a gamepad. Every scene has visible controls, pause, reset and a way back to the lesson.

## The vocabulary model

Separate these dimensions in the data model and UI. “Controller” is overloaded: label a physical device **input device** and the runtime movement code **locomotion controller**.

| Dimension | What it describes | Examples |
| --- | --- | --- |
| Input device | Physical source of signals | Keyboard, mouse, D-pad, analog stick, wheel/pedals, flight stick, trackball, touch, gyro. |
| Binding/action map | Translation from a physical input to an intention | W → move forward; left stick → move vector; trigger → throttle. |
| Input processing | How signals are transformed | Dead zone, response curve, sensitivity, inversion, smoothing, buffering. |
| Reference frame | Axes against which an intention is interpreted | World-relative, camera-relative, actor-relative, surface-relative. |
| Locomotion model | How intention changes position and orientation | Kinematic character, steering vehicle, thrust-driven craft, torque-driven sphere. |
| Facing and aiming | Relationships between body, travel, target and view | Face movement, strafe, independent aim, target lock. |
| Camera | Where the observer is and how the view moves | First person, cockpit, chase, orbit, fixed, overhead, side view. |
| Animation | How motion is presented and coupled to travel | In-place clips, root motion, gait selection, blending, foot IK. |
| Assistance | Rules that help execute an intention | Auto-centering, heading hold, braking assist, coyote time, jump buffering. |

A third-person camera does not imply camera-relative movement. First person does not specify the movement physics. Orthographic is a projection, not a movement scheme. Quadrupedal is a body/locomotion category, not an input device. “Tank controls” for a character means actor-relative forward/back and turning; differential steering describes a vehicle mechanism. Document these distinctions with paired demonstrations.

Seed the glossary with at least 40 substantive entries spanning the groups below. Each entry needs a stable ID, plain-language definition, implementation meaning, common aliases or ambiguities, a contrasting term, a source where appropriate, and a linked example. Do not populate it with circular one-line definitions.

| Group | Required coverage |
| --- | --- |
| Inputs | Digital/analog; absolute/relative input; action/binding; axis; chord; hold/toggle; polling; input sampling. |
| Processing | Axial/radial dead zone; outer dead zone/saturation; response curve; sensitivity; acceleration; smoothing; hysteresis; input buffer. |
| Ground movement | Camera/world/actor-relative movement; strafing; tank controls; turn rate; acceleration/deceleration; braking; traction; slip; steering angle; turning radius. |
| Character feel | Grounded/airborne state; air control; coyote time; jump buffering; variable jump height; turn-in-place; root motion/in-place animation; gait; foot planting. |
| Flight and space | Pitch/yaw/roll; throttle/thrust; lift/drag; bank-to-turn; auto-level; angular-rate control; attitude control; six degrees of freedom; translational versus rotational freedom. |
| Camera and aim | Orbit/chase/fixed cameras; field of view; perspective/orthographic projection; camera lag; recentering; collision avoidance; aim versus look; lock-on; horizon stabilization. |
| Simulation and evidence | Kinematic/dynamic; force/torque; velocity/acceleration; fixed timestep; interpolation; repeatability; input latency versus frame time. |

State units: meters, seconds, m/s, m/s² and degrees in user-facing controls. Declare radians where used internally. Define input ranges, sign conventions and whether sensitivity is per mouse displacement or a stick-driven angular rate. A feeling such as “heavy” must link to specific parameters and a reproducible task.

## Historical curriculum and research standard

Ship at least 12 concise, sourced exhibit cards across the following themes. The titles below are **research candidates**, not verified claims about original defaults, invention or chronology. Confirm the exact release, platform, region where relevant, hardware and control options before publishing a comparison. Remakes, ports and modern reissues can differ.

| Theme | Candidate references to investigate | Playable principle |
| --- | --- | --- |
| Dedicated arcade hardware | Pong, Breakout, early steering-wheel games | Absolute position, constrained axes and specialized devices. |
| Rotation, thrust and momentum | Asteroids, Lunar Lander | Heading differs from velocity; thrust, coasting and braking. |
| Digital movement and platforming | Pac-Man, Super Mario Bros. | Discrete directions, acceleration and jump timing. |
| Multiple independent control axes | Robotron: 2084 and later twin-stick games | Movement and aim can be separate. |
| Early first-person navigation | Doom, Quake | Turning, strafing and mouse look; distinguish defaults from community practice. |
| Fixed cameras and actor-relative motion | Original Resident Evil and Tomb Raider releases | Tank-style movement, camera cuts and spatial continuity. |
| Analog 3D movement and camera negotiation | Super Mario 64 | Stick magnitude, facing, movement reference frames and camera operation. |
| Target-centered navigation | The Legend of Zelda: Ocarina of Time | Lock-on changes facing, movement and camera relationships. |
| Driving and flight conventions | Out Run, Gran Turismo, Pilotwings, flight simulators | Steering versus heading commands; arcade assists versus simulation assumptions. |
| Rolling and indirect movement | Marble Madness, Super Monkey Ball | Direct rolling input versus tilting the environment. |
| Nonhuman embodiment | Ōkami, a suitable quadruped example verified during research | Familiar player actions expressed through another body, gait and turning envelope. |
| Modern alternatives and access | Touch, gyro, remapping, adaptive devices | Hardware choice, configurable actions and reduced input burden. |

Every exhibit must contain: the design problem; hardware constraints; a labeled input diagram; what the player actually controls; the movement/camera relationship; useful vocabulary; benefits and costs; a short challenge; a linked lab profile; and source records. Record source title, author/publisher, full URL, relevant page/section, access date and the specific claim supported. Separate documented facts, observations and our interpretation.

Prefer original manuals, developer talks/interviews, official documentation and released source code. Supplement with reputable preservation or historical sources where originals are unavailable. Do not assert “first ever” without unusually strong evidence. Label our experiments **inspired by a control principle** unless fidelity has been established; disclose simplified physics, different devices and modern conveniences. Original game art, ROMs and audio are not required: use our own scenes and diagrams.

Useful source starting points located for this brief; the implementing CLI must inspect relevant sections and complete the broader research:

- Nintendo's Super Mario 64 manual, for a primary account of its controls:
  https://www.nintendo.com/eu/media/downloads/games_8/emanuals/nintendo_8/Manual_Nintendo64_SuperMario64_EN.pdf
- id Software's released Quake input code, for studying action construction; source code alone does not establish a typical player's bindings:
  https://github.com/id-Software/Quake/blob/master/WinQuake/cl_input.c
- W3C Gamepad specification, for device exposure and standard versus unmapped layouts:
  https://www.w3.org/TR/gamepad/
- Game Accessibility Guidelines, for configurable inputs and related access considerations:
  https://gameaccessibilityguidelines.com/full-list/

## Playable laboratory scope

The complete first release includes the seven modules below. They may share one compact test environment with dedicated stations. Implement visibly different behavior, not differently named presets of the same movement code. Use clear primitive proxies while importing assets; missing models must not block control experiments.

| Module | Required experiments | Useful tuning and task |
| --- | --- | --- |
| Biped | Camera-relative movement with facing-to-travel; strafe/independent look; actor-relative tank-style variant | Speed, acceleration, yaw limit, jump assistance; slalom, reverse and land on a platform. |
| Quadruped | Direct desired-direction control versus forward-and-turn control; walking/running gait transitions | Turn radius/rate, acceleration and gait thresholds; weave gates, stop and clear a low hurdle. |
| Driving | Steering/throttle vehicle plus a differential-steering variant | Steering range, speed-dependent turning, grip, brake/reverse semantics; slalom, parking and stopping-distance course. |
| Hover/VTOL | Assisted translation/heading versus attitude-and-thrust control | Damping, auto-level and altitude hold; hover, move sideways and land on a pad. |
| Fixed-wing flight | Simplified bank/pitch/throttle flight with optional assists | Bank, pitch, lift/drag approximation and leveling; pass rings and make a coordinated turn. Label the model as simplified. |
| Free-space craft | Six-DOF translation and rotation; damped versus inertial motion | Thrust, angular response and separate linear/angular damping; orient, brake and dock. |
| Sphere | Force/torque-driven rolling versus tilting the test surface | Rolling resistance, traction, braking and tilt limit; ramp, balance and stop on a target. Keep visual shell spin separate from camera orientation. |

Swimming, climbing, grappling, tracked multilegged hybrids, rotorcraft-specific aerodynamics, wheels/HOTAS calibration, native gyro, VR and multiplayer are extensions after the complete first release. The input architecture should admit them; they need not all be implemented immediately. A stationary turret can become a later aim-only exhibit.

Provide these camera modes where meaningful: first-person/eye, cockpit, third-person follow, shoulder, manually orbiting third person, fixed external, top-down/isometric and side-on. Include a free spectator view for inspection. At minimum, every module needs an external view, each biped needs first/third-person comparison, and each flying module needs an onboard view. Primitive cockpit framing is sufficient; no new cockpit asset family is required.

Camera configuration includes projection, FOV or orthographic scale, distance/offset, damping, orbit sensitivity, recenter policy, horizon/roll policy and collision handling. Mark unsupported combinations with a reason. Changing only the camera must not silently replace the locomotion profile; camera-relative inputs can naturally change their world direction when the view rotates, and the UI must explain that coupling. Distinguish moving the camera from steering the actor.

## Experiment tools and export

- Show raw inputs, processed axes and active actions together, with a small device diagram. Unknown gamepad layouts need explicit calibration rather than guessed button labels.
- Display velocity, acceleration, facing, travel direction, current mode and relevant forces or contact state. Optional arrows and trails should explain what is happening without obscuring the scene.
- Provide pause, single simulation step, reset, repeatable scenario seed and slow motion. State whether parameters take effect immediately or require reset; never reset silently.
- Compare A/B from the same initial conditions, course and seed. Show configuration differences and keep unchanged variables fixed. Start with sequential trials and a ghost/path overlay; simultaneous split-screen is optional.
- Record tick-indexed commands for locomotion comparisons. For input-mapping/camera experiments, also record the necessary raw device and view state, because already-transformed commands cannot test a different mapping. Store initial state, app/controller versions, profile, seed and timestep with recordings.
- Measure task time, stopping distance, overshoot, path deviation, collisions and success rate where defined. Keep subjective comfort/control notes separate. Describe the limits of a small personal trial; do not rank a universal “best” scheme.
- Export a versioned JSON profile plus Markdown explaining the device map, reference frame, motion, facing, camera, assists, animation, values/units, reference exhibits, results and unresolved integration needs. Include complete source URLs and asset provenance. Offer a copyable prompt for a future game-building CLI.

Example human-readable export, with illustrative lab values rather than asset specifications:

> Actor: RECKON K9. Interpret the left stick or WASD as camera-relative planar movement. Preserve analog magnitude and normalize digital diagonals. Face travel direction, with a 180 degrees/second yaw limit, 4 m/s speed cap and 3 m/s² acceleration. Use in-place gait animation synchronized to traveled distance. Use a third-person follow camera with manual orbit, no automatic recentering and a stable horizon. Release input to decelerate at 5 m/s². Keep body heading separate from camera yaw. These are experimental values, not biological measurements or promises of matching another game.

Profiles must reference independent reusable components rather than a monolithic “feel” string. A representative schema outline is:

```json
{
  "schemaVersion": 1,
  "id": "quadruped_camera_relative_v1",
  "label": "Quadruped / camera-relative",
  "actorAdapterId": "reckon_k9",
  "inputMapId": "ground_move_keyboard_gamepad",
  "inputProcessingId": "radial_linear_default",
  "referenceFrame": "camera_ground_plane",
  "locomotion": {
    "id": "kinematic_quadruped",
    "version": 1,
    "maxSpeedMps": 4,
    "accelerationMps2": 3,
    "decelerationMps2": 5,
    "turnRateDegPerSec": 180
  },
  "facingPolicy": "travel_direction",
  "cameraProfileId": "follow_manual_orbit_no_recenter",
  "animationPolicy": "in_place_distance_synced",
  "scenarioId": "ground_slalom_v1",
  "assists": [],
  "referenceExhibitIds": [],
  "notes": "Illustrative lab preset; not a historical reconstruction."
}
```

Define and export every referenced component or resolve it against a versioned registry included in the export. Preserve a user's custom binding/calibration settings. Validate imports, ranges, finite numbers, compatible components and schema versions; show useful errors rather than silently substituting another controller. Store profiles/notes locally without an account, with explicit download/import for portability. Shareable routes should identify lessons and built-in profiles; local files need not become a hosted sharing service.

## Reusing the Workshop assets

Read `AGENTS.md`, `ASSET-LICENSE.md`, `docs/ASSET-COLLABORATION.md` and the selected asset READMEs/manifests before integration. Keep the received collaboration contract verbatim. Its requirements are not evidence that every older asset already complies.

| Role | Starting folders in SentryTowers_A6 | Integration considerations |
| --- | --- | --- |
| Biped | `assets/b-rek37/`, `assets/eva-k7/`, `assets/eva-k8/` | Inspect available clips and speeds. A rig may have no run/jump clip; use a labeled procedural presentation or proxy rather than inventing source capabilities. |
| Quadruped | `assets/reckon-k9/`, `assets/mechanical-cheetah/`, `assets/k0-tech-01/` | Inspect gait and root-travel contracts. `quadruped-playground/` is a useful reference for motion composition, not proof of a general-purpose character controller. |
| Driving | `assets/recon-rover/`, `assets/recon-rover-s/`, `assets/xb12/` | Preserve steering/suspension pivots and documented sign conventions. Rendering a suspension does not establish physical suspension behavior. |
| Hover and flight | `assets/hover-tank/`, `assets/hugin-flight/`, `assets/sh-rocket/` | Audit each family individually. HUGIN flight uses a center-of-mass reference and static poses; do not assume a ground-origin animated rig. Use simple original proxies for missing aircraft types. |
| Sphere | `assets/tai09/` and its current `torque/` exports | Read the current README before choosing files. Separate stable core, rolling shell and camera. Existing assisted movement is a reference, not a general rigid-body solver. |

Import the complete glTF scene through an actor wrapper; retain original node names, animation pivots, sockets and scale. Declare per-asset transforms and root-motion ownership in adapters. Do not apply clip translation twice. Match gait playback to movement where possible and expose animation limitations independently of controller behavior. Record axis/sign exceptions explicitly instead of renaming the source rig.

Pin imported files by source repository, commit, path and SHA-256 in an asset lock. Keep a reproducible local import command; the deployed app must not depend on the sibling checkout or mutable hotlinks. Use original plain GLBs as the source of truth. Credit **jelaludo** and include the reuse notice. Model/animation permission does not automatically license copied viewer code or third-party dependencies; inspect those separately or implement an independent adapter.

Default to articulated game tiers, with detailed tiers for close shots/recordings. Static distance/loading tiers must never substitute for an actor whose articulation is visible. Keep damage states separate from detail levels. Measure triangles, draw calls and byte sizes; record LOD selection rules, source versus derived files and integration limits. Preserve originals. If any assets are newly authored or substantially revised, provide detailed/game/distance tiers where useful and satisfy the collaboration manifest and budget requirements. Validate decoded compressed derivatives if produced; do not claim FPS gains without measurement.

If Workshop documentation or viewers are later changed in the source repository, keep `docs/DEVLOG.md` and its website Devlog synchronized and run `tools/build-workshop-docs.py`. Workshop viewers must retain its generated shared navigation. The independent companion can have its own navigation with a clear return link:

https://jelaludo.github.io/SentryTowers_A6/

## Implementation defaults

Use a browser-first, statically deployable application. TypeScript, Vite and Three.js are the proposed starting stack because the asset library already uses glTF/Three.js. Verify and pin compatible versions in the companion lockfile. Choose a lightweight UI approach; a large framework is optional. No backend, login or cloud synchronization is required for the first release.

Separate device adapters, action maps, input processing, movement, camera, animation adapters, lesson/glossary data, scenarios and experiment recording. Content and profiles should be editable as validated data files. Use stable identifiers and routes. Prefer one physics layer where rigid-body behavior is needed; record the choice and its limits. Explicitly distinguish kinematic approximations from force/torque simulation. A fixed-wing demo may use simplified lift/drag, but should not merely move a free camera wearing an aircraft model.

Run simulation at a declared fixed timestep with render interpolation; render rate must not set movement speed. Define input sampling and buffering at simulation boundaries. Keep mouse displacement independent from stick rate semantics, avoid doubled integration, clamp long-frame catch-up, pause on focus loss and clear held inputs. Document determinism limits: same-build repeatability is the initial target, not bit-identical physics across every browser/device.

Support keyboard/mouse and standard gamepads throughout the first release. Detect connection/disconnection and mapping changes; offer a keyboard fallback. Pointer lock starts from a deliberate action, exits normally, and has a visible recapture control. Do not capture movement keys while editing text or navigating menus. All bindings shown in help must reflect the active map.

Include remapping with conflict detection, axis inversion, sensitivity/dead-zone adjustment, hold/toggle options where applicable, reduced camera motion, adjustable FOV, pause and comfortable defaults. Make menus keyboard usable with visible focus; do not convey state only through color. Provide readable text equivalents of the diagrams and experiments. On phones, museum/lexicon/notebook remain usable; a limited touch lab may follow, with unsupported experiments clearly identified. Full mobile simulation parity is not a first-release requirement.

## Delivery milestones

1. **Foundation and one complete loop:** initialize the independent app; create content/profile schemas, input abstraction, one ground course, a biped proxy and then one Workshop asset; implement first/third-person comparison, one sourced exhibit, glossary links, A/B and working JSON/Markdown export/import. Establish the architecture through a usable end-to-end slice.
2. **Complete control lab:** implement all seven modules and their specified contrasting variants, cameras, tuning, repeatable tasks, input visualization and recordings. Integrate representative Workshop assets; retain proxies for unsupported bodies and clearly document gaps.
3. **Complete learning experience:** deliver at least 12 sourced exhibits and 40 substantive glossary entries, cross-links, original diagrams, a short guided tour and useful example profiles. Review historical accuracy and consistent terminology.
4. **Verification and hand-off:** finish access settings, error handling, static deployment support, asset locks/credits, measured runtime reports and documentation. Deliver the source, runnable build, screenshots, test evidence and an explicit list of remaining extensions. Do not stop at milestone 1 and describe the full brief as complete.

## Acceptance and evidence

- A newcomer can open an exhibit, launch its experiment, alter one meaningful parameter, compare A/B, and export a self-contained specification usable by another CLI.
- All seven movement modules run and complete their authored tasks. Required contrasting variants have demonstrably different control semantics. Input, locomotion, camera and animation choices remain independently inspectable.
- Lessons identify exact versions/platforms and cite claims. No unsourced invention/priority claims, fabricated quotes or falsely exact recreations. At least 12 finished exhibits and 40 glossary entries link to useful examples.
- Keyboard/mouse and a real standard gamepad are checked. Automated input mocks supplement hardware checks; they do not count as real hardware validation. Report hardware unavailable for testing as unverified.
- Focus loss, gamepad disconnect and pointer-lock exit do not leave actors moving. Remapping updates help and survives reload. Invalid imports fail visibly without corrupting saved profiles.
- Reset/replay reproduce results within a stated tolerance for the same build, seed and initial state. Test straight/diagonal movement, a stopping-distance case, an attitude/thrust case, sphere force/torque response and changing render rates against the fixed simulation.
- Camera switching, collisions and extreme view angles remain usable; camera-relative movement handles near-vertical views without invalid vectors. View choice must not silently modify movement parameters.
- Asset hashes, transforms, animation ownership and loading failures are checked. Missing assets have a visible fallback. Static tiers never pretend to support animation.
- Run build/type checks, meaningful controller/schema tests and browser workflow tests. Inspect actual desktop UI and a narrow layout, plus at least one additional browser engine. Test direct links under a static-hosting subpath. Report exactly what was exercised.
- Record browser/device, viewport, active scene/tier, triangles/draws/bytes and measured frame timing. A 60 Hz desktop experience is an initial design target, not a performance claim. App timestamps are not an end-to-end physical input-latency measurement.

The final hand-off must include a README with setup/build/import/test commands; architecture and vocabulary notes; historical source records; profile/recording schemas and example exports; asset locks and attributions; known limitations; test/measurement reports; screenshots; and a brief devlog distinguishing completed work from pending extensions. Supply the companion commit hash plus project folder when committed. Keep the scope centered on learning and specifying controls; a campaign, combat system, open world or asset-authoring suite is unnecessary.
