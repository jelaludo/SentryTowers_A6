# Above the city / Elevator diorama

Models by jelaludo. A separate 112-second continuous camera journey at `elevator-city-diorama/`: eight connected domes and a surface elevator station, a close approach to the climber, a 20× ascent with a KORP flyby, and arrival at the orbital terminal with SOL-82 and SOL-88 moving behind it at different speeds.

## Sequence

`City_to_Orbit_Sequence` is a deterministic runtime one-shot, clamped at 112 seconds. The viewer starts automatically and offers optional looping. This is an interactive browser diorama, not a newly baked GLB clip or exported movie.

| Time | Action |
| --- | --- |
| 0–12 s | Establish the city, its eight linked domes, plaza and surface station. |
| 12–24 s | Zoom toward the elevator cabin above the tower. |
| 24–32 s | Climb from Y=55 to 71 m at 2 m/s. |
| 32–36 s | Smoothly ramp from 2 to 40 m/s, reaching Y=155 m. |
| 36–68 s | Climb at 40 m/s: exactly 20× the normal travel speed. |
| 46–60 s | KORP crosses behind the tether near Y=805 m; the camera opens to frame it. |
| 61–78 s | Blend toward the orbital terminal; brake at 68–72 s and dock. |
| 78–98 s | Reveal the terminal with SOL-82 and SOL-88 drifting behind it. |
| 98–112 s | Hold a moving final composition with the miniature world's curved horizon below. |

The acceleration multiplier belongs to climber travel within the sequence. The viewer's separate ½×/1×/2×/4× playback control scales the whole presentation. Tether markings every 25 m make movement visible during the close ascent. The climber's original traction rollers turn according to distance travelled.

SOL-82 uses its original `Idle_Cycle` (8 s), SOL-88 its original `Idle_Cycle` (24 s). They travel on separate nearby scenic drift arcs at 0.0018 and 0.0022 rad/s; SOL-88's angular rate is 22.2% higher. Both remain behind the terminal in the final camera view. Neither fires. KORP retains its original size, uses `Gear_Retract` clamped at 2 s, and crosses on an independent horizontal trajectory; gun aiming is not animated.

## City and connections

Eight unscaled Dome City modules comprise two habitats, two research domes, a biosphere, power, fabrication and logistics. Eight canonical 20 m elevated hallways connect the 48 m centre-spaced modules into one continuous network. Every used cap is hidden on the scene instance, with coincident connection sockets at Y=9.7 m and opposing normals. Source GLBs remain unchanged. A separately generated pedestrian transfer hall connects the logistics south socket `[0,9.7,48]` to the surface station observation facade at `[0,9.7,23.2]`. This is an exterior assembly adapter; a passable interior doorway, pressure seals and loading logic are not modelled. Its wide support portals leave the single vehicle bay's approach clear.

The display plot is 174 × 224 m, centred at `[0,0,78]`. A civic plaza, utility banks, road markings, a parked MÖRK in the existing single hangar and a second slow patrol MÖRK complete the ground scene. Dome shells are opaque material overrides on the instances. Shared source geometry is retained across repeated domes, halls and vehicles; no canonical asset is rewritten.

## Frames and scenic scale

Metres, +Y up, +Z forward. `ELEVATOR_CITY_DIORAMA_ROOT` is at the surface station's ground centre. Each source lives inside a uniquely named wrapper; canonical engine node names remain scoped within that wrapper. All vehicles, domes and stations are at their original 1× scale.

The world is a display sphere of radius 6,000 m. The orbital station's assembly datum is `[0,1523.2,0]`, and the climber stops at `[0,1515,0]`, aligning its `SOCKET_DOCK` with the terminal's lower tether collar. This is a compressed scenic altitude chosen for a readable short film, not an engineered space-elevator/orbital altitude. Tether position is continuous from the surface station to above the orbital terminal. Planet, atmosphere and stars are presentation scenery outside the model counts.

The surface station still has exactly one vehicle hangar. New city scenery, connection adapter and tether markings are code-generated derived display geometry. The original station, dome, SOL, KORP and MÖRK GLBs remain the source of truth. No new compressed files or merged scene GLB are supplied.

## Measurements and hand-off

`layout.json` pins all 14 unique GLB sources per tier by path, SHA-256, bytes, triangles, primitive draws and clip names/durations. Repeated instances count once toward transfer bytes and separately toward composed geometry. Hidden caps are excluded from composed visible counts. Measurements below include the 4,116 triangles / four draws of generated site, hall, tether and instanced markings, but exclude the planet, atmosphere, stars and shadow passes.

| Composition | Unique source bytes | Visible triangles | Primitive draws | Model render triangles | Model render draws |
| --- | ---: | ---: | ---: | ---: | ---: |
| Master | 8,805,316 | 267,224 | 283 | 267,736 | 291 |
| Game | 3,802,996 | 101,692 | 249 | 101,948 | 257 |

The browser measures model-only rendering with culling and shadows disabled for comparison. Double-sided transparent bridge glass uses front/back passes, so rendered triangle/draw counts exceed source primitives. Actual shots cull offscreen city and spacecraft geometry; chapter render samples are recorded separately in `viewer-validation.json`. These are aggregate diorama counts, not a claim that the complete city meets a single-landmark budget. No FPS improvement is claimed.

LOD0 is the detailed recording composition; LOD1 is the reduced animated composition. No automatic swaps or scene LOD2 are provided: source distance proxies are static and cannot retain the KORP flight, climber or SOL articulation. Existing source-family distance tiers remain available separately. Only D0 is composed; damage states remain independent of detail tiers.

Controls: play/pause, restart, full reversible scrubbing, nine chapter jumps, playback speed, loop, master/game detail, cinematic/city/climber/orbital/gunship cameras, free orbit, spacecraft labels, fullscreen and PNG capture. Dragging switches to free orbit; choose the cinematic camera to resume the directed shot. Seeking is deterministic, including source clips. The scene holds its endpoint when looping is off.

Rebuild and check:

```sh
node tools/asset-pipeline/build-elevator-city-diorama.mjs
node tools/asset-pipeline/validate-elevator-city-diorama.mjs
node tools/asset-pipeline/test-elevator-city-diorama-viewer.mjs
python3 tools/build-workshop-docs.py
```

The browser test accepts `PLAYWRIGHT_MODULE`, `CHROMIUM_EXECUTABLE` and `DIORAMA_URL` when needed. `validation.json` records 450 half-second samples across both tiers, unchanged source hashes/clips, one connected eight-dome graph, exact port mating, travel speeds, camera continuity, source-scale preservation, final docking and reversible scrubbing. `viewer-validation.json` records both tiers, all chapters, visible flyby/SOL shots, actual render counts, controls, downloads and mobile framing. Previews are derived browser captures.

Hand off the containing Git commit plus `assets/elevator-city-diorama/` and its referenced source folders. Production collision, sealed/passable transfer interiors, navigation, force/flight/orbital physics, reference-phone/game-camera profiling and release gltfpack/decode checks in the consuming game remain pending. The received collaboration contract is unchanged.
