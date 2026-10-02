# Planet Scoreboards

Three grounded, literal scoreboards for planetary game scenes: **Beacon** (seven-segment light bars), **Flip-Dot** (reflective disc matrix), and **Split-Flap** (mechanical numbered cards). Their display technologies were inspired by the gallery at:

https://kai-denrei.github.io/dexipurei-galore/

These are original 3D structures and runtime code, not copied assets from that site. Every board has a solid ground base, an eight-digit score face, a visible `SCORE` label and a power socket. The default score is **12,345,678**. Runtime range is integer **0–99,999,999**, clamped at either end.

## Measured exports

| Board | Tier | Triangles | Draw calls | Plain GLB bytes | Optional Meshopt bytes |
| --- | --- | ---: | ---: | ---: | ---: |
| Beacon | LOD0 detailed | 1,796 | 2 | 141,548 | 45,608 |
| Beacon | LOD1 game | 1,572 | 2 | 125,800 | 40,444 |
| Beacon | LOD2 distance | 1,572 | 1 | 124,696 | 38,696 |
| Flip-Dot | LOD0 detailed | 4,612 | 2 | 271,564 | 89,492 |
| Flip-Dot | LOD1 game | 3,558 | 2 | 220,992 | 66,776 |
| Flip-Dot | LOD2 distance | 1,512 | 1 | 120,012 | 37,248 |
| Split-Flap | LOD0 detailed | 3,456 | 2 | 267,576 | 83,844 |
| Split-Flap | LOD1 game | 2,880 | 2 | 227,828 | 70,520 |
| Split-Flap | LOD2 distance | 2,880 | 1 | 226,728 | 68,636 |

All files are plain, self-contained GLBs with vertex colours, one material and no textures. LOD2 is one static mesh and one material. The game tier uses two GLB draws before runtime score replacement; the live score adds one GPU-instanced draw. All nine exports meet the collaboration document's landmark triangle, draw and byte targets. These are geometry measurements, not an FPS claim.

## Runtime score control

`SCORE_STATIC_DIGITS` is a visible, static 12,345,678 snapshot in LOD0/LOD1. `SCORE_DISPLAY_ORIGIN` is the stable local anchor for the live display. `runtime.js` hides the snapshot and adds one `THREE.InstancedMesh`, then updates its instance matrices when the score changes:

```js
import {attachScoreDisplay} from './runtime.js';
const live = attachScoreDisplay(THREE, gltf.scene, manifestEntry, 12345678);
live.setScore(99999999);
// On unload: live.dispose();
```

The caller passes the same Three.js namespace used to load the GLB. `setScore` accepts finite numbers, truncates fractional values and clamps to 0–99,999,999. The viewer offers direct entry, increments and count-up; these are preview controls, not exported clips. Do not bake score changes into an animation. The consuming game should drive the number from authoritative score state. LOD2 keeps the default static snapshot for map/loading views; use LOD1 when the live score becomes readable. The model has no gameplay logic for awarding points.

The [Workshop viewer](../../planet-scoreboards/) can compare all three boards or inspect one, switch detail tiers, enter a score, add 1/1,000/1,000,000 points, count up by a million, reset or show the maximum, and choose front, top or perspective cameras. Live score controls are disabled at LOD2 because its face is a fixed distance snapshot.

## Placement and handoff

- Units: metres, +Y up, +Z forward, origin on the ground at the centre of an 8 × 5 m reserved plot.
- `SOCKET_POWER` and `SOCKET_SERVICE` are named, stable in every tier. Positions and normals are in `manifest.json`.
- Suggested selection: load LOD2 initially, switch to LOD1 within 150 m with 20 m hysteresis. Tune with the game camera. LOD0 is for close shots and recordings.
- Only D0 intact is authored. Damage states are independent from detail tier and score.
- No clips are exported; the score is engine-driven. At runtime the face always stays on the physical board.

Plain GLBs are the source of truth. Optional `.meshopt.glb` files are transport derivatives and are decoded in validation. Rebuild with `node tools/asset-pipeline/build-planet-scoreboards.mjs`; validate with `node tools/asset-pipeline/validate-planet-scoreboards.mjs`; render the selection with `blender --background --python tools/blender/render_planet_scoreboards.py`.

Hand off the commit hash plus `assets/planet-scoreboards/`. Game-camera, live browser, release gltfpack and reference-phone performance reviews remain pending.

## Additional PLAYER vs ISAO rivalry boards

The [rivalry viewer](../../scoreboard-rivalry/) presents a new pair and all three new display technologies. These are **additional variants** in the same folder; the original nine single-score GLBs and their eight-digit API are unchanged. Each extra board reserves the same grounded 8 × 5 m plot, uses one material, and has three rows labeled KILLS, GATHERED and USED. The owner name field accepts 18 characters. Each score is an integer from 0 through 999,999, with leading zeros blank by default. The detailed master is LOD0, the live game tier is LOD1, and LOD2 is a one-mesh blank face for distance and loading views.

| Rivalry board | Tier | Triangles | GLB draws | Plain GLB bytes | Optional Meshopt bytes |
| --- | --- | ---: | ---: | ---: | ---: |
| Beacon | LOD0 | 380 | 1 | 30,712 | 12,940 |
| Beacon | LOD1 | 204 | 1 | 18,712 | 8,952 |
| Beacon | LOD2 | 204 | 1 | 18,720 | 8,960 |
| Flip-Dot | LOD0 | 5,384 | 1 | 284,960 | 95,308 |
| Flip-Dot | LOD1 | 3,948 | 1 | 220,040 | 61,572 |
| Flip-Dot | LOD2 | 168 | 1 | 15,912 | 8,092 |
| Split-Flap | LOD0 | 608 | 1 | 48,508 | 18,508 |
| Split-Flap | LOD1 | 432 | 1 | 36,500 | 14,520 |
| Split-Flap | LOD2 | 432 | 1 | 36,508 | 14,528 |

The measurements count rendered triangles and mesh draws from each plain GLB before runtime lettering. Runtime adds one instanced digit draw and one instanced label draw. No FPS claim is made. The game-tier and distance-tier files meet the landmark budget targets in `docs/ASSET-COLLABORATION.md`.

```js
import {attachRivalryDisplay} from './runtime.js';
const live = attachRivalryDisplay(THREE, gltf.scene, manifestEntry,
  {kills: 0, gathered: 500, used: 0},
  {label: 'ISAO', color: '#b8f5c6'});
live.setScores({kills: 1}, {duration: 2});
live.setLabel('ISAO');
live.setColor('#ffd06e');
// Once per frame: live.update(deltaSeconds);
live.celebrate(2);
// On unload: live.dispose();
```

`setScores` clamps each row, defaults to a 0.25-second transition, and accepts partial row updates. `setScore` is a convenience alias for KILLS. `setRowLabels` can replace the three labels, up to eight characters each. `blankLeading:false` on attachment displays six full digits instead. Beacon fades changed segments; Flip-Dot sweeps across disc columns; Split-Flap steps through digits from the units side. `celebrate(seconds)` animates the face only. The consuming game can emit confetti at `SOCKET_FX` at [0, 4.25, 0] m, with +Y normal. `SOCKET_POWER` and `SOCKET_SERVICE` are also preserved across the new tiers. There are no baked clips or score-award logic; game code supplies score events and calls `update`.

Suggested LOD2→LOD1 selection is 150 m with 20 m hysteresis, subject to game-camera review. LOD0 is for recordings. Damage state is D0 intact only. Build with `node tools/asset-pipeline/build-planet-scoreboards.mjs`, validate with `node tools/asset-pipeline/validate-planet-scoreboards.mjs`. Plain GLB is the source of truth; Meshopt copies are optional derivatives. The local Safari viewer was checked with live PLAYER and ISAO values. Game-camera, release gltfpack and reference-phone reviews remain pending.
