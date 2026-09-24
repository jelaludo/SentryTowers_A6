# Devlog

Authored asset changes, game integration feedback, and work still to do. Completed entries describe exports in this repository; open requests are not completed features.

## Open requests from the game developer

1. **Terraformer 3000 and HUGIN launch pad — candidate delivered; game review pending.** Sixteen LOD1/LOD2 files meet the numeric budgets and preserve the primary clip bindings. Stålheart now uses the same canonical tier IDs in its standalone, landmark-comparison and MÖRK-fabrication appearances. Confirm appearance, swap distance and FPS in the game camera on the reference phone before assigning Reviewed runtime status. The existing approximately 40k-triangle files remain labeled legacy comparisons.
2. **Robotic assembly line — candidate delivered; game review pending.** Eight LOD1/LOD2 exports meet the landmark budgets and preserve the useful eight-arm motion in D0/D1. Reduced tiers now omit the rover workpieces and carry a single continuous conveyor silhouette. Confirm the revised composition, swap distance and FPS in the game camera on the reference phone.
3. **SH02 rocket — candidate delivered; game review pending.** A static intact landing-island tier now meets the landmark distance budget. Confirm map silhouette, the approach swap and FPS on the reference phone. D1–D3 remain unauthored rather than inferred from legacy HUGIN wreck art.
4. **AFR-01 Seed Foundry / arrival recycling sequence — candidate delivered; game review pending.** The first panel-to-barrel cycle and a separate four-piece SH02 salvage family now provide detailed/game/distance tiers, sockets and event timings. Confirm the site composition and causal read in the game camera before animating successive section removal. See the [arrival recycler concept brief](../docs/CONCEPT-ARRIVAL-RECYCLER.md).
5. **SOL-82 orbital laser — original satellite restored; laser-lab review pending.** Original detailed/game/distance tiers and four clips remain active. Confirm game-camera framing, thresholds and reference-phone performance.
6. **SOL-88 Syzygy — independent model delivered; integration/review pending.** Three articulated cages, a mechanical lens engine and six clips have separate exports and a viewer. Integrate its bounded alignment controller explicitly; review cameras, thresholds and phone performance.

7. **Yūshi045 Bio-Pearl — first intact candidate delivered; integration/review pending.** Wire its live capacity and valve controller to ISAO inventory; check docking clearance, game release compression, LOD thresholds and reference-phone performance.

8. **Yūshi037 Bio-Dome — second design delivered; integration/review pending.** Compare the low half-sphere/skid alternative; complete live-browser rendering review, ISAO docking/inventory, release compression, game-camera and phone checks.

9. **Frontier industry — first five-module candidate delivered; review pending.** Review the ISAO/MÖRK/KORP family resemblance, drilling and cassette pickup, seven-mirror solar receiver, live browser/mobile behavior and game integration. D1–D3, refinery unloading and orbital/stellar extensions remain future work.

10. **ARC-01 orbital launcher / SEED-01 collector — first intact candidate delivered; review pending.** Integrate the curved rail, sled recovery and collector deployment with planetary satellite production. Confirm sustained browser/mobile playback, game cameras, release compression, inventory, thresholds and phone performance. The local sequence is visual choreography, not real orbital mechanics.

11. **LIT-01 chip manufacturing — intact candidate delivered; review pending.** Review the four-mirror optical bench, wafer writing and cassette interfaces in the game camera. Live browser/mobile, inventory hooks, release compression and phone performance remain pending. D1–D3 are future work.

12. **VER-01 greenhouse — intact candidate delivered; review pending.** Review crop visibility through the envelope, irrigation, harvest access and resource interfaces. Live browser/mobile transparency, game release compression, inventory/growth integration, thresholds and phone performance remain pending. D1–D3 are future work.

13. **HEX-06 Heptapod resource walker — intact candidate delivered; review pending.** Integrate traffic exclusion, ground ablation/resource collection and locomotion/terrain IK. Live browser/mobile, game skinning/release compression, turret/terrain clearance, LOD thresholds and reference-phone review remain pending.

The game may continue using its own derived far tiers until the new candidates pass game-side review. Those game-side files are separate derivatives, not the authored exports in this library. The game developer's original notes are retained in [ASSET-COLLABORATION.md](../docs/ASSET-COLLABORATION.md).


## 25 September 2026 / MÖRK personalization plan

Planned a cosmetic expansion covering paint roles, finishes, curated decals, vehicle identity, portable presets and an in-game garage. The proposal distinguishes the repo's authoring/runtime contract from game persistence, network and combat state. Existing exports are unchanged; customization is not implemented.

Inspection found separate hull/edge materials, 43 primitives in game D0 (44 in D1), partial UV coverage and a one-material vertex-colored intact distance tier. The plan therefore includes explicit paint roles, authored decal zones, independent per-tank materials, damage/LOD behavior and compression checks. Initial scope: three paint roles, three decal zones, number/name and four saved presets; broader patterns, wear and uploads follow later. See [MÖRK customization plan](../docs/PLAN-MORK-CUSTOMIZATION.md).

## 24 September 2026 / HEX-06 tall resource walker

Added a Heptapod A6-inspired six-legged mining robot with a suspended hexagonal hull, tall armored shins, grounded shoes, underside laser, mineral recovery effects and upper process reservoirs. It stands 12.7 m high and reserves an 8 m-wide × 6.5 m-high straight tank corridor. The actual MÖRK low D0 reference measures 5.819 × 3.011 × 13.267 m (width/height/length); a triangle-level check certifies the corridor in parked traffic mode across all plain/decoded tiers. Laser/recovery effects are inhibited while the tank passes.

- Detailed: 14,760 triangles / 6 draws / 790,236 plain bytes. Game: 7,256 / 6 / 390,116. Static distance: 2,860 / 1 / 132,004. D0 only. Game preserves the bone hierarchy in one leg-skin draw and meets both the unit triangle target and tighter landmark budgets.
- Unbaked 16-second mining demonstration, in-place alternating tripod gait, and traffic mode. Stable named pivots/sockets; no terrain deformation, inventory transfer, terrain IK or navigation claimed. Static distance omits laser/recovery effects.
- Six plain/decoded exports pass validation, budgets, geometry, names/hierarchy, bounds, socket, foot placement and corridor checks. Real-model/mocked-renderer viewer tests cover tank/laser interlock, walking, reset, load races, static controls, encoding, wireframe and playback.
- Added procedural source, derived Blender review with actual tank for scale, visually reviewed full/mining renders, manifest, validation report, integration README and viewer. Catalog, readiness, roadmap, Devlog and shared navigation updated. Live WebGL/mobile, game collision/resource/locomotion integration, release gltfpack and reference-phone acceptance remain pending; no FPS claim.
- Hand-off: this commit plus `assets/heptapod-extractor/`. Existing Heptapod and MÖRK assets remain unchanged.

## 24 September 2026 / VER-01 greenhouse operation

Added a futuristic greenhouse to the terraforming kit: a faceted glazed envelope and roof collectors above two hydroponic beds with 24 leafy crop clusters. Rear recovery tanks and a climate fan support the operation. A traveling irrigation bridge services the beds, returns, then sliding front doors open for harvest access in a continuous 20-second unbaked demonstration.

- LOD0: 8,494 triangles / 9 mesh draws / 326,728 plain bytes.
- LOD1: 5,014 triangles / 9 mesh draws / 202,000 plain bytes.
- LOD2: 1,250 triangles / 1 mesh draw / 62,968 plain bytes. Opaque static envelope; hidden internal geometry omitted. D0 only at all tiers.
- All six plain/decoded exports pass glTF, geometry, hashes, budgets, stable node/socket, bounds and controller checks. Viewer tests with real models and a mocked renderer cover initial painting, canopy visibility, harvest doors, reset, loading races, tier controls, encoding, wireframe and playback.
- Added procedural source, derived Blender review scene, full/interior previews (both visually reviewed), manifest, integration notes and viewer with irrigation/glazing controls. Workshop catalog and shared navigation updated. Live WebGL/mobile and game review, transparency sorting, inventory/growth hooks, release gltfpack and reference-phone acceptance remain pending; no FPS claim.
- Hand-off: this commit plus `assets/greenhouse/`. Plain GLBs remain authoritative; Meshopt and Blender review copies are derived.

## 24 September 2026 / LIT-01 chip manufacturing unit

Added a compact chip writer to the terraforming kit: four correctly angled folding mirrors, open focusing collar, patterned wafer, articulated XY stage, power cabinet and twin wafer/chip cassette ports. The detailed master includes fine die traces, fasteners and cooling fins; game and distance tiers reduce the geometry while preserving roots, sockets and meaningful lookup names. D0 only; damage states remain separate from LODs.

- LOD0: 8,144 triangles / 8 mesh draws / 346,540 plain bytes.
- LOD1: 3,712 triangles / 8 mesh draws / 163,124 plain bytes.
- LOD2: 2,152 triangles / 1 mesh draw / 81,776 plain bytes; explicitly static.
- Six plain/decoded exports pass validation, hashes, budgets, geometry, node/socket consistency and optical-reflection checks. A 12-second unbaked `Wafer_Write_Cycle` aligns, writes six rows with indexing blanking and returns to datum; sampled focus checks keep the beam on the wafer.
- Added procedural source, derived editable Blender review scene, full/optical previews, integration README, manifest, validation report and a viewer with tier/encoding selection, timeline, beam visibility, wireframe, cameras and downloads. Blender render review completed. No browser was available for live viewer review; browser/mobile, game release compression, inventory integration and reference-phone acceptance remain pending. No FPS claim.
- Workshop catalog, readiness, roadmap and generated Devlog/navigation updated. Hand-off is this commit plus `assets/chip-manufacturing/`.

## 24 September 2026 / Faster launch after slow loading

- The loading approach now continues slowly until the first rung lights at 8 seconds. Rail acceleration takes 0.4 seconds instead of 4 seconds: ten times faster.
- Synchronized rung activation, clamp release, payload departure and sled braking to the faster launch. Lit rungs remain cyan until the returning platform passes; the later recovery/deployment schedule remains intact.
- Updated runtime timing, manifest, viewer cache versions and integration notes. Regression checks cover the shortened rail traversal, release continuity, light timing and loading approach. Geometry and export budgets are unchanged.

## 24 September 2026 / Hold rail lights until platform return

- Rail stations now stay cyan after outward payload passage, through release and recovery. Each switches back to white as the platform descends past it during 18–26 seconds.
- Updated runtime, manifest and integration notes; export geometry and budgets are unchanged. Plain/decoded runtime checks cover the held lights, descending clearance and reset.

## 23 September 2026 / Payload collar cleanup and sequential rail lights

- Shortened SEED-01's inner hexagonal body behind the pale collar, removing the coplanar cap responsible for the reported moiré across all three tiers.
- ARC-01's sixteen accelerator crosspieces and paired rectangular side housings pulse cyan one by one as the payload passes, then fade to white over 0.48 seconds. Timeline scrubbing/reset reproduce the sequence; returning sleds do not retrigger it.
- Crosspieces share one additional draw: launcher LOD1 remains 5,768 triangles, now seven draws and 342,756 plain bytes. The full assembly is 6,896 triangles / fifteen draws. LOD2 remains one draw per module.
- Regenerated plain/derived exports, hashes, Blender source and previews. Plain and decoded checks cover the single collar face, all sixteen station UVs, pulse timing, decay and reset. Viewer regression checks pass. Safari scrub inspection shows the cyan passage lights and a clean collector collar. Game/mobile acceptance remains pending.

## 23 September 2026 / ARC-01 curved orbital launcher

**Owner-requested orbital industry family delivered as a contract candidate.** ARC-01 launches small SEED-01 collector satellites manufactured on the planet as the first modular contributions to the future Dyson structure. The original design follows ISAO/MÖRK/KORP's slate armor, pale caps, cyan status lighting and amber service marks. Names are provisional development identifiers.

A continuous twin rail sweeps upward on seven braced supports, with a loading apron, paired four-unit capacitor banks, sixteen acceleration cassettes and a straight sled-recovery extension. The packed satellite has six independently hinged hexagonal reflective petals, a service bus and an optional insertion-stage preview plume. Separate plain GLBs cover both modules at detailed/game/static-distance tiers, plus six explicitly derived Meshopt exports. The editable Blender assembly and full/close/deployed renders accompany the procedural source.

| Module / tier | Triangles | Mesh draws | Plain bytes |
| --- | ---: | ---: | ---: |
| Launcher / detailed | 11,784 | 6 | 678,100 |
| Launcher / game | 5,768 | 6 | 326,140 |
| Launcher / distance | 2,952 | 1 | 165,380 |
| Satellite / detailed | 1,824 | 8 | 82,368 |
| Satellite / game | 1,128 | 8 | 55,676 |
| Satellite / distance | 840 | 1 | 39,548 |

The 30-second unbaked engine demonstration loads and charges, accelerates along the curve, separates the payload, brakes/returns the sled, unfolds six petals and shows an insertion-stage effect. It finishes with a deployed collector and recovered launcher. The display flight slows to a held inspection position; the art-directed rail and timing are not claims of real orbit capability. D0 only. LOD2 is docked/packed and explicitly static.

All twelve plain/decoded exports pass glTF validation, hashes/counts, budgets, nondegenerate geometry and node/socket checks. Sampled controls verify payload docking, packed rail/clamp clearance, continuous position at transitions, deployment after exit, recovery/reset and static tiers. Automated viewer tests cover loading/races, follow camera, collector shortcut, control/tier restoration, wireframe, retries and deferred-frame playback fallback. Shared primitive exports do not change the existing settlement geometry.

Safari live review confirmed the assembled launcher, six deployed petals, plain/decoded loading and reset/inspection controls. Its deferred animation callbacks exposed a blank first-frame issue; direct painting on load/resize/control changes fixes that case, with a watchdog for intentional playback when animation frames are deferred. Sustained live playback review was interrupted when the Safari window became unavailable. Mobile, consuming-game Three.js r160/release gltfpack, gameplay inventory, physics, final LOD thresholds and reference-phone FPS remain pending. No FPS improvement is claimed.

Hand-off: this commit plus assets/orbital-launcher/, including manifest.json and runtime.js. Source: tools/asset-pipeline/orbital-launcher-shape.mjs and source/blender/orbital-launcher.blend. Workshop catalog, readiness, roadmap, Devlog and generated navigation are current.

## 23 September 2026 / Ore cassette side-panel z-fighting

**Fixed the corner-strip shimmer reported in the Workshop screenshots.** The CAS-01 corner strips ended at the same x = ±0.74 m planes as the side wall in LOD1/LOD2. Moved the strips outward by 20 mm in all three authored tiers; their outer faces now stand clear of the wall, within the original base footprint. Names, sockets, bounds, capacity behavior, triangles and draws are unchanged.

Rebuilt the three plain cassette GLBs and optional Meshopt derivatives, refreshed hashes/measurements, the editable Blender assembly and preview renders. A ray-intersection regression verifies more than 15 mm of face separation at all four strips in every plain and decoded compressed tier. The complete export validator and viewer-control regressions pass. Live browser confirmation of the reported artifact remains pending; reload the viewer to fetch the corrected assets.

Hand-off: this fix commit plus assets/settlement-industry/. The screenshot report adds browser evidence of the original defect, not final game-camera or reference-phone acceptance.

## 23 September 2026 / Frontier industry: extraction to stellar construction

**Owner-requested first industrial vertical slice delivered as a contract candidate.** New automated drilling, rugged six-wheel transport and minimalist hexagonal mirrors share the corporation's existing ISAO, MÖRK and KORP design language: petrol/slate chamfered shells, pale inset panels, black recesses, cyan functional readouts and amber service marks. BOR-01/TRK-01/HEL-01/CRU-01/CAS-01 are provisional development designations, not a new corporation name.

Five original modules supply fifteen intact plain GLBs across detailed, game and static distance tiers, with fifteen optional derivatives under derived/meshopt/. The drill has bracing feet, a helical auger, spare rod magazine and swinging output chute. The hauler has treaded wheels, protected sensor head, telescoping forks and a slotted cargo bed. A common cassette physically fits the output/loading arrangement. Seven shared-geometry heliostats aim toward the crucible's elevated field-facing receiver; their clean reflective faces anticipate a later orbital collector family.

| Game module | Triangles | Draws | Plain bytes |
| --- | ---: | ---: | ---: |
| BOR-01 | 2,380 | 8 | 95,064 |
| TRK-01 | 4,284 | 10 | 204,012 |
| HEL-01 | 296 | 3 | 18,036 |
| CRU-01 | 800 | 2 | 42,100 |
| CAS-01 | 204 | 2 | 14,756 |

All module game budgets pass; each distance tier is one static mesh/material/draw. The complete game scene is 9,740 model triangles / 43 model draws, excluding ground, grid, shadow passes and optional alignment guides. No FPS measurement or improvement claim.

The unbaked engine controller provides a deterministic 32-second one-shot: extraction/fill, chute clearance, lift, slide into bed, secure, eight-metre transport and delivery stop. Runtime inventory, physics, terrain adaptation and refinery unloading are not implemented by this visual demonstration. Distance controls are lookup-only; the viewer disables playback at LOD2. Master/game pivots and sockets retain stable names and transforms. D0 only: damage and LOD remain separate.

The Workshop viewer offers the complete site and individual modules, tier/encoding selection, playback/pause/reset/scrub, wireframe, optical guides, perspective/map cameras, fullscreen and per-module downloads. A detailed editable Blender assembly, full-scene poster and close/stowed-cargo review renders accompany the procedural sources.

Validation covers every plain and decoded Meshopt file with zero glTF errors/warnings, hashes, measured geometry, nondegenerate triangles, grounding/bounds, hierarchy/socket parity and budgets. Sampled runtime checks verify cargo continuity and bed docking, lift-before-slide, optical reflection and static proxy behavior. Viewer tests use real model graphs with mocked DOM/WebGL and cover controls, stale loading, tier/time preservation and failure/retry. Blender visual review is complete. Live-browser review could not run because no browser provider was available and Safari reported an unavailable window; GPU/mobile verification remains explicit follow-up work.

Remaining: game-camera/Three.js r160 integration, release gltfpack, inventory/physics, refinery unloading, final thresholds and reference-phone performance. D1–D3, orbital deployment/station-keeping hardware, assembly tugs and Dyson construction modules are future work. Existing assets and the received collaboration contract are preserved.

Hand-off: this delivery commit plus assets/settlement-industry/ (manifest.json, runtime.js and plain tier folders); optional Meshopt derivatives are clearly marked. Editable source: source/blender/settlement-industry.blend and tools/asset-pipeline/settlement-industry-shape.mjs. Catalog, readiness, roadmap and website Devlog/navigation updated.

## 17 September 2026 / Yūshi037 Bio-Dome and long-vowel naming

**Independent second biomass-container candidate delivered; integration/review pending.** The owner specified the long-vowel spelling Yūshi045 and named the next design Yūshi037. Display names and export metadata now use ū; existing ASCII paths, URLs, node names and family IDs remain stable. Yūshi045 retains its geometry, socket coordinates and tripod design.

Yūshi037 explores the low half-sphere direction: a 3.30 m wide dome on a grounded octagonal skid, broad protective straps, low service hatch and pumped forward extraction cassette. It holds the same dense organic binder concentrate ISAO mixes with planetary regolith and mineral aggregate. Its compact base is intended for prepared yards, distinct from the rough-terrain tripod of Yūshi045. The model number does not imply a gameplay upgrade or replacement.

| Yūshi037 tier | Triangles | Opaque draws | Optional glass draw | Plain bytes | Meshopt bytes |
| --- | ---: | ---: | ---: | ---: | ---: |
| Detailed / LOD0 | 6,506 | 2 | 1 | 238,664 | 73,480 |
| Game / LOD1 | 1,134 | 2 | 1 | 53,484 | 22,696 |
| Static distance / LOD2 | 386 | 1 | 0 | 23,720 | 10,636 |

All three tiers share 3.66 × 1.9425 × 3.9025 m overall bounds, ground-centred origin, dot-free lookup nodes and sockets within a 4.4 × 4.4 m plot (approach marker intentionally external). Engine-driven valve articulation is retained in the detailed/game tiers; the distance tier is one static opaque mesh. D0 only. Detailed Blender source and a rendered Workshop poster are included.

The segmented shoulder gauge and recessed inspection well share a live capacity value. Its own runtime adapter inverts the half-ellipsoid volume relationship f = 1.5t − 0.5t³; 50% capacity lies at about 34.73% of internal height. Optional small glass and pumping shader motion require no refraction, textures or fluid simulation. Do not use the full-sphere Yūshi045 height mapping for this asset. The instanced yard shares fill; independent per-instance inventory still needs a game-side attribute.

All plain and decoded Meshopt exports pass hashes, bytes, budgets, nondegenerate geometry, socket/name parity, bounds and volume/valve tests. The Blender master/poster is visually reviewed. Automated viewer regression tests use real scene graphs and controllers with mocked DOM/WebGL, covering delayed startup, full/empty, flow/pause, tier-switch fill preservation, stale downloads, failed-load recovery and batching structure for both families. They are not GPU or FPS measurements. The Safari live-render/control check was interrupted when its window became unavailable; live-browser review remains pending.

The game still needs inventory wiring, ISAO docking/clearance, release gltfpack attribute preservation, Three.js r160 integration, final LOD thresholds and reference-phone measurements. No FPS improvement is claimed. Yūshi045 byte counts/hashes reflect the Unicode metadata spelling change; current values are in its manifest/README, while the earlier entry below records initial delivery sizes.

Hand-off: this commit plus assets/yushi037/ (including runtime.js and manifest.json), or assets/yushi045/ for the renamed Bio-Pearl. Editable source: source/blender/yushi037-bio-dome.blend. Shared navigation, catalog and website documentation regenerated.

## 17 September 2026 / Yūshi045 Bio-Pearl

**First intact candidate delivered; ISAO/game integration and reference-phone review pending.** Authored Yūshi045 (有機性資源コンテナ 第045型) as a squat spherical binder reservoir on three broad-footed legs. ISAO uses its concentrated organic feedstock with local regolith and mineral aggregate to construct buildings on remote planets. The pale upper shell, armored bowl, equatorial support belt, low extraction coupling and service cap explain its storage function.

Eight shoulder segments and a recessed sight chamber share an engine-driven capacity value. A small optional glass cover provides the close-up inspection effect. Pumping adds subtle shader movement; there is no fluid simulation, refraction, texture or particle system. The actual volume fraction maps nonlinearly to the vessel's liquid height. Capacity remains independent of detail and damage.

| Yūshi045 tier | Triangles | Opaque draws | Optional glass draw | Plain bytes | Meshopt bytes |
| --- | ---: | ---: | ---: | ---: | ---: |
| Detailed / LOD0 | 7,560 | 2 | 1 | 284,176 | 84,324 |
| Game / LOD1 | 1,208 | 2 | 1 | 62,920 | 25,288 |
| Static distance / LOD2 | 400 | 1 | 0 | 27,196 | 11,440 |

All tiers share identical approximately 3.737 × 3.1525 × 3.485 m bounds, a 4 × 4 m reservation, ground-centred origin, meaningful dot-free nodes and inlet/outlet/service/approach sockets. The game and master keep DISPENSE_VALVE articulated; LOD2 retains a static lookup. There are no baked clips because inventory and flow belong to the game. Plain GLBs show a 50% reference state; assets/yushi045/runtime.js supplies live capacity from the preserved _YUSHI attribute.

Validation covers all plain and decoded Meshopt files, hashes, geometry, nondegenerate triangles, names, socket normals/positions, budgets, valve state and capacity/height mapping. Blender provides the editable master and poster. Safari review covers full and empty indicators and a 25-container game-tier yard reporting two model draws, excluding its grid. That yard shares capacity across instances; independent inventories need a game-side instancing extension. Reference-phone FPS is not measured and no speed claim is made.

The viewer provides capacity presets/slider, filling/dispensing demonstration, pause, optional glass, wireframe, detail/encoding selection, camera presets and the instanced yard. The consuming game still needs inventory wiring, actual ISAO docking/clearance review, final LOD thresholds and release gltfpack validation that preserves the capacity attribute. No earlier model is replaced.

Hand-off: this commit plus assets/yushi045/. Source: tools/asset-pipeline/build-yushi045.mjs. Editable detailed scene: source/blender/yushi045-bio-pearl.blend. [Runtime and lore](../assets/yushi045/README.md).

## 17 September 2026 / ISAO viewer loading-race fix

Fixed the website error “null is not an object (evaluating wrapper.position)”. The render loop could enter production animation before the initial GLB download created its wrapper, then permanently stop after the exception. Loading now keeps the render loop alive without accessing incomplete model state. Model selection publishes state only after its download finishes; stale responses are discarded and their resources released. Failed downloads keep a readable error and allow a subsequent selection to retry. Hover/tool controls are guarded during loading, and prior clip handles are reset when switching models.

Regression coverage exercises delayed startup, controls before download completion, rapid out-of-order model changes, stale failures, failed downloads and retries across production, static-distance and preserved-concept modes. Safari verification confirms the detailed model renders and responds to emotion controls. A versioned script URL refreshes the fix on the website; shared navigation and this website Devlog are regenerated. Model exports are unchanged; existing game-side asset reviews remain pending.

## 17 September 2026 / SOL-88 separated from SOL-82

**Independent model delivered; game integration/review pending.** At the owner's request, Syzygy is now SOL-88, a separate model family under assets/sol88/ with its own sol88/ viewer, SOL88-prefixed engine nodes, manifest IDs, generators, validator, Blender scene and Workshop poster. All three plain exports and decoded Meshopt previews retain the approved cage-and-lens design and six clips.

The original SOL-82 satellite has been restored to assets/sol82/ and sol82/, including its original four clips, generator, validator, manifest, Blender source and poster. Restored files are checked against the original b3fe793 revision. Both models have independent Workshop entries; the historical satellite archive remains available.

SOL-88 LOD0 is 65,664 triangles / 7 draws / 2,303,400 plain bytes; LOD1 is 7,928 / 7 / 386,400; LOD2 is 2,650 / 1 / 81,924. Both families pass their own plain/decoded validators. SOL-88 retains the sampled 3,321-ray firing-clearance check per encoding. These are asset candidates; the consuming game must explicitly choose SOL-88 and implement its alignment controller. SOL-82 requires no Syzygy controller migration.

Hand-off: this commit plus assets/sol88/ for Syzygy, or assets/sol82/ for the original satellite. [SOL-88 design and integration](../docs/SOL-88-SYZYGY.md). Game-camera, final LOD thresholds, release gltfpack output and reference-phone review remain pending.

## 17 September 2026 / Syzygy initial redesign (subsequently designated SOL-88)

This historical entry records the initial SOL-82 redesign. The later separation above restores SOL-82 and moves Syzygy to SOL-88.

**Authored candidate delivered; game-controller migration and laser-lab review pending.** Replaced the conventional satellite appearance with three independently rotating armillary cages around a suspended mechanical lens engine. The owner approved the supplied interwoven-ring reference and sustained firing-window concept before implementation. Original satellite assets and sources remain preserved under source/archive/sol82-satellite-v1/.

The master adds armor clamps, fasteners, cooling ribs and optical collars. The game tier keeps three cages, eight retracting iris blades, lens-carriage translation, focus motion and unbaked engine-driven optical steering. A broad capture collar houses the open iris. Full materials are the Workshop default; cyan wireframe remains available.

| Syzygy tier | Triangles | Draws | Plain bytes | Meshopt bytes |
| --- | ---: | ---: | ---: | ---: |
| Detailed / LOD0 | 65,664 | 7 | 2,303,400 | 459,796 |
| Game / LOD1 | 7,928 | 7 | 386,400 | 106,468 |
| Static distance / LOD2 | 2,650 | 1 | 81,924 | 27,636 |

Six clips provide Idle_Cycle (24 s), Convergence (4 s), Firing_Cycle (10 s), Recovery (5 s), Aperture_Open and Aperture_Close (0.6 s each). The lore requires field coherence and a physical escape corridor; rings maintain alignment for the continuous burn, then separate to restore field stability and reject heat. The 120 MW fictional output and 1.2 GJ optical-energy budget remain.

ROOT/APERTURE retain the beam-origin contract. A 40.2 m spherical motion envelope replaces the old array span. All tiers share named pivots and sockets. ARRAY_L/ARRAY_R and the old radiator hinges are deprecated lookup-only nodes; Arrays_Deploy is replaced by Convergence. The consuming game must implement the documented alignment/energy gate, moved auxiliary sockets and animation migration before adopting these files.

All six exports pass family validation, including decoded Meshopt, animation parity, loop seams, sockets, names, materials, hashes and budgets. The firing corridor passes 3,321 rays per encoding over 41 phases and nine aiming combinations at a 0.75 m clearance radius. The detailed scene/poster were rendered in Blender; plain detailed and decoded game previews were inspected in Safari. Game release gltfpack output, laser-lab cameras, final thresholds and reference-phone performance remain pending. No FPS improvement is claimed.

The viewer adds a complete convergence → firing → recovery demonstration, timeline scrubbing, a lens-engine camera, tracking and emissive controls, and an optional viewer-only clearance guide. Shared navigation and website documentation are regenerated.

Hand-off: this commit plus assets/sol82/. Geometry/choreography: tools/asset-pipeline/sol82-syzygy.mjs; exporter: tools/asset-pipeline/build-sol82.mjs. Detailed Blender scene: source/blender/sol82-orbital-laser.blend. Design and migration: [current SOL-88 design](../docs/SOL-88-SYZYGY.md).

## 15 September 2026 / SOL-82 orbital laser platform

**Contract candidate delivered; laser-lab ground-camera, close-orbit and reference-phone review pending.** Authored SOL-82 as a 52.55 m combat satellite with a shielded octagonal bus, guarded sensor prow, triple capacitor/reactor spine, separated thruster pods, broad tracking wings, paired deployable thermal radiators and a two-axis ventral optical assembly. The primary Workshop presentation is cyan wireframe telemetry; the same topology also carries the complete carbon, gunmetal, cyan, amber and engine-driven emissive treatment for rare cut-ins.

| SOL-82 tier | Triangles | Draw calls | Plain bytes | Meshopt bytes | Motion |
| --- | ---: | ---: | ---: | ---: | --- |
| Detailed / LOD0 | 9,436 | 7 | 447,372 | 100,504 | Four clips; close cinematic/recording master |
| Game / LOD1 | 4,940 | 7 | 264,808 | 69,912 | Four clips; arrival, departure and close orbit |
| Distance / LOD2 | 2,700 | 1 | 78,936 | 24,272 | Static deployed sky silhouette and glint |

`ROOT` and `APERTURE` coincide at the beam exit; local and default world `-Y` is the fire direction, while +Z remains direction of flight. `OPTICS_YAW` and `OPTICS_PITCH` are deliberately absent from all clip tracks so the game can steer them continuously. `Arrays_Deploy` lasts 2.5 seconds, `Aperture_Open` and `Aperture_Close` last 0.6 seconds each, and `Idle_Cycle` lasts 8 seconds. LOD1 is 4,940 triangles / 7 draws / 264,808 plain bytes; LOD2 is 2,700 triangles / 1 draw / 78,936 bytes, so both meet the landmark targets.

The energy lore treats 120 MW as stored optical output: a shielded continuous-power core charges a 1.2 GJ pulse store between passes, while the arrays operate the bus, cryocoolers and optical control. Phase-change sinks accept the ten-second burn and radiator vanes reject the heat afterward. The game still owns the beam, footprint, aim marker, scorch, smoke and HUD. Plain GLB and decoded Meshopt files pass glTF validity, self-containment, names, material, animation, aperture, bounds, hash and budget checks. D1–D3 remain intentionally absent because the platform cannot currently be damaged.

Hand-off folder: `assets/sol82/` at the commit containing this entry. Production source: `tools/asset-pipeline/build-sol82.mjs`. Editable review scene: `source/blender/sol82-orbital-laser.blend`.

## 13 September 2026 / SH02 four-piece salvage staging

**Contract candidate delivered; game-camera/reference-phone review pending.** The AFR-01 viewer no longer composes an intact rocket beside a recycler that is supposedly dismantling it. A separate `sh02_salvage_layout` family stages four addressable D0 assemblies around the service arm: the deployed legs and engines remain joined to the lower two-band booster, the upper tank lies separately, the complete top cargo capsule lies on its side, and a newly authored hatch-open module identifies where ISAO emerges.

| SH02 salvage tier | Triangles | Draw calls | Plain bytes | Meshopt bytes | Behavior |
| --- | ---: | ---: | ---: | ---: | --- |
| Detailed / LOD0 | 20,418 | 4 | 1,721,028 | 565,172 | Four static movable section roots; source landing gear and cargo-capsule detail retained |
| Game / LOD1 | 4,796 | 4 | 157,432 | 50,864 | Four static movable section roots and five sockets |
| Distance / LOD2 | 2,398 | 1 | 69,996 | 22,560 | One merged draw with lookup-only section roots and sockets |

The intact animated `assets/sh-rocket/sh_rocket.glb` remains preserved. `salvage_stage: 1` is explicitly independent of D0 damage and LOD selection. The game and distance tiers meet the small-landmark numeric targets; decoded Meshopt, GLB validity, hashes, names, bounds, socket parity and source preservation validate. The AFR-01 metrics continue to exclude SH02 context cost. Successive section-removal states, game-camera thresholds, reference-phone performance and sound remain pending.

Hand-off folder: `assets/sh02-salvage/` at the commit containing this entry.

## 13 September 2026 / AFR-01 Seed Foundry vertical slice and Assembly conveyor

**Contract candidates delivered; game-camera/reference-phone review pending.** AFR-01 now demonstrates ISAO's first build as a sixteen-second diegetic chain: the reused service arm aims at `SALVAGE_PANEL_00`, blue cutter sparks mark contact, the panel transfers into the processor, the induction signal and separator activate, and a relabeled construction-feed barrel fills for Stålheart. A separate four-second `Foundry_Process_Cycle` supports continuing operation.

| AFR-01 tier | Triangles | Draw calls | Plain bytes | Meshopt bytes | Motion |
| --- | ---: | ---: | ---: | ---: | --- |
| Detailed / LOD0 | 6,788 | 41 | 439,772 | 176,428 | Two clips; reused detailed arm and barrel structure |
| Game / LOD1 | 1,660 | 8 | 92,728 | 42,504 | Two clips; rigid articulated arm proxy |
| Distance / LOD2 | 1,228 | 1 | 52,224 | 19,336 | Static lookup-only tier |

The SH02 remains a separate preserved asset; the newer entry above records its derived four-piece salvage context. Its cost is excluded from the AFR metrics. `rocket_salvage_stage` remains independent of D0–D3 and LOD selection. The detailed barrel reuses the source structure while omitting the misleading fuel placard and adding an AFR cyan collar. Runtime sparks should come from `SOCKET_CUTTER_TIP`, using the authored `CUTTER_ARC_ON` and `CUTTER_ARC_OFF` cues instead of shipping the preview mesh as a particle system. Resource-inventory wiring, audio and D1–D3 remain future work.

The Assembly Line LOD generator now omits all four detailed rover workpieces and replaces six reduced conveyor modules with a single dark 2.05 × 0.22 × 23.9 m oblong. D0 LOD1 measures 5,186 triangles / 3 draws / 392,648 bytes; its eight-arm 36-track cycle remains intact. D0–D3 LOD1/LOD2, decoded Meshopt copies, names, sockets, damage distinction and the continuous belt bounds validate. A fresh Blender render confirms the conveyor reads clearly beneath the arms.

Hand-off folders: `assets/arrival-foundry/` and `assets/assembly-line/` at the commit containing this entry. Editable AFR review scene: `source/blender/afr-01-seed-foundry.blend`.

## 13 September 2026 / Assembly viewer repair and arrival recycler concept

**Viewer repair completed; concept captured at this checkpoint.** The Robotic Assembly Line viewer previously called `toLocaleString()` on absent `draw_calls` metadata for detailed reusable modules, so selecting the Articulated service arm could stop at `LOAD FAILED`. The viewer now measures loaded render primitives as a fallback and safely displays missing numeric or plot metadata. The module cache key was refreshed. The documentation builder now preserves the Roadmap's global item numbers across section breaks.

Captured the game designer's first-build sequence in the [arrival recycler concept brief](../docs/CONCEPT-ARRIVAL-RECYCLER.md). At this checkpoint no recycler GLB existed; the later entry above records the delivered first vertical slice. Salvage stages remain distinct from damage states and LOD tiers, and blue cutter sparks remain specified as socket-driven runtime VFX.

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
| LOD1 | 4,196–5,188 | 1–3 | 125,800–393,336 | D0/D1: `Assembly_Cycle`, 8.0 s, 36 tracks |
| LOD2 | 2,074–2,932 | 1 | 60,264–81,196 | Static |

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
