# Devlog

Authored asset changes, game integration feedback, and work still to do. Completed entries describe exports in this repository; open requests are not completed features.

## Open requests from the game developer

1. **Terraformer 3000 and HUGIN launch pad — candidate delivered; game review pending.** Sixteen LOD1/LOD2 files meet the numeric budgets and preserve the primary clip bindings. Stålheart now uses the same canonical tier IDs in its standalone, landmark-comparison and MÖRK-fabrication appearances. Confirm appearance, swap distance and FPS in the game camera on the reference phone before assigning Reviewed runtime status. The existing approximately 40k-triangle files remain labeled legacy comparisons.
2. **Robotic assembly line — candidate delivered; game review pending.** Eight LOD1/LOD2 exports meet the landmark budgets and preserve the useful eight-arm motion in D0/D1. Confirm silhouettes, belt treatment, swap distance and FPS in the game camera on the reference phone.
3. **SH02 rocket — candidate delivered; game review pending.** A static intact landing-island tier now meets the landmark distance budget. Confirm map silhouette, the approach swap and FPS on the reference phone. D1–D3 remain unauthored rather than inferred from legacy HUGIN wreck art.

The game may continue using its own derived far tiers until the new candidates pass game-side review. Those game-side files are separate derivatives, not the authored exports in this library. The game developer's original notes are retained in [ASSET-COLLABORATION.md](../docs/ASSET-COLLABORATION.md).

## 13 September 2026 / Canonical Stålheart and wireframe-only MÖRK fabrication

**Composite rebuilt; game-camera/reference-phone review pending.** Removed the separate legacy Stålheart reduction from the fabrication pipeline. LOD0, LOD1 and LOD2 now import the exact intact D0 members `terraformer_3000_d0`, `terraformer_3000_d0_lod1` and `terraformer_3000_d0_lod2`. The standalone Stålheart viewer now exposes those same tier IDs across D0–D3, matching the HUGIN/Stålheart comparison. The fabrication manifest records each canonical source ID, hash and measured triangle/draw count; validation requires exact parity and stable animated pivots.

The MÖRK sequence no longer exports or reveals solid tank geometry. `MORK_Fabrication_Sequence` resolves twelve cyan line bands from bottom to top over 16 seconds and stops on a complete, recognizable MÖRK wireframe. The full cannon, turret, hover chassis and surface topology remain legible at the endpoint. `MORK_BUILD_WIREFRAME` is the primary node. `MORK_BUILD_LATTICE` and the former two solid-stage names remain empty deprecated lookup aliases so existing integration can migrate without accidentally rendering armor. The static LOD2 is now the 100% wireframe endpoint rather than a 50% build.

| Tier | Solid triangles | Draw calls | Plain bytes | Meshopt bytes | MÖRK state |
| --- | ---: | ---: | ---: | ---: | --- |
| Detailed / LOD0 | 165,404 | 795 | 12,399,036 | 1,867,220 | 12-band animated wireframe |
| Game / LOD1 | 7,342 | 23 | 595,400 | 260,920 | 12-band animated wireframe |
| Distance / LOD2 | 2,173 | 2 | 161,024 | 86,448 | Complete static wireframe |

The reported triangles belong to the solid Stålheart geometry; MÖRK uses line primitives. LOD1’s canonical Stålheart remains 7,342 triangles / 10 draws; the additional draws are twelve independently keyed print bands and the moving boundary. The plain game file remains above the 400 KB landmark transfer target. Visual review in Safari covered the decoded Meshopt endpoint and 50% bottom-up print state. Validation also covers plain glTF errors, decoded Meshopt, hashes, finite full-tank bounds, zero MÖRK mesh primitives, discrete band keys, complete Stålheart visibility and exact canonical tier parity. No FPS improvement is claimed.

Hand-off folder: `assets/fabrication-lab/` at the commit containing this entry.

## 13 September 2026 / Readiness and naming audit

**Library-wide evidence pass completed; legacy migrations remain ordered follow-up work.** Replaced Workshop capability badges and unsupported “game-ready” labels with four evidence states: Original, Legacy derivative, Contract candidate and Reviewed runtime. No collection claims Reviewed runtime because no checked-in hand-off yet contains representative game-camera captures, tuned selection thresholds and reference-phone measurements together.

The reproducible audit reads every GLB JSON chunk and all asset manifests. It records SHA-256, bytes, triangles, draw calls, materials, textures, skins, clips and node-name findings per file. Across 453 GLBs and 34 manifests, all 159 files in current candidate scope pass; 283 original/legacy files retain reported naming debt and zero manifest references are missing. Current candidates fail the audit on noncanonical filenames, unnamed/duplicate/dotted nodes, invalid declared engine names, missing lookups or inconsistent declared name sets across a family. Preserved originals and legacy derivatives are still inventoried, but their findings are a migration backlog rather than a false compliance claim.

Solar’s coordinated migration replaces 8,361 Blender-leaked or noncanonical identifiers across 48 plain GLBs, regenerates 48 Meshopt derivatives, and publishes the complete old-to-new map. Thirty-nine static `TRACKER_TILT` lookups were restored to D3 across LOD0/1/2 under the same rack parents and rest transforms as D0. The manifest now declares one engine-name set per Solar family, and validation checks name, parent and local-transform parity for every damage/LOD pair. Assembly’s signed finger controls are now `FINGER_P1` and `FINGER_N1` consistently in all eight plain and compressed candidates; its four-name migration is also published.

Evidence: `docs/ASSET-AUDIT.md`, `docs/generated/asset-contract-audit.json`, `docs/ASSET-NAMING.md`, `assets/solar-power/name-migration-v1.json` and `assets/assembly-line/name-migration-v1.json`.

## 13 September 2026 / SH02 landing-island distance candidate

**Library candidate completed; map-camera/reference-phone review pending.** Added a static D0 map, orbit, loading and far-view composite of the deployed SH02 and the documented 16 × 16 m landing-site slab. The animated `sh_rocket.glb` and editable Blender source remain preserved as the approach/authoring assets.

| Asset | Triangles | Draw calls | Plain bytes | Meshopt bytes | Clips |
| --- | ---: | ---: | ---: | ---: | ---: |
| Animated approach source | 23,502 | 107 | 1,587,456 | — | 5 |
| Static landing-island LOD2 | 2,154 | 1 | 52,424 | 22,512 | 0 |

The distance export preserves the 21.4 m deployed silhouette, three-leg stance, island top at Y=0, 1.2 m skirt and cargo-capture socket. Existing rocket, booster, capsule, door, marking and landing-chain names remain as non-articulating lookup nodes; move the complete root only. Markings and five clips are deliberately omitted because they cannot read or operate in the merged static tier. Swap to the approach asset before leg, suspension, cargo-door or marking behavior becomes visible.

SH02 presently authors only intact D0. The older HUGIN wreck is a separate legacy family, so D1–D3 were not fabricated or mislabeled. Validation checks the original source plus exact hashes, bytes, triangle/draw/material/texture/skin/animation counts, finite non-degenerate geometry, unique dot-free names, hierarchy and socket parity, island corners/skirt, rocket-only elevated bounds, budgets and decoded Meshopt output. Perspective and map renders compare source composition with LOD2. No FPS improvement is claimed.

The HUGIN/SH02 Workshop viewer now switches between the animated detailed rocket and the static landing-island tier, disables irrelevant animation/marking controls for LOD2, reports measured geometry and provides plain plus Meshopt downloads. Hand-off folder: `assets/sh-rocket/` at the commit containing this entry.

## 13 September 2026 / Robotic assembly-line contract LOD candidates

**Library candidate completed; game-camera/reference-phone review pending.** Added LOD1 and static LOD2 exports for the complete robotic assembly line across D0–D3. The detailed plain GLBs and editable Blender scene remain preserved as authoring sources.

| Tier | Triangle range | Draw calls | Plain-byte range | Motion |
| --- | ---: | ---: | ---: | --- |
| LOD1 | 4,192–4,982 | 1 | 129,732–389,384 | D0/D1: `Assembly_Cycle`, 8.0 s, 36 tracks |
| LOD2 | 2,190–2,938 | 1 | 67,624–81,316 | Static |

D0/D1 LOD1 converts the eight articulated robot assemblies to one rigid-weighted skinned mesh with a 45-joint skeleton. It retains all 36 useful arm-control tracks and matches sampled source transforms. The original 180 tread and 12 roller targets are omitted because hundreds of individually animated objects are not an appropriate runtime belt implementation; use a shader/material offset or one engine control if belt travel must read.

LOD2 uses authored per-robot and structural proxies so the factory skyline survives reduction. D1 marks one warning arm, D2 removes destroyed gantry crossbeams while retaining columns, and D3 preserves broken conveyor rails and the tallest wreck remnant. Stable roots, all arm-control lookup nodes, four sockets, collider metadata, plot, coordinate system and damage identifiers remain consistent.

Validation reports zero glTF errors/warnings and checks hashes, exact bytes/triangles/draws, one material, zero textures, finite non-degenerate geometry, unique dot-free names, required nodes, socket parity, rigid weights, exact clip duration/targets, sampled animation parity, source bounds, damage distinction, budgets and decoded Meshopt copies. A separate Blender render pass reviewed all eight silhouettes. No FPS improvement is claimed.

The Workshop assembly-line viewer now defaults the complete line to LOD1, exposes LOD2 and the detailed source, reports draws and bytes, and offers plain plus optional Meshopt downloads. Reusable modules remain honestly labeled detailed originals. Hand-off folder: `assets/assembly-line/` at the commit containing this entry.

## 13 September 2026 / HUGIN and Stålheart contract LOD candidates

**Library candidate completed; game-camera/reference-phone review pending.** Added standalone LOD1 and static LOD2 exports for HUGIN and Stålheart across D0–D3. The preserved detailed plain GLBs remain the authoring source; the older approximately 40k derivatives remain available only for regression comparison.

| Family | Tier | Triangle range | Draw range | Plain-byte range |
| --- | --- | ---: | ---: | ---: |
| HUGIN | LOD1 | 7,138–7,192 | 1–7 | 203,420–287,836 |
| HUGIN | LOD2 | 2,186–2,193 | 1 | 69,300–72,452 |
| Stålheart | LOD1 | 7,146–7,342 | 1–10 | 210,524–329,980 |
| Stålheart | LOD2 | 2,167–2,196 | 1 | 73,052–76,780 |

D0/D1 LOD1 retain `Cargo_Recovery_Cycle` at 20 seconds and `Terraforming_Cycle` at 16 seconds. HUGIN keeps six animated recovery controls; Stålheart keeps the gantry, carriage, tool lift and J1–J6 motion. The forty individually animated flexible-feed segments are omitted from Stålheart LOD1 because they do not read at its intended distance; primary feeds and machine silhouette remain. LOD2 files contain one static vertex-colour mesh and one material, while stable lookup controls remain as non-articulating nodes.

Validation reports zero glTF errors/warnings and checks exact hashes, bytes, triangles, draws, material/texture counts, finite non-degenerate geometry, silhouette bounds, unique dot-free node names, required nodes, local transform parity, clip names/durations, sampled primary-control motion and decoded Meshopt copies. A separate rendered visual pass confirms recognizable intact silhouettes and meaningful reduction between tiers. No FPS improvement is claimed.

The Landmark LOD Workshop now opens on the current LOD1 candidates and exposes LOD2, legacy and detailed comparison with truthful review labels and direct downloads. Hand-off folders: `assets/launchpad/` and `assets/terraformer/` at the commit containing this entry.

## 13 September 2026 / MÖRK and ISAO static distance tiers

**Completed for recurring background use; game-camera thresholds remain to be measured.** MÖRK and ISAO are units, but their actual staging creates repeated far-view roles: intact MÖRK 2 and MÖRK 3 appear diegetically inside containers, while ISAO is usually too distant for facial pixels or limb acting to read. That evidence justifies static LOD2 exceptions to the usual one-tier unit policy.

| Asset | Intended use | Triangles | Draw calls | Plain bytes | Clips |
| --- | --- | ---: | ---: | ---: | ---: |
| MÖRK D0 LOD2 | Intact container, background, map and loading displays | 1,706 | 1 | 222,796 | 0 |
| ISAO LOD2 | Distant flight, background, map and loading views | 1,800 | 1 | 177,028 | 0 |

Both tiers use one merged vertex-colour mesh, one material, zero textures and no clips. Stable roots and control/socket empties remain for lookup, but their child controls do not articulate the merged geometry. MÖRK’s long cannon assembly is protected from simplification because it defines the silhouette; the same D0 proxy can be instanced for repeated intact container displays. ISAO omits unreadable emotion dots and substitutes one non-emotive cyan functional panel signal. The engine may translate or rotate each complete root.

Swap MÖRK to its low-poly game tier before combat, turret motion, ammunition changes or damage. Swap ISAO to LOD1 before facial or limb performance becomes readable. ISAO’s threshold must be based on projected screen size and measured on the actual game camera/reference hardware, not copied from the 150 m landmark rule. D1–D3 MÖRK distance tiers are intentionally absent until a damaged-background use is established. No FPS improvement is claimed.

Validation reports zero glTF errors/warnings and checks hashes, exact geometry/byte metrics, one-draw construction, zero textures/skins/animations/degenerate triangles, ground placement, silhouette dimensions, stable dot-free names and required engine nodes. Hand-off folders: `assets/hover-tank/` and `assets/isao-birudoron/` at the commit containing this entry.

The MÖRK workshop module cache key was refreshed with the distance-tier delivery so an already-open browser cannot keep the older two-tier viewer and incorrectly report the 6,742-triangle game model after selecting Static.

## 13 September 2026 / ISAO-Birudorōn production alpha

**Production-alpha character family delivered; art and gameplay review pending.** The supplied draft remains byte-for-byte intact as the initial concept. Beside it, a new detailed master and reduced game tier rebuild ISAO as the Japanese ビルドローン (“build drone”) that puts Stålheart together before the Terraformer fabricates MÖRK vehicles.

The new silhouette retains the inset LED face, four construction limbs and central nozzle while adopting the MÖRK/KORP vocabulary: graphite armor, recessed cyan lift/tool hardware, protected rotor rings, amber service marks, sturdy chamfers and exposed mechanical joints. All tiers use metres, +Y up, +Z forward and a ground-level `ISAO_ROOT`. Stable dot-free pivots articulate four rotors, four hip/knee/claw chains, body pitch and a yaw/pitch/extend fabrication nozzle in LOD0/1; the same named controls and twelve lift, claw, cargo, tool and Terraformer-interaction sockets remain available for lookup in static LOD2.

Seventeen embedded clips are delivered with explicit durations: `Rotor_Cycle` (1.0 s), `Hover_Idle` (4.0 s), fourteen `Emotion_*` clips (1.2–4.0 s) and `Tool_Fabricate` (2.0 s). The emotion system combines four channels: LED dot pattern, facial pattern animation, limb/body acting and semantic color. Curious uses an amber left–center–right pupil scan while its mouth and eye framing stay fixed. Determined adds an amber four-limb brace; Sad adds a slow purple droop; Skeptical adds an animated amber brow, side lean and wrist tap; rare Love adds a pulsing pink heart and self-hug. This revision adds green Glee, purple Worried, red Angry, amber Surprised and purple Sleepy performances. Neutral is now a deliberately flat two-eye/four-dot expression. The preserved concept’s runtime face orientation remains corrected without altering its GLB.

LED visibility channels now use glTF `STEP` interpolation while body and limb motion remains smooth. Hidden faces rest at exact zero scale, and validation samples every expression frame to require exactly one full-size face. This removes the jarring miniature glyph that previously appeared while Blender linearly interpolated one facial state down and the next state up.

| Tier | Triangles | Draw calls | Plain bytes | Clips |
| --- | ---: | ---: | ---: | ---: |
| Detailed / LOD0 | 45,780 | 99 | 3,362,660 | 17 |
| Game / LOD1 | 17,264 | 49 | 1,570,944 | 17 |
| Distance / LOD2 | 1,800 | 1 | 177,028 | 0 |

All three production exports have zero textures. The reduced game tier remains below the 25,000-triangle unit guideline; the richer LOD0 is reserved for recordings rather than runtime. The 99/49 draw counts remain explicit alpha optimization targets, so those articulated tiers are not marked Reviewed runtime and no FPS claim is made. The static one-draw LOD2 is now delivered for distant staging, with its actual swap threshold pending game-camera measurement. D1–D3 damage states, colliders, animation blending and final Stålheart assembly timing remain pending.

The validation suite reports zero glTF errors/warnings and checks hashes, exact byte/triangle/draw counts, zero degenerate triangles, neutral/rest bounds, ground placement, hierarchy and socket parity, unique dot-free node names, clip durations, expression/limb/tool/rotor bindings, `STEP` facial switching, exact hidden scales and one full-size face per sampled emotion frame.

[Open ISAO-Birudorōn](../isao-birudoron/) · [Production-alpha hand-off and concept audit](../assets/isao-birudoron/README.md). Hand-off folder: `assets/isao-birudoron/` at the commit containing this entry.

## 12 September 2026 / Stålheart printing a MÖRK tank

**Historical implementation, superseded by the 13 September wireframe-only rebuild above.** This first pass reused the existing Terraformer 3000 / Stålheart and MÖRK tank in a dedicated fabrication scene. Its 16-second one-shot formed opaque chassis and weapon stages; those solid stages and its separate Terraformer reduction are no longer present in the current exports.

The historical metrics and behavior are intentionally not repeated as current guidance. Use the 13 September entry, current `assets/fabrication-lab/manifest.json` and integration README for the active wireframe-only hand-off.

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
