# TAKAASHI-02 / Braided Spider Crab

An original variant of TAKAASHI-01 (高脚蟹, *taka-ashi-gani*) with every actuator rebuilt. Dark open carbon frames sit outside taut braided muscles. Each muscle ends in machined steel ferrules and pulls a steel tendon round the sheave of the joint it drives. The skeleton, rest pose, sockets and nine clips are identical to TAKAASHI-01, so one controller drives either variant. Leg span is 2.98 m standing; the body is carried at 0.61 m.

Viewer: `takaashi02/`. Rebuild sources: `tools/blender/build_takaashi02.py` (geometry; reuses the TAKAASHI-01 primitives and clip baking) and `tools/blender/takaashi_motion.py` (shared motion).

## What changed from TAKAASHI-01

The variant follows the user's brief for this round:

- dark open-lattice carbon exo-frames outside taut braided actuators, with no ballooning muscles;
- braided sleeves anchored in steel ferrules;
- no floating hoops;
- minimal `#28a8ff` optics;
- rest-mesh jaws 10–24° open;
- exact 30 fps frame counts;
- clay and collision checks before the final export.

- **Actuators (88 on LOD0, 72 on LOD1):**
  - **Sleeve:** each is a modelled braided sleeve. Eight flat strands per family are wound at ±25° and cross over and under each other, one over one, on a darker core. The sleeve is nearly cylindrical, with ends at 76% of the body radius and short necks, so it reads as a taut muscle.
  - **Ends:** machined steel ferrules with two crimp grooves. An end finishes either in a rod eye on a steel cross pin, or in a crimp and a steel tendon.
  - **LOD1:** a six-sided twisted tube with strand shading and simplified ferrules.
- **Mechanism:**
  - **Merus:** two antagonist pairs in series on a mid bulkhead. Pair A pulls back over a sheave on the basis (leg lift). Pair B pulls forward over the knee sheave on the carpus.
  - **Carpus and propodus:** the carpus pair drives the fixed carpus–propodus knuckle. The propodus pair drives the dactyl through long tendons.
  - **Palm:** a 46 mm closer and two slim openers pull on a three-groove sheave on the dactyl hinge.
  - **Body:** ten actuators run from clevises on a dorsal keel to brackets over each coxa, visible through the lattice carapace.
  - **Why the joints never gap:** sheaves, drums, hub caps and the chela's wrist ball are round about their joint, so rigid skinning never opens a gap, and no muscle is skinned across a joint.
- **Frames:**
  - **Box frames:** dark carbon box frames with open side faces, so the muscles read from the side. They have corner rails, end collars and bulkheads, and Warren diagonals across the dorsal and ventral faces.
  - **Joints:** fork-and-tongue joints with dog-bone link plates and machined hub caps. Each child segment's tongue fits inside its parent's fork. That is why the knee (62–109° of flexion) and the chela elbow (to 124°) fold without the frames meeting.
- **Claws:**
  - **Frames:** a bowed open palm frame; open-truss pollex and dactyl blades.
  - **Bite:** steel teeth interleave along a bite line, and the dactyl's steel point hooks past the pollex point when shut.
  - **Rest gape:** the rest mesh holds the claws 17° open (G0 0.30 rad). The maxillipeds are parted 8° and the mandibles 6° each side.
- **Optics:** two 10.5 mm lenses recessed in dark housings behind steel bezels, plus a 6.2 mm sensor lens. All are `#28a8ff` (linear 0.021, 0.392, 1.0) at emissive strength 2.5; nothing else glows.
- **LOD2:** reuses the shared TAKAASHI static distance silhouette in the TAKAASHI-02 palette.

## Files

| Tier | File | Triangles | Draws | Plain bytes | Meshopt (derived) | Role |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| LOD0 / detailed | `takaashi02_d0_lod0.glb` | 255,388 | 6 | 19,297,872 | 4,005,560 | Close shots, recordings, animation review; all nine clips |
| LOD1 / game | `takaashi02_d0_lod1.glb` | 23,122 | 6 | 3,590,124 | 1,073,148 | Animated gameplay tier; all nine clips |
| LOD2 / distance | `takaashi02_d0_lod2.glb` | 1,050 | 1 | 91,260 | 37,180 | Static standing silhouette, one merged mesh, vertex palette |

Plain GLBs are authoritative. `derived/meshopt/` copies are optional derivatives; the game packs its own release copy with gltfpack. The editable master is `source/blender/a6-takaashi02.blend` (LOD0 with all nine NLA tracks).

LOD0 and LOD1 use six materials: Carbon_frame, Braided_sleeve, Machined_steel, Dark_housing, Claw_steel and Blue_optics (emissive). They also carry `COLOR_0` as unsigned short. That attribute is the strand shading on the sleeves and white everywhere else; glTF multiplies it into base colour. LOD2 uses one palette material. There are no textures. Every GLB embeds the Jelaludo attribution in `asset.copyright`.

QA artefacts:

- `validation-report.json`
- `collision-report.json` (self-collision)
- `silhouette-report.json` (LOD silhouette IoU)
- `viewer-validation.json`

## Runtime contract

- **Axes and origin:** metres, +Y up, +Z forward; the crab's left is +X. The origin is on the ground under the carapace centre and is identical in every tier.
  - Standing bounds are 2.98 × 1.16 × 2.24 m; the plot reserves 3.00 × 2.25 m.
  - Animated envelopes (instance space) reach 3.27 m wide while scuttling and 1.71 m tall in Threat_Display.
- **Placement:** put the whole glTF scene in an instance group and clone it with `SkeletonUtils.clone`. `ROOT`, `TK02_RIG` and `MOTION` carry no keys. `BODY` carries body height, pitch and roll.
- **Shared with TAKAASHI-01:** joint names, rest pose, socket positions, clip names and durations match TAKAASHI-01 exactly. Swapping meshes needs no new animation set.
- **Locomotion:** gait clips have no baked root motion. Each frame, translate the instance by `clips[].velocity_mps` (glTF axes) and rotate it about +Y by `clips[].yaw_rate_rad_s`, both multiplied by playback rate.
- **Engine-driven node:** `SENSOR_YAW` is excluded from all clips; `SOCKET_SENSOR` follows it.
- **Damage:** `d0` only.
- **Detail selection (manifest `lod_selection`):** start on LOD2, swap to LOD1 inside 30 m with 8 m hysteresis, keep LOD1 while animated. LOD2 is a static bind pose with all 87 node names as non-articulating lookups.

### Clips

All durations are whole frames at 30 fps (and at the 60 fps sampling rate).

| Clip | Duration | Loop | Travel | What it does |
| --- | ---: | --- | --- | --- |
| `Watch_Idle` | 4.0 s | yes | — | Breathing body, scanning eyestalks, working mouthparts, flexing claws; L2 (0.5–1.1 s) and R3 (2.4–3.0 s) reset their footing. Starts on the bind pose. |
| `Scuttle_Left_Cycle` | 1.5 s | yes | +X 0.30 m/s | Alternating tetrapod (L1 R2 L3 R4 / R1 L2 R3 L4, duty 0.62, 13 cm lift). Leading legs flex to pull, trailing legs extend to push. |
| `Scuttle_Right_Cycle` | 1.5 s | yes | −X 0.30 m/s | Mirror of the above. |
| `Forward_Walk_Cycle` | 2.4 s | yes | +Z 0.16 m/s | Posterior-to-anterior wave gait, one leg per side in swing (duty 0.75). |
| `Turn_Left_Cycle` | 2.0 s | yes | yaw +0.22 rad/s | Turning in place on the tetrapod rhythm. |
| `Turn_Right_Cycle` | 2.0 s | yes | yaw −0.22 rad/s | Mirror of the above. |
| `Feed_Cycle` | 4.0 s | yes | — | Each chela in turn opens, pinches just above the floor (left 0.82 s, right 2.82 s), then holds food across the mouth with the palm turned across the face (left 1.75–2.4 s, right 3.75–0.4 s). It then rises, turns and settles aside. Mouthparts work at 3 Hz. |
| `Claw_Snap` | 2.4 s | no | — | Both chelae open to 0.95 rad, tremble, then each shuts in 70 ms (`events_s`: left 1.05 s, right 1.20 s). Starts and ends on the bind pose. |
| `Threat_Display` | 4.0 s | no | — | Rises 16 cm on six legs, lifts the first walking pair to about 0.5 m, spreads and pulses the open chelae, then settles. Starts and ends on the bind pose. |

### Sockets and rig

There are 84 joints. Each walking leg and cheliped is a six-segment rigid chain: `COXA`, `BASIS`, `MERUS`, `CARPUS`, `PROPODUS` and `DACTYL`. On a cheliped the propodus is the palm and the dactyl is the movable finger.

Sockets:

- `SOCKET_TIP_L1`…`SOCKET_TIP_R4` mark the dactyl points, 2 mm above the authored floor.
- `SOCKET_GRIP_CL` and `SOCKET_GRIP_CR` sit between the fingers.
- `SOCKET_MOUTH`, `SOCKET_PAYLOAD` and `SOCKET_SENSOR` are as in TAKAASHI-01.

Socket positions match across tiers within 0.2 mm.

## Measured validation

`TAKAASHI_FAMILY=takaashi02 node tools/asset-pipeline/validate-takaashi.mjs` checks all six files, plain and decoded Meshopt:

- **Files:** zero glTF validator errors and warnings; matching hashes, triangle and draw counts; finite, non-degenerate triangles; unique dot-free names identical across tiers; sockets matching within 0.2 mm.
- **Budgets:** LOD1 has 23,122 of the 25,000-triangle unit budget. LOD2 meets 3k triangles, one draw and 250 KB, and is static.
- **Joints:** 11,460 joint samples at 120 Hz with engine travel applied, plus 1,446 skinned-geometry samples at 30 Hz.
  - Planted-tip slip ≤ 0.73 mm; loop seams ≤ 0.007 mm and 0.00002 rad; rigid stretch ≤ 0.15 mm.
  - Lowest geometry is 1.2 mm above the floor; Meshopt tip drift ≤ 0.76 mm.
- **Per-frame rotation at 30 fps (snap check):** at most 6° in gaits and idle, 4° in the threat display and 17.6° in Feed, where the dactyl closes for the pinch. The Claw_Snap dactyl turns 35.9° in one frame by design, because it shuts in 70 ms. Every other clip stays under the 20° gate.
- **Behaviour:**
  - In scuttles, leading legs close 0.28–0.29 m toward the body in stance and trailing legs open by the same.
  - Feed: the lowest claw vertex at the pinch is 3.0 cm; the grip comes within 7.3 cm of the mouth.
  - Snap: open 0.95 rad, shut to 0.0013 rad.
  - Threat: rise 0.16 m.
- **Self-collision** (`tools/blender/check_takaashi_collisions.py`, `collision-report.json`): zero frames with triangle overlap.
  - Coverage: LOD1 at 30 Hz (723 posed frames) and LOD0 at 10 Hz (247 posed frames).
  - Pairs tested: every limb against every other limb; legs beyond the coxa and basis against the body and mouthparts; and segments within a limb, including the dactyl blade against the pollex when shut.
- **LOD silhouettes** (`tools/blender/check_takaashi_silhouettes.py`, bind pose, 3.3 mm per pixel):

  | Tier | IoU vs LOD0, front / side | Coverage vs LOD0, front / side |
  | --- | --- | --- |
  | LOD1 | 0.878 / 0.880 | 0.957 / 0.966 |
  | LOD2 | 0.669 / 0.733 | 0.922 / 0.942 |

`tools/asset-pipeline/test-takaashi-viewer.mjs` (`TAKAASHI_FAMILY=takaashi02`) runs the viewer in headless Chromium.

- **Covered:** all nine clips; contact counts; skinned claw-tip gaps (open 35.1 cm, shut 3.1 cm, pinch 3.1 cm); engine travel and yaw; all six tier/encoding loads with matching download bytes; PNG capture; the 390 px layout; reduced motion.
- **Not covered:** performance. This is a functional check, not a benchmark, and no FPS is claimed.

## QA verdict

**VERDICT: SHIP WITH NOTES**

- **Budgets:**
  - LOD0: 255,388 triangles. It is the recording master and has no game budget.
  - LOD1: 23,122 of 25,000 triangles.
  - LOD2: 1,050 of 3,000 triangles, one draw, 91 KB of 250 KB.
  - No textures.
- **Screenshots:**
  - `preview.png` (¾ view) and `motion-sheet.png` (12 poses: front, side, top, claw and ¾).
  - Live-viewer Actuator, Knee and Feed views were inspected during the build.
- **Blockers:** none.
- **Majors:** none open. These were found and fixed during the build:
  - Each palm folded up to 4 cm into its own merus while feeding at the mouth. The mouth pose came from the shared motion module, so it was fixed there.
  - The palm turned 27.6° in one frame leaving the mouth.
  - The pollex tip went 15 mm through the floor while parked aside.
- **Minors:**
  - LOD1 silhouette IoU is 0.88 against the 0.95 target. The game tier halves the frame diagonals, so the see-through pattern of the open frames differs; it still covers 96% of the master's pixels.
  - LOD2 is a solid static silhouette (IoU 0.67/0.73).
- **Notes:**
  - The collision check measures intersection, not depth. It excludes 7.5 cm around each shared joint, where forks, sheaves and the wrist ball nest by design.
  - LOD0 is checked at 10 Hz.
  - The master is 19.3 MB plain and the game tier 3.6 MB plain (1.07 MB Meshopt), mostly nine 60 fps clips plus the shading attribute. Unit budgets set no byte limit.
- **Retest after:** visual acceptance by the user; then the game side (r160 load, gltfpack release decode, LOD thresholds, reference-phone profiling).

## Viewer controls

As TAKAASHI-01, plus an **Actuator** view framing the first leg's merus, its two muscle pairs and the body actuators under the carapace. There are links to the collision report and to TAKAASHI-01 for comparison.

## Limitations and pending

- Visual acceptance by the user is pending.
- No damage states (d1–d3), terrain adaptation or physics.
- The actuators are rigid. They do not shorten or swell with joint angle; only their tendons imply the pull.
- The modelled braid is on LOD0 only. LOD1 uses a six-sided twisted tube with strand shading.
- Consuming-game r160 load, gltfpack release decode, game-camera LOD thresholds and reference-phone profiling are pending.

## Rebuild

```sh
python3 tools/blender/takaashi_motion.py
blender -b --factory-startup --python-exit-code 1 --python tools/blender/build_takaashi02.py
blender -b --factory-startup --python-exit-code 1 --python tools/blender/check_takaashi_collisions.py -- --glb assets/takaashi02/takaashi02_d0_lod1.glb --hz 30
blender -b --factory-startup --python-exit-code 1 --python tools/blender/check_takaashi_silhouettes.py -- --family takaashi02 --out assets/takaashi02/silhouette-report.json
cd tools/asset-pipeline && TAKAASHI_FAMILY=takaashi02 node pack-takaashi.mjs && TAKAASHI_FAMILY=takaashi02 node validate-takaashi.mjs
python3 -m http.server 8788 --bind 127.0.0.1   # repository root, separate shell
TAKAASHI_FAMILY=takaashi02 PLAYWRIGHT_MODULE=<playwright/index.mjs> node render-takaashi-sheets.mjs
TAKAASHI_FAMILY=takaashi02 PLAYWRIGHT_MODULE=<playwright/index.mjs> node test-takaashi-viewer.mjs
```

For a quick shape pass, add `--no-anim --no-save --out <scratch dir>` to the build. Then render clay or EEVEE views with `tools/blender/render_takaashi.py --engine workbench --views hero,actuator,palm,face,top`.

## Provenance

The original procedural geometry, rig and motion are by Jelaludo, written in this repository; no geometry or code is taken from other projects.

The TAKAASHI-01 concept image (`Mechanical Spider Crab in Studio Light.png`, SHA-256 `258ae7fd7ba6a85904d1ddac5a67ede8fa437fb030387e1dc13f1f0fe3e683bf`) informs the shared body plan. It stays outside the repository.

The variant brief is the user's notes on actuator design, optics, rest-open jaws, frame-exact clips and the check-first workflow.

Reuse requires attribution: *Models by jelaludo*.
