# 09-TAI / Gyro

First playable interpretation of the three supplied spherical-robot references. A nominal 1.6 m ivory/graphite sphere uses amber seam lights, a stabilized core, independently driven armor panels, six folding limbs with three adhesive toes each, and a retractable three-jaw grappling head. D0 intact only. Original geometry by jelaludo; supplied images are reference-only and remain outside the repository.

The shell is a truncated icosahedron: 20 hexagonal regions and 12 pentagonal closure regions. The forward hex region is an optical/launcher port. Six small flush wear shoes preserve the same 1.6 × 1.6 × 1.6 m rolling envelope at every tier. This scale is a first-design assumption, not a measurement from the concept images.

## Files and measured budgets

| Tier | Plain file | Triangles | Material draws | Plain bytes | Meshopt bytes |
| --- | --- | ---: | ---: | ---: | ---: |
| LOD0 / detailed | `tai09_d0_lod0.glb` | 73,602 | 4 | 4,049,568 | 780,460 |
| LOD1 / articulated game | `tai09_d0_lod1.glb` | 12,374 | 4 | 967,900 | 223,688 |
| LOD2 / static distance | `tai09_d0_lod2.glb` | 636 | 1 | 81,804 | 48,160 |

The game tier meets the contract's ≤25k unit triangle target. The optional distance tier meets the ≤3k / one-draw / ≤250 KB static target. Draw counts cover the model, excluding shadows, the arena and tether effects. No FPS improvement or phone performance is claimed.

Plain GLBs are authoritative and self-contained, with vertex colors and no external textures. `derived/meshopt/` contains optional compressed derivatives. `manifest.json` records SHA-256 hashes, exact byte counts, sockets, all 95 required lookup nodes, axes, bounds, runtime policy and credits. `validation-report.json` checks both original and decoded compressed files; `viewer-validation.json` records real Chromium WebGL review.

## Runtime contract

Metres, +Y up, +Z forward; `TAI09_ROOT` is at the ground centre of the closed sphere. `BODY` is at Y = 0.8 m. Both articulated tiers use rigid vertex weights on the same named hierarchy; preserve all bones. Geometry is grouped into ceramic, alloy, carbon and amber materials. LOD2 has one static mesh and the same lookup transforms; those transforms do not deform its geometry.

Reserve 3 × 3 m for the unfolded unit. The tether can extend outside that footprint; the viewer limits attachment range to 16 m. Keep LOD1 during gameplay. LOD0 is for close shots and recordings. Use LOD2 only for a closed static map/loading silhouette, and switch before showing movement. No unmeasured automatic distance threshold is prescribed.

There are no baked animation clips (`clips: []`). Rolling, registration, panel opening, limb contact, launching and aiming are engine-driven. `runtime.js` exports `createRig(root, THREE)` and the deterministic `TAIController` used by the viewer. Deployment takes 1.1 s, hook flight 0.45 s; walking phase advances by actual distance. Jump demonstration uses 5.8 m/s initial vertical velocity and 9.81 m/s² gravity, with a 0.12 m landing-compression response.

| Controls | Engine use |
| --- | --- |
| `BODY` | Stable core centre, rest Y = 0.8 m |
| `SHELL_ROLL` | Roll quaternion; world travel / 0.8 m gives rotation angle |
| `PANEL_01` … `PANEL_32` | Independent radial slide and hinge; rest pose and normal in extras |
| `CORE_GIMBAL`, `GYRO_ROTOR` | Core stabilization and internal flywheel |
| `LEG_01` … `LEG_06` with `_MOUNT`, `_HIP`, `_KNEE`, `_ANKLE` | Deploy and solve rigid limbs; upper 0.46 m, lower 0.58 m |
| `LEG_01_PAD_1` … `LEG_06_PAD_3` | Eighteen independently folding toes |
| `LAUNCHER_AIM`, `LAUNCHER_SLIDE` | Aim and extend the barrel through an opened shell region |
| `HOOK_HEAD`, `HOOK_JAW_01` … `HOOK_JAW_03` | Move the hook to its anchor and spread its claws |
| `SOCKET_CABLE`, `SOCKET_HOOK` | Runtime tether endpoints; cable is a separate effect |
| `SOCKET_FOOT_01` … `SOCKET_FOOT_06` | Support/contact points |
| `SOCKET_SENSOR`, `SOCKET_CORE` | Optical and central attachment references |

The viewer uses a carrier centred on the sphere, with the loaded scene translated down 0.8 m. Carrier position/orientation follows the active support surface; `rig.pose({deploy, gecko, height, phase, stride, direction, explode, grapple, grappleDirection, time, air})` operates in that local frame. `height` is the sphere-centre distance from the support plane. Supply the target and hook transform separately as shown in `tai09/viewer.js`. Reset entire joint rotations when adapting imported GLBs: a large yaw can import as a mathematically equivalent X/Z Euler decomposition.

## Viewer controls

Local route:

http://localhost:8788/tai09/

- WASD / arrows: move. Shift: faster rolling.
- 1: closed rolling shell. 2: multipod walk. 3: gecko adhesion.
- In Gecko, hold W toward the far wall, continue upward, then traverse the underside of the ceiling. S reverses the route.
- G or Launch grapple: hook the marked wall target, reel in, then release with G. Shift-click an actual arena surface to choose a different anchor.
- Space / Jump: launch and cushion the landing. R / Reset: return to the ground start.
- Drag / scroll: orbit and zoom. Close/Arena view and Follow control framing. The ceiling camera stays below the roof.
- Shell separation exposes the interior. Wireframe, pause, detail/encoding selectors and a selected-file download support inspection. Static LOD disables ability controls.
- Touch arrows and action buttons provide basic phone control; Shift-click custom aiming is desktop-only.

## Source and reproduction

`tools/asset-pipeline/tai09-shape.mjs` is the procedural geometry/rig master. `source/tai09/references.json` preserves reference hashes without redistributing the images. `source/blender/tai09-review-derived.blend` is an editable imported review scene with the detailed rig, materials and studio lighting; it is explicitly derived, not the authoritative authoring source. `derived/review/` contains rendered closed/walking/grapple studies. The gallery thumbnail is derived from the closed render.

Build: `node tools/asset-pipeline/build-tai09.mjs`. Validate: `node tools/asset-pipeline/validate-tai09.mjs`. Render preparation: `node tools/asset-pipeline/prepare-tai09-review.mjs`, followed by Blender background execution of `tools/blender/render_tai09.py`. Serve the repository with `python3 -m http.server 8788`. Browser verification: `PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node tools/asset-pipeline/test-tai09-viewer.mjs`. Rebuild shared navigation with `python3 tools/build-workshop-docs.py`.

## Verified scope and pending integration

Six plain/decoded exports pass zero-error/zero-warning glTF validation, unique dot-free names, cross-tier rest transforms and socket parity, matching rolling bounds, rigid segment lengths and geometry hygiene. 180 full-geometry pose samples cover walking, gecko stance and the unfolding path. Sampled walking/gecko mesh clearance is 4.0 mm; deployment clearance is zero within floating-point tolerance. Closed geometry stays within 0.8002 m of the centre. Straight stance and rigid-length errors remain below 0.001 mm in the analytic rig checks. Straight-line stance drift and support-plane height are independently checked; see the JSON report for measured values. Browser checks cover keyboard movement, deployment, jump, wall/ceiling traversal, tether/release, all six tier/encoding combinations, wireframe/separation, static-mode interlocks, desktop and 390 px mobile framing.

This is a kinematic prototype on a fixed planar fixture. Turning feet use procedural placement; individual anchors are not maintained through arbitrary turns or surface transitions. The corner transition blends the body orientation and is not a multi-surface contact solver. Internal deployment clearance, general self-collision, arbitrary terrain, real adhesion forces, dynamic rope/swing physics, combat damage, multiple simultaneous tethers, consuming-game Three r160/release gltfpack behavior, camera thresholds and reference-phone acceptance remain pending. No D1–D3 or production physics compliance is claimed.

Hand off the implementing commit hash plus `assets/tai09/`; include `tai09/`, the source/build/validation scripts and derived Blender scene for the complete review package. All derived files are clearly labeled. The received collaboration contract remains unchanged.
