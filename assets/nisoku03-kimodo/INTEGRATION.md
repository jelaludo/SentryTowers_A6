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

## Chase v2 and controls

`nisoku03-chase/` now provides an **82.718795-second loop with 29 beats**: walk/jog/run/sprint, two running jumps, balance, left/right trips, forward and backward ukemi, crouch entry/travel/exit under a gantry, rail-assisted climbing onto a 1.05 m ledge, a sloping deck and a 1.8 m superhero landing. K0 reacts to closing distance and delayed pursuer speed, waits during recoveries and traverses the raised route. The authored course and prewarmed lure controller remain deterministic when seeking.

The ten scene-specific clips in `derived/chase-actions.glb` are **modified derivatives**, separate from the exact source library. Their actor paths live in `derived/chase-actions.json` and must be applied once. The original side-trip path continued to travel after the robot was standing; the new path finishes at 5.15 m instead of 6.3 m and holds during anchored recovery. Ground fitting removes source height offsets, two-bone IK retains link lengths, and the new landing holds its fist-and-knee pose before staged foot placement and rising. Its clenched AUREL fingers are an intentional pose edit. The original sinking landing remains unchanged and labeled in Clip lab.

Controls: pause/Space, restart, ¼×–2× speed, scrub, ten chapter shortcuts, follow/court/NISOKU cameras, orbit/zoom, fullscreen, course line, skeleton and wireframe. Clip lab still exposes the original 207 takes plus five recordings. Source poses are restored exactly when returning from a recording. In-place source jumps receive their source-window controller arc; recorded paths retain original root motion. The viewer loads the actual plain court GLB. Court v1 files are preserved under `../../nisoku03-chase/revisions/v1/` with their original manifest; the previous implementation is pinned at `e4a3835803a66d53f981a2dcc2959c8426becb87`.

## Measured exports

| File | Triangles | Material draws | Bytes | Purpose |
| --- | ---: | ---: | ---: | --- |
| `rig.glb` | 24,900 | 3 | 1,276,396 | Original imported articulated game rig |
| `derived/chase.glb` | 0 | 0 | 2,380,700 | Nine animation-only clips for initial playback |
| `derived/chase-actions.glb` | 0 | 0 | 1,097,944 | Ten scene-specific contact passes, 60 Hz |
| `derived/library.glb` | 0 | 0 | 13,564,512 | 212 animation-only clips, loaded on demand |
| `../../nisoku03-chase/court_d0_lod1.glb` | 2,512 | 5 | 181,884 | Static court with shared material meshes |
| `../../nisoku03-chase/court_d0_lod2.glb` | 2,512 | 1 | 237,908 | Derived merged-material static court |

Exact measured hashes, clip names/durations and counts are in `integration-validation.json`, `derived/bundles.json` and the scene `manifest.json`; these override any prose transcription. The source ZIP is 23,279,319 bytes. K0's existing game rig adds 14,878 triangles / seven draws / 1,852,732 bytes. The default scene reports 42,292 triangles / 16 draws, including the ground, with overlays off. These are counts, not FPS measurements.

Keep articulated game rigs for readable motion. Existing static model tiers are loading/distance placeholders only; the Kimodo skeleton must not be driven on a static mesh. The detailed NISOKU master remains available for further work, but these retargeted clips are validated for the imported game rig only. The small static court is already below the landmark game budget; the optional one-draw court keeps matching fixture and lookup names. No new Meshopt copies were produced. Plain GLBs are authoritative; the consuming game performs release packing and must validate its decoded result.

## Validation and remaining motion review

Thirteen GLBs pass glTF validation with zero errors and warnings. The original 212-clip library still preserves all 5,733 source bone tracks exactly; source archive/extracted checksums remain unchanged. `chase-contact-playback-validation.json` checks 2,200 decoded poses at 60 Hz across the ten new contact clips: limb-length error below 0.1 μm, recovery ankle drift below 0.1 μm, and rail grip error below 0.1 μm. Worst sampled flat-floor intrusion is 3.72 mm; sloped-foot intrusion is below 1 mm. Crouch height peaks at 1.234 m under the 1.55 m crossbars. The derived superhero cut stays at least 9 mm above the floor. These are sampled kinematic checks, not physics guarantees.

Browser validation covers 636 original-library poses and 145 story poses across all 29 beats, exact pose restoration, review labels, new chapter navigation, pause/scrub/restart and desktop/mobile layouts with no runtime errors. Positive-time wrapping preserves exact chapter boundaries. Current review captures are under `../../nisoku03-chase/review/`.

The **original source recordings** still contain their documented errors: left roll −109 mm, right roll −76 mm, and hard-landing recovery −1.766 m at 50 ms source samples. Those source numbers do not describe the corrected chase cuts. The faulty hard landing is manual-review only; the separate derived landing is used automatically. Source review-only sprint 822 and backward ukemi 303 remain excluded. The court is authored choreography, not arbitrary navigation or a dynamic collision/force solver. Full body/fixture/self contact, arbitrary terrain, detailed-master retargeting, consuming-game r160/release packing and reference-phone acceptance remain pending. No new compressed assets or FPS claim.

Rebuild in this order:

1. `node tools/asset-pipeline/build-nisoku-kimodo.mjs` (original exact-pose bundles).
2. `node tools/asset-pipeline/build-nisoku-chase-actions.mjs` (derived contact cuts).
3. `node tools/asset-pipeline/build-nisoku-chase-court.mjs` (court and manifest).

Validate with `node tools/asset-pipeline/validate-nisoku-kimodo.mjs` and `node tools/asset-pipeline/validate-nisoku-chase-contacts.mjs`. Browser: `PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs node tools/asset-pipeline/test-nisoku-chase-browser.mjs`, with the repository served at port 8791 (or set `VIEWER_URL`).

Handoff: the containing commit plus `assets/nisoku03-kimodo/` and `nisoku03-chase/`, together with the referenced original NISOKU-03 and K0-TECH-01 families. Original sources, exact-pose bundles, modified contact cuts and court exports are distinguished explicitly. Attribution remains in `ATTRIBUTIONS.md`; no inference weights or credentials are bundled.
