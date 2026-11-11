# AUREL-03 / Compact swappable heads

Revision 4 adds **Red Witness**, with its original textured finish and a derived open neck mount. Revision 3 made **compact Hex Witness / Carbon** the default AUREL-03 head. It retains revision 2’s smaller, interchangeable head mounting. Select **RK-MG02**, **Hex Witness**, **Breach Warden** or **Red Witness** in the viewer's **Head** control. Selecting **Original AUREL head** restores the untouched cranial frame/sensor crown. The source GLBs and animation kit remain unchanged.

http://localhost:8788/robot-assembly/

Public route after publication:
https://jelaludo.github.io/SentryTowers_A6/robot-assembly/

Explicit links support `helmet=hex-witness`, `helmet=rk-mg02`, `helmet=breach-warden`, `helmet=red-witness` and `helmet=none`. The last option restores the original head and remains selected on reload.

## Carbon finish

Hex Witness uses the muscle sheath’s **#303b3e** charcoal, with a **#3d484b** crown band, **#343f42** jaw, **#4a5659** edge trim and a deeper **#1e282b** face. Its opaque material matches the muscle layer’s roughness **0.59** and metalness **0.32**. Vertex palette remapping preserves the original cell/grain shading, copper accents, red lenses and luminous cores. The same remapping applies to the merged distance surface without adding geometry, textures or draw calls.

This is an AUREL assembly finish. Standalone Hex Witness source GLBs and the Helmet Lab retain their original light finish. Download links still identify those original source files; reproduce the carbon appearance using this attachment helper. Other swappable helmets retain their own finishes.

## Proportions and shared mount

RK-MG02 is **20% smaller in every axis** than the previous full-scale fit. The other designs use individually chosen uniform scales to match its crown height while preserving their silhouettes. The helmet is now a replacement robotic head; it does not need to enclose the original full-size skull.

Metres, +Y up, +Z forward; original body ground origin. All heads attach to **HEAD_PITCH** with no added rotation. Crown height is **1.785 m**, or **0.215 m above HEAD_PITCH**. Local X/Z and neutral world X/Z are zero; the table gives Y translations. The same mount and scale apply at all tiers.

| Head | Uniform scale | Local Y / m | Neutral world Y / m |
| --- | ---: | ---: | ---: |
| RK-MG02 | 80% | -0.06324 | 1.50676 |
| Hex Witness | 72% | -0.05788 | 1.51212 |
| Breach Warden | 76% | -0.06392 | 1.50608 |
| Red Witness | 80% | -0.05708612 | 1.51291388 |

The original pitch-bound cranial surfaces are omitted from the in-memory body, retaining its yaw-bearing neck and the existing neck muscles. Master/game filtering uses the original skin bindings. Static filtering removes complete disconnected source components extending above Y = 1.581 m. Standalone helmet collars are hidden in master/game; distance collars are omitted as complete disconnected components below each recorded cutoff. For the original three families this avoids slicing through the jaw or shell. Red Witness has a joined neck ring: its adapter also removes triangles reaching below source-local Y=0.075 m, producing an open mounting edge and clearing AUREL’s neck. This trim applies only to the loaded fitted copy. Original downloads still include all source geometry.

`attachHelmet(host, helmet, id)` in `runtime.js` runs **after** `createRig(host)`, before posing. Pass a fresh body/helmet load when changing heads; the viewer does this automatically and preserves the current pose, detail and layer selections. Head yaw/pitch, chest motion and assembly separation remain engine-driven. Names receive `HELMET_` prefixes in memory; `userData.source_node` retains original identifiers. No new baked clips. Original motion studies remain 12 seconds for articulation and 20 seconds for assembly.

## Viewer and downloads

**Head** swaps among all four standalone Helmet Lab designs. **Original head** is enabled when using AUREL's own head. **Head / fit** frames the neck and shoulders. Full-body/front/side/rear views, skeleton/muscle layers, isolated parts, wireframe, hand controls, exploded view, motion seeking and PNG capture remain available. The base `/robot-assembly/` route opens compact Hex Witness / Carbon; `?helmet=none&head=frame` opens the original frame.

Downloads remain clearly separate: original body/animation kit and the selected **original standalone helmet**, at its authored size. **No combined equipped-character GLB or ZIP is authored.** Use the recorded source files plus this attachment helper to reproduce the scaled replacement head. Standalone Helmet Lab viewers retain their authored standalone geometry; the imported Red Witness fit overlay is a proportion reference, not human-fit certification.

## Measured composition costs

Sensor-source body, skeleton + muscles + replacement head. Source bytes include geometry omitted in memory. Master is for close shots; game is the default articulated study; distance is static and retains three source surfaces.

| Head | Tier | Visible triangles | Model draws | Source bytes |
| --- | --- | ---: | ---: | ---: |
| RK-MG02 | LOD0 | 750,144 | 26 | 25,788,580 |
| RK-MG02 | LOD1 | 60,734 | 26 | 2,547,156 |
| RK-MG02 | LOD2 | 6,440 | 3 | 402,916 |
| Hex Witness | LOD0 | 716,888 | 26 | 24,933,256 |
| Hex Witness | LOD1 | 54,898 | 26 | 2,406,040 |
| Hex Witness | LOD2 | 6,698 | 3 | 411,488 |
| Breach Warden | LOD0 | 797,700 | 27 | 26,971,756 |
| Breach Warden | LOD1 | 51,833 | 27 | 2,180,604 |
| Breach Warden | LOD2 | 6,674 | 3 | 443,512 |
| Red Witness | LOD0 | 640,067 | 18 | 36,875,636 |
| Red Witness | LOD1 | 45,381 | 18 | 5,648,740 |
| Red Witness | LOD2 | 6,286 | 3 | 371,776 |

These compositions exceed the 25k unit reference and the 3k/one-draw distance reference; they remain fitting studies, not optimized equipped characters. Counts exclude floor, grid and guides. No FPS claim. The inherited body bounds/neck reductions differ slightly between source tiers and original frame/sensor distance variants; exact costs, bounds, source files and hashes for all 24 combinations are in `manifest.json`. Damage remains d0; tiers are not damage states.

## Validation and handoff

`validation-report.json` checks **18 original GLB hashes** against source commit `c1901e8`, plus the new Red Witness source hashes in its own manifest/provenance, unique dot-free names, all **24 helmet/body-head/tier combinations**, scale/crown/mount consistency, removed pitch-bound skull geometry and **328 attachment poses**. **96 sampled body/muscle intersection checks** passed: each helmet with both source heads, master at rest/maximum study, game at nine study times and distance at rest. This is not an arbitrary-pose collision certification.

`viewer-validation.json` records the original three helmet families. `../../red-witness/browser-report.json` adds all six Red Witness head/tier combinations, real textured rendering and original helmet downloads. The combined reports check actual rendered costs, source downloads, three layers, live helmet swaps at a posed head, original-head restoration, part isolation, wireframe, PNG capture, carbon default, persistent original-head selection and 390 px layout. Plain GLB remains the source of truth. No new compressed exports or release-decode claims.

```sh
node tools/asset-pipeline/build-aurel-helmet-fit.mjs
node tools/asset-pipeline/validate-aurel-helmet-fit.mjs
python3 tools/build-workshop-docs.py
node tools/asset-pipeline/test-aurel-helmet-fit.mjs
```

Handoff: containing commit plus **assets/robot-assembly/helmet-fit/**, with original source files pinned by the manifest. The earlier 1:1 RK fitting is preserved at commit `4278676`.

Completed: carbon Hex Witness default, smaller RK head, all four interchangeable helmet heads, original-head restoration, inherited tiers, sampled motion clearance, source downloads and viewer checks. Pending: visual acceptance, unrestricted motion clearance, optimized combined export, game integration and device profiling.

Original models and attachment preview by **jelaludo / Model Workshop**. No third-party geometry or reference pixels incorporated.

Models by jelaludo — https://jelaludo.github.io/SentryTowers_A6/
