# Roadmap

This is the ordered delivery plan for the model library and Workshop. It translates game-design goals and the asset collaboration contract into reviewable work. An item moves to **completed** only when its files, measurements, validation, documentation and hand-off are present; visual or reference-phone review may remain explicitly pending.

## Active

1. **HUGIN and Stålheart contract LODs — candidate delivered; review active.** Sixteen standalone LOD1/LOD2 files now cover all four damage states and meet the numeric triangle, draw and plain-byte budgets. Required names, transforms, silhouettes and primary animation motion are validated against the detailed sources; optional Meshopt copies are decoded during validation. The Workshop visual review is complete. Game-camera, swap-threshold and reference-phone review remain before the files can be labeled game-ready.
2. **Robotic assembly-line LODs — candidate delivered; review active.** Eight standalone LOD1/LOD2 files cover D0–D3 and meet the landmark budgets. D0/D1 LOD1 retain all eight robot rigs through 36 source-matched tracks in one rigid-weighted draw; static LOD2 preserves readable robot, gantry, belt and wreck silhouettes. Plain and decoded Meshopt files, sockets, names, damage distinction and rendered views are validated. Game-camera, belt-treatment and reference-phone review remain before game-ready status.

## Next contract work

3. **SH02 landing-island distance tier — queued.** Add a static, one-material LOD2 for map and loading views, with the same plot origin, island footprint, rocket silhouette, gameplay sockets and damage identity as the approach tier.
4. **Truthful readiness and documentation — queued.** Replace stale “game-ready” labels and tables, distinguish original, legacy derivative, contract candidate and reviewed runtime asset, and keep Workshop cards, READMEs, manifests and Devlog measurements synchronized.
5. **Shared manifest and viewer specification — queued.** Adopt one versioned manifest schema for every family: files, tier, damage, role, derivation, hashes, bytes, triangles, draw calls, dimensions, plot, roots, sockets, colliders, clips, materials, textures, selection thresholds, review state and credit. Show the same essentials in every viewer.
6. **Engine-facing naming migration — queued.** Replace dotted or duplicate runtime lookup names with meaningful, unique, dot-free names in a coordinated versioned migration. Publish old-to-new mappings and preserve damage/LOD parity; do not silently rename nodes already pinned by the game.
7. **Game-camera acceptance evidence — queued.** Add third-person, optic, map, container and loading-view captures where relevant. Record projected size, swap thresholds and FPS on the reference phone before making performance or game-readiness claims.
8. **Measured optimization pass — queued.** Profile units and map-visible environments in representative scenes, then prioritize families by loaded bytes, visible triangles, draw calls, animation cost and repetition. Keep damage states separate from LODs and add distance tiers to units only when their actual staging justifies them.

## Experience and world expansion

9. **Mobile fullscreen asset viewing — queued.** Make the 3D stage the primary phone experience in portrait and landscape: a true fullscreen control, safe-area-aware layout, collapsible title and controls, thumb-sized inputs, dependable orbit/pinch gestures, reduced render scale where needed and restoration of the previous camera/UI state on exit. Test representative heavy and light viewers on iOS and Android-sized viewports.
10. **Science-grounded futuristic Habitats — discovery queued.** Design an original habitat family that projects credible current work in lunar/Martian construction, radiation shielding, closed-loop life support, in-situ resource use and modular logistics into the game’s visual language. Record research provenance and design inference, avoid copied project geometry, and plan detailed, game and static distance tiers plus damage states before production.
11. **Model-linked sound packages — specification queued.** Package original or properly licensed WAV masters and runtime OGG derivatives beside appropriate models. Define stable event names for motors, servos, rotors, hover fields, fabrication, impacts, alarms and emotional vocalizations; identify loops and one-shots, loop points, distance curves, loudness targets, attribution and animation cue timing in the manifest. Never embed large audio payloads in GLB files.
12. **Collision and navigation hand-offs — queued.** Add simple named collider meshes, walkable/blocked regions, interaction volumes and socket diagrams where gameplay needs them. Keep render geometry out of physics and document engine import settings.
13. **MÖRK / KORP / ISAO style bible — queued.** Codify silhouette, armor bevels, graphite/teal/white materials, cyan functional light, amber service markings, mechanical joints, scale cues and controlled exceptions so future vehicles, drones and habitat machinery read as one product lineage.
14. **Progressive and resilient Workshop loading — queued.** Load posters or LOD2 first, stream heavier tiers on demand, use content-hashed cache keys, surface loading and failure states, and make the documentation useful when WebGL or remote module delivery is unavailable.
15. **Accessible motion and controls — queued.** Respect reduced-motion preferences, provide pause-by-default where appropriate, keyboard-visible controls, non-color status labels, useful text descriptions and captions/transcripts for future sound demonstrations.
16. **Reproducible release packaging — queued.** Generate hand-off inventories, SHA-256 hashes, plain/decoded validation reports, derived Meshopt copies, ZIP packages and route checks in one repeatable pipeline. CI must fail on missing files, broken links, schema errors, unstable required names or claimed budgets that do not match measured exports.

## Review sequence

Work proceeds in numbered order unless the game developer changes priority. At each item: review the proposed visual and runtime behavior, build the smallest complete vertical slice, validate measured requirements, update the Devlog and Workshop, hand off a commit plus folder, then record game-side feedback before advancing.
