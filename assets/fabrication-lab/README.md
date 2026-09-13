# Stålheart / MÖRK wireframe fabrication

Models by jelaludo. This derived scene composes the canonical intact Terraformer 3000 / Stålheart tier with a wireframe generated from the corresponding MÖRK tier. It does not redesign either asset. Plain GLB files are the hand-off source of truth; `.meshopt.glb` files are optional release previews that require `EXT_meshopt_compression` decoding.

## Canonical Stålheart family

The scene does not maintain a second Terraformer reduction. Each tier imports the existing D0 member identified by the Stålheart manifests:

| Scene tier | Canonical Stålheart ID | Source file |
| --- | --- | --- |
| LOD0 | `terraformer_3000_d0` | `assets/terraformer/terraformer_3000_d0.glb` |
| LOD1 | `terraformer_3000_d0_lod1` | `assets/terraformer/terraformer_3000_d0_lod1.glb` |
| LOD2 | `terraformer_3000_d0_lod2` | `assets/terraformer/terraformer_3000_d0_lod2.glb` |

The manifest records each source ID, hash, triangle count and draw count. Validation requires exact Stålheart triangle/draw parity, stable control pivots in animated tiers and a complete machine envelope throughout the one-shot. The standalone Stålheart viewer and the HUGIN/Stålheart landmark comparison expose the same tier IDs.

## Construction behavior

`MORK_Fabrication_Sequence` is a 16-second one-shot in LOD0 and LOD1. Stålheart retains the useful motion from `Terraforming_Cycle`; only the tank construction linework changes.

- `STALHEART_ROOT` remains a complete, intact machine throughout the clip.
- `MORK_BUILD_WIREFRAME` contains the full recognizable tank linework.
- Twelve `MORK_WIREFRAME_BAND_00`–`11` nodes appear from bottom to top using discrete keys. At 16 seconds all bands are present.
- `FABRICATION_FRONT` is the moving cyan print boundary.
- The tank hierarchy contains no solid mesh primitive. No chassis, turret, weapon or armor stage becomes opaque.
- `MORK_BUILD_LATTICE` remains as a deprecated lookup alias for `MORK_BUILD_WIREFRAME`. The former `MORK_STAGE_01_CHASSIS_HULL` and `MORK_STAGE_02_TURRET_WEAPONS` names remain empty compatibility lookups and have no animation tracks.

The MÖRK operational clips are deliberately excluded while it is under construction. Engine code should play the one-shot once and clamp at 16 seconds if the complete wireframe must persist.

## Export tiers

| Tier | Solid triangles | Draw calls | Plain GLB | Meshopt GLB | Intended use |
| --- | ---: | ---: | ---: | ---: | --- |
| LOD0 detailed | 165,404 | 795 | 12,399,036 bytes | 1,867,220 bytes | Close shots, animation review and recordings |
| LOD1 game | 7,342 | 23 | 595,400 bytes | 260,920 bytes | Active gameplay fabrication sequence |
| LOD2 distance | 2,173 | 2 | 161,024 bytes | 86,448 bytes | Static full-wireframe endpoint for loading and distance |

The triangle values are Stålheart’s solid triangles; MÖRK is exported as line primitives. LOD1 keeps Stålheart at its canonical 7,342 triangles / 10 draws and adds twelve independently keyed print bands plus one moving boundary, producing 23 draws. Its plain file is above the 400 KB landmark transfer target; the optional Meshopt copy is 260,920 bytes. LOD2 keeps canonical Stålheart at 2,173 triangles / one draw and adds one static MÖRK line draw. These are measured export properties, not FPS measurements.

Only intact D0 fabrication is authored. D1–D3 fabrication scenes are not supplied or implied; damage state remains separate from detail tier.

## Coordinates and integration

All tiers use meters, +Y up and +Z forward. `FABRICATION_SCENE_ROOT` is at the Stålheart plot origin. `STALHEART_ROOT` and `MORK_ROOT` namespace the two reused modules inside the composite while their engine controls remain dot-free and stable. The tank build origin is `SOCKET_FABRICATION_ORIGIN`. Coarse reserved-machine and build-bay collider metadata is in `manifest.json`; it is not a detailed physical collision mesh.

Rebuild with `node tools/asset-pipeline/build-stalheart-mork-fabrication.mjs`. Validate plain and decoded Meshopt files with `node tools/asset-pipeline/validate-stalheart-mork-fabrication.mjs`.
