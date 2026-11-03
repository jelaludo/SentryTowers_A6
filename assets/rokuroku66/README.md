# RokuRoku-66 / Six independent serpentine limbs / v1.2

Isao’s second biomimetic study grows out of the Nih-Dairia mech: a low hexagonal hub with six long, tapering limbs made from short geared vertebrae. Each joint has two perpendicular motor housings, a central cable passage and short ivory armor scales. Equal sideways bends form arcs; increasing bends produce spirals; coordinated sideways and vertical bends wind a limb around a pole. The supplied RokuRoku-66 concept defines the new silhouette. All mechanical geometry is procedurally authored; reference images are external and recorded by hash.

Viewer:

http://127.0.0.1:8791/rokuroku66/

Start a local server at the repository root before opening that address. The separate Nih-Dairia family remains at revision `0697a7f2e023043fcc6298f18029608d46b12824`; this family does not replace its geometry or behavior.

Revision 1.2 adds seeded roaming, hesitation, tentacle surveying and a rush/arrival performance to the two existing walks. Geometry and all six original GLB files remain byte-for-byte unchanged from `aef140cf025b45026daac3e3a37ccbe30127cc10`; movement uses the existing engine-driven pivots.

## Measured exports

| Tier | Triangles | Material draws | Plain bytes | Derived Meshopt bytes |
| --- | ---: | ---: | ---: | ---: |
| LOD0 / detailed | 143,864 | 3 | 7,198,676 | 1,452,304 |
| LOD1 / articulated game | 24,888 | 3 | 1,644,860 | 474,436 |
| LOD2 / static distance | 2,976 | 1 | 242,796 | 177,728 |

Plain GLBs in `lod0/`, `lod1/` and `lod2/` are the source of truth. Optional files under `derived/meshopt/` are compressed derivatives. The game tier meets the unit target of 25,000 triangles; the optional distance tier meets 3,000 triangles, one draw and 250,000 bytes. No textures or external resources. Three shared palette materials group the articulated geometry into three draws. Tiny rings, fasteners and the second slack cable are omitted in the game tier. Distance removes the joint detail and merges an extended silhouette into one static mesh/material. No FPS improvement is claimed; the 667-control skeleton still needs target-device profiling.

Only D0 is authored. Damage states D1–D3 are not represented by LOD numbers. Each manifest entry includes hashes, sizes, triangles, draws, bounds, plot, sockets, empty baked clips, engine nodes and credit.

## Geometry and controls

Metres, +Y up, +Z forward. `ROKUROKU_66_ROOT` stays at ground level at the plot centre. Nominal extended bounds are 8.722 m wide × 10.064 m long × 1.415 m of geometry, with a highest point at 1.426 m. Scale is an authoring assumption. Reserve a 12 × 12 m plot; the conservative inspection envelope is `[-6,0,-6]` to `[6,8,6]`. No ground or pole is exported. Pose-dependent body height belongs to `BODY_HEAVE`; world movement belongs to an outer game parent.

Six mounts sit at radius 0.70 m, numbered 01–06 at 60° intervals; 01 faces +Z. Each limb has 22 vertebrae, tapering from 235 to 181 mm joint spacing, with a total chain length of 4.576 m. Armor half-width tapers from 115 to 42 mm. These are fixed-length links, replacing Nih-Dairia’s long telescopic sections.

All tiers preserve 676 required names: the root, 667 controls and eight sockets. Names are unique and dot-free. Each `LIMB_nn_MOUNT` has a chain of `LIMB_nn_V01` through `V22`:

| Suffix | Role |
| --- | --- |
| `_YAW` | First motor, rotation about local +Y; side-to-side bending |
| `_PITCH` | Child of yaw, rotation about local +Z; vertical bending; local +X runs down the link |
| `_SCALE` | Short armor base, translates slightly back and away from the spine under curvature |
| `_DORSAL_LIP` | Rounded forward overlap lip, follows the next joint’s yaw and positive pitch |
| `_VENTRAL_LIP` | Recessed underside overlap lip, follows the next joint’s yaw and negative pitch |

The engine may drive yaw and pitch up to ±0.72 rad (±41.25°). This is a motor limit, not a guarantee that every combination is collision-free. There are 264 motor axes across 132 vertebrae, plus the passive armor controls. Lip rotations depend on the neighboring joint: a long rigid shell would collide during tight coiling. The bases retract slightly, the appropriate lip lifts, and the outer bend opens a gap. Adjacent scales overlap in the straight pose.

Rigid parts have one bone influence. Short U-shaped service loops near the joint centre blend between adjacent bones; the master carries two loops for power/data and the game tier uses one visual representation. Slack is visible, but skinning does not model cable tension, fixed cable length or electrical routing.

Sockets: `SOCKET_LIMB_01_TIP` through `SOCKET_LIMB_06_TIP`, `SOCKET_DORSAL_TOOL`, and `SOCKET_POWER`. The limb tips are endpoint frames, not ground-contact constraints; their normal follows the distal link. Use current world socket transforms while articulated. Rest transforms and normals are in the manifest and remain consistent across tiers. LOD2 retains the hierarchy solely for lookup; moving its bones does not deform its geometry.

## Runtime demonstrations

Import `applyPose`, `motions` and `limbs` from `runtime.js`. Call `applyPose(gltf.scene, timeSeconds, mode, options)` after loading an articulated plain or decoded GLB. Options are `selected: '01'` through `'06'`, `amount: 0–1`, and optional manual `yaw`/`pitch` in radians. `animate: false` applies full requested amount independently of cycle time. The adapter returns per-limb angle arrays, active limb IDs, maximum yaw/pitch, body height, strength and the pole fixture position. Static LOD2 returns a static status without changing the geometry.

| Mode | Runtime name | Duration | Behavior |
| --- | --- | --- | --- |
| `walk` | `Organic_Walk_Cycle` | 4.8 s loop | Staggered six-limb ripple, 0.34 m/s, 74% stance duty, four or five tips planted |
| `scout` | `Sensor_Walk_Cycle` | 5.6 s loop | Four walking limbs, 0.25 m/s, 80% stance duty; front 01/02 scan independently |
| `mixed` | `Mixed_Curvature_Idle` | 10 s loop | 01/03/05 extend toward the floor; 02/04/06 form upright coils with slight side motion |
| `extended` | `Extended_Idle` | 8 s loop | Six extended, gently sinuous limbs; deliberately static inspection pose |
| `arc` | `Arc_Cycle` | 10 s loop | Same yaw on the last 18 joints; up to 0.24 rad per joint |
| `spiral` | `Spiral_Cycle` | 12 s loop | Yaw increases from 0.20 to 0.68 rad toward the tip; six planar spirals |
| `wrap` | `Pole_Wrap_Cycle` | 12 s loop | Selected limb makes a rising helix using both axes; other five retain their extended pose |
| `manual` | `Joint_Inspection` | Untimed inspection | Selected limb receives uniform yaw ±0.24 and pitch ±0.18 rad after four straight lead joints |

These names/durations describe the runtime adapter; GLB `clips: []` is intentional. No engine-driven pivots are baked. Arc/spiral/wrap use a cosine strength cycle: straight at time 0, fully bent at half-duration, straight at the end. The manual UI uses a narrower range than the motor limit because a uniform sharp bend would loop into itself. It raises the whole specimen when needed to inspect downward bends above the floor. Switching modes directly selects a study pose; transitions between gaits and curvature studies are not blended.

The separate viewer pole has radius 0.25 m and height 3.6 m. The chosen limb uses four straight lead links, then a chord-length-preserving helix with centreline radius 0.47 m and rise 0.10 m per radian. The fixture moves with limb selection. Minimum sampled limb-to-pole clearance is 0.106 m: the wrap illustrates 3D curvature around an object, not a force-bearing grip. Only the selected limb departs from its extended pose. Changing selection returns the previous limb and wraps the new one; the other four stay unchanged.

LOD selection is provisional: static LOD2 loads first, switch to LOD1 around 150 m with 20 m hysteresis, and use LOD0 for close shots/recording. Switch to an articulated tier before running any demonstration. Tune distances in the consuming game; unit LOD swapping is optional.

## Walking and forward sensors

`walk` uses all six limbs in a staggered ripple. `scout` walks on 03/04/05/06 and holds 01/02 ahead as feelers. Both modes yaw `BODY_HEAVE` by −30° so 01 and 02 form a symmetric front pair while root forward remains +Z. The four-limb gait rearranges the supporting tips into a quadrilateral. Body sway, slight roll/pitch, soft heave and anticipatory weight shifts accompany each step. Leaving either gait resets the body orientation and offsets for the original studies.

A distributed smooth bend solves each walking tip onto its requested target; a small side wave travels along the vertebrae. During stance, the target moves backwards relative to the body at exactly the stated travel speed. During swing, a quintic forward trajectory matches that velocity at release/landing, while a smooth lift reaches 0.43 m above the 0.08 m tip-frame height. The surrounding distal geometry sits about 3.3 mm above the flat floor in the closest sampled pose. The two sensor limbs use separate phased yaw/pitch curves and never enter the foot schedule; their tips stay at least 1.338 m high in the sampled cycle.

Translate an **outer parent** continuously along +Z at `gaits[mode].speed_m_s`. Do not wrap world displacement at the clip boundary. For example, `applyPose(model, elapsedSeconds, 'scout')` pairs with `actor.position.z = startZ + 0.25 * elapsedSeconds`. The adapter itself returns a periodic local pose; `travel_m` is the suggested continuous outer travel. Returned state also includes `feet` (IDs, stance, phase, lift, targets), `contacts`, `sensors`, `speed_m_s`, `bodyPosition` and `bodyRotation`. `gaits` is exported alongside `motions`.

The viewer follows the creature in place and scrolls the ground grid at matching speed. **Ground travel** switches that cue off for an in-place study. Travel continues across loop boundaries; scrubbing resets it to the selected time. Green indicators mean planted tips, amber means swing, blue means sensor. Select Walk or Sensor walk and press Play. The viewer now opens on Roam, also paused for inspection.

The projected body origin remains inside the sampled support polygon (minimum 0.157 m margin), with four/five stance tips for Walk and three/four for Sensor walk. This checks the geometric support arrangement, not centre-of-mass distribution or contact forces. These two original loops cover straight walking. The separate seeded behavior below adds changing position, heading, speed and posture; terrain and transitions between study buttons remain integration work.

## Seeded organic behavior

The four new controls use `behavior.js`, with `applyBehaviorPose` from `runtime.js`. They move the actual creature through a 48 × 48 m review clearing. The local rig still uses its original 12 × 12 m reserve; the outer actor changes world position and heading. Ground marks, destination and trail belong to the viewer and are not exported geometry.

| Mode | Runtime name | Duration | Behavior |
| --- | --- | --- | --- |
| `roam` | `Seeded_Roaming` | Continuous; initial 90 s scrub window | Repeat wander → hesitate → sense → gather → rush → brake → settle, with seeded destinations, timings, cruise/burst speeds and step timing |
| `hesitate` | `Hesitate_And_Test` | 12 s one-shot | Short tentative advance, stop, test a step without committing, probe and settle |
| `sense` | `Tentacle_Survey` | 14 s one-shot | Four tips stay planted; body rises and two front feelers search with separate traveling curves, then the body lowers |
| `rush` | `Rush_And_Settle` | 18 s one-shot | Compress the body, accelerate toward a new point, brake and settle; terminal pose holds |

Roaming cruise commands are 0.35–0.60 m/s; rush commands are 1.90–2.55 m/s. Acceleration is capped at 2.4 m/s², braking at 1.7 m/s², with a 5 m/s³ acceleration-change limit. The body height target rises to 1.53 m for sensing, lowers to 0.91 m before a burst, and rebounds to 1.32 m while braking. Breathing and gait bounce add smaller continuous motion. The sampled body-height range is 0.876–1.593 m, with peak measured speed 2.415 m/s in the validation routes.

Four limbs carry the body and 01/02 remain sensors. Walking steps are selected by placement error, with one limb lifted at a time. Rushes use alternating diagonal pairs, leaving two tips planted during each swing. Landing targets anticipate acceleration. Turns spread across several proximal vertebrae, while body heading follows the destination more slowly; the radial creature can scuttle sideways or backwards before its hub finishes turning. Planted tips keep their world coordinates during both translation and rotation. The contact-frame height is 0.10 m; the minimum sampled visible-geometry clearance is 9.08 mm. Foot orientation and contact forces are not constrained.

Create one controller per actor. It uses a deterministic 1/60 s simulation step and interpolates between frames. It retains two frame snapshots and replays from the seed when seeking backwards; playback frame rate does not change the random sequence. The seed controls route choices, durations and step timing. The same seed and time produce the same pose. New route chooses a new seed and starts playback. Roam continues beyond 90 seconds without teleporting or wrapping its position; the timeline grows. Other profiles stop at their named durations.

```js
const controller = createBehavior(6601, 'roam');
// Each frame, using elapsed seconds since this controller started:
const frame = controller.sample(elapsedSeconds);
actor.position.fromArray(frame.position);
actor.rotation.y = frame.heading;
actor.updateMatrixWorld(true);
const state = applyBehaviorPose(model, frame);
```

`model` is the loaded articulated GLB scene inside `actor`. Do not also add the constant-speed Walk/Scout travel when using this controller. The controller's `feet[].target` values are in the clearing's world frame; the pose adapter converts them into actor-local coordinates and preserves them as `world_target` in its returned state. `stance`, `step`, `contacts`, `speed_m_s`, `behavior`, `goal`, `bodyPosition`, `bodyRotation`, `sense` and `energy` support game integration and inspection. Keep the actor transform and adapter frame together. Do not animate static LOD2.

The viewer follows translation while preserving the orbit angle; **Follow creature** can be disabled. **Clearing** frames the whole area, including scattered ground markers, the current amber destination and a short trail. Unlike the in-place Walk/Scout studies, this mode keeps the grid fixed. Selecting an earlier study restores its origin/orientation and hides the clearing elements. Switching study buttons is a direct selection; within Roam, speed, posture and sensor activation change continuously across behavior states.

The new performance is a flat-ground kinematic prototype. Two-tip rush support is not a static-balance or force simulation. Markers are visual references, not obstacles. Terrain, collision avoidance, physical toe contact and arbitrary-pose self-collision remain integration work.

## Viewer and review artifacts

Modes: Roam, Hesitate, Sense, Rush, Walk, Sensor walk, Mixed, Extended, Arc, Spiral, Pole wrap and Joint lab. Controls include play/pause, time scrub, coil strength, independent limb selection, manual sideways/vertical bending, ground travel, tier/encoding, armor visibility, wireframe, joint rig and the selected GLB download. Camera presets cover perspective, clearing, top, front, side, exposed gimbal and armor scales. Orbit/zoom remains available. Static selection disables motion controls. Camera framing adapts to pose and viewport.

`preview.png`, `previews/`, `design-sheet.jpg`, `motion-sheet.jpg`, `walking-sheet.jpg` and `behavior-sheet.jpg` are derived review images. Studio images show master poses produced by the actual runtime. Browser captures show the same controls and separate pole fixture. `source/blender/rokuroku66-review.blend` is an editable derived mixed-pose studio import, not the authoritative model or animation source. The authoring source is `tools/asset-pipeline/rokuroku66-shape.mjs` plus the motion adapters `runtime.js` and `behavior.js`.

Reproduce from repository root, with the asset-pipeline dependencies installed:

```sh
node tools/asset-pipeline/build-rokuroku66.mjs
node tools/asset-pipeline/validate-rokuroku66.mjs
node tools/asset-pipeline/validate-rokuroku66-walk.mjs
node tools/asset-pipeline/validate-rokuroku66-behavior.mjs
node tools/asset-pipeline/check-rokuroku66-scales.mjs
node tools/asset-pipeline/prepare-rokuroku66-poses.mjs
blender --background --python-exit-code 1 --python tools/blender/render_rokuroku66.py
python3 -m http.server 8791
```

With that server running, run `node tools/asset-pipeline/test-rokuroku66-viewer.mjs` (set `PLAYWRIGHT_MODULE` to the installed Playwright module if needed), then `node tools/asset-pipeline/prepare-rokuroku66-review.mjs` and `node tools/asset-pipeline/prepare-rokuroku66-walk-review.mjs`. Browser captures use the OS temporary `rokuroku66-review` directory or `ROKU_SHOT_DIR`. Temporary posed GLBs use `/tmp/rokuroku66-review` or `ROKU_REVIEW_DIR`. Run `tools/asset-pipeline/test-rokuroku66-behavior-viewer.mjs` for the four new modes, then `tools/asset-pipeline/prepare-rokuroku66-behavior-review.mjs` for their review sheet. Rebuild shared navigation with `python3 tools/build-workshop-docs.py`.

`validation-report.json` records six plain/decoded exports with zero glTF errors/warnings, file hashes, hierarchy/socket parity, triangle/draw budgets, normalized weights, nondegenerate geometry and 484 full-geometry motion samples. Those samples check floor and pole clearance, rigid segment lengths, joint limits, independent limb selection and loop closure. Minimum sampled floor clearance is 10 mm; segment-length numerical error is below 0.001 mm. `scale-clearance-report.json` checks actual triangle-edge crossings between different ivory scale assemblies in fifty-four poses per articulated tier, including the original curves, both walking gaits and fourteen behavior poses. All 108 sampled cases pass. This finite test does not certify arbitrary-pose, continuous or all-component collision clearance.

`walk-validation.json` adds 776 full-geometry samples across both gaits and the four plain/decoded articulated files. All samples pass floor clearance, exact tip targets, world-space planted-tip drift, joint limits before clamping, fixed link lengths, forward sensor separation/height and loop closure for every required node. Numerical stance drift is below 0.001 mm; minimum sampled floor clearance is 3.31 mm.

`viewer-validation.json` records desktop/390 px mobile controls, eight modes, six camera presets, all six tier/encoding combinations, downloads, static lockout, independent limbs, both manual axes, coil amount, scrub/play/pause, continuous ground travel across the walk loop, sensor/contact indicators, six-phase gait captures, framing and zero page errors. SwiftShader was used for functional checks, not FPS measurement.

`behavior-validation.json` adds 14,188 kinematic samples and 2,860 full-geometry samples across four seeds, all four profiles, and plain/decoded master/game files. World-space planted tip drift stays below 0.001 mm; raw motor angles stay below 0.622 rad; sensor tips remain at least 0.904 m high. Full-mesh samples pass the floor and 48 m area checks. Seed replay, backward seeking, state sequence, speed changes and body-height excursion pass. `behavior-viewer-validation.json` covers the new modes on desktop/mobile, seeds/replay, camera follow, clearing view, file combinations, static lockout, one-shot holds, continuous play beyond 90 s and return to the original studies. These finite checks do not certify every possible seed or general collision clearance.

Completed v1.2: separate creature, compact two-axis vertebrae, sliding/lifting scales, flexible service loops, six curvature studies, two planted-tip walking gaits, four seeded behavior profiles with real travel and variable posture, detailed/game/static exports, decoded validation, viewer, derived review scene and sheets. Pending: terrain locomotion, force-based gripping, transition solving, general self-collision and cable mechanics; consuming-game r160/release gltfpack acceptance, game-camera tuning and reference-phone measurements. The received collaboration contract is unchanged.

Credit: Mechanical model by jelaludo; Nih-Dairia lineage and user-supplied RokuRoku-66 concept. Hand off the commit containing this README plus folder `assets/rokuroku66/`; keep the plain exports and identify derived files as such.
