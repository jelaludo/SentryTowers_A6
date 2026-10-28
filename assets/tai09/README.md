# 09-TAI-01 / 球体

The first unit in the **09-TAI-<number>** family. The name plays on 球体 (*kyuutai*, sphere): 9 = *kyuu*, TAI = *tai*. A nominal 1.6 m ivory/graphite sphere uses amber seams, a stabilized core, independently driven armor panels, six low-mounted gecko limbs with three adhesive toes each, and a retractable three-jaw grappling head. The same feet walk on the floor and grip walls or ceilings; there is no separate multipod mode. D0 intact only. Original geometry by jelaludo; supplied images are reference-only and remain outside the repository.

The shell has 20 hexagonal regions and 12 pentagonal closure regions. The forward hex region is the optical/launcher port. Six flush wear shoes preserve the same 1.6 × 1.6 × 1.6 m rolling envelope at every tier. This scale is a design assumption, not a measurement from the concept images.

## Files and measured budgets

| Tier | Plain file | Triangles | Material draws | Plain bytes | Meshopt bytes |
| --- | --- | ---: | ---: | ---: | ---: |
| LOD0 / detailed | `09_tai_01_d0_lod0.glb` | 73,602 | 4 | 4,049,612 | 779,244 |
| LOD1 / articulated game | `09_tai_01_d0_lod1.glb` | 12,374 | 4 | 967,944 | 223,368 |
| LOD2 / static distance | `09_tai_01_d0_lod2.glb` | 636 | 1 | 81,848 | 48,204 |

The game tier meets the contract's ≤25k unit triangle target. The optional distance tier meets the ≤3k / one-draw / ≤250 KB static target. Draw counts cover the model, excluding shadows, arena and tether effects. No FPS improvement or reference-phone performance is claimed.

Plain GLBs are authoritative and self-contained, with vertex colors and no external textures. `derived/meshopt/` contains optional compressed derivatives. `manifest.json` records hashes, byte counts, sockets, all 95 required lookup nodes, axes, bounds, selection policy and credits. `validation-report.json` checks plain and decoded compressed exports; `dynamics-validation.json` records simulated approaches and actual rig recoil geometry; `viewer-validation.json` records real Chromium WebGL review.

The previous `tai09_d0_lod*.glb` files, corresponding Meshopt files, `derived/review/` images and `source/blender/tai09-review-derived.blend` are preserved from commit `6c2c22cd7d1c46fd1ec83384418203f26e8a6052`. They are historical exports, not the current manifest selection. Use their matching runtime from that commit if reproducing the earlier prototype. Stable engine node names such as `TAI09_ROOT` are intentionally retained across the public designation change.

## Runtime and movement

Metres, +Y up, +Z forward; `TAI09_ROOT` is at the ground centre of the closed sphere. `BODY` rests at Y = 0.8 m. Both articulated tiers use rigid vertex weights on the same named hierarchy; preserve all bones. Geometry is grouped into ceramic, alloy, carbon and amber materials. LOD2 has one static mesh and matching lookup transforms; those transforms do not deform its geometry.

Reserve 3 × 3 m for the unfolded unit. The tether extends outside that footprint, with a 75 m fixture attachment limit. Use LOD1 during gameplay and LOD0 for close shots or recordings. LOD2 is a closed static map/loading silhouette: switch before showing movement. No unmeasured automatic distance threshold is prescribed.

There are no baked clips (`clips: []`). `runtime.js` exports `createRig(root, THREE)`, `TAIController`, `ARENA` and `TARGETS`. Body rotation, shell registration, contact preparation, panel opening, limb IK and launcher aim remain engine-driven. The controller runs at a fixed 120 Hz in the viewer, independently of render frames.

- **Shared low gecko limbs:** mount Y is −0.22 m stowed and −0.40 m deployed, relative to the core. Standing centre height is 1.04 m. Deployment takes 0.85 s on the ground. Upper/lower rigid links remain 0.46 / 0.58 m.
- **Momentum:** sustained input builds acceleration over six seconds, starting at 2.2 m/s² in ball mode. Normal/Shift ball speed limits are 14 / 20 m/s. Releasing input coasts; X brakes. Gecko speed limits are 4.8 m/s on the floor and 3.5 m/s on walls/ceiling.
- **Winch:** hook flight takes 0.30 s, followed by a 1.8 s ramp from 6 to 30 m/s² assisted pull. Tether travel is capped at 18 m/s and brakes on approach. This assists most of the weight rather than simulating a physically exact rope.
- **Feet-first arrival:** estimated time to contact drives a 1.25 s preparation window. A folded ball registers its shell, rotates and deploys its feet; deployed gecko limbs also rotate with the body before arrival. Released flight uses 9.81 m/s² gravity and rights for the floor. Jump launch speed is 6.4 m/s.
- **Landing recoil:** the feet contact first, then the body compresses toward the support plane by 7.5–18 cm depending on impact speed. Fast compression and a smaller second response settle over 1.26 s. Initial recovery holds all six feet planted and blocks premature folding. The same normal-axis response works on floor, wall and ceiling.

| Controls | Engine use |
| --- | --- |
| `BODY` | Stable core centre, rest Y = 0.8 m |
| `SHELL_ROLL` | Roll quaternion; world travel / 0.8 m gives angle |
| `PANEL_01` … `PANEL_32` | Independent slide/hinge; rest normal in extras |
| `CORE_GIMBAL`, `GYRO_ROTOR` | Core stabilization and flywheel |
| `LEG_01` … `LEG_06` with `_MOUNT`, `_HIP`, `_KNEE`, `_ANKLE` | Shared walking/adhesive limbs |
| `LEG_01_PAD_1` … `LEG_06_PAD_3` | Eighteen independently folding toes |
| `LAUNCHER_AIM`, `LAUNCHER_SLIDE` | Aim/extend the barrel |
| `HOOK_HEAD`, `HOOK_JAW_01` … `HOOK_JAW_03` | Hook travel and claw spread |
| `SOCKET_CABLE`, `SOCKET_HOOK` | Tether endpoints; cable is a separate effect |
| `SOCKET_FOOT_01` … `SOCKET_FOOT_06` | Support/contact points |
| `SOCKET_SENSOR`, `SOCKET_CORE` | Optical and central attachments |

The viewer uses a carrier centred on the sphere, with the imported scene translated down 0.8 m. Apply `state.orientation` and `state.shellRotation` directly. `rig.pose({deploy, height, phase, stride, direction, explode, grapple, grappleDirection, time, air, tuck, plant})` operates in that carrier frame. `height` is centre distance from the support plane; `air` suppresses contact indicators, `tuck` controls airborne foot preparation, and `plant` freezes swing during impact compression. Supply hook transforms separately as in `tai09/viewer.js`. Replace entire joint rotations when adapting imported GLBs: a large yaw can import as an equivalent X/Z Euler decomposition.

## Playtest and controls

http://localhost:8788/tai09/

The arena is 84 × 86 m with a 24 m wall and partial ceiling. Nine selectable anchors include walls at 3 / 7 / 12 / 18 m, suspended rings at 6 / 11 / 16 m, a 24 m ceiling anchor and a ground pad. Sky rings release automatically near the target, retaining momentum into a ballistic return. Wall/ceiling anchors remain attached until release or jump.

- WASD / arrows: accelerate and steer. Shift: higher ball speed limit. X: brake.
- 1: ball. 2: gecko feet for walking, climbing and hanging.
- G / Launch grapple: fire at the selected target. G again releases. Shift-click an actual surface or target ring to launch there.
- Space / Jump or drop: jump on the floor or detach from a wall/ceiling. R resets.
- In Gecko, W approaches the far wall, climbs it and continues beneath the ceiling. S reverses the route.
- Drag / scroll: orbit and zoom. Close/Arena view and Follow control framing.
- Shell separation, wireframe, pause, tier/encoding selectors and selected-file downloads support inspection. Static LOD disables ability controls.
- Touch arrows and action buttons provide basic phone control; custom Shift-click aiming and the X brake shortcut are desktop controls.

For a compact review: start in Ball, select **Wall · 18 m**, fire and watch approach rotation and wall recoil. Release, then watch the ground landing. Reset, choose Gecko and **Sky ring · 16 m** to review an already-deployed launch and ballistic feet-first return.

## Source and reproduction

`tools/asset-pipeline/tai09-shape.mjs` is the procedural geometry/rig master. `source/tai09/references.json` preserves reference hashes. `source/blender/09-tai-01-review-derived.blend` is the current editable imported detailed review scene, explicitly derived. `derived/review-09-tai-01/` contains studio renders and browser motion captures. The gallery thumbnail derives from the closed studio render.

Run from the repository root:

```sh
node tools/asset-pipeline/build-tai09.mjs
node tools/asset-pipeline/validate-tai09.mjs
node tools/asset-pipeline/test-tai09-dynamics.mjs
PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node tools/asset-pipeline/test-tai09-viewer.mjs
node tools/asset-pipeline/prepare-tai09-review.mjs
blender --background --python tools/blender/render_tai09.py
python3 tools/build-workshop-docs.py
```

Serve the repository with `python3 -m http.server 8788` before browser verification.

## Verified scope and pending integration

Six plain/decoded exports pass zero-error/zero-warning glTF validation, unique dot-free names, cross-tier rest transforms/socket parity, rolling bounds, rigid link lengths and geometry hygiene. 180 full-geometry samples cover stance, gait and unfolding; another 114 evaluate landing recoil using actual detailed/game meshes. Minimum sampled support-plane clearance is 4.0 mm; unfolding clearance is zero within floating-point tolerance. Closed geometry stays within a 0.8002 m radius.

Dynamics checks cover all nine anchors from both starting modes, acceleration/coasting/braking, pre-contact orientation and deployment, wall/ceiling drops, releases during winching, jumps, and wall-to-ceiling traversal. Pre-contact up/normal dot products exceed 0.9999; measured tether speed stays at or below 18 m/s. Recovery foot-plane error stays below 0.001 mm in the sampled analytic rig checks. Browser checks independently cover real keys, UI target selection, timed righting/recoil, all six tier/encoding combinations, static interlocks, desktop and 390 px mobile framing. These are correctness checks, not performance measurements.

This is a deterministic movement prototype with assisted winching and planar adhesion. General rigid-body collisions, dynamic rope/swing physics, arbitrary terrain, independently anchored feet during turning, multi-surface corner solving and internal self-collision remain pending. Untethered wall/roof intersections use boundary clamps; the feet-first wall/ceiling arrivals tested here are directed grapples. Consuming-game Three r160/release gltfpack integration, camera thresholds and reference-phone acceptance are also pending. D1–D3 and simultaneous multiple tethers have not been authored.

Hand off the implementing commit hash plus `assets/tai09/`; include `tai09/`, the source/build/validation scripts and current derived Blender scene for the full review package. The received collaboration contract remains unchanged.
