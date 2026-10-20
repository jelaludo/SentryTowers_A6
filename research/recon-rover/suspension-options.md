# R-47X animated suspension exploration

20 October 2026. Design study only; no model, rig or runtime revision is implemented by this note.

## Recommendation

Start with six independent swing arms and articulated telescopic dampers. This retains the current stance and wheel stations while making compression, rebound and landing animation mechanically readable. Prototype one front station first, including steering at full travel, before propagating it to all six wheels and D0–D3.

An active ride-height controller can be added to this mechanism later for kneeling, launch preparation and landing recovery. It is a control option, not a separate suspension geometry.

## What exists

The procedural source `tools/asset-pipeline/recon-rover-shape.mjs` builds six stations at X ±0.98 m and Z +1.44 / −0.42 / −1.44 m. Intact wheel radius is 0.48 m. Each wheel has a 0.50 m lateral offset from its suspension pivot.

The articulated hierarchy is `SUSP_PIVOT_FL` → `WHEEL_STEER_FL` → `WHEEL_SPIN_FL` → `WHEEL_FL`, repeated for all stations. `SUSP_ARM_FL` is another child of the suspension pivot. It contains the arm, knuckle and both damper representations in one rigid mesh. Their apparent upper mounts therefore move with the arm; they are not chassis-fixed telescoping mechanisms. The side groups called `SUSPENSION_BOGIE_L/R` are legacy lookup groups, not a solved rocker-bogie system.

`assets/recon-rover/runtime.js` supplies phase-offset sine motion and a common suspension bias, including crouch/landing staging and damage scaling. It rotates the suspension pivot around Z. It has no terrain contact solver or spring/damper dynamics. Steering and spin are already independent channels.

The current scalar travel clamp is −0.12 to +0.14 m. Its sign is not wheel-centre Y: the implemented angle is `−side * asin(travel / 0.50)`, so a positive scalar lowers the hub in local chassis coordinates. A new API should explicitly define positive compression as hub motion upward relative to the chassis, with a compatibility conversion for existing controls. At either travel extreme the hub also moves laterally along an arc and the steering axis tilts with the arm.

## Options

| Mechanism | Visible animation | Fit to this Rover | Main cost or limitation |
| --- | --- | --- | --- |
| Independent swing arms + telescopic dampers | Each arm rotates; damper barrel aims between mounts; rod slides; wheels spin and steer separately | Recommended first prototype; closest to current geometry and hierarchy | Arc changes track and camber; must relocate/fix damper upper mounts and check steering clearance |
| Double wishbones + upright + coilover | Upper and lower arms rotate together; upright carries steering; damper compresses | Best candidate if controlled wheel camber and close-up mechanical realism are priorities | More links, pivots, damage parts and kinematic constraints; requires substantial station redesign |
| Longitudinal trailing arms + dampers | Arm rotates about a transverse axis; wheel moves in a fore/aft arc | Plausible alternative for a rugged utility appearance | Changes silhouette and wheelbase through travel; middle/rear wheel spacing needs particular clearance review |
| Rocker-bogie with body differential linkage | Large side rockers and smaller bogies articulate over obstacles | Strong planetary exploration identity | Largest redesign; coupled wheel motion replaces six independent spring units; not the first choice for the existing crouch/hop performance |

These are design assessments, not measured performance comparisons. JPL's rover materials establish rocker-bogie as a rough-terrain rover mechanism; they do not validate this Rover's proportions or landing behavior.

Reference: [JPL Rocky 8](https://www-robotics.jpl.nasa.gov/how-we-do-it/systems/the-rocky-8-rover/)

## Animation and dynamics are separate decisions

1. **Art-directed demonstration:** drive a normalized compression channel per wheel from keyframes or scrub controls, and solve all connected visual parts from it. Useful for recordings, damage reviews and deterministic previews.
2. **Terrain-following visual rig:** obtain wheel contact targets from raycasts or shape sweeps, clamp travel, then solve arms and dampers. This makes the wheels follow a test course, but does not alone constitute vehicle physics.
3. **Physical suspension:** the game's vehicle controller owns contact, chassis forces, sprung mass, spring stiffness, damping, tire behavior and gravity. Feed its solved travel, steering and wheel angles into the same visual rig. Do not add an independent preview bounce on top.

PhysX documents raycast/sweep road queries and spring/damper suspension as a reference architecture; adopting PhysX is not required.

Reference: [NVIDIA vehicle documentation](https://nvidia-omniverse.github.io/PhysX/physx/5.6.1/docs/Vehicles.html)

For physical tuning, mass, gravity, centre of mass and desired sag must be established first. A spring force model can begin with `F = k*x + c*dx/dt`, with explicit compression sign, contact gating and bump/droop stops; free-flight wheels must not apply a ground reaction force. Active levelling changes rest length within rate and stroke limits rather than teleporting wheel positions.

## Proposed retrofit rig

Retain existing engine names and wheel hierarchy where practical. Add dot-free chassis-side mount sockets and separate damper barrel/rod nodes for each of the two existing dampers per wheel, using suffixes such as `FL_A` and `FL_B`. New names, rest transforms, axes and stroke limits must be recorded in the manifest and runtime README. Existing names alone do not guarantee compatibility if parents or local frames change.

The upper mount belongs to the chassis. The lower mount belongs to the moving arm. Evaluate both endpoints in a common coordinate frame, orient the barrel along their difference, and slide the piston along that axis. Keep rod diameter fixed; avoid scaling an entire cylinder to simulate extension. Clamp the mechanism at its true minimum/maximum length and preserve piston overlap.

For a close-shot master, add separate spring seats, bushings and a spring whose pitch changes with stroke while coil count stays fixed. For the game tier, use simple barrels and rods; omit animated coils unless their visual value justifies their cost. Share geometry/materials across stations, while recognizing that separate articulated mesh objects can still add draws.

Do not bake the engine-driven wheel or suspension pivots into production clips. A recording-only preview may offer proposed `Suspension_Cycle` (4 seconds) and `Landing_Recover` (3 seconds), but these are future preview sequences, not existing GLB clips. Production exports currently have no baked clips.

## Prototype review

Use the existing travel range only as a starting envelope; do not increase it before checking tire/fender, arm/chassis, neighbouring wheel and damper clearance.

- Front wheel: full bump and droop, each with centre and ±34° steering; inspect the tilted steering axis and camber.
- Terrain: one-wheel step, diagonal articulation, crest with a wheel airborne, and recovery to level ground.
- Landing: full droop → compression → damped recovery; scrub, pause and replay deterministically.
- Viewer controls: per-wheel compression, linked all-wheel compression, terrain/landing presets, speed, damping, reset, and mount/axis/contact overlays.
- Damage: D1 retains motion; D2 reduces travel or locks a damaged unit with a consistent bent/seized damper pose; D3 remains collapsed and disabled. Healthy stations remain operable under localized damage.

The current damage swap lists only `SUSP_ARM_*` and `WHEEL_*` for each wheel zone. Any split damper parts must join those zone mappings and validation checks so a geometry swap cannot leave an intact damper on a broken arm.

## Export and acceptance requirements

LOD0 is the detailed recording master; LOD1 keeps the functional rig; LOD2 stays explicitly static and merged for distance/loading use. Switch to LOD1 before visible wheel performance. Maintain metres, +Y up, +Z forward, ground-centred root, damage identifiers, sockets and stable names across states and tiers. Static tiers can retain lookup nodes without claiming that merged geometry articulates.

The existing manifest reports D0 LOD1 at 4,796 triangles, 37 draws and 383,848 plain bytes, and D0 LOD2 at 2,772 triangles, one draw and 215,964 bytes. These are existing recorded figures, not new measurements. The collaboration contract's unit target is ≤25k triangles with articulated pivots; the Rover also has its own tighter historical target of ≤8k triangles / ≤400 KB. The existing 37 draws deserve attention before adding dozens of separate damper meshes.

For an implementation, measure triangles, actual draws and bytes afresh; validate all plain and decoded compressed exports, travel limits, mount attachment, piston overlap, finite transforms, damage swaps and name parity. Preserve original assets, label derived files, update the manifest and integration notes, and hand off a commit hash plus asset folder. No FPS improvement can be inferred from this study.

Pending: one-station animated prototype, clearance evidence, full six-wheel implementation, damage/LOD exports, terrain/physics integration and game-camera performance review.
