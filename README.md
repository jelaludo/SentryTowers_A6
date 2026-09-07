# Sentry Workshop

The [robotic assembly line](assembly-line/) adds a 24 m conveyor with eight articulated robots, gantries and a ramp-accessible control station. The complete line and five reusable modules each include four structural states. [Integration notes](assets/assembly-line/README.md).

The [alien research outpost](research-outpost/) adds **12 asset families / 48 GLBs**, each with intact and three destruction states. Includes a xenobiology lab, command module, barracks, infirmary, reactor, relay, launch pad, rover garage, container, specimen vault, road and conduit. [Integration notes](assets/research-outpost/README.md).

The [base construction lab](base-kit/) now contains the first Blender-authored wall kit: four straight-wall states, a corner, an animated vehicle gate and a foundation. [Integration notes](assets/base-kit/README.md) and [editable source](source/blender/a6-wall-kit.blend) are included.

The [futuristic base design catalog](research/README.md) defines 109 planned modular assets, three damage levels plus intact state, and procedural assembly rules for future base construction.

The research collection now includes a [character animation lab](animation-tests/) alongside the sentry families. Open it from the tower viewer to inspect Shelly's eight experimental clips and two optimized variants of the rigged Mercenary Astronaut. New characters can be registered in `animation-tests/catalog.json` without changing viewer code. See [astronaut optimization measurements and integration requirements](assets/characters/README.md).

33 generated GLBs: Needle, Rotor, Kiln, Quiver, Lancer, Relay, Railgun, Howitzer, Mortar, Heptapod A6 and Plasma, each at three tiers. Based on both supplied text specifications. No reference GLB or screenshot was supplied; these are original procedural interpretations, not matched reproductions. The external tower builder could not be retrieved, so integration with that application is not verified.

Run `python3 tools/build_sentries.py` to regenerate. No Python packages are needed.

Run `python3 -m http.server 8000` from this directory and visit http://localhost:8000 for the interactive viewer. Its pinned Three.js modules require internet access. Select family/tier, orbit, adjust yaw/elevation, test recoil, switch to neutral materials, or download the selected GLB. Assets themselves have no external resources.

## Integration contract

Units are meters; local +Y is up, local +Z is forward. Origin is the center of the foundation at ground level. Mount ROOT to the planet's local tangent frame. All tiers within a family retain the same foundation and pivot centers. Weapon overhang can grow beyond the foundation.

Hierarchy: `ROOT → BASE` and `ROOT → YAW → PITCH → RECOIL → MUZZLE_00`. YAW is at (0, 0.55, 0); PITCH is at (0, 0.48, 0) relative to YAW. Rotate YAW about local Y. Negative rotation about local X raises the weapon. Translate RECOIL along negative local Z for a kick. Additional muzzle nodes use zero-padded sequential numbers. Rotor muzzle nodes belong to an extra ROTOR assembly under RECOIL; rotate ROTOR around Z for barrel spin.

Relay keeps the common transform names for loader compatibility, but every visible mesh is under BASE. Do not aim or recoil it; the manifest and ROOT extras flag it as stationary. It has no muzzle node.

Preserve these transforms when importing: merge only within the same moving assembly. MUZZLE nodes are empty transforms for runtime projectiles/VFX. Models contain no external firing effects or gameplay statistics. Standard metallic/roughness materials include emissive accents, but bloom must be supplied by the renderer. No baked animation clips or skeletal rigs are required.

`assets/manifest.json` lists all exports. Source geometry is intentionally modular and unoptimized for individual-part editing; production use may benefit from merging meshes within each assembly. The preview uses a shared scale to make tier differences visible.


## Artillery and Heptapod A6

Railgun uses paired induction rails and a heavy capacitor bank. Howitzer has three fixed hydraulic stabilization legs and a default elevation of 25 degrees. Mortar has a short broad tube, drum autoloader, and default elevation of 68 degrees. Each family has three equipment tiers.

Heptapod A6 has exactly six legs (the supplied name is retained), each with HIP, KNEE and ANKLE joints plus a compensating FOOT transform. BODY hangs below the raised knees. The hull carries 6 / 8 / 10 vertical missile silos across the tiers. Its MUZZLE nodes orient local +Z upward, so projectile code can always use muzzle-local +Z. No turret aiming or recoil should be applied to this carrier.

The A6 GLBs include a looping `Walk` animation and a one-shot `Anchor` animation that lowers the hull, spreads the feet and drives ground spikes down. The viewer offers Mobile stance, Walk cycle and Anchor to ground. The walk is an in-place gait for inspection; world movement, terrain adaptation, pathfinding and gameplay state transitions belong to the consuming game. Return to Mobile stance to release the anchored pose. BODY and leg transforms are separate from the legacy turret hierarchy; preserve them and animation tracks on import. Ground spikes intentionally penetrate the ground when deployed.

## Plasma Sentry

Three tiers share one broad flared flamethrower-style nozzle, twin pressure reservoirs, insulated feeds and a recessed green plasma throat. The sleeve has real circular through-holes (30 / 40 / 50), with modeled inner walls. Higher tiers increase nozzle length and diameter, reservoir capacity and cooling fins. Uses the standard YAW / PITCH / RECOIL hierarchy and forward MUZZLE_00; no external flame or plasma VFX is baked in.


The [solar power network](solar-power/) adds a six-rack photovoltaic array, inverter/battery station, authored equipment-specific ruins, and a live demonstration where destroying either power component disables nearby sentry towers. [Integration notes](assets/solar-power/README.md).

The [logistics warehouse](warehouse-props/) adds stackable crates, secure cases, fuel barrels, an armored container, loaded pallets, and a shelf warehouse scene. Every prop has four impact states, with recognizable component-specific D3 wreckage. [Integration notes](assets/warehouse-props/README.md).

The [open micro-reactor](micro-reactor/) adds an exposed fuel lattice, control rods, coolant manifold, heat exchanger, control skid and authored reactor-specific destruction states. [Integration notes](assets/micro-reactor/README.md).
