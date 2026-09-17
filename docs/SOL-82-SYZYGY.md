# SOL-82 Syzygy / approved redesign

17 September 2026. The owner approved a radical armillary orbital-laser redesign inspired by a supplied image of interwoven metallic rings. This document supersedes the satellite appearance and deployment choreography in SOL-82-BRIEF.md. The received brief and ASSET-COLLABORATION.md remain preserved.

## Design and lore

Three independently rotating cages surround a stabilized mechanical lens engine. Each cage has two intersecting meridian bands, interrupted end couplers, carbon armor, silver structural edges, cyan field tracks and embedded amber radiator sectors. The cages occupy separate spherical envelopes about [0, 5, 0] metres, at radii 19.2, 15.1 and 11.1 m. Their intersecting bands belong to a single rigid cage; different cages do not intersect.

The suspended central engine contains concentric lens carriages, focusing collars, eight radially retracting iris blades, external actuator rods and a shielded power core. Detailed masters add armor clamps, fasteners, collar edges and cooling ribs. Geometry remains useful in cyan wireframe as well as full materials.

In the fiction, circulating containment fields store energy while the cages follow different rotation paths. Firing requires both coherent field phases and a physical escape corridor. The cages converge, the lens train advances and the iris opens. Coordinated rotation keeps the corridor clear for a sustained ten-second burn. Holding this alignment depletes field stability and concentrates heat; the cages must separate and recharge afterward. This explains why the opening cannot simply remain ready indefinitely.

The 120 MW fictional optical output represents 1.2 GJ over ten seconds. Conversion losses and stored thermal energy are additional, not included in that optical-energy number. The name SOL-82 remains the owner's homage to SOL-740 and 1982; Syzygy is the new design's subtitle.

## Motion and firing

| Clip | Seconds | Behavior |
| --- | ---: | --- |
| Idle_Cycle | 24 | Loop: three counter-rotating cages, closed iris, retracted lens train |
| Convergence | 4 | One-shot: cages phase into the firing corridor; iris opens during the last 0.8 seconds |
| Firing_Cycle | 10 | Loopable coordinated rotation with optics open; runtime must enforce a maximum ten-second window |
| Recovery | 5 | One-shot: iris closes in the first 0.6 seconds, then cages return to charging paths |
| Aperture_Open | 0.6 | Isolated iris and focusing-carriage motion; does not establish cage alignment |
| Aperture_Close | 0.6 | Isolated inverse optical motion |

These cages use independent rotation, rather than literal six-axis translational motion. Sliding lens groups provide internal translation. OPTICS_YAW and OPTICS_PITCH remain engine-driven and are absent from all baked clip tracks.

The viewer demonstrates Convergence → Firing_Cycle → Recovery → Idle_Cycle. This takes 19 seconds before returning to idle. Individual clips, time scrubbing, pause/resume, yaw/pitch, heat/charge, four overview cameras and a lens-engine camera are available. An optional translucent guide represents a 0.75 m radius clearance cylinder, not an exported beam or the game's six-metre ground footprint.

## Integration changes requiring game-side work

Retain the 180-second pass interval, 20-second overhead period, ten-second energy budget, continuous beam, slow steering, wavelength and power values. Convergence can occupy the first four seconds of a pass; authorize the first burn only when convergence finishes. The actual beam and all ground effects remain game-owned.

The new controller must enforce both energy and elapsed alignment-window limits. Start a maximum ten-second coordinated firing window with the first burn, bounded by the remaining overhead time. Player release suppresses the beam while coordinated rotation continues; it does not restart or extend the alignment window. On expiry or pass end, suppress the beam before Recovery or an emergency Aperture_Close. An interrupted Convergence must close the iris and must not imply permission to fire. This timing policy is documented for integration; this repository does not contain the consuming game's controller.

For an idle cycle interrupted at an arbitrary phase, blend into Convergence over approximately 0.4 seconds while the beam is inhibited. Completed Convergence, Firing_Cycle and Recovery endpoints agree. Firing_Cycle is loopable for review, but unrestricted looping must never grant additional energy in the game.

ROOT and APERTURE remain at the beam exit, [0,0,0], with local -Y firing and +Z flight direction. The optical steering pivots now also rotate about the aperture, so APERTURE remains fixed during tracking. The core and auxiliary sockets have new physical positions, explicitly listed in manifest.json. All tiers share those positions and node names. The motion envelope is a 40.2 m sphere centered at [0,5,0], reserved as a 41 × 41 m footprint; it replaces the old 52.55 m array span.

ARRAY_L, ARRAY_R, RADIATOR_L and RADIATOR_R are deprecated lookup-only nodes. They no longer articulate hardware. Arrays_Deploy is replaced by Convergence. The seven material names are retained; M_Radiator_Glow now controls cage radiator sectors. Consumers must update their bindings rather than assume the old wing choreography remains active.

## Delivery and acceptance

Plain GLB is the source of truth. The detailed master is for recordings, the articulated game tier targets 8,000 triangles / 10 draws / 400,000 bytes, and the derived static distance tier targets 3,000 triangles / one draw / 250,000 bytes. D0 only. Distance-tier control nodes are static lookups and cannot articulate its merged geometry. Select the game tier before motion, beam alignment or steering becomes visible; 150 m with 20 m hysteresis remains a provisional distance threshold.

The prior satellite exports, manifest, notes, generator, validator, Blender source and poster are preserved in source/archive/sol82-satellite-v1/. The archived scripts record original provenance; restore them to their original project paths to reproduce that earlier family.

Acceptance includes exported and decoded-Meshopt geometry, stable names, clip durations, optical socket positions, loop seams, radial envelopes, sampled firing clearance and budget checks. Laser-lab ground and orbit camera framing, game release gltfpack output, reference-phone performance and final LOD thresholds still require the consuming game's review. No FPS claim is made.
