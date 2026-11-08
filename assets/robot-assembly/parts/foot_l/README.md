# AUREL-03 / Foot L

Standalone anatomy module. All tiers use the complete robot’s ground datum, metres, +Y up and +Z forward. Its surface stays at the assembled height; use the named attachment for mounting. LOD0 is detailed, LOD1 articulated and LOD2 a derived static rest pose. D0 only.

| Tier | Triangles | Draws | Plain bytes |
| --- | ---: | ---: | ---: |
| LOD0 | 63,560 | 1 | 2,897,704 |
| LOD1 | 2,496 | 1 | 131,056 |
| LOD2 | 318 | 1 | 22,932 |

Authoritative plain files and socket frames are in `manifest.json`, with filenames relative to this folder. Preserve the scene-root skins and the `PART_*` hierarchy together. Full mounting recipe, host/socket table, runtime notes, credits and limitations are in `../../README.md`. Runtime dependencies belong to the family; this folder is not a standalone JavaScript package.

Models by jelaludo.
