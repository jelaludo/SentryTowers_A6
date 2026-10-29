# EVA-K8 / Heavy Hardsuit

Version two of the EVA-K7 hardsuit, built as a separate family from a written v2 brief against the same user-supplied futuristic astronaut reference. EVA-K7 files are untouched. Where v1 reads as a clean toy, EVA-K8 is a heavy, worn suit: grey/black bevelled plates with panel lines and bolt heads over a wrinkled quilted pressure garment, sparse muted brass on buckles, rings and bolt heads, an angular five-face visor helmet seated in a latched collar, a backpack tank plus secondary unit with two ribbed hoses, and lugged boots. Same human leg chain and 1.00 m hip centre as v1.

Open the viewer:

http://localhost:8788/eva-k8/

## What changed against v1

| Item | EVA-K7 | EVA-K8 |
| --- | --- | --- |
| Shoulder joint span | 0.60 m | 0.81 m (1.35×) |
| Chest half depth | 0.14 m | 0.185 m (1.3×) |
| Helmet shell radius | 0.150 m dome | 0.124 m faceted shell (0.75×); helmet half width 0.115 m vs chest 0.257 m |
| Gloves | 1× | 1.4× joint offsets and geometry |
| Boots | 0.27 m support, flat sole | 0.35 m support, 1.5× hull, 24 mm sole over 18 mm lugs |
| Forearms / shins | taper toward the wrist / ankle | thicker at the wrist (0.062 → 0.076 m) and ankle (0.072 → 0.086 m) |
| Waist | pinched | 0.182 m half width plus a 0.20 m belt ring |
| Plates | chamfered rings | 6-ring bevels, chamfered corners, inset panel groove, 2–4 bolt heads |
| Limbs | ribbed cylinders | displaced wrinkles bunching toward shoulders, elbows, hips, knees |
| Chest | one plate + abdomen | yoke, breastplate, control block, abdomen plate, shoulder caps overlapping the yoke |
| Belt | pouches | webbing strap, brass buckle, three pouches, tool holster on the right hip only |
| Legs | one thigh plate, shin guard | two overlapping thigh and shin slabs, steel hinge leaves and pin at the knee |
| Decals | EVA-K7 | EVA-K8, K8-0088, SN 0088, worn warning stripe on the right shoulder |
| Helmet | sphere, visor patch | faceted shell, 5×2 flat visor faces, 9.5 mm steel rim, two lamps, four collar latches |
| Life support | one tank | tank left, box unit right, webbing bands, two ribbed hoses with steel couplings |
| Clips | 6 | 7: `Hero_Stance` contrapposto plus the six carried over |
| Materials | 6 palette | 7 palette in the GLB; worn PBR generated in the viewer |

Measured master: 1.108 × 1.955 × 0.598 m (ground clearance 6 mm, helmet top 1.961 m). Standing plot 1.1 × 0.8 m.

## Exports and measured budgets

Plain self-contained GLBs are authoritative. Optional Meshopt copies in `derived/meshopt/` are derived. No external images or buffers, no textures, per the collaboration contract.

| Tier | Triangles | Mesh draws | Plain bytes | Meshopt bytes | Clips |
| --- | ---: | ---: | ---: | ---: | ---: |
| Detailed / LOD0 | 76,724 | 7 | 3,961,848 | 979,532 | 7 |
| Game / LOD1 | 23,852 | 7 | 1,945,892 | 567,112 | 7 |
| Static distance / LOD2 | 2,900 | 1 | 234,680 | 72,648 | 0 |

LOD1 meets the unit target of 25k triangles with articulated pivots. LOD2 meets 3k triangles, one draw and 250 KB. Use LOD0 for close inspection and recordings, LOD1 throughout animated gameplay. LOD2 is an unskinned static silhouette with the same 65 named nodes and no clips. Initial LOD2, 30 m approach and 8 m hysteresis remain suggested values awaiting game-camera review; never swap a moving character to static distance.

## Materials: palette in the file, wear at runtime

The GLB carries seven named palette materials and nothing else: `EVAK8_Carbon_plate`, `EVAK8_Quilted_suit`, `EVAK8_Brass_fittings`, `EVAK8_Rubber_seals`, `EVAK8_Steel`, `EVAK8_Visor_glass`, `EVAK8_Decal_stencil`. The distance tier uses one vertex-colour palette material. Nothing in the palette is pure white or black and every entry is under 15% saturation.

The worn look lives in `eva-k8/materials.js` and is generated when the page loads (three.js r180, `onBeforeCompile` on `MeshPhysicalMaterial`):

- Three 512² tileable textures from seeded lattice noise: carbon twill normal (2.5 mm cells, roughness variation in alpha), quilted diamond plus low-frequency wrinkle normal (quilt height in alpha for crease darkening), and a detail pack (grime, anisotropic scratches, brushed-metal streaks, dust speckle).
- Per-vertex masks computed from the loaded geometry: part height from skin index (0 at the bottom of each part), edge curvature from co-located normal divergence (bevels, facet edges, tube caps), and a neighbour-based cavity estimate.
- Triplanar sampling in bind-pose space (`position` and `normal` before skinning), with the skin matrix carried to the fragment stage so the perturbation stays attached to the suit through every clip.
- Surface rules: grime darker in cavities, at the bottom of each part and on downward faces; dust and extra roughness on upward faces; lighter edge wear with raised metalness on bevels and scratches; crease darkening on the quilting; brushed roughness streaks on steel and brass; the stencil decal wears through to the plate.
- Visor: dark physical glass, roughness 0.06, gold-tinted specular, clearcoat, 93% opaque so the dark headform inside shows as a hint. The shell has no faces behind the visor.
- Half-resolution screen-space GTAO (six samples, denoised), ACES filmic at 0.85 exposure, hangar environment map, one soft shadowed key, cool rim, low fill, dark seamless floor with radial falloff and contact blobs under the boots. The `Runtime wear` and `Ambient occlusion` toggles switch both off for comparison; `flat-palette.png` shows what a consumer sees without the module.

If the game wants the same look it can adopt `materials.js` (it is self-contained) or we can agree on baked textures. Until then the palette renders as a clean flat suit, like v1.

## Rig and runtime contract

Metres, +Y up, +Z forward, origin on the ground beneath the standing hip centre. Use per-clip envelopes from `validation-report.json` for animated culling (walk envelope 1.31 × 1.89 × 1.02 m; halt signal 1.35 × 1.96 × 0.98 m). D0 intact only; D1–D3 are not authored.

50 rigid joints, 12 sockets and 65 unique dot-free nodes, consistent across all three tiers and identical in name to EVA-K7, so engine lookups transfer. Main path: `ROOT` → `EVAK8_RIG` → `MOTION` → `PELVIS` → `WAIST` → `CHEST` → `NECK` → `HEAD`. Shoulders `SHOULDER_L/R` sit 0.2835 m from centre and carry the pauldrons; `UPPER_ARM`, `FOREARM` and `HAND` carry the sleeves, gauntlets and gloves; each glove has four three-link fingers and a two-link thumb at 1.4× the v1 offsets. Legs: `HIP`, `KNEE`, `ANKLE` and a `TOE` lookup; boots are rigid on `ANKLE`.

Place the complete glTF scene inside an instance wrapper. `ROOT` is a skeleton lookup; use `SkeletonUtils.clone` for skinned instances. All locomotion clips are in place; move the wrapper along +Z at `speed_mps` times playback rate. No root displacement is baked. `HEAD` is animated inside the clips and may be overridden additively by an engine look-at; `SOCKET_VISOR` marks the visor centre with +Z as the viewing normal in the `HEAD` rest frame. Twelve sockets keep names, parents and bind positions across tiers and carry no animation tracks. Palm normals are −X on the left hand and +X on the right. Foot sockets mark the 6 mm contact plane with a 35 cm heel-to-toe support; flat support anchors the sole, heel placement and toe-off rotate about the heel and toe sockets. `SOCKET_BACK` marks the backpack bracket; the tank, unit, webbing and both hoses are part of the `CHEST` skin, with one coupling on `NECK`.

## Motion

Seven original performances on the workshop biped IK with the v1 leg lengths, 1.00 m hip height and 35 cm boot pivots. Analytic two-bone IK preserves leg lengths; these are authored flat-floor kinematics, not captured motion or a force simulation.

| Clip | Duration | Mode | Behaviour |
| --- | ---: | --- | --- |
| `Hero_Stance` | 4 s | Loop | Weight over the left boot, pelvis 3 cm toward it and rolled, right boot forward and turned out with the heel 5.5 cm up on the toe socket, right knee 34° against 14°, chest 5° forward, elbows 14° and 13°, helmet turned 8°. No mirror symmetry. Slow breathing. |
| `Suit_Idle` | 4 s | Loop | Planted stance, slow pressurised-suit breathing, weight shifts and a helmet glance. |
| `Walk_Cycle` | 1.3 s | Loop | 92 steps/min · 0.75 m/s. Heavy-boot heel placement, weight transfer and restrained arm swing. |
| `Cautious_Walk_Cycle` | 2.2 s | Loop | 55 steps/min · 0.32 m/s. Lowered stance, short careful steps and long double support. |
| `Survey_Scan` | 6 s | One-shot | Boots stay planted while the helmet and upper torso sweep the horizon. |
| `Kneel_Inspect` | 5 s | One-shot | Drop the hips 30 cm into a braced inspection crouch, hold, then stand. |
| `Signal_Halt` | 4 s | One-shot | Raise an open right glove, hold a silent halt signal, then lower it. |

## Viewer and verification

Nine views (three-quarter at chest height from a slight low angle, 40° FOV; front, side, rear, helmet, chest, gloves, boots, tank) plus fullscreen: the same part buttons as v1. Seven motion controls, playback speed, replay, scrub, contact timelines and phase jumps, ground travel, skeleton, wireframe, boot markers, repeated one-shots, ambient-occlusion and runtime-wear toggles, and a true-scale EVA-K7 v1 comparison that keeps v1's own flat palette. No grid. Drag to orbit, scroll to zoom, Space to pause.

Six plain/decoded exports and 12,748 geometry samples at 120 Hz pass validation: no glTF errors or warnings, finite/nondegenerate geometry, unique naming and cross-tier socket parity, explicit durations, unbaked sockets, loop/return seams, intermediate-key rigid arm/leg/finger lengths, human stance, 35 cm support, 1.35× shoulder span, helmet narrower than the chest, hero-stance asymmetry (hip shift, knee difference, heel rise, torso lean, elbow range, helmet turn, no mirror), thumb-forward and inward finger curl through motion, the raised palm-forward halt, the survey yaw range, world-space contact anchors and decoded pose agreement. Minimum sampled floor clearance: 1.46 mm. Maximum contact drift: 0.69 mm. Maximum rigid-segment length error: 0.063 mm. Reports: `validation-report.json` and `viewer-validation.json`.

Chromium WebGL checks cover all seven clips and tier/encoding combinations, desktop/390 px mobile framing, five close-ups, every toggle, travel, the v1 comparison and same-angle captures of both viewers with zero page errors; the v1 viewer still loads unchanged. `comparison-sheet.png` puts v1 beside v2 at the same camera direction, `detail-sheet.png` collects the close-ups; `review-images.json` lists their source. Frame cost: `viewer-validation.json` records a matched software-rasterizer probe of both viewers (SwiftShader, headless, 1130 × 935 stage, best of five rounds of eight synced frames). Across four runs on the same machine v1 measured 74 to 131 ms per frame, v2 119 to 127 ms with half-resolution GTAO and 81 to 91 ms without; the latest run gives 0.94× with occlusion and 0.70× without. The run-to-run spread on v1 is wider than the difference between the viewers, so this supports only "v2 with half-resolution occlusion costs about the same as v1 in a CPU rasterizer"; it is not a GPU frame rate, no FPS claim is made and the reference-phone number is still owed. Full-resolution occlusion, measured at about twice v1, was cut.

Repository status: **Contract candidate**. Consuming-game r160/release gltfpack, transitions, general self-collision, terrain/physics, game cameras, phone acceptance and the decision on runtime versus baked textures remain pending. The received collaboration contract is unchanged.

## Findings and limits

- The 1.35× shoulders first left a hollow between each arm and the torso: the forearm and hand joints had been splayed with the shoulders, and the chest fabric stopped at the old width. Pulling the forearm to 0.435 m and the hand to 0.455 m from centre, widening the upper chest to 0.25 m and adding an underarm fabric volume under each pauldron closed it. Overlapping shells still do not make an armpit.
- Primitive assembly gives repeatable tiers, stable node names and clean budgets, but the organic transitions of a pressure suit (underarms, crotch, fabric gathering under plates) are where it runs out. A better next pipeline is to scan or sculpt the torso and each limb separately, clean and decimate those meshes, and assemble them on this joint table and node names, keeping the procedural tools for plates, hardware, hoses and the distance tier.
- Everything worn is viewer-side. The GLB renders as a flat palette elsewhere; the game has to adopt `materials.js` or ask for baked textures before the look travels.
- Texture scale decides whether the suit reads as a suit: 2.5 mm weave and 3 cm quilting work at review distance; 7 mm and 6 cm read as a basket and a duvet.
- Edge wear from per-vertex curvature is free and convincing on bevels and tube caps, but a faceted shell gets it on every facet edge; it has to be dimmed with noise.
- Hero-stance numbers were only right once they were asserted: absolute bone orientations meant the waist and chest leans did not add, and a world-space yaw on the free leg pulled the thigh skin off the knee until it became a twist about the bone.
- The frame-cost figure is a software-rasterizer comparison of two render paths. Full-resolution GTAO doubled it; half resolution with six samples brought v2 inside v1's own run-to-run spread. No FPS claim is made.

Shared working notes for all families are in `docs/WORKSHOP-PRACTICES.md`, shown at the end of the Best Practices page.

## Rebuild and hand-off

Editable master: `source/blender/a6-eva-k8.blend`. Geometry and performance sources: `tools/blender/build_eva_k8.py` and `eva_k8_motion.py`; mesh helpers extend the shared `quadruped_geometry.Build` toolkit. The private reference remains outside the repository; its filename and hash are recorded in the manifest. Models and original animation by jelaludo.

From the repository root:

```sh
/Applications/Blender.app/Contents/MacOS/Blender -b -t 2 --python-exit-code 1 --python tools/blender/build_eva_k8.py
node tools/asset-pipeline/pack-eva-k8.mjs
node tools/asset-pipeline/validate-eva-k8.mjs
python3 -m http.server 8788 --bind 127.0.0.1 &
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs EVAK8_SHOT_DIR=/tmp/evak8-viewer node tools/asset-pipeline/test-eva-k8-viewer.mjs
EVAK8_SHOT_DIR=/tmp/evak8-viewer node tools/asset-pipeline/render-eva-k8-sheets.mjs
python3 tools/build-workshop-docs.py
python3 tools/validate-workshop-navigation.py
```

`--geometry-only` after Blender's `--` exports unanimated tiers for quick shape checks; `--distance-only` rebuilds LOD2 alone. Repack and revalidate afterward. Pin the delivered commit plus `assets/eva-k8/`, using manifest hashes. Include source and procedural files for authoring, and `eva-k8/materials.js` if the runtime look is wanted. The game repacks plain GLBs with `gltfpack -cc -kn -km -ke` at release time.
