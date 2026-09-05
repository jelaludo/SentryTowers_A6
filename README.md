# Sentry Workshop

18 generated GLBs: Needle, Rotor, Kiln, Quiver, Lancer and Relay, each at three tiers. Based on both supplied text specifications. No reference GLB or screenshot was supplied; these are original procedural interpretations, not matched reproductions. The external tower builder could not be retrieved, so integration with that application is not verified.

Run `python3 tools/build_sentries.py` to regenerate. No Python packages are needed.

Run `python3 -m http.server 8000` from this directory and visit http://localhost:8000 for the interactive viewer. Its pinned Three.js modules require internet access. Select family/tier, orbit, adjust yaw/elevation, test recoil, switch to neutral materials, or download the selected GLB. Assets themselves have no external resources.

## Integration contract

Units are meters; local +Y is up, local +Z is forward. Origin is the center of the foundation at ground level. Mount ROOT to the planet's local tangent frame. All tiers within a family retain the same foundation and pivot centers. Weapon overhang can grow beyond the foundation.

Hierarchy: `ROOT → BASE` and `ROOT → YAW → PITCH → RECOIL → MUZZLE_00`. YAW is at (0, 0.55, 0); PITCH is at (0, 0.48, 0) relative to YAW. Rotate YAW about local Y. Negative rotation about local X raises the weapon. Translate RECOIL along negative local Z for a kick. Additional muzzle nodes use zero-padded sequential numbers. Rotor muzzle nodes belong to an extra ROTOR assembly under RECOIL; rotate ROTOR around Z for barrel spin.

Relay keeps the common transform names for loader compatibility, but every visible mesh is under BASE. Do not aim or recoil it; the manifest and ROOT extras flag it as stationary. It has no muzzle node.

Preserve these transforms when importing: merge only within the same moving assembly. MUZZLE nodes are empty transforms for runtime projectiles/VFX. Models contain no external firing effects or gameplay statistics. Standard metallic/roughness materials include emissive accents, but bloom must be supplied by the renderer. No baked animation clips or skeletal rigs are required.

`assets/manifest.json` lists all exports. Source geometry is intentionally modular and unoptimized for individual-part editing; production use may benefit from merging meshes within each assembly. The preview uses a shared scale to make tier differences visible.
