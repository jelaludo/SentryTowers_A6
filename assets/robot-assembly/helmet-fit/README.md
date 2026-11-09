# AUREL-03 × RK-MG02 / Helmet fitting study

A reversible full-body preview using the original AUREL-03 skeleton, optional muscle layer and RK-MG02 revision 3. The original GLBs, runtime sources, animation kit and standalone helmet remain unchanged.

Open the fitted sensor-head body:
http://localhost:8788/robot-assembly/?helmet=rk-mg02&head=sensor

Public route after publication:
https://jelaludo.github.io/SentryTowers_A6/robot-assembly/?helmet=rk-mg02&head=sensor

## Attachment

Metres, +Y up, +Z forward, original AUREL ground origin. Helmet scale is **[1, 1, 1]**. At neutral pose its source root is placed at **[0, 1.485, 0] m**: 20 mm higher than the isolated-head datum match, to clear the full body's clavicles, rear neck structure and muscles. It attaches to `HEAD_PITCH` at local **[0, −0.085, 0] m**, with no added rotation. Crown height is **1.8328 m** above the body ground datum.

The standalone helmet collar and its rubber seal are hidden in master/game, using AUREL's original neck joint instead. The static helmet's merged surface omits the 268 triangles wholly below local Y = 69 mm, the collar region. That is an in-memory derivative only; source files and downloads retain the original complete helmet. Exact head-datum coincidence is intentionally replaced by the 20 mm fit clearance. All three tiers share the same attachment transform and scale.

`attachHelmet(host, helmet)` in `runtime.js` must run after `createRig(host)`, before animation. It parents the helmet to the moving pitch joint; no per-frame copy or baked clip is needed. It also prefixes helmet node names with `HELMET_` in memory to avoid the body's `DISTANCE_SURFACE` name; `userData.source_node` retains each original name. All source head surfaces remain inside the helmet. This is a proportion/fit preview, not a hidden-internals or draw-call optimization pass.

The helmet follows the original 12-second articulation study and 20-second assembly separation. Head yaw/pitch and chest motion remain engine-driven. The optional muscle adapter continues to follow the original body. No new baked clips or automatic motion-retargeting claims.

## Viewer and downloads

Use **Helmet** to switch between RK-MG02 and the original head. **Head / fit** frames the helmet, neck and shoulders; front, side, rear and full-body views remain available. The layer selector switches skeleton, muscles or both. Part isolation, wireframe, hand controls, motion seeking, exploded view and PNG capture continue to work. Default `/robot-assembly/` remains the original unhelmeted cranial frame.

The GLB and ZIP links are explicitly separate: the existing original body/animation kit plus the selected standalone RK-MG02 tier. **There is no combined equipped-character GLB or ZIP in this study.** To reproduce the equipped fit, use the pinned source GLBs and the attachment helper. A combined optimized export is a separate future handoff.

## Measured composition costs

Default sensor head, skeleton + muscles + fitted helmet; source byte totals include collar data hidden or omitted by the fitting helper:

| Tier | Visible triangles | Model draws | Source bytes |
| --- | ---: | ---: | ---: |
| LOD0 | 754,836 | 26 | 25,788,580 |
| LOD1 | 62,194 | 26 | 2,547,156 |
| LOD2 | 6,650 | 3 | 402,916 |

Game is the default for this articulated study; select master for close inspection. Static distance freezes the original rest pose and retains three separate source surfaces/materials. This composition exceeds the 25k unit reference and the 3k/one-draw distance reference. It is not an optimized equipped unit. Numbers exclude floor, grid and proportion guides; no FPS claim. Source bounds vary slightly across the pre-existing body tiers (about 3.3 mm total width master versus game); they are preserved rather than silently rescaled. Exact per-variant bounds, files, costs and hashes are in `manifest.json`.

## Validation and handoff

`validation-report.json` checks 12 source GLB hashes against commit `44573d5c64f229866e301f3a5b7c20ba9da6ba7c`, unique names, six head/tier combinations, exact scale and mount, and 82 sampled attachment poses. Surface intersection checks cover both original head variants against the complete body and muscle layer: master at rest/maximum joint study, game at nine study times and static distance at rest. No intersections occur in these 24 sampled combinations. General motion, arbitrary poses, donning and external animation still need review.

`viewer-validation.json` checks rendered costs, three visible-layer modes, reversible helmet selection, motion/separation, part isolation, wireframe, source GLB/PNG downloads, default-route regression and 390 px layout. Plain source GLBs remain the source of truth; there are no new compressed exports or release-decode claims.

```sh
node tools/asset-pipeline/build-aurel-helmet-fit.mjs
node tools/asset-pipeline/validate-aurel-helmet-fit.mjs
python3 tools/build-workshop-docs.py
node tools/asset-pipeline/test-aurel-helmet-fit.mjs
```

Handoff: containing commit plus **`assets/robot-assembly/helmet-fit/`**, including the source manifest and attachment runtime. Preserve the linked original sources at their recorded hashes.

Completed: requested full-body fitting preview, three source tiers, both head options, pose/clearance checks and source downloads. Pending: visual acceptance, unrestricted movement clearance, optimized combined character export, consuming-game integration and device profiling.

Original models and derived attachment preview by **jelaludo / Model Workshop**. No third-party geometry or concept pixels incorporated.

Models by jelaludo — https://jelaludo.github.io/SentryTowers_A6/
