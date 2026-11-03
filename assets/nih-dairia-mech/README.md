# Nih-Dairia / Isao mechanical study v1

Isao encountered a Nih-Dairia, reverse-engineered its six-limbed movement and built a mechanical analogue. The low radial chassis carries six articulated limbs, ivory armor petals, exposed carbon hydraulic sleeves, amber bearing rings and eighteen folding titanium ground claws. This is original procedural mechanical geometry following the supplied concept and creature references.

Viewer route: `nih-dairia-mech/`. Start a local server at the repository root, then open:

http://127.0.0.1:8791/nih-dairia-mech/

Creature reference:

https://kai-denrei.github.io/lab-creatures/?specimen=nih-dairia

The reference site and user-supplied images informed the silhouette and lore. The tripod gait is an authored mechanical interpretation, not a measured reproduction of the creature simulation. Reference image hashes are in the manifest; images and external creature geometry are not redistributed.

## Exports and measurements

| Tier | Triangles | Material draws | Plain bytes | Derived Meshopt bytes |
| --- | ---: | ---: | ---: | ---: |
| LOD0 / detailed | 58,952 | 3 | 2,812,128 | 542,860 |
| LOD1 / game | 17,784 | 3 | 886,548 | 196,540 |
| LOD2 / static distance | 1,776 | 1 | 64,016 | 33,856 |

The articulated game tier meets the unit target of ≤25k triangles. Static distance meets ≤3k triangles, one draw and ≤250 KB. No FPS improvement is claimed. Palette-only GLBs contain no textures or external resources. Each material bucket shares one rigid skin; all parts have weight 1 to one bone. Detailed and game meshes use the same 49 control bones, 27 sockets, bind transforms and ground root. The static tier preserves the same lookup interface but its merged geometry does not move.

Plain files in `lod0/`, `lod1/`, `lod2/` are the source of truth. Optional `derived/meshopt/` copies are derived. The game may repack the plain files at release. D0 is the only authored damage state; no D1–D3 damage variants are implied by the LOD numbers.

## Runtime contract

Metres, +Y up, +Z forward. `NIH_DAIRIA_MECH_ROOT` is at ground level and the plot centre. The nominal observation pose is about 5.99 m wide × 6.91 m long × 1.82 m high. Scale is an authoring assumption. Reserve a 9 × 9 m plot and 2.6 m vertical clearance for the demonstrated poses. Bounds and conservative swept envelope are in every manifest entry. There is no exported floor.

`runtime.js` exposes `applyPose(root, time, mode, extension)` and `motions`. Run it after loading the GLB; `extension` is a minimum stroke fraction from 0 to 1. It returns phase, contact status and per-foot targets. The viewer keeps walking in place. For forward travel, translate an outer parent at 0.30 m/s along +Z without wrapping world displacement when the three-second gait loops.

| Mode | Runtime name | Duration | Behavior |
| --- | --- | --- | --- |
| `idle` | `Observation_Idle` | 6 s loop | Subtle body pressure regulation; contacts fixed |
| `walk` | `Tripod_Walk_Cycle` | 3 s loop | Alternating tripods, 65% support duty, 0.34 m swing lift; 0.30 m/s translation contract |
| `extend` | `Reach_Cycle` | 8 s loop | Extends and retracts all six carbon sleeves; maximum 580 mm stroke |
| `anchor` | `Anchor_Deploy` | 8 s one-shot | 0–2 s widen support; 2–4 s deploy claws; 4–6 s lower and brace; 6–8 s hold; later times remain held |

These are named runtime demonstrations, not baked GLB animation clips. `clips: []` is intentional: the game owns the pivots. The initial support-widening stage is a kinematic repositioning demonstration. Claws meet the flat support plane; penetration, adhesion and terrain resistance are not simulated.

`BODY_HEAVE` owns body height. Each `LEG_01` through `LEG_06` has `_YAW`, `_HIP`, `_KNEE`, `_SLIDE`, `_ANKLE` and `_CLAW_1`–`_CLAW_3`. The fixed upper link is 1.15 m; the lower knee-to-ankle distance is 1.85–2.43 m. The `_SLIDE` node translates along local +X from 1.50 to 2.08 m; shaft geometry remains rigid. The ankle counter-rotates to keep the foot level. Leg 01 points +Z; other legs follow at 60° intervals; odd/even legs form the two tripods.

Sockets: six `LEG_nn_CONTACT` ground points, eighteen `LEG_nn_CLAW_k_TIP` points, `SOCKET_DORSAL_TOOL`, `SOCKET_POWER`, and `SOCKET_FRONT`. Socket positions/normals are measured in the rest pose in the manifest; use current world transforms during motion. Names are unique and dot-free. All three tiers preserve the engine-facing names and hierarchy.

LOD selection is provisional: load static LOD2 first, approach threshold 150 m with 20 m hysteresis, switch to LOD1 before motion becomes readable. LOD0 is for close inspection and recording. Do not drive the static distance bones expecting its mesh to articulate.

## Review, reproduction and checks

Authoring source: `tools/asset-pipeline/nih-dairia-mech-shape.mjs` plus `runtime.js`. `source/blender/nih-dairia-mech-review.blend` is an editable derived import of the detailed plain GLB, with a studio camera and lights; it is not the authoring source. `preview.png`, `previews/`, `design-sheet.jpg`, and `motion-sheet.jpg` are derived review imagery. Studio stills show the rest pose; reach and anchor stills are actual viewer captures.

Rebuild from repository root:

```sh
node tools/asset-pipeline/build-nih-dairia-mech.mjs
node tools/asset-pipeline/validate-nih-dairia-mech.mjs
blender --background --python-exit-code 1 --python tools/blender/render_nih_dairia_mech.py
python3 -m http.server 8791
```

With that server running, run `tools/asset-pipeline/test-nih-dairia-mech-viewer.mjs` using Playwright (set `PLAYWRIGHT_MODULE` to its installed module path if needed), then `node tools/asset-pipeline/prepare-nih-dairia-review.mjs`. Browser captures use the OS temporary directory unless `NIH_SHOT_DIR` is set. Rebuild shared navigation with `python3 tools/build-workshop-docs.py`.

Validation covers all six plain/decoded exports, glTF errors/warnings, hashes, triangle/draw counts, degenerate triangles, unique names, hierarchy/socket parity, rest bounds, 1,056 full-geometry pose samples, zero/full extension, planar clearance, rigid upper links, exact foot targets, translated stance contacts and one-shot terminal hold. Reports: `validation-report.json` and `viewer-validation.json`. Numerical contact and rigid-link errors are below 0.001 mm; deployed claw tips reach the plane, with negligible floating-point error. These checks do not certify self-collision or general terrain interaction.

Viewer controls: Observe / Walk / Reach / Anchor, play/pause, time scrub, extension, detail/encoding selectors, wireframe, skeleton, foot-contact markers, selected GLB download, perspective/top/front/side/actuator/claw cameras, orbit and zoom. Desktop and 390 px mobile WebGL review cover all behaviors and six file combinations. Static selection disables motion controls.

Completed v1 scope: mechanical model, runtime motion study, detailed/game/static exports, decoded validation, viewer, source/review files and hand-off metadata. Pending integration: consuming-game r160 and release gltfpack checks, general terrain/contact forces, turn and transition solving, collision/self-collision, damage variants if requested, game-camera LOD tuning and reference-phone measurements.

Credit: Mechanical model by jelaludo. Creature concept reference: kai-denrei / lab-creatures. Hand off the commit containing this README plus folder `assets/nih-dairia-mech/`; preserve the plain exports and distinguish the derived files. The supplied collaboration contract is unchanged.
