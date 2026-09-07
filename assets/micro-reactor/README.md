# A6 open micro-reactor

Five families, each with D0 intact, D1 damaged, D2 critical and D3 destroyed states: the complete open reactor complex, exposed core, coolant manifold, heat exchanger and control skid.

The complex deliberately leaves the reactor systems readable: the fuel lattice and control rods sit inside open vessel rings; four coolant risers and a copper manifold surround it; the heat exchanger uses exposed tubes and fin racks; and the instrument skid has three monitors, emergency stops and an exposed control cable. A lightweight safety gantry frames the installation without boxing the machinery into a generic building.

D3 remains specific to the intact design. It retains fuel lattice fragments, vessel arcs, fallen/bent control rods, ruptured coolant lines with copper strands, broken exchanger tubes and fins, detached monitors, exposed cable and fallen gantry pieces. It does not replace the reactor with generic rubble.

All assets use meters, +Y up, +Z forward, and a common plot origin. GLBs are uncompressed first-pass exports. Socket and collision metadata are planning helpers; engine radiation, heat, pressure, coolant flow, control logic, safety interlocks and runtime fracture remain integration work.

Preview: `micro-reactor/`. Editable source: `source/blender/a6-micro-reactor.blend`. Rebuild with `blender --background --python-exit-code 1 --python tools/blender/build_micro_reactor.py`; validate with `node tools/asset-pipeline/validate-micro-reactor.mjs`.
