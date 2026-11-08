# AUREL-03 / Leg L

Standalone anatomy module. All tiers use the complete robot’s ground datum, metres, +Y up and +Z forward. Its surface stays at the assembled height; use the named attachment for mounting. LOD0 is detailed, LOD1 articulated and LOD2 a derived static rest pose. D0 only.

| Tier | Triangles | Draws | Plain bytes |
| --- | ---: | ---: | ---: |
| LOD0 | 3,820 | 1 | 184,552 |
| LOD1 | 1,212 | 1 | 60,112 |
| LOD2 | 156 | 1 | 10,324 |

Authoritative plain files and socket frames are in `manifest.json`, with filenames relative to this folder. Preserve the scene-root skins and the `PART_*` hierarchy together. Full mounting recipe, host/socket table, runtime notes, credits and limitations are in `../../README.md`. Runtime dependencies belong to the family; this folder is not a standalone JavaScript package.

Models by jelaludo.
