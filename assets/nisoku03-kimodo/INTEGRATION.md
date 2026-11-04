# NISOKU-03 / Kimodo motion integration

User-supplied `nisoku03-sentry-a6-v1.zip`, imported on 4 November 2026. Open the chase and clip browser:

https://jelaludo.github.io/SentryTowers_A6/nisoku03-chase/

99 movements / 207 takes, plus five recorded examples. The source archive is preserved in `source/`; all 239 source checksums were verified. 238 checksummed files are also extracted byte-for-byte: `README.txt` is named `README.source.txt`; the original example HTML remains inside the archive. The source `manifest.json`, contracts, profiles, JSON clips, GLBs, reference runtime helpers and validation files are unchanged. See `import-provenance.json` for hashes and exact locations. The source manifest's example link refers to that archived example, not the new viewer.

The kit pins NISOKU-03 r4 at `a92cffad917be69edda47d98c5e78393289b82c1`, original game GLB SHA-256 `10712558de761e1a665f60c3c4adf5335b6492f15f227091f27b14a7d972ec5f`. That matches this repository. The kit retains the original geometry, weights and AUREL mounts, adds four unweighted motion/sole helpers, and scales the complete actor to 1.9 m. Source skeleton: 176 original bones + four helpers. Metres, +Y up, +Z forward; anatomical left is +X. Existing detailed/game/static model exports and earlier revisions remain untouched.

## Runtime ownership

- Instantiate the entire `rig.glb` scene, including the scale wrapper, meshes and skeleton siblings. Use `nisoku03-chase/actor.js` or the original adapter; never call `Skeleton.pose()`, and never run the legacy NISOKU procedural pose controller on the same actor as the mixer.
- In-place clips animate native bones. The controller owns XZ travel. Detected jumps use the source takeoff/apex/landing windows and source height for one controller arc. Avoid adding root height twice.
- Baked recordings already include traversal, contact/IK and root travel. The derived pose clips preserve every non-actor track exactly. `derived/recorded-paths.json` contains the original actor transform with only its initial XZ offset removed; original ground-relative Y is retained. Sample this path once, outside the pose mixer. Quaternion interpolation is spherical. Apply one course yaw/translation to place a recording at a beam.
- The supplied runtime files are preserved lab reference helpers, not a drop-in physics engine. The new viewer uses the supplied recorded contacts rather than pretending to port their entire actor/world API. It does not infer finger/toe grasp, solve arbitrary obstacles, or simulate rigid-body falling.
- `game-sprint-forward-seed822` and `game-ukemi-backward-seed303` remain explicitly selectable with REVIEW ONLY labels. They never enter automatic playback. Automatic eligibility is a source selection flag, not a claim of visual acceptance.

## Chase and controls

`nisoku03-chase/` provides a 47.882255-second continuous loop with 17 beats: idle invitation, walk, jog, run, two running jumps, narrow-beam balance, left/right planted-foot trips and recovery, sprint and return. NISOKU follows an authored course. K0 reacts to closing distance and delayed pursuer speed, accelerates away, brakes to wait during recovery, and vaults the low beams. The lure controller is prewarmed to a repeatable loop so timeline seeking is deterministic. This is an animation test court, not unrestricted AI navigation or a collision solver.

Controls: pause/Space, restart, ¼×–2× speed, scrub, eight chapter shortcuts, follow/court/NISOKU cameras, orbit/zoom, fullscreen, route line, skeleton and wireframe. Clip lab loads all 207 takes plus all five recordings; each can be selected and scrubbed. Library jumps show the source-window controller arc; other unbaked takes are in place. Recorded props were not included in the source kit; the chase uses newly authored test beams.

## Measured exports

| File | Triangles | Material draws | Bytes | Purpose |
| --- | ---: | ---: | ---: | --- |
| `rig.glb` | 24,900 | 3 | 1,276,396 | Original imported articulated game rig |
| `derived/chase.glb` | 0 | 0 | 2,380,700 | Nine animation-only clips for initial playback |
| `derived/library.glb` | 0 | 0 | 13,564,512 | 212 animation-only clips, loaded on demand |
| `../../nisoku03-chase/court_d0_lod1.glb` | 1,788 | 5 | 131,808 | Static court with shared material meshes |
| `../../nisoku03-chase/court_d0_lod2.glb` | 1,788 | 1 | 170,964 | Derived merged-material static court |

Exact measured hashes, clip names/durations and counts are in `integration-validation.json`, `derived/bundles.json` and the scene `manifest.json`; these override any prose transcription. The source ZIP is 23,279,319 bytes. K0's existing game rig adds 14,878 triangles / seven draws / 1,852,732 bytes. The default scene reports 41,568 triangles / 16 draws, including the ground, with overlays off. These are counts, not FPS measurements.

Keep articulated game rigs for readable motion. Existing static model tiers are loading/distance placeholders only; the Kimodo skeleton must not be driven on a static mesh. The detailed NISOKU master remains available for further work, but these retargeted clips are validated for the imported game rig only. The small static court is already below the landmark game budget; the optional one-draw court keeps matching fixture and lookup names. No new Meshopt copies were produced. Plain GLBs are authoritative; the consuming game performs release packing and must validate its decoded result.

## Validation and remaining motion review

Twelve imported/derived/exported GLBs pass glTF validation with zero errors and warnings. The derived library preserves all 5,733 source bone tracks exactly (maximum key value/time difference zero). Root-path checks ensure XZ recentering preserves Y and avoids double travel. Course boundary separation is under 0.1 mm; the lure loop closes under 0.03 mm. Sampled actor gap is 1.29–4.12 m. Browser tests exercise all 212 entries at three poses each, verify exact pose restoration after recording playback, review-only labels, scrubbing/restart, and desktop/mobile layouts without browser errors.

The supplied recordings are not all contact-clean. Dense 50 ms source samples measure lowest surfaces at **−109 mm for the left roll**, **−76 mm for the right roll**, and **−1.766 m during the hard-landing recovery**. The small roll errors remain visible for this motion review; the hard landing is excluded from the chase and prominently marked in Clip lab. It is preserved unchanged. Ledge grab and movement-controls recordings are also review-only examples outside the chase. Self-contact, armor clearance, turns, arbitrary terrain/props, detailed-master retargeting, game r160/release packing and reference-phone acceptance remain pending. No FPS claim.

Rebuild with `node tools/asset-pipeline/build-nisoku-kimodo.mjs` and `node tools/asset-pipeline/build-nisoku-chase-court.mjs`. Validate with `node tools/asset-pipeline/validate-nisoku-kimodo.mjs`. Browser test: `PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs node tools/asset-pipeline/test-nisoku-chase-browser.mjs`, with the repository served at port 8791 (or set `VIEWER_URL`).

Handoff: the containing commit plus `assets/nisoku03-kimodo/` and `nisoku03-chase/`, together with the referenced original NISOKU-03 and K0-TECH-01 families. Original sources, animation-only derivatives and court exports are distinguished explicitly. User-supplied Kimodo output and original Isao geometry are credited in `ATTRIBUTIONS.md`; no inference weights or credentials are bundled.
