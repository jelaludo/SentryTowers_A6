# A6 robotic assembly line

Six families, each with D0 intact, D1 damaged, D2 critical and D3 destroyed geometry:

- **Robotic assembly line:** 20 × 32 m reserved plot, 24 m conveyor, eight robots (four per side), three overhead gantries, four rover chassis fixtures, three parts feeders, and raised human control station.
- **Articulated service arm:** waist, shoulder, elbow, wrist and two gripper fingers; local transform hierarchy ready for engine control.
- **Conveyor module:** 4 m belt segment, closed tread return path, two drive drums and motor casing.
- **Control platform:** three monitors, keyboard, emergency stops, stool, handrails and access ramp. Ramp rise 0.8 m over 4 m, clear lane 1.6 m.
- **Gantry module:** columns, overhead braced truss, cable tray, inspection light and carriage.
- **Assembly pallet:** rover chassis on a manufacturing fixture.

Preview: `assembly-line/`. Editable Blender gallery: `source/blender/a6-assembly-line.blend`. Rebuild the detailed sources using `tools/blender/build_assembly_line.py`; validate them using `node tools/asset-pipeline/validate-assembly-line.mjs` after installing the asset-pipeline dependencies. The complete line now also has D0–D3 contract-candidate LOD1/LOD2 exports documented in `README-LODS.md` and `manifest-lods.json`.

D0/D1 line, arm and conveyor GLBs include an eight-second `Assembly_Cycle` clip. The eight robots carry gripper, welding torch, fastener driver and optical inspection heads, with phase-offset motions. D2/D3 are disabled static states. All states have the same plot origin; dimensions are meters, +Y up and +Z forward. Conveyor socket height is 1.18 m and belt width is 2.05 m; opposing ports snap 4 m modules end-to-end.

This is a choreographed art prototype. Workpieces stay in their fixtures while robots cycle; this is not a synchronized production simulation. Welding light, material transfer, inventory, collision avoidance and safety interlocks are engine-side work. Damage is a render-state swap, not runtime fracture. Colliders are conservative planning proxies, including robot sweep volumes. The ramp has continuous visible slope geometry but needs an engine slope/mesh collider. The complete line's access socket is at the foot of the ramp, inside the reserved plot; external path routing must reach that socket through the marked service area.

The intact detailed source preserves separate objects and named robot pivots. The derived D0/D1 LOD1 complete line keeps the eight useful robot rigs in one rigid-weighted skinned mesh, adds one continuous named belt mesh and protects three simple gantry silhouettes. Detailed rover workpieces and individual tread/roller animation are omitted; apply one engine-side shader to `CONVEYOR_BELT_LOD1` if belt travel must read. LOD2 is a static one-draw silhouette tier. Reusable standalone modules remain detailed originals and are not silently represented as reviewed runtime LODs.
