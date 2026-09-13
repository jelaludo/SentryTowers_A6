# SH02 four-piece salvage layout

This derived context family stages the landed SH02 around AFR-01 as four deliberately reusable assemblies. The intact animated source remains preserved at `assets/sh-rocket/sh_rocket.glb`; these files are a post-landing salvage state, not a damage state and not an LOD replacement for the flying or landing rocket.

## Authored section map

| Order | Stable root | Physical read |
| ---: | --- | --- |
| 00 | `SH02_SALVAGE_SECTION_00_LANDING` | Deployed legs, engines and the lower two structural bands remain together as the stable landing unit. |
| 01 | `SH02_SALVAGE_SECTION_01_TANK` | The remaining upper propellant-tank section lies beside the service arm. |
| 02 | `SH02_SALVAGE_SECTION_02_CAPSULE` | The complete top cargo capsule lies separately on its side. |
| 03 | `SH02_SALVAGE_SECTION_03_ISAO_MODULE` | A compact hatch-open emergence module identifies the volume from which ISAO deploys. |

The detailed tier retains the source rocket's deployed landing hardware and complete cargo-capsule geometry. Authored sectional hull forms replace the source's single uncut booster cylinder so the separation boundaries are structurally legible. The emergence module is new derived geometry because no separate payload pod existed in the preserved SH02 source.

## Tiers

| Tier | File | Triangles | Draws | Plain bytes | Meshopt bytes | Use |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| Detailed master | `sh02_salvage_layout_stage1_lod0.glb` | 20,418 | 4 | 1,721,028 | 565,172 | Close review and recordings |
| Game | `sh02_salvage_layout_stage1_lod1.glb` | 4,796 | 4 | 157,432 | 50,864 | AFR-01 gameplay composition |
| Static distance | `sh02_salvage_layout_stage1_lod2.glb` | 2,398 | 1 | 69,996 | 22,560 | Map, loading and far view |

LOD0 and LOD1 keep four individually addressable static section nodes. LOD2 merges their visible geometry into one draw while retaining the four section roots and five sockets as lookup-only nodes. There are no clips: gameplay may move or remove each complete section root in LOD0/1, but should swap out of LOD2 before a piece is manipulated.

## Integration

- Metres, +Y up, +Z forward. The shared origin is the AFR-01 arrival-recycling site ground plane.
- `salvage_stage: 1` means the rocket has separated into four assemblies. `damage_level` remains D0 and is independent.
- `SOCKET_SALVAGE_TARGET_00` through `03` identify cutter targets. `SOCKET_ISAO_RELEASE` identifies the character deployment side of the emergence module.
- Plain GLB is source of truth. Meshopt files are optional derived previews and have been decoded during validation.
- The game and distance tiers meet the collaboration-contract small-landmark targets. Threshold and reference-phone acceptance remain pending; no FPS improvement is claimed.

Rebuild and validate:

```sh
node tools/asset-pipeline/build-sh02-salvage-layout.mjs
node tools/asset-pipeline/validate-sh02-salvage-layout.mjs
```
