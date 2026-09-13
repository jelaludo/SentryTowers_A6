# HUGIN runtime LOD candidates

HUGIN now has separate LOD1 and static LOD2 files for every authored damage state. The original detailed GLBs remain preserved beside them. These are current-contract candidates, not a game-readiness claim: the game camera and reference phone must still establish the final swap distance and performance.

| State | LOD1 triangles / draws / plain bytes | LOD2 triangles / draws / plain bytes |
| --- | ---: | ---: |
| D0 | 7,190 / 7 / 286,776 | 2,188 / 1 / 71,532 |
| D1 | 7,192 / 7 / 287,836 | 2,188 / 1 / 71,888 |
| D2 | 7,138 / 1 / 213,444 | 2,186 / 1 / 72,452 |
| D3 | 7,188 / 1 / 203,420 | 2,193 / 1 / 69,300 |

LOD1 D0/D1 preserve the named 20-second `Cargo_Recovery_Cycle` on `CATCHER_LIFT`, `CATCHER_SHOULDER`, `CATCHER_ELBOW`, `CATCHER_WRIST`, `CAPTURE_JAW_L` and `CAPTURE_JAW_R`. Static geometry is consolidated separately from those six moving groups. D2/D3 have no clip, matching the disabled detailed states. LOD2 is one static vertex-colour mesh and one material; all required lookup nodes remain but do not articulate its merged geometry.

Use LOD2 for initial map, loading and far views. The collaboration contract’s provisional landmark approach threshold is 150 m with 20 m hysteresis; confirm that in the game camera and on the reference phone before release. Use LOD1 anywhere the recovery motion needs to read. LOD0 remains for recordings.

`manifest-lods.json` records hashes, source hashes, dimensions, exact metrics, selection metadata, sockets, colliders, clips and review state. Plain GLB is the source of truth. The `.meshopt.glb` files are optional derived copies and have also been decoded during validation.

Rebuild and validate from the project root:

```sh
node tools/asset-pipeline/build-landmark-lods.mjs
node tools/asset-pipeline/validate-landmark-lods.mjs
```

The reduction is a library-authored derivative of the preserved detailed plain GLBs. It uses topology-preserving Meshoptimizer simplification and a shared vertex-colour palette, then groups geometry by moving control. Do not replace the detailed originals.
