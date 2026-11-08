# AUREL-03 / Leg R

Standalone anatomy module. All tiers use the complete robot’s ground datum, metres, +Y up and +Z forward. Its surface stays at the assembled height; use the named attachment for mounting. LOD0 is detailed, LOD1 articulated and LOD2 a derived static rest pose. D0 only.

| Tier | Triangles | Draws | Plain bytes |
| --- | ---: | ---: | ---: |
| LOD0 | 3,820 | 1 | 184,556 |
| LOD1 | 1,212 | 1 | 60,116 |
| LOD2 | 154 | 1 | 10,204 |

Authoritative plain files and socket frames are in `manifest.json`, with filenames relative to this folder. Preserve the scene-root skins and the `PART_*` hierarchy together. Full mounting recipe, host/socket table, runtime notes, credits and limitations are in `../../README.md`. Runtime dependencies belong to the family; this folder is not a standalone JavaScript package.

Models by jelaludo.
