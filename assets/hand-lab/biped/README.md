# AUREL-01 / Biped variants

Two additional versions for robot integration: an economical articulated LOD1 and a static LOD2 frozen in a natural inward curl. The original master, game and distance GLBs remain byte-for-byte intact. Both use the same right-side authoring frame, scale, joint hierarchy and attachments as the original hand. The detailed master remains the original family's LOD0.

Economical game viewer:

https://jelaludo.github.io/SentryTowers_A6/hand-lab/?variant=biped&lod=1

Curled distance viewer:

https://jelaludo.github.io/SentryTowers_A6/hand-lab/?variant=biped&lod=2

## Measured exports

| Version | Triangles | Draws | Plain bytes | Derived Meshopt bytes |
| --- | ---: | ---: | ---: | ---: |
| Original articulated game | 14,392 | 5 | 579,840 | 134,516 |
| Biped articulated game | 2,708 | 1 | 157,332 | 39,952 |
| Biped curled static | 2,708 | 1 | 97,456 | 41,460 |

The new game version uses **81.2% fewer triangles** and one material draw instead of five. These are model counts, not measured frame-rate gains. The static version has the same economical surface geometry with articulation frozen and skin attributes removed. Its bounds differ from the neutral model because of the pose; no scale or attachment offsets change.

Plain authoritative files are `lod1/aurel01_biped_d0_lod1.glb` and `lod2/aurel01_biped_d0_lod2.glb` within this folder. Optional compressed copies are under the parent family's `derived/meshopt/biped/`. The parent `manifest.json` has `variant: "biped"`, measured bounds, socket transforms, budgets, hashes and the frozen pose. All exports are D0; damage states and detail tiers are independent.

## Construction and articulation

Short three-section shells retain twelve sides around their circumference; low-sided joint barrels, simple tactile blocks and reduced cuff ribs replace the small bearing assemblies and surface details. Hidden longitudinal links are omitted. A single `BIPED_PALETTE` material uses vertex colors for ivory, graphite, gold and amber; the amber is painted rather than emissive. Material roughness/metalness are shared, so the lab disables separate shell/pad material visibility. Wireframe, joint inspection and shell-bone separation remain available on the articulated model.

LOD1 keeps all **23 engine axes**, **59 required names** and **17 sockets**, with rigid single-bone weights. Every original named pose and runtime study still works through the existing `runtime.js`. No game pivots or animation clips are baked. `biped.js` exports `BIPED_REST`; apply it with `rig.pose(BIPED_REST)` to restore the natural rest posture. The pose JSON download includes the chosen variant and source file.

The four fingers curl progressively farther toward the little finger, forming a loose cup rather than a fist. The thumb rests closer to the palm. Wrist flexion and deviation remain zero. `SOCKET_WRIST_ATTACH` stays at `[0, 0, 0]` with its original orientation.

LOD2 is a **frozen lookup hierarchy**: its meshes do not animate. Its local socket offsets and parent names match LOD1, while world transforms match LOD1 **after applying `BIPED_REST`**. Compare it with that pose, not the straight neutral bind pose. The validator checks every static vertex against the articulated economy model in the same pose. Use LOD1 for readable motion or interaction; transition to the rest pose before a static swap. The existing 150 m/20 m hysteresis metadata remains provisional and should follow the parent robot's screen-size policy.

Full mounting, coordinate, mirroring and LOD integration notes: `docs/BIPED-EXTREMITIES.md` at the repository root. These files prepare the parts for biped integration; no complete robot was retargeted in this change.

## Validation and reproduction

`validation-report.json` covers all four plain/decoded variant files, nondegenerate geometry, rigid weights, original file hashes, budgets, every required node and socket against the original rig, original motions and axis limits, floor/pipe clearance, inward curl and static lockout. `viewer-validation.json` covers the version selector, all tier/encoding combinations, controls and downloads, static lockout, desktop/mobile framing and actual one-primitive loading. Source hashes identify the tested files. The parent family's reports separately retain the original asset validation scope.

Rebuild the original family first only if needed, then regenerate both variants:

```sh
node tools/asset-pipeline/build-biped-extremities.mjs
node tools/asset-pipeline/validate-biped-extremities.mjs
PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node tools/asset-pipeline/test-biped-extremities-viewers.mjs
node tools/asset-pipeline/prepare-biped-extremities-review.mjs
```

The browser test expects a server at `http://127.0.0.1:8791/`; override with `EXTREMITY_LAB_BASE`. `review-sheet.jpg` and `previews/` are derived screenshots of the actual exported meshes. Preserve original files and notices; credit **jelaludo**. Handoff is the containing commit plus the parent `assets/hand-lab/` folder, including the shared runtime and `biped.js`.

Finite pose checks do not establish arbitrary-pose self-collision avoidance, force-based contact or manufacturing readiness. Left-side retargeting, complete-robot integration, consuming-game r160/release packing and reference-phone performance remain pending. The received collaboration contract is unchanged.
