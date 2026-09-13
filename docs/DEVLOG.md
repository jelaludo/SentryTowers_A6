# Devlog

Authored asset changes, game integration feedback, and work still to do. Completed entries describe exports in this repository; open requests are not completed features.

## Open requests from the game developer

1. **Terraformer 3000 and HUGIN launch pad — pending.** Create game tiers targeting 8,000 triangles, 10 draws and 400 KB plain GLB or less, plus distance tiers targeting 3,000 triangles, one draw and 250 KB. Preserve current node names so `Terraforming_Cycle` and `Cargo_Recovery_Cycle` continue to bind. The existing approximately 40k-triangle game versions exceed the new target.
2. **Robotic assembly line — pending.** Apply the same landmark budgets. The developer reports the current asset at approximately 97k triangles / 7.2 MB.
3. **SH02 rocket — pending.** Add a distance tier for the landing island as seen from the map.

The game currently uses its own derived far tiers for the first request. Those are game-side derivatives, not new authored exports in this library. The game developer's original notes are retained in [ASSET-COLLABORATION.md](../docs/ASSET-COLLABORATION.md).

## 13 September 2026 / ISAO-Birudorōn production alpha

**Production-alpha character family delivered; art and gameplay review pending.** The supplied draft remains byte-for-byte intact as the initial concept. Beside it, a new detailed master and reduced game tier rebuild ISAO as the Japanese ビルドローン (“build drone”) that puts Stålheart together before the Terraformer fabricates MÖRK vehicles.

The new silhouette retains the inset LED face, four construction limbs and central nozzle while adopting the MÖRK/KORP vocabulary: graphite armor, recessed cyan lift/tool hardware, protected rotor rings, amber service marks, sturdy chamfers and exposed mechanical joints. Both tiers use metres, +Y up, +Z forward and a ground-level `ISAO_ROOT`. Stable dot-free pivots articulate four rotors, four hip/knee/claw chains, body pitch and a yaw/pitch/extend fabrication nozzle; twelve named lift, claw, cargo, tool and Terraformer-interaction sockets match across tiers.

Twelve embedded clips are delivered with explicit durations: `Rotor_Cycle` (1.0 s), `Hover_Idle` (4.0 s), nine `Emotion_*` clips (1.2–4.0 s) and `Tool_Fabricate` (2.0 s). The emotion system combines four channels: LED dot pattern, facial pattern animation, limb/body acting and semantic color. Curious now uses an amber left–center–right pupil scan while its mouth and eye framing stay fixed. Determined adds an amber four-limb brace; Sad adds a slow purple droop; Skeptical adds an animated amber brow, side lean and wrist tap; rare Love adds a pulsing pink heart and self-hug. Happy remains green, Alarm red and Working cyan. The preserved concept’s runtime face orientation remains corrected without altering its GLB.

| Tier | Triangles | Draw calls | Plain bytes | Clips |
| --- | ---: | ---: | ---: | ---: |
| Detailed / LOD0 | 34,116 | 89 | 2,485,808 | 12 |
| Game / LOD1 | 12,512 | 39 | 1,171,336 | 12 |

Both production exports have zero textures. The reduced game tier remains below the 25,000-triangle unit guideline; the richer LOD0 is reserved for recordings rather than runtime. The 89/39 draw counts remain explicit alpha optimization targets, so neither tier is marked game-ready and no FPS claim is made. D1–D3 damage states, colliders, animation blending and final Stålheart assembly timing remain pending. A static LOD2 remains conditional on actual camera/loading tests.

The validation suite reports zero glTF errors/warnings and checks hashes, exact byte/triangle/draw counts, zero degenerate triangles, neutral/rest bounds, ground placement, hierarchy and socket parity, unique dot-free node names, clip durations and expression/limb/tool/rotor bindings.

[Open ISAO-Birudorōn](../isao-birudoron/) · [Production-alpha hand-off and concept audit](../assets/isao-birudoron/README.md). Hand-off folder: `assets/isao-birudoron/` at the commit containing this entry.

## 12 September 2026 / Stålheart printing a MÖRK tank

**Completed.** Reused the existing Terraformer 3000 / Stålheart and MÖRK tank in a dedicated fabrication scene. `MORK_Fabrication_Sequence` is a 16-second one-shot: the chassis and lower hull form during stage 01, then the turret and weapons solidify during stage 02. The viewer opens paused at eight seconds, where the chassis is complete and the unfinished upper structure reads as an energized cyan lattice. A moving rectangular fabrication boundary shows the current construction height.

The intact Terraformer remains fully formed throughout the sequence; only the MÖRK is subject to construction-stage visibility. The simplified AFR-9 lattice sits inside the armor instead of overlapping its surfaces, preventing coplanar wireframe shimmer. AFR-9 is described as a magnetically aligned ferroceramic load lattice that receives a rapid-sinter metal-ceramic skin. The MÖRK operational clips are omitted while the vehicle is under construction; Stålheart's existing moving gantry and arm pivots remain stable.

| Tier | Triangles | Draw calls | Plain bytes | Meshopt bytes |
| --- | ---: | ---: | ---: | ---: |
| Detailed / LOD0 | 191,462 | 853 | 12,673,748 | 1,905,796 |
| Game / LOD1 | 7,880 | 10 | 930,244 | 277,240 |
| Distance / LOD2 | 2,043 | 1 | 231,764 | 77,228 |

LOD0 and LOD1 retain the named 16-second clip. LOD2 is one merged static mesh fixed at 50% construction and has no animation. The game and distance tiers now weld split normals and use topology-preserving Meshoptimizer simplification, keeping the completed Terraformer visually solid instead of sampling disconnected triangles. The plain animated game file exceeds the 400 KB transfer target; its optional Meshopt derivative is 277,240 bytes. Filter-mode compression leaves positions unquantized so small features remain valid. Both plain and decoded compressed files passed glTF structure, bounds, unique-name, hierarchy, complete-machine visibility, progression, triangle, draw-call, finite-position and degenerate-triangle validation. These are export measurements rather than FPS claims.

[Open the fabrication viewer](../fabrication-lab/) · [Engine integration notes](../assets/fabrication-lab/README.md). Hand-off folder: `assets/fabrication-lab/` at the commit containing this entry.

## 12 September 2026 / MÖRK turret cleanup and wireframe

**Completed.** Removed the intersecting turret cheek overlays from standard and low-poly tanks, including the copies in loaded containers and deployment dioramas. Added a wireframe toggle alongside neutral shading in the tank viewer. Rebuilt source files and container package; checks cover weapon clearance, animations, ammunition display, container fit and rollout.

## 12 September 2026 / KORP roof fit correction

**Completed.** Front and rear armor panels now conform to the sloping roof, and rear access hatches sit on their supporting surfaces. The shallow dorsal spine had folded side faces; its chamfers now scale to the available section height. Updated all three exports, source and package. Current budgets: detailed 5,228 triangles, game 2,472, distance 1,218; draw calls remain 50 / 16 / 1.

## 12 September 2026 / KORP heavy gunship

**Completed.** Authored through Blender MCP as a MÖRK-manufacturer aircraft. Twin forward rotary cannons pitch down 70° and the centerline heavy cannon 60°. Four tilting engine pods, retractable landing supports and a rear service ramp use stable engine-facing nodes.

Detailed tier: 6,428 triangles / 50 draws. Game tier: 2,424 triangles / 16 draws with one shared vertex-color material. Optional static distance tier: 1,194 triangles / one draw. Seven mechanical clips in detailed/game tiers; aiming and engine tilt remain engine-driven. Only D0 is authored. The distance tier is a parked proxy, not a moving aircraft LOD replacement.

Validated GLB structure, unique stable names, sockets, triangle hygiene, clip durations and muzzle clearance against the hull. [Open KORP](../korp/) · [Runtime contract](../assets/korp/README.md). Hand-off folder: `assets/korp/` at the commit containing this entry.

## 12 September 2026 / Collaboration contract and navigation

**Completed.** Adopted the game developer's export contract as project guidance. Plain GLB is the source of truth; upstream Meshopt copies are optional. Stable named nodes, complete damage/LOD matrices, manifests and measured budgets are part of the hand-off. The game loads distance geometry first and approaches the game tier at 150 m with hysteresis; this differs from the Solar viewer's illustrative screen-size switching.

Added shared Workshop, Devlog and Best Practices navigation to every asset viewer. The detailed contract and budget table are available in [Best Practices](../best-practices/).

## 12 September 2026 / Solar Power LOD exports

**Completed.** Four modules × four damage states × three detail levels. Original detailed files preserved. Plain and Meshopt files are supplied for each of the 48 variants.

| Intact complex | Triangles | Draw calls | Plain bytes | Meshopt bytes |
| --- | ---: | ---: | ---: | ---: |
| Detailed / LOD0 | 131,236 | 1,150 | 9,203,540 | 466,996 |
| Game / LOD1 | 3,856 | 7 | 339,812 | 51,132 |
| Distance / LOD2 | 2,752 | 1 | 237,088 | 49,296 |

All 96 files passed plain/decoded loading, geometry, socket and metadata checks, including 48 damage/power combinations. Game tracking pivots remain; the distance mesh is static. These measurements are export budgets, not a phone FPS benchmark.

[Open Solar Power](../solar-power/) · [Runtime notes](../assets/solar-power/README-LODS.md). Hand-off: commit `b9dc51ad8294aa4ebe2e74d9eceeced71d401ac8`, folder `assets/solar-power/`.

## 12 September 2026 / Ammunition library

**Completed.** 18 authored ammunition families and three reused motion-lab missiles. Complete rounds, separate flight projectiles and empty cases where applicable, with game and display meshes. MÖRK Arrowhead revised to a slender rod and flared collar after reference feedback.

[Open Ammunition](../ammunition/). Hand-off: commit `b7edeb390e93f8e7999dc44a96ba53ae4f5fda46`, folder `assets/ammunition/`. Legacy references also require `assets/missile-kit/` from that commit.

## Feedback for the next hand-off

Send the module and pinned revision, the game camera used (map, third person or optic), triangles/draws/bytes as loaded, and a screenshot from that camera. Include FPS measured on the reference phone when reporting performance. Keep each request focused on one module and identify the budget it should meet.
