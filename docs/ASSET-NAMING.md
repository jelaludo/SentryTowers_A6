# Asset naming contract

This is the versioned naming policy for engine-facing exports. Version 1 applies to every new contract candidate and to any family when it is substantially revised. Preserved originals and historical derivatives are audited but are not silently renamed, because game code may already look up their existing identifiers.

## File identifiers

- Use lowercase snake case and `.glb`. Co-located tiers use `family_d0_lod1.glb`; a family that uses tier directories may use `lod1/family_d0.glb`. Choose one layout for the family and declare the tier in its manifest.
- Use `_d0` through `_d3` for damage state. Damage and LOD are separate axes.
- Use `_lod0`, `_lod1` and `_lod2` when formal tiers are co-located. If `lod0/`, `lod1/` and `lod2/` directories are used, do not repeat the tier in the basename. A detailed authoring source may retain its established unsuffixed filename, but its manifest must declare `lod: 0`.
- Put the optional compressed derivative immediately before the extension: `family_d0_lod1.meshopt.glb`. The plain GLB is authoritative.
- Do not use `high`, `medium`, `low`, `game`, `static`, `final`, `new` or `v2` as an engine-facing substitute for a declared LOD. Existing files with those words are legacy aliases until a versioned family migration is accepted.

## Runtime node identifiers

- Use meaningful uppercase snake case: `TURRET_YAW`, `SOCKET_MUZZLE_L`, `ISAO_ROOT`.
- Names must be unique within each GLB, non-empty and dot-free. Blender counters such as `Cube.001` are not runtime identifiers.
- The family root, gameplay pivots, sockets and animation targets must keep the same names, parent relationships and rest transforms across damage states and LODs whenever they remain applicable.
- LOD2 may merge visible geometry, but it retains the declared lookup transforms as non-articulating nodes. Its manifest must say that the tier is static.
- Sockets start with `SOCKET_`; rotating controls use semantic suffixes such as `_YAW`, `_PITCH`, `_ROLL`, `_RECOIL` or `_EXTEND`. Use zero-padded numbering for ordered repeated controls, for example `MUZZLE_00`.
- Clip names use stable descriptive identifiers such as `Terraforming_Cycle` or `Emotion_Curious`. Durations and looping behavior belong in the manifest. Engine-driven pivots are not baked into clips.

## Compatibility and migration

1. Audit the existing family and identify every game lookup.
2. Publish a versioned old-to-new map before changing a pinned name.
3. Export the entire damage/LOD matrix with the new identifiers together; never migrate one tier in isolation.
4. Retain the old files as documented aliases for at least one consuming-game integration cycle.
5. Remove an alias only after the game confirms the replacement revision.

`node tools/asset-pipeline/audit-library-contract.mjs` enforces canonical filenames, unique/non-empty/dot-free nodes, declared engine-name syntax and required-name existence for current contract candidates. It reports naming debt in older originals and derivatives without mislabeling those files as compliant.
