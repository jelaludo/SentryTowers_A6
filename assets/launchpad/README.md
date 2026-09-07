# HUGIN / Reusable launch and cargo recovery

An A6 launch complex with a roughly 24 m reusable entry vehicle, three broad flat landing feet, three open engine bells, radial descent fins, launch hold-downs, an exhaust opening/deflector trench, pressure tanks, a flight-control shelter and a 33 m launcher/recovery tower. The upper cargo capsule has its own separation collar, capture ring, access hatches and optical windows.

The tower carries an elevator-mounted two-link mechanical arm with a counter-rotating wrist and opposing capture fingers. The 20-second `Cargo_Recovery_Cycle` closes the fingers, lifts the cargo portion off the landed booster, swings it to the receiving apron, lowers it onto the pedestal, and returns it to the booster. The booster stays landed throughout this demonstration.

- **D0 / Intact:** full cargo recovery sequence.
- **D1 / Damaged:** heat scars, impact fragments and warning telemetry; operating.
- **D2 / Critical:** ruptured booster hull, stalled catcher, damaged finger, tilted cargo and a severed service cable; disabled.
- **D3 / Destroyed:** open broken booster shell, detached flat feet, fallen recovery boom, cargo capsule wreck and torn tower conduits; disabled.

[Interactive preview](../../launchpad/) includes D0–D3 selection, timeline/speed controls, capture/lift/transfer/unload shortcuts, neutral materials and socket/collision overlays. A 1.8 m worker provides scale. [Editable Blender source](../../source/blender/a6-launchpad.blend) contains the four states in a comparison gallery; only D0 is enabled for the hero render by default.

```sh
blender --background --python-exit-code 1 --python tools/blender/build_launchpad.py
node tools/asset-pipeline/validate-launchpad.mjs
```

Outputs: `source/blender/a6-launchpad.blend`, four `hugin_launchpad_d0.glb` through `hugin_launchpad_d3.glb` files, `manifest.json` and `hugin-preview.png`. The background builder does not replace an open artist scene.

Units are meters. Blender is Z-up; GLBs use Y-up and +Z forward. All destruction states share a ground-centered origin and a 40 × 40 m reserved plot. Preserve the motion hierarchy:

`ROOT → CATCHER_LIFT → CATCHER_SHOULDER → CATCHER_ELBOW → CATCHER_WRIST → CARGO_CAPSULE`

The two `CAPTURE_JAW_*` transforms also belong to the wrist. `REUSABLE_BOOSTER` and its three `LANDING_LEG_*` transforms remain separate. The feet are authored deployed and flat; no landing-leg retraction animation is included.

This is an authored cargo-handling demonstration, not a simulated airborne catch or launch. The capsule stays parented to the catcher for consistent visual contact. Runtime detachment/reattachment, flight and launch dynamics, collision avoidance, exhaust VFX, physical hoses, damage switching and fracture simulation remain engine integration work. Collision metadata is a coarse planning aid. Models remain modular for editing and are not production-optimized.
