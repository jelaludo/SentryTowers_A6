# Red Witness / Action showcase integration

The existing `red-witness/` viewer now opens with the ten supplied animations. Select **Model inspection** for the original master, game and static distance tiers, head/arm controls and rest pose. `red-witness/?mode=inspect` opens inspection directly. The action model and inspection models are separate instances; the rigid inspection pose driver never touches the animated skin.

## Controls and runtime

Choose a movement or **Play all**. Pause/resume, restart, timeline scrubbing and quarter/half/normal/1.5× playback are available. Scrubbing pauses at the selected time. Walk/Jog/Run, T_Pose and Crouch loop according to the original manifest; Jump and the four ukemi clips play once and hold. Play all visits every clip, with the supplied 0.35-second end hold. Transitions use cuts between independently authored floor contacts. Reduced-motion preference starts the showcase paused; it can be resumed explicitly. Hidden pages stop advancing.

The stage cancels only horizontal MOTION travel by default, retaining the jump and floor-support height. **Show travel** reveals the baked horizontal translation; the camera, lighting, scale and optional AUREL comparison follow the actor. A ground grid makes displacement visible. The helmet camera follows HEAD. Do not add a second root-motion or jump controller. Gait travel resets at each baked loop; this is a display, not continuous navigation.

One Three.js 0.180.0 instance and one existing render loop drive the adapter. The host calls `update(deltaSeconds)` only while the action view is active. Inspection tier changes cannot select a static silhouette as an animated actor. Original manual poses remain available independently. Clay/wire, cameras, turntable, true-scale comparison and PNG capture work in both views. The selected GLB download follows the current view; the original figure/helmet ZIP and supplied offline animation ZIP have separate links.

## Assets and provenance

- `red-witness-showcase.glb`: plain, self-contained derived game-tier skin; **21,032 triangles, 17 model draws, 11,795,048 bytes**, two materials, 17 rigid-part skins, seven embedded images. These measurements exclude scene, shadows and ruler. Muscles remain rigid and digits fixed.
- `manifest.json`: original exact clip names, durations, loop policy, source takes and credit, unchanged.
- `integration-manifest.json`: Workshop measurements, hashes, source archive, sockets, rest plot and detail-selection policy. The 1.2 × 1 m plot describes rest only; uncentered Run travels over 10 m.
- `red-witness-action-showcase-v1.zip`: supplied archive, unchanged. All 27 extracted payload files are preserved; `CHECKSUMS.sha256` verifies its other 26 files. The archive includes its own offline preview and vendored Three.js MIT license.
- `integration-validation.json` and `browser-*.json`: independently rerunnable Workshop validation. The source `validation/` folder is evidence received with the package, not a new Workshop certification.

Metres, +Y up, +Z forward and native roughly 2.08 m height are retained. The original master/game/distance GLBs in `assets/red-witness/` are unchanged. The action set is game geometry only; no animated master or static-distance playback is claimed. The imported clip names are retained exactly, with loop/one-shot semantics explicit in the manifests. All keyed joints belong to the baked display; engine-driven aiming requires a separate integration. There are no damage states beyond d0.

Models and adaptations by **Jelaludo**; attribution is required. Retain `LICENSE.md` and `ATTRIBUTIONS.md`. Plain GLB is the source of truth. No compressed derivative is supplied; consuming-game release packing and decoded animation validation remain pending. No gameplay collision, muscle deformation, performance/FPS or device acceptance claim is made.

## Recheck and handoff

Run from the repository root:

    node tools/asset-pipeline/validate-red-witness-actions.mjs
    node tools/asset-pipeline/test-red-witness-actions.mjs
    BROWSER_ENGINE=webkit node tools/asset-pipeline/test-red-witness-actions.mjs

The browser check uses the repository's HTTP server at port 8788. Source checksum and glTF validation preserve the received payload. Browser checks exercise all ten clips, decoded textures, measured model draws, floor and camera samples, loop/end behavior, reverse scrub, pause/speed/travel/sequence, mode and tier switching, original posing, comparison/cameras, exact GLB/ZIP downloads, image capture and responsive/reduced-motion behavior.

Pin the containing Git commit plus `assets/red-witness-action-showcase/` and the companion `red-witness/` viewer. Keep the original `assets/red-witness/` family for inspection mode. Visual acceptance, gameplay locomotion/contact integration and release/device checks remain future work.
