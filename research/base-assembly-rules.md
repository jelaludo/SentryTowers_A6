# Procedural base assembly and destruction rules

This accompanies the [109-item catalog](base-assets.md) and its [structured JSON](base-assets.json). Names, plots and connector examples are design commitments. Meshes, collision hulls and validated vehicle envelopes still need authoring before this becomes a runtime generator. The system describes a fictional game base; mines and energy devices are visual/gameplay abstractions.

## 1. A common modular language

- Use meters, local +Y up and +Z forward. A planning cell is 4 × 4 m; connector centers can fall on a 2 m subgrid. Asset coordinates start at the center of the reserved plot, at foundation height.
- Rotate whole plots only by 0°, 90°, 180° or 270°. Rotate connector positions, normals, clearance volumes and footprint dimensions together. Cosmetic parts may have unrestricted rotation within their allowed sockets.
- Plot dimensions describe reserved ground, not the mesh's tight bounding box. The art must leave entrance and service space within that reservation. Props may instead occupy named subcell sockets; never reserve a full building plot for a tiny crate by accident.
- A road corridor is 8 m wide; a pedestrian lane is 2 m clear within a 4 m corridor. These are game-art standards, not real engineering recommendations. Vehicle width, turn radius and height are separate profiles. A6, cargo vehicles and aircraft must fit their specific profiles before placement succeeds.
- Author foundations in 0, 1 and 2 m elevation variants. Ramps and stairs connect one 1 m step over their reserved run. Elevated decks require rated support sockets. Do not stretch a GLB to bridge arbitrary height differences.
- Use one material language: dark structural metal, pale replaceable armor, recessed utilities and restrained emissive status lights. Zone colors are optional accents: blue command, teal medical, amber industry, violet power, orange flight operations. Faction colors are overrides, not separate geometry.

## 2. Typed connections

An asset is not connectable merely because two boxes touch. Each connector needs a type, position, outward direction, clear width/height, elevation and supported agent classes.

| Type | Matching rule | Typical use |
| --- | --- | --- |
| `road` | Road-to-road, opposite outward normals, identical width/elevation | Gate, garage, loading dock, roadway |
| `walk` | Walk-to-walk, matching clear lane and elevation | Barracks, clinic, common areas |
| `wall` | Wall-to-wall, matching section height and seam profile | Perimeter sections, corners and gate frame |
| `fence` | Fence-to-fence only | Utility-yard enclosure |
| `utility` | Matching physical duct seam; typed services also checked | Conduit and junction geometry |
| `power`, `data`, `water`, `waste`, `cooling` | Service graph edge with compatible producer/consumer endpoints | Supply networks; may share a physical conduit |
| `support` | Load class and attachment transform match | Foundation pier, crane base, stacked container |
| `roof`, `wall_prop`, `cargo`, `turret` | Named parent socket and compatible attachment class | Vent, terminal, crate, sentry |

The catalog's border connector samples describe the planar road/walk/wall seams. Detailed power plugs, attachment sockets, connector heights, vehicle swept volumes and load classes must be added during prefab authoring. Do not interpret missing dimensions as unlimited clearance.

Match road graph endpoints before snapping plots. A 2-cell road's edge center does not automatically align with every odd-width building plot. Place by matching socket transforms on the 2 m subgrid, then reserve the rotated plot and test overlaps. Never shift a building visually while leaving its graph endpoints behind.

Road and footpath graphs are separate. Join them only through a marked crossing asset. Roads do not connect to wall ports. A vehicle gate is a composite: a road crossing and wall endpoints share a plot, with gate leaves controlling passage. Fence-to-wall transitions require a separately authored adapter; there is none in the initial catalog, so reject that join.

## 3. Make functional districts

| District | Anchor | Supporting assets | Spatial rule |
| --- | --- | --- | --- |
| Command | Command nexus | Operations annex, server vault, communications, uplink | Connected to the main road and walking networks; reserve its landmark silhouette |
| Personnel | Barracks | Mess hall, hygiene, recreation, shelter | Connected walking courtyards; keep industrial delivery traffic outside them |
| Medical | Infirmary | Triage shelter, medical crates, patient-transfer entrance | Reachable from personnel paths and a vehicle pickup route |
| Logistics | Warehouse | Loading dock, crane, hardstand, containers | Connect directly to vehicle circulation; retain cargo handling space |
| Maintenance | Repair workshop | Garage, fabrication, drone bench, recycler | Adjacent to logistics by road, with separate pedestrian entrances |
| Utilities | Power module | Battery, substation, cooling, water, waste | Use a service courtyard; utility routes must reach consumers |
| Air operations | Launch pad | Hangar, flight control, service module, drone pad | Reserve landing, overhead and approach volumes before placing surrounding assets |
| Perimeter | Wall loop and gates | Watchtower, observation devices, compatible sentry sockets | Close the boundary graph; every intentional opening is a gate or declared scenario breach |
| Temporary field area | Deployable devices | Barricades, sensor pucks, boundary markers, repair dock | Optional scenario-tagged space; never intersects required friendly routes |

This is a set of content-generation constraints, not a real-world defensive layout. Exact spacing comes from the game camera, movement envelopes and prefab collision geometry.

Use district anchors before decorative clustering. A medical crate belongs at a medical or warehouse cargo socket; a tool rack belongs at a workshop socket. A crane needs a supported base plus a clear swept volume. A roof antenna requires a valid roof attachment. Do not scatter every prop uniformly across the map.

## 4. Resource and dependency logic

Keep a physical adjacency graph and a separate functional service graph. Touching buildings do not automatically share power. A conduit can carry several declared service edges, but a missing or destroyed branch disconnects only the services routed through it.

Define capacities in abstract game units in the scenario configuration, not inside model geometry. For each service, require `reachable supply >= admitted demand` and apply the configured priority order. Storage only covers demand while charged or stocked; it is not an unlimited producer. Important consumers can request two independent paths, but that must be an explicit scenario option.

- Power source → substation/junction → consumers; battery is backup storage.
- Water purifier → water tank/distribution → medical, hygiene and galley consumers.
- Cooling module → declared server, fabrication or power consumers.
- Communications backbone → local relays → command, sensors and controlled devices.
- Warehouse inventory → service routes → repair, medical, fabrication and flight-service facilities.
- Foundation/support → building shell → roof attachments. This graph must be acyclic.

Loss of command does not delete other buildings. Loss of power changes powered behavior, lights and production; it does not imply structural collapse. Loss of a pier affects only assets whose support requirements are no longer satisfied. Aircraft pads and utility modules remain visible when disabled.

## 5. Generator sequence

1. Read a seeded scenario: base archetype, site polygon, terrain, faction, unit classes, resource budget and intact/damaged starting condition.
2. Reserve exclusions: terrain obstacles, unsupported slopes, map exits and any aircraft approach volumes. For a spherical board, fit the site's local surface frame first.
3. Place the main district anchors and external access portals. Reserve their full plots and clearance volumes.
4. Connect anchors with the road graph. Insert corners, junctions, gate approaches and turnarounds. Validate vehicle paths using swept geometry, not just tile connectivity.
5. Connect entrances with the footpath graph and marked road crossings. Reserve service doors, medical transfer routes and emergency exits.
6. Solve physical support and foundation elevations. Add ramps, piers and bridges only where their authored interfaces fit.
7. Add the perimeter as a closed boundary graph. Allocate gates at approved road crossings, then fill with compatible wall sections and corners.
8. Place service producers and route utility networks. Check capacity, dependencies and scenario-required redundancy.
9. Fill district expansion slots with optional buildings. Revalidate paths and service budgets after each placement.
10. Populate attachment and cargo sockets with weighted, district-appropriate props. Check stack capacity, door swing, crane sweep, landing space and weapon articulation envelopes.
11. Add optional fictional field hazards only inside authored hazard zones. Keep friendly circulation, spawn areas and required exits clear. Pair zones with readable boundary markers. Device operation belongs to game logic, not model internals.
12. Validate, then save the seed, selected prefabs, transforms, graph edges and persistent IDs. Failed placements backtrack; they do not silently overlap existing geometry.

If an archetype cannot fit, reduce optional content or choose a smaller archetype. Do not hide failures by shrinking buildings or deleting required paths.

## 6. Example scenario recipes

These are distinct starting recipes, not promises that any arbitrary map size will fit.

| Recipe | Required anchors | Optional character |
| --- | --- | --- |
| Survey outpost | Operations annex, barracks, power supply, water supply, cargo hardstand, road access | Drone pad, observation tower, temporary sensor field |
| Mechanized support base | Command nexus, warehouse, workshop, garage, barracks, infirmary, utilities, gates | A6 dock, salvage plant, fabrication hall |
| Orbital foothold | Command nexus, launch pad, flight control, hangar, warehouse, crew support, utilities | Uplink dish, orbital cargo platform, drone operations |
| Relief and recovery camp | Infirmary, triage shelters, barracks, mess, water, backup power, road access | Recycler, repair workshop, additional medical storage |

If an outpost lacks an authored dedicated command module, the operations annex may satisfy the command role through a scenario role assignment. Roles are separate from visual prefab names.

## 7. Three levels of destruction, plus intact

Use four mutually exclusive visual states for each physical prefab:

| State | Art purpose | Default structural behavior |
| --- | --- | --- |
| D0 — intact | Complete silhouette; readable functions | Full authored collision and support |
| D1 — damaged | Scoring, dents, cracks, small missing pieces | Main form and essential collision remain |
| D2 — critical | Broken panels, exposed internals, missing sections | Per-asset loss of function, support or cover |
| D3 — destroyed | Recognizable ruin, footing or bounded debris | No original function; rubble collision replaces intact collision |

Suggested initial thresholds are D1 below 67% structural health, D2 below 34%, D3 at zero. They are tuning defaults only. Named component destruction can force a state earlier, and repair must use hysteresis to avoid flickering between states at a threshold.

Do not scale an intact mesh down or make it transparent to represent damage. D2 and D3 need deliberate geometry and their own collision. Effects such as sparks, smoke, fire and holograms are runtime systems; destruction removes or changes emitters without baking permanent effects into GLBs.

| Asset family | D1 | D2 | D3 | Navigation consequence |
| --- | --- | --- | --- | --- |
| Standard wall | Cracked armor, exposed bolts | Missing panel with an authored breach | Broken footing and low rubble | Open passage only if the damaged collider clears the agent envelope |
| Heavy wall | Chipped outer layer | Exposed reinforcing core; still blocks unless a breach variant is chosen | Collapsed mass with larger debris | Heavy-wall D2 need not behave like standard-wall D2 |
| Gate | Damaged leaf; frame intact | One leaf jammed or torn off | Collapsed frame and debris | Damage can open or obstruct passage; choose by saved variant, never assume open |
| Barracks / clinic / warehouse | Local facade damage | Missing roof section and exposed room | Recognizable shell and floor ruin | Entrances, interior walkable area and roof support update separately |
| Watchtower / crane | Bent braces | Failed upper component | Base wreck and fallen upper assembly | Falling assembly uses a bounded, reserved debris envelope |
| Road / launch pad | Scored surface | Broken sections | Cratered patch | Walking, driving and landing use independent surface-validity tests |
| Crate / locker | Dented shell | Split shell | Fragments or small empty pallet | Contents are consumed/dropped once through persistent inventory state |
| Utility machine | Damaged casing | Disabled exposed mechanism | Inert chassis | Service graph disconnects; neighboring buildings remain structurally independent |
| Fictional mine / sensor | Cracked casing | Disabled housing | Inert fragments | Active, armed, spent and destroyed are distinct game states |
| Sign / hologram projector | Flickering or bent emitter | Broken emitter | Small debris | Physical emitter is destructible; projected image disappears |
| Pier / deck support | Cracked support | Reduced support capacity | Failed support | Re-evaluate only dependent structures |

Each asset's exact D2 behavior must be set in metadata. The catalog's damage profiles are family defaults; the heavy-wall and gate rules above override generic wall descriptions. Authoring cannot infer functional rules from a material color.

Damage direction selects a compatible fracture variant: north/east/south/west or a small set of impact-side masks. Mirror or rotate only when ports, recognizable graphics and asymmetric equipment still match. Keep plot origin, surviving connection locations and attachment identifiers consistent across D0–D3.

## 8. State, physics and repair

Store structural damage separately from operation (`powered`, `unpowered`, `active`, `disabled`, `spent`) and deployment (`folded`, `deployed`, `anchored`). A powered-off D0 gate is still intact. A spent field device is not necessarily destroyed. A roof attachment can fail before its parent shell.

Destruction processing order:

1. Apply the authoritative damage event to a persistent instance/component ID.
2. Choose the new state and seeded fracture variant once.
3. Swap render and collision state; remove invalid sockets and emitters.
4. Re-evaluate support descendants in topological order.
5. Update the affected navigation regions and utility edges.
6. Award/drop inventory at most once; spawn a limited debris/effect budget.

Use local rigid debris briefly, then convert it to a cheap static ruin or remove insignificant pieces. Small decorative damage may use GPU effects while still storing a logical destroyed state. Do not keep dozens of physics bodies alive for every ruined wall. Large debris must not appear outside its declared envelope.

An intact generated base must satisfy all required connectivity checks. A damaged base may intentionally lose routes and services. Report those failures to gameplay and repair planners; do not automatically reject the damaged state or repair it behind the player's back.

Repair restores components through declared reverse transitions, reserves the plot, and checks whether units or objects occupy the rebuilding volume. Rebuilding must not trap a character inside a restored wall or duplicate lost crate contents.

## 9. Spherical-board adaptation

Keep each prefab in a local tangent frame with +Y aligned to surface normal. Small rigid structures sit on fitted foundation adapters; do not bend buildings to the planet. Tile corner positions must be sampled/projected on the sphere, and edge distances/heights checked against connector tolerances. Large sites may require multiple terraced local patches connected by authored ramps or bridges.

The planar catalog does not guarantee gap-free spherical placement at every planet radius. The generator must reject a plot if terrain variation or curvature exceeds the foundation's allowed fit, or choose a terraced layout. All path, aim, collapse and attachment transforms use the local surface frame rather than world Y.

## 10. Export and production plan

Suggested paths: `base/<asset_id>/<asset_id>_d0.glb` through `_d3.glb`. Build a prefab manifest that selects exactly one state; do not render all four at once. Shared wreck modules and trim-sheet materials can reduce unique art work, but each asset still needs explicit collision and state definitions.

Suggested nodes: `ROOT`, `STRUCTURE`, `COMPONENT_<name>`, `SOCKET_<type>_<id>`, `COLLIDER_<id>`, `VFX_<id>`. Keep authored damage colliders in an engine-side companion file or export them as tagged helper meshes removed from rendering. Articulated gates, crane booms and existing sentries retain their moving nodes. Named parts allow separate component health without full fracture simulation.

The existing 33 sentry models remain weapon assets. `defense_sentry_socket`, `defense_artillery_socket` and `defense_a6_dock` are new base-side adapters, not duplicate weapons. Test the weapon's entire yaw, pitch, recoil or leg-deployment swept volume; a fitting foundation alone is not enough. Existing sentries also need destruction variants if the whole assembled scene is to satisfy the new destructibility requirement.

Start with **22 asset types** for an assembly proof: flat foundation, road straight/corner/T/turnaround, walk straight/corner/T, wall standard/corner, vehicle gate, command nexus, barracks, infirmary, warehouse, workshop, reactor, substation, conduit, junction, general crate and sentry emplacement. Build D0 first, then wall/road D1–D3 and one building's full damage chain before producing every variant. This stage is deliberately an assembly prototype, not a complete life-support base.

The full 109-type catalog implies **436 state definitions** at four states per type. That is not necessarily 436 unique GLBs: minor props can share fragments, and modular buildings can reuse damaged components. Cosmetic and equipment variants multiply the workload further. Do not create three equipment tiers for every bench, road or crate unless the game needs them.

## 11. Validation checklist for the future generator

- Unique IDs, deterministic seeded selections and no plot/clearance overlaps.
- Every connection matches type, opposite direction, width, elevation and agent class.
- Required roads, footpaths, gates and entrances are reachable in D0.
- Vehicle turns, door motion, crane sweeps, landing approaches and sentry articulation fit.
- Boundary loops close; allowed openings have explicit scenario roles.
- Each consumer has reachable supply; support dependencies are acyclic and sufficient.
- Every physical asset resolves D0–D3, collision behavior and attachment consequences.
- Wall breaches and rubble are tested with actual agent envelopes, not just visual gaps.
- Save/load reproduces damage variants and does not duplicate inventory drops.
- Spherical sites pass height, curvature and connector-fit checks.
