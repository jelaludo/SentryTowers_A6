# RECKON K9 / Canine reconnaissance platform

Articulated mechanical scout inspired by the supplied K9-RECON reference. Graphite and titanium armor, twin camera optics, pointed folding ears, servo housings, three digits per paw, exposed actuator rails, paired battery cassettes, a segmented tail and folding radio antennas. This is the separate ground canine family; Reckon-Guard remains the flying drone.

Open the repository's `reckon-k9/` viewer. Authored Blender master: `source/blender/a6-reckon-k9.blend`. Review images: `preview.png` and `animation-review.png`. Models and animation by jelaludo; see `ATTRIBUTIONS.md` for reference provenance.

## Measured export set

Plain GLBs are authoritative, self-contained and texture-free. The six-material palette provides metal, rubber, accent and emissive optics. LOD2 uses one vertex-colour material and one static mesh. Optional `derived/meshopt/` files are explicitly derived; the consuming game still owns its release gltfpack pipeline.

| Tier | Triangles | Mesh draws | Plain bytes | Meshopt bytes | Clips |
| --- | ---: | ---: | ---: | ---: | ---: |
| LOD0 / detailed | 25,884 | 6 | 1,664,712 | 449,000 | 8 |
| LOD1 / game | 9,732 | 6 | 1,177,236 | 356,784 | 8 |
| LOD2 / static distance | 2,484 | 1 | 190,764 | 56,072 | 0 |

The articulated game tier meets the 25k unit triangle target. The static tier meets 3k triangles / one draw / 250 KB. Detailed and game files include the full animation set, so their byte counts include motion. Draw counts exclude the viewer floor, demonstration prop, skeleton, and shadow passes. No FPS claim is made.

## Coordinates, footprint and names

Metres, +Y up, +Z forward, ground-centred origin. Blender source uses Z up / -Y forward. Canonical reservation: 0.48 m wide × 0.96 m tall × 1.42 m long; the standing plot is 0.6 × 1.6 m. Paw soles clear the floor by 4 mm in the bind pose. Exact measured bounds are in the manifest; small silhouette differences at the tail tip reflect removed surface detail, not a different scale. Joint rest transforms and sockets match across all tiers.

Place the **entire loaded glTF scene** inside a game instance group. The skinned mesh is a scene-root sibling of the skeleton, as recommended by glTF; moving only `RECKON_SKIN` is not an instance placement operation. Clone animated instances with `SkeletonUtils.clone` and create an AnimationMixer per clone.

All 36 skeleton names are stable and dot-free, including `MOTION`, `BODY`, `SPINE`, `CHEST`, `NECK`, `HEAD`, `JAW`, `EAR_L/R`, `TAIL_1/2/3`, `ANTENNA_L/R`, and each leg's `UPPER_*`, `LOWER_*`, `PAW_*` (plus hind `HOCK_*`). `FL/FR` are front left/right; `HL/HR` are hind left/right. Left is local +X. `ROOT` and `RECKON_RIG` are unanimated hierarchy lookups.

`required_nodes` records actual exported glTF nodes, not the loader's synthetic material-primitive children. All tiers keep those nodes. The distance tier's skeleton nodes are static lookup transforms; its mesh is not skinned and must not be animated.

## Rig and clip contract

Rigid components carry a single bone weight, preserving hard armor and servo shape. The editable Blender file includes a poseable skeleton and eight separate NLA actions. The builder analytically solves canine leg targets, then samples the resulting transforms at 60 Hz; the plain exports simplify redundant keys. This is an editable baked deformation rig, with the IK authoring logic in `build_reckon_k9.py`, rather than a Blender control-widget rig.

| Clip | Seconds | Playback | Behavior |
| --- | ---: | --- | --- |
| `Alert_Idle` | 3.0 | Loop | Quiet head scan, ear adjustment and tail motion. |
| `Walk_Cycle` | 1.4 | Loop | Four-beat walk, 68% stance, 0.34 m stance travel. |
| `Run_Cycle` | 0.7 | Loop | Diagonal running trot, 44% stance, 0.48 m stance travel. |
| `Sit_Down` | 2.4 | One-shot, clamp | Fold hindquarters and hold seated. |
| `Roll_Over` | 4.8 | One-shot | Crouch, fold ears/antennas, roll fully, stand. |
| `Fetch_Return` | 8.0 | One-shot, root motion | Ease out 0.625 m, lower muzzle, pick up, turn, return and release. |
| `Give_Paw` | 4.0 | One-shot | Sit, offer left forepaw, shake, return upright. |
| `Jump` | 2.0 | One-shot | Anticipation, roughly 0.38 m body lift, landing compression. |

Walk and run are in place. Translate the instance along +Z at **0.357142857 m/s** for walk or **1.558441558 m/s** for run, multiplied by playback rate. Both clips return continuously to their starting poses. Use normal engine crossfades for entering/exiting locomotion.

Only fetch contains forward/turning motion on `MOTION`; disable additional game root travel while that performance plays. The placement wrapper stays under game control. Play one-shots with `LoopOnce` and `clampWhenFinished=true`; sit intentionally holds at the endpoint. The other one-shots return upright. The viewer's repeat option restarts one-shots and is an inspection convenience.

## Sockets and engine control

- `SOCKET_MOUTH`: rigid prop attachment. Attach the separate 27 mm-radius demonstration ball at 2.65 s and release at 7.40 s in fetch. Pickup centre is `[0, 0.027, 0.9812715]` and release centre `[0, 0.027, 0.3562715]` in the unmoved instance's glTF coordinates. The ball is viewer-only and is not in the dog GLBs.
- `SOCKET_PAYLOAD`: modular dorsal rail attachment.
- `SENSOR_YAW` and `SOCKET_SENSOR`: reserved independently aimable sensor mount/socket. No animation channels target `SENSOR_YAW` or the sockets.
- `SOCKET_PAW_FL/FR/HL/HR`: ground contact markers. The game supplies terrain adaptation, articulated collision and navigation; these clips assume a flat floor.

Reserve about 1.6 m square for roll and social performances, 1.4 m vertical clearance for jump, and additional forward space for fetch. `validation-report.json` contains measured world-space envelopes for every clip. General locomotion needs clearance along the game's path.

## LOD selection and damage

LOD0 is the close-shot / recording master. LOD1 retains the complete skeleton and clips for gameplay. LOD2 is a static standing loading/map silhouette. The provisional idle policy loads LOD2 first, switches to LOD1 inside 25 m, and returns to LOD2 beyond 30 m. Keep LOD1 for every animated performance regardless of distance; do not replace a moving or sitting dog with the standing static mesh. Tune thresholds in the consuming game's cameras. D0 intact is the only authored damage state; LOD numbers are not damage identifiers.

## Validation and hand-off

Six plain/decoded Meshopt exports pass glTF validation with zero errors and warnings. Geometry checks cover finite positions, nondegenerate triangles, names, material draws, hashes, socket parity and identical skeleton interfaces. Across 6,344 sampled animated poses, minimum mesh clearance is approximately 1.7 mm; maximum stance drift is 0.33 mm and limb-length error is below 0.08 mm. Fetch attachment events meet the prop centre within 2 mm. Jump has four airborne paws. See the full measured report for exact values.

The real Chromium/WebGL viewer test exercises all eight clip controls, scrubbers, camera framing, six tier/encoding combinations, skeleton/wireframe, ground travel, and a 390 px mobile layout. Blender review renders and browser views were visually inspected. These are repository checks, not consuming-game r160, terrain, release-gltfpack or reference-phone acceptance. Those integration checks remain pending.

Hand off the Git commit containing this folder together with `assets/reckon-k9/`. SHA-256 hashes are in `manifest.json`; retrieve the pinned revision with `git log -1 --format=%H -- assets/reckon-k9/`. Do not hand off an unversioned loose GLB. Include the Blender source separately when editable authoring material is needed.

## Rebuild and inspect

```sh
blender --background --python-exit-code 1 --python tools/blender/build_reckon_k9.py
node tools/asset-pipeline/pack-reckon-k9.mjs
node tools/asset-pipeline/validate-reckon-k9.mjs
blender --background --python-exit-code 1 --python tools/blender/render_reckon_k9.py
node tools/asset-pipeline/render-reckon-review.mjs
python3 tools/build-workshop-docs.py
python3 tools/validate-workshop-navigation.py
```

Serve the repository over HTTP, then open `/reckon-k9/`. Drag to orbit, scroll to zoom, select front/side/optics views, scrub any clip, change speed, pause with Space, inspect the skeleton or wireframe, compare plain/Meshopt and download the selected export. The browser test accepts `PLAYWRIGHT_MODULE`, `CHROMIUM_EXECUTABLE` and `K9_VIEWER_URL` environment variables for a local Playwright/browser installation.
