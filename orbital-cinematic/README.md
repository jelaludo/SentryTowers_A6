# First Light — orbital cinematic

A separate Workshop tab presents a deterministic 100-second scene: ARC-01 launches SOL-88, the camera pulls back to reveal a small planet, Syzygy animates and performs a ten-second laser test, then repeated HEL-01 launches build a 48-mirror orbital constellation.

Open from the **First Light cinematic** link in ARC-01 or SOL-88; both links open a separate browser tab. The Workshop catalog also lists the scene. Playback starts paused. Controls include play/pause, restart, continuous scrub, six chapter jumps, half/normal/double speed, free camera and fullscreen. Space toggles playback outside form controls; hiding the browser tab pauses it. Scrubbing derives every pose and count from time, including backward jumps.

| Time | Scene |
| --- | --- |
| 0–6.8 s | Close shot of charging/loading and SOL-88 acceleration along ARC-01 |
| 6.8–24 s | Payload rises; camera pulls away to reveal the small planet |
| 24–30 s | Camera approaches SOL-88; the containment cages identify the payload |
| 30–34 s | Original Convergence clip aligns the optical engine |
| 34–44 s | Original Firing_Cycle clip and a gated ten-second beam terminating at the planet |
| 44–52 s | Recovery, then camera returns toward the launcher |
| 52.4–87.95 s | Forty-eight HEL-01 reflector heads launch successively, travel and join three orbit rings |
| 88–100 s | Complete constellation, gradual camera orbit, then playback stops |

`timeline.js` is the pure sequence description; `scene.js` constructs and poses the scene; `viewer.js` handles browser loading, camera and controls. The original GLBs remain unchanged. Source hashes, selected tiers and measured source metrics are recorded in `validation-report.json`.

ARC-01 and SOL-88 use their detailed LOD0 masters for this presentation. SOL-88 retains its named original cage/optics clips. HEL-01 uses the two reflector-head meshes from the existing LOD1 heliostat; its planetary pedestal is deliberately omitted from this cinematic orbital adaptation. All 48 heads share two InstancedMesh draws. The loading head is a separate two-draw preview. These are scene derivatives, not replacement game assets or new exported LODs.

The small planet, atmosphere, star field, beam, orbit guides and trails are original procedural presentation geometry. The 140-unit planet, compressed loading/recovery cycles and payload scaling from transport to orbital presentation are art direction. This is not a physical launch/orbit simulation, a full-size clearance certification, or a change to the canonical dimensions of the three asset families. HEL-01s share an illustrative sun-facing orientation; no energy-collection or beam-reflection simulation is claimed. The SOL-88 laser is capped to its original ten-second demonstration window and is hidden before convergence and after firing.

Validation samples all scene transforms at 0.125-second intervals, camera/payload continuity at segment boundaries, mirror clearance from the planet, increasing deployment counts, beam termination, the ten-second gate, reset and original hashes. A real-model/mocked-renderer viewer test covers loading, chapter jumps, scrub, playback/end/replay, hidden-tab pause and free-camera behavior. Desktop Safari review covers initial launch framing, SOL-88 laser, the growing constellation, and playback through all 48 deployments. Mobile, game integration and sustained reference-device performance remain unmeasured; no FPS claim.

```sh
node tools/asset-pipeline/validate-orbital-cinematic.mjs
node tools/asset-pipeline/test-orbital-cinematic-viewer.mjs
node tools/asset-pipeline/render-orbital-cinematic-poster.mjs
# Blender --background --python tools/blender/render_orbital_cinematic_poster.py
python3 tools/build-workshop-docs.py
```

The poster is a Blender review derivative at 96 seconds. The review GLB is temporary in `/tmp` and not authoritative. The browser adds its own procedural atmosphere, star field and line effects. Hand-off: the commit containing this README plus `orbital-cinematic/` and the three source folders listed in its validation report. Models by jelaludo.
