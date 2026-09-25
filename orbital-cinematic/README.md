# First Light — orbital cinematic

A separate Workshop tab presents a deterministic 100-second scene: ARC-01 launches SOL-88, the camera pulls back to reveal a larger rotating planet against a distant spiral galaxy, Syzygy animates and performs a ten-second laser test, then repeated HEL-01 launches build a 48-mirror orbital constellation.

Open from the **First Light cinematic** link in ARC-01 or SOL-88; both links open a separate browser tab. The Workshop catalog also lists the scene. Playback starts paused. Controls include play/pause, restart, continuous scrub, six chapter jumps, half/normal/double speed, free camera and fullscreen. Space toggles playback outside form controls; hiding the browser tab pauses it. Scrubbing derives every pose and count from time, including backward jumps.

| Time | Scene |
| --- | --- |
| 0–6.8 s | Close shot of charging/loading and SOL-88 acceleration along ARC-01 |
| 6.8–24 s | SOL-88 shoots vertically at constant speed through 9.8 s; camera tracks the same visible payload into orbital acquisition and the rotating-planet reveal |
| 24–30 s | Camera approaches SOL-88; the containment cages identify the payload |
| 30–34 s | Original Convergence clip aligns the optical engine |
| 34–44 s | Original Firing_Cycle clip and a gated ten-second beam terminating at the planet |
| 44–52 s | Recovery, then camera returns toward the launcher |
| 52.4–87.95 s | Forty-eight HEL-01 reflector heads shoot vertically, transfer off-screen, then deploy into three orbit rings |
| 88–100 s | Complete constellation, gradual camera orbit, then playback stops |

`timeline.js` is the pure sequence description; `scene.js` constructs and poses the scene; `viewer.js` handles browser loading, camera and controls. The original GLBs remain unchanged. Source hashes, selected tiers and measured source metrics are recorded in `validation-report.json`.

ARC-01 and SOL-88 use their detailed LOD0 masters for this presentation. SOL-88 retains its named original cage/optics clips. HEL-01 uses a derived 36-triangle distance head built by `mirror-head.js`, retaining the LOD1 heliostat head's hexagonal footprint, local pivot, optical direction and palette. Its planetary pedestal and small rear braces are omitted. The single optical face sits inside an open rim, with no overlapping backing cap or second optical cap to cause depth interference. Optical roughness is raised to 0.32 to soften tiny specular highlights. This distance representation is used throughout the cinematic, including the loading preview; no dynamic LOD switch occurs. All 48 heads share two InstancedMesh draws (1,728 submitted triangles total); shared geometry attributes occupy 3,888 bytes. The source head contains 180 triangles. The loading head is a separate two-draw preview. These are scene derivatives, not replacement game assets or new exported LODs.

The larger rotating planet, atmosphere, distant spiral galaxy, star field, beam, orbit guides and trails are original procedural presentation geometry. The 195-unit-radius planet (increased from 140), compressed loading/recovery cycles and payload scaling from transport to orbital presentation are art direction. This is not a physical launch/orbit simulation, a full-size clearance certification, or a change to the canonical dimensions of the three asset families. HEL-01s share an illustrative sun-facing orientation; no energy-collection or beam-reflection simulation is claimed. The SOL-88 laser is capped to its original ten-second demonstration window and is hidden before convergence and after firing.

Validation samples all scene transforms at 0.125-second intervals, camera and payload continuity at segment boundaries, full animated SOL bounds in landscape and portrait at 20 Hz from 6–30 seconds (at least eight pixels tall at 720px viewport height and no planet occlusion), vertical launch straightness and constant speed, mirror clearance from the planet, increasing deployment counts, beam termination, the ten-second gate, reset and original hashes. A real-model/mocked-renderer viewer test covers loading, chapter jumps, scrub, playback/end/replay, hidden-tab pause and free-camera behavior. Desktop Safari review covers initial launch framing, SOL-88 laser, the growing constellation, and playback through all 48 deployments. Mobile, game integration and sustained reference-device performance remain unmeasured; no FPS claim.

```sh
node tools/asset-pipeline/validate-orbital-cinematic.mjs
node tools/asset-pipeline/test-orbital-cinematic-viewer.mjs
node tools/asset-pipeline/render-orbital-cinematic-poster.mjs
# Blender --background --python tools/blender/render_orbital_cinematic_poster.py
python3 tools/build-workshop-docs.py
```

The poster is a Blender review derivative at 96 seconds. The review GLB is temporary in `/tmp` and not authoritative. The browser adds its own procedural atmosphere, star field and line effects. Its fixed spiral galaxy uses 11,000 procedural point sprites and a soft core; the Blender poster approximates those sprites with tiny emissive triangles. Hand-off: the commit containing this README plus `orbital-cinematic/` and the three source folders listed in its validation report. Models by jelaludo.

The planet and its polar launch site rotate together after 7 seconds at 0.018 radians per second. Released payloads do not inherit that ongoing rotation: each launch freezes its release origin and moves along world +Y at a constant speed (SOL-88: 108 scene units/s; HEL-01: 470, matching the compressed rail acceleration). SOL-88 maintains its straight launch through 9.8 seconds, then follows a continuous, tangent-matched cinematic acquisition into its orbit at 23 seconds. The camera follows the same visible packed payload throughout the pullback; presentation scale grows continuously from transport to orbital scale, with no hidden replacement or zero-scale reveal. HEL-01 launch proxies still appear for 0.85 seconds and their orbital deployments occur five seconds after release. Both acquisition treatments are staged, not simulated maneuvers. The fixed distant galaxy supplies a stationary reference behind the rotating planet.
