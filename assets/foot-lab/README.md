# Foot Lab / AUREL-02

Renamed from NISOKU-02 to **AUREL-02**, companion to AUREL-01. NISOKU-02 now identifies the complete Isao humanoid. Existing GLB filenames, `nisoku02foot` family key, root-node names and pose schema are retained as compatibility identifiers; all original model bytes remain unchanged.

**Biped variants:** choose “Biped / economy” for a second articulated game version (2,496 triangles / one draw) and a static version with naturally curled toes. All original exports below are preserved. See `biped/README.md` and `docs/BIPED-EXTREMITIES.md` for measurements, pose matching and mounting notes.

An original tactile, prehensile **foot** from **Isao / Mechanism Atelier**, the fictional manufacturer of the AUREL-01 hand. Short ivory shells, graphite links, gold bearings, amber indicators and dark elastomer pads share the hand’s material language. The substantial heel, elevated medial arch, ankle above the hindfoot and four short toes make this a foot. Its two-segment great toe rotates to oppose the four lesser toes.

Viewer: https://jelaludo.github.io/SentryTowers_A6/foot-lab/

Companion hand: https://jelaludo.github.io/SentryTowers_A6/hand-lab/

This is a standalone foot mechanism and kinematic design study. The supplied Nisoku-02 humanoid concept guides its proportions; a full humanoid is not included. Geometry is original, with no imported third-party hand code or meshes. The concept image remains external; its hash is in the manifest. Original workshop attribution terms apply: credit **jelaludo**.

## Authoritative exports

| Tier | Intended use | Triangles | Material draws | Plain bytes | Derived Meshopt bytes |
| --- | --- | ---: | ---: | ---: | ---: |
| LOD0 | Close shots, inspection, recording | 63,560 | 5 | 2,899,364 | 536,288 |
| LOD1 | Articulated game foot | 12,792 | 5 | 522,632 | 123,816 |
| LOD2 | Static distance/loading silhouette | 2,376 | 1 | 85,060 | 35,396 |

Plain `lod*/nisoku02foot_d0_lod*.glb` files are the source of truth. `derived/meshopt/` contains optional compressed derivatives. `preview.png`, `previews/` and the review sheets are derived renders of the actual model. The renderer uses a small shared palette and vertex colors, with no texture files. Articulated tiers use rigid skin weights and five material primitives; master-only modeled tactile stippling and fasteners are omitted from cheaper tiers. The distance tier merges to one static mesh/material.

These counts describe the foot, excluding the viewer’s floor, lighting, shadows and pipe fixture. They are not FPS measurements. The game unit triangle target and distance triangle/draw/byte targets are met; no byte budget is specified for the articulated unit category.

## Coordinate and attachment contract

- Metres; **+Y up, +Z toes/forward, -X medial**. Root `NISOKU_02_FOOT_ROOT` is on the ground at the plot centre, unchanged across all tiers. The original embedded “right” label is historical; with +Z forward, this -X-medial source is mounted on NISOKU-02’s left ankle and reflected for its right. Original GLB bytes are preserved. Reserved plot: 0.40 × 0.40 m. D0 is the only authored damage state; D1–D3 are not implied by LOD.
- **53 consistent named nodes:** root, 38 bones and 14 sockets. All names are meaningful, unique and dot-free. There are 22 mechanism axes, 15 inspection shell bones and one placement bone. Bone lengths are rigid.
- `SOCKET_ANKLE_ATTACH` is the leg interface, with its normal along +Y in the neutral pose. Its exact transform, along with all other sockets and neutral bounds, is measured in `manifest.json`.
- `SOCKET_HEEL`, `SOCKET_FOREFOOT` and `SOCKET_ARCH` describe support locations. Each of `TOE_02` through `TOE_05` and `HALLUX` has `_TIP` and `_PAD` sockets. Pad socket +Z points out of the tactile surface; use the full socket quaternion, not the foot’s forward axis.
- `FOOT_PLACEMENT` carries demo lift/travel in metres and pitch/roll in radians. A consuming robot controller may keep it at identity and drive the foot through its own leg rig. `ANKLE_PITCH` and `ANKLE_ROLL` articulate the upper attachment cuff relative to the planted foot; a leg-centred controller must account for that frame direction.
- Four lesser toes each have `SPLAY` (local Y), `MTP`, `PIP` and `DIP` (local X). The great toe has `HALLUX_OPPOSITION` (Y), `HALLUX_ROLL` (Z), `HALLUX_MTP` and `HALLUX_IP` (X). Positive toe flexion bends forward digits down toward the sole. Exact angle limits are in `runtime.js` and the manifest.
- LOD0/LOD1 retain the same articulated hierarchy, pivots and sockets. **LOD2 is static**: retained names are lookup metadata, not an animatable distance rig. Switch to LOD1 before articulation. The manifest’s 150 m approach / 20 m hysteresis values are provisional loading metadata; tune for the consuming robot and camera. A gameplay unit may simply remain at LOD1.

## Runtime and demonstrations

There are **no baked GLB clips**: all mechanism axes remain engine-driven. Import `createRig`, `POSES`, `MOTIONS` and `sampleMotion` from `runtime.js`, create a rig for the loaded GLTF scene, then call `rig.pose(sampleMotion(seconds, mode))`. The adapter updates the skeleton and clamps mechanism angles; it refuses to animate the static tier. `rig.pose(pose, {explode})` separates inspection shells without altering the saved engine pose.

| Mode | Named runtime motion | Duration | Action |
| --- | --- | ---: | --- |
| `showcase` | `Prehensile_Foot_Showcase` | 36 s, loop | Ground balance, toe agility, heel-to-toe step, pipe capture and return |
| `rail` | `Metal_Pipe_Grasp_Cycle` | 12 s, loop | Approach, set sole, wrap, hold, release and lift |
| `step` | `Heel_To_Toe_Step_Cycle` | 4 s, loop | Toe-off, toe clearance, swing, heel-first return |
| `agility` | `Independent_Toe_Agility_Cycle` | 8 s, loop | Lift, splay, staggered toe curls and settle |
| `opposition` | `Great_Toe_Opposition_Cycle` | 8 s, loop | Rotate the great-toe saddle inward and unfurl |
| `balance` | `Ankle_Balance_Cycle` | 6 s, loop | Rock across heel, forefoot and lateral edge with ankle compensation |

The metal pipe is a **separate procedural viewer fixture**, not part of the exported foot. Its horizontal axis is X, centre `[0, 0.110, 0.037]` m, radius 0.027 m and length 0.29 m. During the continuous showcase, its stand rises into view after the ground study and retracts before the return. `fixture` and `fixtureRise` in the sampled pose drive that scene staging. The four toe pads address the front of the pipe; the opposed great-toe pad addresses its rear. Contact-frame radial gaps in the held pose are approximately 1.30 mm, allowing a visible near-contact study without asserting simulated grip forces.

## Viewer controls

The lab opens in the plantigrade pose. Play starts the continuous study; selecting a demo starts that study. Play/pause, speed and timeline controls allow inspection. Six static poses provide plantigrade stance, splay, reach, curl, opposition and rail grip. Individual toe curl and all 22 axes are editable. Manual edits lift the foot for clearance. Shell separation, shell/pad visibility, wireframe and rig inspection show construction. Instep, sole, medial side and great-toe cameras complement the orbit view; sole view hides the floor. Detailed/game/static and plain/Meshopt selectors exercise the exported files. The static tier disables pose controls and hides the pipe.

“Save current pose” exports the actual clamped 22 angles plus root placement as `nisoku02foot.pose/v1` JSON. Foot geometry downloads separately; viewer fixtures and inspection separation are not baked into the GLB or pose.

## Validation and reproduction

```sh
node tools/asset-pipeline/build-foot-lab.mjs
node tools/asset-pipeline/validate-foot-lab.mjs
PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node tools/asset-pipeline/test-foot-lab-viewer.mjs
node tools/asset-pipeline/prepare-foot-lab-review.mjs
python3 tools/build-workshop-docs.py
python3 tools/validate-workshop-navigation.py
```

The builder uses the asset pipeline’s installed dependencies. The external concept image’s pinned hash is recorded without requiring or redistributing that image. The optional `calibrate-foot-rail.mjs` prints contact-fit angles without modifying files. The browser test expects a local server at `http://127.0.0.1:8791/`; override with `FOOT_LAB_BASE`.

`validation-report.json` records file hashes, zero glTF errors/warnings for all six plain/decoded exports, geometry checks, cross-tier hierarchy/socket parity, static lockout and 3,104 sampled poses. It checks every deformed vertex at 120 intervals per runtime cycle, floor and rail clearance, rigid toe lengths, loop seams, independent control and five inward-facing rail contact frames. `viewer-validation.json` records desktop/mobile controls, camera framing, playback, all encodings, pose downloads and page-error checks against source hashes.

These finite samples establish the authored study, not arbitrary-pose collision avoidance, physical ground contact, grip strength, tactile sensing electronics, compliant skin or a manufacturable sealed mechanism. Remaining integration work includes consuming-game r160/release packing, reference-phone measurements, leg-controller attachment and any gameplay collision/force solver. No FPS improvement is claimed. The received collaboration contract remains verbatim.
