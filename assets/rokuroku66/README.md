# RokuRoku-66 / Six independent serpentine limbs / v1

Isao’s second biomimetic study grows out of the Nih-Dairia mech: a low hexagonal hub with six long, tapering limbs made from short geared vertebrae. Each joint has two perpendicular motor housings, a central cable passage and short ivory armor scales. Equal sideways bends form arcs; increasing bends produce spirals; coordinated sideways and vertical bends wind a limb around a pole. The supplied RokuRoku-66 concept defines the new silhouette. All mechanical geometry is procedurally authored; reference images are external and recorded by hash.

Viewer:

http://127.0.0.1:8791/rokuroku66/

Start a local server at the repository root before opening that address. The separate Nih-Dairia family remains at revision `0697a7f2e023043fcc6298f18029608d46b12824`; this family does not replace its geometry or behavior.

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
| `mixed` | `Mixed_Curvature_Idle` | 10 s loop | 01/03/05 extend toward the floor; 02/04/06 form upright coils with slight side motion |
| `extended` | `Extended_Idle` | 8 s loop | Six extended, gently sinuous limbs; deliberately static inspection pose |
| `arc` | `Arc_Cycle` | 10 s loop | Same yaw on the last 18 joints; up to 0.24 rad per joint |
| `spiral` | `Spiral_Cycle` | 12 s loop | Yaw increases from 0.20 to 0.68 rad toward the tip; six planar spirals |
| `wrap` | `Pole_Wrap_Cycle` | 12 s loop | Selected limb makes a rising helix using both axes; other five retain their extended pose |
| `manual` | `Joint_Inspection` | Untimed inspection | Selected limb receives uniform yaw ±0.24 and pitch ±0.18 rad after four straight lead joints |

These names/durations describe the runtime adapter; GLB `clips: []` is intentional. No engine-driven pivots are baked. Arc/spiral/wrap use a cosine strength cycle: straight at time 0, fully bent at half-duration, straight at the end. The manual UI uses a narrower range than the motor limit because a uniform sharp bend would loop into itself. It raises the whole specimen when needed to inspect downward bends above the floor. Switching modes directly selects a study pose; this is not a locomotion/transition solver.

The separate viewer pole has radius 0.25 m and height 3.6 m. The chosen limb uses four straight lead links, then a chord-length-preserving helix with centreline radius 0.47 m and rise 0.10 m per radian. The fixture moves with limb selection. Minimum sampled limb-to-pole clearance is 0.106 m: the wrap illustrates 3D curvature around an object, not a force-bearing grip. Only the selected limb departs from its extended pose. Changing selection returns the previous limb and wraps the new one; the other four stay unchanged.

LOD selection is provisional: static LOD2 loads first, switch to LOD1 around 150 m with 20 m hysteresis, and use LOD0 for close shots/recording. Switch to an articulated tier before running any demonstration. Tune distances in the consuming game; unit LOD swapping is optional.

## Viewer and review artifacts

Modes: Mixed, Extended, Arc, Spiral, Pole wrap and Joint lab. Controls include play/pause, time scrub, coil strength, independent limb selection, manual sideways/vertical bending, tier/encoding, armor visibility, wireframe, joint rig and the selected GLB download. Camera presets cover perspective, top, front, side, exposed gimbal and armor scales. Orbit/zoom remains available. Static selection disables motion controls. Camera framing adapts to pose and viewport.

`preview.png`, `previews/`, `design-sheet.jpg` and `motion-sheet.jpg` are derived review images. Studio images show master poses produced by the actual runtime. Browser captures show the same controls and separate pole fixture. `source/blender/rokuroku66-review.blend` is an editable derived mixed-pose studio import, not the authoritative model or animation source. The authoring source is `tools/asset-pipeline/rokuroku66-shape.mjs` plus `runtime.js`.

Reproduce from repository root, with the asset-pipeline dependencies installed:

```sh
node tools/asset-pipeline/build-rokuroku66.mjs
node tools/asset-pipeline/validate-rokuroku66.mjs
node tools/asset-pipeline/check-rokuroku66-scales.mjs
node tools/asset-pipeline/prepare-rokuroku66-poses.mjs
blender --background --python-exit-code 1 --python tools/blender/render_rokuroku66.py
python3 -m http.server 8791
```

With that server running, run `node tools/asset-pipeline/test-rokuroku66-viewer.mjs` (set `PLAYWRIGHT_MODULE` to the installed Playwright module if needed), then `node tools/asset-pipeline/prepare-rokuroku66-review.mjs`. Browser captures use the OS temporary `rokuroku66-review` directory or `ROKU_SHOT_DIR`. Temporary posed GLBs use `/tmp/rokuroku66-review` or `ROKU_REVIEW_DIR`. Rebuild shared navigation with `python3 tools/build-workshop-docs.py`.

`validation-report.json` records six plain/decoded exports with zero glTF errors/warnings, file hashes, hierarchy/socket parity, triangle/draw budgets, normalized weights, nondegenerate geometry and 484 full-geometry motion samples. Those samples check floor and pole clearance, rigid segment lengths, joint limits, independent limb selection and loop closure. Minimum sampled floor clearance is 10 mm; segment-length numerical error is below 0.001 mm. `scale-clearance-report.json` checks actual triangle-edge crossings between different ivory scale assemblies in sixteen poses per articulated tier, including both manual axes and intermediate coils. All 32 sampled cases pass. This finite test does not certify arbitrary-pose, continuous or all-component collision clearance.

`viewer-validation.json` records desktop/390 px mobile controls, six camera presets, all six tier/encoding combinations, downloads, static lockout, independent limbs, both manual axes, coil amount, scrub/play/pause, framing and zero page errors. SwiftShader was used for functional checks, not FPS measurement.

Completed v1: separate creature, compact two-axis vertebrae, sliding/lifting scales, flexible service loops, six curvature studies, detailed/game/static exports, decoded validation, viewer, derived review scene and sheets. Pending: terrain locomotion, force-based gripping, transition solving, general self-collision and cable mechanics; consuming-game r160/release gltfpack acceptance, game-camera tuning and reference-phone measurements. The received collaboration contract is unchanged.

Credit: Mechanical model by jelaludo; Nih-Dairia lineage and user-supplied RokuRoku-66 concept. Hand off the commit containing this README plus folder `assets/rokuroku66/`; keep the plain exports and identify derived files as such.
