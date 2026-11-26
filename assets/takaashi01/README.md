# TAKAASHI-01 / Mechanical Spider Crab

An original mechanical Japanese spider crab (高脚蟹, *taka-ashi-gani*, “tall legs”) after the user-supplied concept *Mechanical Spider Crab in Studio Light*. Gunmetal openwork frames with rounded windows and brass rivets wrap twisted ivory cable cores. Bolted pulley hubs sit at each joint. A spined lattice carapace over a dark core carries blue optics on short eyestalks, horn rostral spines and fanged mouthparts. Two chelae have serrated, crossing fingers. Leg span is 2.98 m standing; the body is carried at 0.61 m.

Viewer: `takaashi01/`. Rebuild sources: `tools/blender/build_takaashi.py` and `tools/blender/takaashi_motion.py`.

## Files

| Tier | File | Triangles | Draws | Plain bytes | Meshopt (derived) | Role |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| LOD0 / detailed | `takaashi01_d0_lod0.glb` | 146,316 | 6 | 9,904,388 | 2,286,488 | Close shots, recordings, animation review; all nine clips |
| LOD1 / game | `takaashi01_d0_lod1.glb` | 20,178 | 6 | 2,816,976 | 946,896 | Animated gameplay tier; all nine clips |
| LOD2 / distance | `takaashi01_d0_lod2.glb` | 1,050 | 1 | 99,784 | 37,464 | Static standing silhouette, one merged mesh, vertex palette |

Plain GLBs are authoritative. `derived/meshopt/` copies are optional derivatives; the game packs its own release copy with gltfpack. Editable master: `source/blender/a6-takaashi01.blend` (LOD0 with all nine NLA tracks). LOD0/1 use six materials: Gunmetal_frame, Ivory_cable, Brass_fasteners, Carbon_core, Horn_spines and Blue_optics (emissive). LOD2 uses one palette material. No textures. Every GLB embeds the Jelaludo attribution in `asset.copyright`.

## Runtime contract

- **Axes and origin:** metres, +Y up, +Z forward; the crab's left is +X. The origin is on the ground under the carapace centre and is identical in every tier. Standing bounds are 2.98 × 1.19 × 2.24 m; the plot reserves 3.00 × 2.25 m. Animated envelopes (instance space) reach 3.27 m wide while scuttling and 1.71 m tall in Threat_Display; per-clip boxes are in `validation-report.json`.
- **Placement:** put the whole glTF scene in an instance group and clone it with `SkeletonUtils.clone`. `ROOT`, `TK01_RIG` and `MOTION` carry no keys. `BODY` carries body height, pitch and roll.
- **Locomotion:** gait clips have no baked root motion. Each frame, translate the instance by `clips[].velocity_mps` (glTF axes) and rotate it about +Y by `clips[].yaw_rate_rad_s`, both multiplied by playback rate. Planted tips then stay fixed in the world.
- **Engine-driven node:** `SENSOR_YAW` (small forward sensor between the eyes) is excluded from all clips; `SOCKET_SENSOR` follows it.
- **Damage:** `d0` only. Damage states are a separate axis and are not authored yet.
- **Detail selection (manifest `lod_selection`):** start on LOD2, swap to LOD1 inside 30 m with 8 m hysteresis, keep LOD1 while animated. LOD2 is a static bind pose and retains all 87 node names as non-articulating lookups.

### Clips

| Clip | Duration | Loop | Travel | What it does |
| --- | ---: | --- | --- | --- |
| `Watch_Idle` | 4.0 s | yes | — | Breathing body, scanning eyestalks, working maxillipeds/mandibles, flexing claws; L2 (0.5–1.1 s) and R3 (2.4–3.0 s) reset their footing. Starts on the bind pose. |
| `Scuttle_Left_Cycle` | 1.5 s | yes | +X 0.30 m/s | Alternating tetrapod: L1 R2 L3 R4 swing together, then R1 L2 R3 L4 (duty 0.62, 13 cm lift). Leading legs flex to pull, trailing legs extend to push; body rolls toward travel. |
| `Scuttle_Right_Cycle` | 1.5 s | yes | −X 0.30 m/s | Mirror of the above. |
| `Forward_Walk_Cycle` | 2.4 s | yes | +Z 0.16 m/s | Posterior-to-anterior wave gait, one leg per side in swing (duty 0.75); six tips always planted. |
| `Turn_Left_Cycle` | 2.0 s | yes | yaw +0.22 rad/s | Turning in place on the tetrapod rhythm. |
| `Turn_Right_Cycle` | 2.0 s | yes | yaw −0.22 rad/s | Mirror of the above. |
| `Feed_Cycle` | 4.0 s | yes | — | Body lowered and nose-down. Each chela in turn opens, pinches just above the floor (left 0.82 s, right 2.82 s) and passes food across the mouth (left at 2.1 s, right at 0.1 s) while the other waits aside. The chela then rises and turns before settling aside. Mouthparts work at 3 Hz. Mouth pose revised on 26 November, see below. |
| `Claw_Snap` | 2.4 s | no | — | Both chelae rise and open to 0.95 rad, tremble, then each shuts in 70 ms (`events_s`: left 1.05 s, right 1.20 s) and settles. Starts and ends on the bind pose. |
| `Threat_Display` | 4.0 s | no | — | Rises 16 cm on six legs, lifts the first walking pair to about 0.5 m, spreads and pulses the open chelae, then settles. Starts and ends on the bind pose. |

Stance for gaits follows `touchdown_phase` and `duty_factor`; other clips list `swing_windows_s`. Clips are sampled at 60 fps and resampled losslessly within 1e-5.

### Sockets

`SOCKET_TIP_L1`…`SOCKET_TIP_R4` mark the eight dactyl points, 2 mm above the authored floor. `SOCKET_GRIP_CL`/`CR` sit between each claw's fingers; parent held props there. `SOCKET_MOUTH` is the maxilliped opening. `SOCKET_PAYLOAD` is on the carapace crown. `SOCKET_SENSOR` is the forward sensor. Socket positions are listed per tier in `manifest.json` and match across tiers within 0.2 mm.

### Rig

84 joints. Each walking leg (L1–L4, R1–R4) and cheliped (CL, CR) is a six-segment chain: `COXA`, `BASIS`, `MERUS`, `CARPUS`, `PROPODUS` and `DACTYL`. On a cheliped the propodus is the palm with the fixed finger, and the dactyl is the movable finger on the palm hinge. Body parts are `EYESTALK_L/R`, `ANTENNA_L/R`, `MAXILLIPED_L/R` and `MANDIBLE_L/R`. Skinning is rigid (one joint per vertex). The coxa yaws about the body's vertical axis; the other leg joints are hinges in the leg plane. A planar IK keeps the merus–carpus “knee” high (1.13 m on the first pair) and the dactyl point exactly on its target.

## Measured validation

`node tools/asset-pipeline/validate-takaashi.mjs` checks all six files, plain and decoded Meshopt (`validation-report.json`):

- **Files:** zero glTF validator errors and warnings; matching hashes, triangle and draw counts; finite, non-degenerate triangles; unique dot-free names identical across tiers; sockets matching within 0.2 mm.
- **Budgets:** LOD1 is within the 25k-triangle unit budget. LOD2 meets 3k triangles, one draw and 250 KB, and is static.
- **Joint sampling:** 11,460 joint samples at 120 Hz with engine travel applied, and 1,446 skinned-geometry samples at 30 Hz.
  - Planted-tip slip ≤ 0.73 mm; loop seams ≤ 0.007 mm and 0.00002 rad. Quaternions are normalized before comparison.
  - Rigid segment stretch ≤ 0.15 mm; lowest geometry 1.4 mm above the floor.
  - Meshopt tip drift ≤ 0.76 mm.
- **Per-frame rotation at 30 fps:** ≤ 6° in gaits and idle and 17.6° in Feed (pinch close). The Claw_Snap dactyl turns 35.9° in one frame by design.
- **LOD silhouettes** (`silhouette-report.json`, bind pose): IoU against LOD0 is 0.926 / 0.928 for LOD1 and 0.686 / 0.713 for LOD2 (front / side).
- **Minimum planted tips:** 4 in scuttle and turn, 6 forward and in threat, 7 at idle, 8 while feeding or snapping.
- **Behaviour:**
  - In scuttles, every leading leg closes 0.28–0.29 m toward the body during stance and every trailing leg opens by the same.
  - Feed: lowest skinned claw vertex at the pinch is 2.7 cm; the grip reaches 7.3 cm from the mouth.
  - Snap: open 0.95 rad, shut to 0.0013 rad 80 ms after each event.
  - Threat: body rise 0.16 m.

The motion module's own self-test (`python3 tools/blender/takaashi_motion.py`) reports zero IK reach error and zero authored slip for all clips. A 30 Hz segment-axis check keeps at least 0.13 m between different limbs in every clip. That is an authored clearance check, not general self-collision.

`tools/asset-pipeline/test-takaashi-viewer.mjs` runs the viewer in headless Chromium and writes `viewer-validation.json`. It covers all nine clips with framing, contact counts, claw tip gaps from the skinned fingers (open 34.5 cm, shut 3.8 cm, pinch 3.7 cm), engine travel and yaw, all six tier/encoding loads with matching download bytes, PNG capture, the 390 px layout and reduced motion. This is a functional check, not a performance benchmark; no FPS is claimed.

## Viewer controls

Nine clip buttons, play/pause (Space), replay, ⅛–2× speed and a scrubbing timeline. An eight-tip contact strip and readout show planted tips, body height and live claw-tip gaps. Toggles cover ground travel (applies the clip velocity/yaw like a game), follow camera, skeleton, tip markers, wireframe and repeating one-shots. Views: ¾, front, side, top, claw and knee, plus fullscreen. Tier and encoding selectors, selected-GLB download, PNG capture and links to this file, the motion sheet, the validation report and the Blender master.

## Limitations and pending

- Visual acceptance by the user is pending.
- No damage states (d1–d3), terrain adaptation or physics.
- **Self-collision** (`tools/blender/check_takaashi_collisions.py`, added with TAKAASHI-02): the 30 Hz LOD1 check finds overlaps that are not fixed in this tier.
  - The chela wrist bosses intersect the merus and palm in every clip.
  - The serrated fingers pass through each other at full closure (Claw_Snap, and the Feed pinch).
  - The bulky palm still grazes its merus for about 25 frames at the mouth, down from up to 132 overlapping triangle pairs to 40 after the shared mouth-pose fix.
  - TAKAASHI-02's joints and claws are clean under the same check.
- **Shared motion change (26 November):** the Feed mouth pose, its exit and the claw roll at the mouth were revised in `takaashi_motion.py` after the collision check showed each palm folding into its merus. This file set is rebuilt with that motion, and Feed's mouth landmarks keep their times.
- The game tier is 2.8 MB plain (0.95 MB Meshopt), mostly from nine 60 fps clips. Unit budgets set no byte limit; reduce the sampling rate if the game needs a smaller file.
- Consuming-game r160 load, gltfpack release decode, game-camera LOD thresholds and reference-phone profiling are pending.
- The cable cores are modelled twisted strands, not deforming muscles.
- `preview.png` and `motion-sheet.png` are derived from the viewer. `tools/blender/render_takaashi.py` makes optional studio review renders.

## Rebuild

```sh
python3 tools/blender/takaashi_motion.py
blender -b --factory-startup --python-exit-code 1 --python tools/blender/build_takaashi.py
cd tools/asset-pipeline && node pack-takaashi.mjs && node validate-takaashi.mjs   # TAKAASHI_FAMILY defaults to takaashi01
python3 -m http.server 8788 --bind 127.0.0.1   # repository root, separate shell
PLAYWRIGHT_MODULE=<playwright/index.mjs> node render-takaashi-sheets.mjs
PLAYWRIGHT_MODULE=<playwright/index.mjs> node test-takaashi-viewer.mjs
```

## Provenance

The original procedural geometry, rig and motion are by Jelaludo. The concept image (`Mechanical Spider Crab in Studio Light.png`, 1672 × 941, SHA-256 `258ae7fd7ba6a85904d1ddac5a67ede8fa437fb030387e1dc13f1f0fe3e683bf`) informed the silhouette and materials. It stays outside the repository; no pixels are embedded or redistributed. The motion is original procedural authoring, informed by commonly described crab locomotion and feeding: lateral alternating-tetrapod stepping, leading legs flexing while trailing legs extend, wave-gait forward walking, and chelae passing food to constantly working mouthparts. No captured or third-party animation keys are used. Reuse requires attribution: *Models by jelaludo*.
