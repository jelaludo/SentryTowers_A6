# C-07 / Mechanical Cheetah

An original articulated feline robot with ochre armor, ivory inserts, a low head, sliding shoulder carriages, a flexible segmented torso and an eight-section rudder tail. Separate asset family from RECKON K9. D0 intact only; damage levels and detail tiers are different concepts.

Open the local viewer at http://127.0.0.1:8788/mechanical-cheetah/ after serving the repository on port 8788. Select **Gallop**, use **¼ speed**, or select the four phase buttons to pause in a side view. Walk, stalk, sit, pounce, roll and hand have their own clips. Controls include scrubbing, replay, travel, skeleton, wireframe, paw markers, camera presets, plain/Meshopt loading and downloads. Each floor grid square is 0.25 m. Contact badges mean the sole socket is within 12 mm of the floor; they are a visualization, not a collision solver.

## Export measurements

| File | Role | Triangles | Mesh draws / materials | Plain bytes | Derived Meshopt bytes |
| --- | --- | ---: | ---: | ---: | ---: |
| `c07_d0_lod0.glb` | Detailed animation / recording master | 62,720 | 6 / 6 | 2,974,820 | 862,896 |
| `c07_d0_lod1.glb` | Articulated game model | 12,760 | 6 / 6 | 1,537,544 | 539,404 |
| `c07_d0_lod2.glb` | Static standing distance / loading silhouette | 2,848 | 1 / 1 | 232,288 | 71,088 |

These are asset mesh draws, excluding lights, shadow passes, the viewer floor and overlays. All materials use a small palette; there are no texture dependencies. The game tier meets the unit triangle target. The optional static distance tier meets the 3k triangle, one draw and 250,000 byte targets. No FPS improvement is claimed.

Plain GLBs are authoritative runtime exports. `derived/meshopt/` files are optional compressed derivatives, not replacements for the originals. All PNGs here are derived Blender review renders or their composite `motion-sheet.png` seven-pose `jump-study.png` and `social-study.png`. The editable detailed source is `../../source/blender/a6-mechanical-cheetah.blend`. `manifest.json` records measured sizes, SHA-256 hashes, bounds, named nodes, socket transforms and source provenance.

## Runtime contract

- Metres, +Y up, +Z forward. Ground origin below the torso at `(0,0,0)` in every tier. Blender authoring uses Z up and −Y forward; the exporter performs the axis conversion.
- Standing LOD0 bounds are approximately **0.484 m wide × 0.847 m high × 2.775 m long**. The reserved standing plot is 0.65 × 3.0 m. The tail extends aft to −1.82 m. Dynamic clip envelopes are in `validation-report.json`; pounce travels beyond the standing plot.
- Wrap the **whole loaded glTF scene** in an instance group, and move that group. `C07_SKIN` is a scene-root sibling of the skeleton hierarchy, as required for a correctly transformed glTF skin. `ROOT` is an unanimated skeleton lookup, not a placement wrapper. Use `SkeletonUtils.clone` for independent animated instances.
- Keep LOD1 for visible movement and interaction. LOD0 is for close shots and recordings. LOD2 has **no skin or clips**, but preserves all 54 authored node names and seven socket transforms. It must not replace an actively moving animal. The manifest's initial distance loading tier, 30 m approach hint and 8 m hysteresis are proposals for game-camera review, not accepted game thresholds.
- Game locomotion translates the instance along +Z at `clips.speed_mps × playbackRate` for walk, stalk and gallop. All three cycles are authored in place with stance-foot compensation. `Pounce` instead includes 3 m of travel on `MOTION`; suppress additional locomotion while playing it, then transfer that displacement to the instance before returning to idle.
- `SENSOR_YAW` is deliberately excluded from animation tracks. It provides a virtual sensor aiming frame for `SOCKET_SENSOR`; it does not rotate the head armor. `SOCKET_MOUTH`, `SOCKET_PAYLOAD` and `SOCKET_PAW_FL/FR/HL/HR` provide attachment/contact frames. Paw sockets lie 3 mm above the authored floor in stance. Socket coordinates are measured in the manifest.
- Collision, terrain adaptation, navigation, state blending and game events belong to the consuming game. This is an authored kinematic motion study, not a musculoskeletal, motor-torque or ground-reaction-force simulation.

## Rig and clips

51 joints include `MOTION`, lumbar/rear/front links, pelvis, chest, neck, head, jaw, ears, two independent scapulae, three rigid segments per leg, separate paws/toes, eight tail sections and seven sockets. All armor vertices have one bone influence so plates remain rigid. The source contains editable actions and NLA tracks; FK bones can be posed directly. The Python motion author solves limb positions analytically during regeneration; the exported files do not require runtime IK.

| Clip | Duration | Loop | Intended behavior |
| --- | ---: | --- | --- |
| `Watch_Idle` | 3.0 s | Yes | Quiet head scan, ear and tail movement |
| `Feline_Walk_Cycle` | 1.6 s | Yes | Narrow four-beat walk; 0.541667 m/s, duty factor 0.60 |
| `Stalk_Cycle` | 2.4 s | Yes | Lower body and low paw clearance; 0.202991 m/s, duty factor 0.78 |
| `Gallop_Cycle` | 0.4 s | Yes | Rotary contacts and two flight phases; 6.111111 m/s, duty factor 0.18 |
| `Sit_Down` | 2.4 s | No | Fold hindquarters and hold seated pose |
| `Pounce` | 3.2 s | No | Crouch, hind push, tucked flight, forepaw-first landing, 3 m forward travel |
| `Roll_Over` | 5.6 s | No | Crouch, tuck, roll 360° over flank/back, stand again |
| `Give_Paw` | 4.4 s | No | Sit, offer and shake left forepaw, lower it, stand again |

Loop phases are normalized 0–1. Walk/stalk touchdown phases are HR 0.00, FR 0.22, HL 0.50, FL 0.72: hind foot followed by the forefoot on the same side. At least two paws remain in stance during the walk and three during stalk. Shoulder glide, narrow tracks and a relatively quiet head distinguish these clips from the canine family.

Gallop touchdown order is **FL 0.00 → FR 0.08 → HR 0.48 → HL 0.56**. Gathered flight spans 0.26–0.48; extended flight spans 0.74–1.00. The phase buttons inspect 0.13, 0.37, 0.61 and 0.87. At gathered flight the chest–pelvis chord is 0.670 m; at extended flight it is 0.778 m and the fore–aft paw span reaches 1.801 m. Both landmarks have all four sole sockets over 0.19 m above the floor. These are this model's authored measurements, not biological speed claims.

## 27 October pounce revision

The seven-pose jump reference now drives distinct preparation, launch, apex, fore-contact, compression and recovery stages. Forepaws release at 0.650/0.675 s and hind paws finish pushing at 0.800/0.815 s. Forepaws land at 1.340/1.365 s; hind paws follow at 1.455/1.480 s. The torso follows a parabolic flight arc with constant forward airborne speed, independent paw tuck/reach paths, chest-to-hip compression delay and tail follow-through. World paw anchors hold through support while the torso travels. This remains a 3.2 s clip with 3 m root travel; existing names, skeleton, sockets and geometry budgets are preserved. The original 1.2 m push/settle path is supplemented by 1.8 m during the all-air interval, 0.815–1.340 s. `root_motion_profile` records both components. The viewer and seven-pose study use a fixed camera and ground marks to reveal the entire leap.

The viewer adds four clickable contact tracks, a live sole-height readout and seven jump-pose buttons. Tracks show authored support intervals; the readout shows actual near-floor sockets. Existing gallop phase controls remain. Numeric timing and amplitudes were authored to fit this rig; the references establish pose and event order, not measured seconds or forces. The earlier revision remains at commit `a4b1e41e6a8f85fa2385f242b418edc9a2a82031`.

Shared source profiles and validation evidence are in `source/motion-patterns/`. `docs/ANIMATION-REFERENCE-WORKFLOW.md` documents reference → event annotation → reusable pattern → rig adaptation → export/review, with an annotation tool proposed as a future step.

## Faster gallop and social actions

Gallop is now twice as fast: its baked cycle is 0.40 s and synchronized ground travel is 6.111111 m/s at normal playback. Contact phases and stride distance are unchanged. Use the new manifest speed with the new clip; do not combine it with the old 0.80 s export. Other existing clip durations remain unchanged. The previous complete set is preserved at `3847df11c149220c6996ae940e78371ccbe2e2d5`.

Sit remains the existing 2.4 s seated hold. New **Roll** (`Roll_Over`) and **Hand** (`Give_Paw`) buttons expose the two added actions. Roll folds the limbs and ears, turns fully over the back, and settles the detailed geometry against the floor throughout the turn. Hand sits, offers the left paw with a gentle shake, and returns to standing with the other three paws supporting the body. Both are in-place one-shots and should use `LoopOnce` with a clamped endpoint. Their named pose landmarks are included in the manifest. See `social-study.png` for the original review renders. Use the measured clip envelopes for clearance around the tail during roll.

## Validation and regeneration

`validation-report.json` covers all three plain files and decoded Meshopt copies: zero glTF errors/warnings; finite nondegenerate geometry; stable dot-free nodes, sockets and hashes; static tier budgets; 11,072 full-geometry pose samples at 120 Hz, plus intermediate joint checks. Across both articulated tiers and encodings: minimum floor clearance **1.59 mm**, maximum stance drift **1.169 mm**, maximum rigid segment-length error **0.062 mm**, loop position error **0.014 mm** and pounce travel quantization error **0 mm at the endpoint**. Gathered/extended flight, spine flexion and minimum support counts are asserted separately.

Roll checks assert an inverted mid-pose, floor support through the turn and an upright matching endpoint. Hand checks assert a raised left forepaw, three supporting paws and return to standing. Sit checks verify lowered hips and forepaw support.

Independent pattern checks on both animated tiers and encodings measure at most **0.606 mm** jump-anchor drift and hip compression **41 ms** after the chest, verify fore-before-hind release/landing, and compare the node/socket and clip-duration contracts to the preserved baseline.

`viewer-validation.json` records Chromium real-WebGL tests of eight clips, four gallop phases, all six tier/encoding combinations, static clip disabling, inspection controls, travel, camera framing and desktop/390 px mobile layout. The shared study test checks seven jump poses, contact scrubbing, sole readouts and static-tier hiding. Blender renders and browser screenshots were visually inspected. Self-collision and arbitrary animation blends have not been physically validated. Consuming-game r160/release gltfpack, game cameras, terrain and reference-phone acceptance remain pending.

Regenerate from the repository root with Blender and the pinned dependencies in `tools/asset-pipeline/package.json`:

```sh
blender -b --python-exit-code 1 --python tools/blender/build_mechanical_cheetah.py
node tools/asset-pipeline/pack-mechanical-cheetah.mjs
node tools/asset-pipeline/validate-mechanical-cheetah.mjs
node tools/asset-pipeline/validate-quadruped-patterns.mjs
blender -b --python-exit-code 1 --python tools/blender/render_mechanical_cheetah.py
blender -b --python-exit-code 1 --python tools/blender/render_mechanical_cheetah.py -- --jump-study
blender -b --python-exit-code 1 --python tools/blender/render_mechanical_cheetah.py -- --social-study
node tools/asset-pipeline/render-cheetah-social-sheet.mjs
node tools/asset-pipeline/render-cheetah-motion-sheet.mjs
node tools/asset-pipeline/render-quadruped-jump-sheets.mjs
python3 tools/build-workshop-docs.py
python3 tools/validate-workshop-navigation.py
```

Serve the repository with `python3 -m http.server 8788`, then run `tools/asset-pipeline/test-mechanical-cheetah-viewer.mjs` with `PLAYWRIGHT_MODULE` and, if needed, `CHROMIUM_EXECUTABLE` set to installed paths. The test writes screenshots to `/tmp`, and a hash-linked report here. The hand-off is the committed revision plus `assets/mechanical-cheetah/`; include the source and viewer folders when editing or reviewing.

## Reference provenance

The user supplied the yellow C-07 robot concept and a two-flight cheetah diagram. They guided silhouette, palette and the requested motion study; neither image is embedded or redistributed. The local `/Users/jela/Downloads/cat-walk/source/Cat walk.glb` was inspected for walk contact order, shoulder movement and head stability. It has 24 sampled keys over 0.766667 s; SHA-256 `51b589493729ee93bb23457dfc7739caff9d8684fc5e5528532f41e19aa9f6c8`. No cat mesh, textures, rig or keyframes were copied or retargeted. `inspect-feline-reference.mjs` reproduces the read-only observation report into `/tmp` and leaves that reference untouched. Reference creators/licenses were not supplied; the reference files remain outside this repository.

Primary motion references consulted for the gathered/extended distinction and rotary contact sequence:

https://www.nature.com/articles/s41598-021-88879-0

https://journals.biologists.com/jeb/article/215/14/2425/10852/High-speed-galloping-in-the-cheetah-Acinonyx

Abiharu / Motion Zoo's authored gait diagrams and cat-jump animation study informed the 27 October revision. No website imagery, animation keys or rigs are embedded or redistributed:

https://motionzoo.net/dog_walk_gaits/

https://motionzoo.net/making_cat_jump/

Credit the original workshop model and motion as **Models by jelaludo**. See the repository's `ATTRIBUTIONS.md` for reuse context.

The forward-leap revision preserves geometry, skin, rest transforms and all other clip keys against commit `284a65d5a41311a312b52f307c485fd8c1f8bd1d`. See `forward-leap-validation.json` and `source/motion-patterns/runtime-validation.json` for root travel, relative pose and planted-paw checks. The static tier is byte-identical. Regenerate the revision comparison with `node tools/asset-pipeline/validate-forward-leap-revision.mjs`.
