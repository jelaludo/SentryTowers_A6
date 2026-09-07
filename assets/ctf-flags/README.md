# A6 capture-the-flag kit

Six original texture-free banners with angular modeled insignia, three pole styles, and a modular capture socket.

| Faction | Banner | Pole |
| --- | --- | --- |
| Ember | Crimson, stylized 火 (fire) | Beacon |
| Vanguard | Cobalt, stylized 力 (strength) | Tactical |
| Eclipse | Violet, broken orbit and star | Spire |
| Helix | Green, intertwined angular strands | Beacon |
| Horizon | Amber, rising chevron and horizon | Tactical |
| Void | Graphite, four-point diamond | Spire |

[Interactive preview](../../ctf-flags/) · [Editable Blender scene](../../source/blender/a6-ctf-flags.blend)

Each `flag_*.glb` is a complete assembly. The three `pole_*.glb` files contain poles without fabric or bases; `capture_socket.glb` is the reusable base. Units are metres, +Y up, +Z facing the front of the banner. Poles are about 3.3 m tall; fabric is 1.7 × 1.05 m with a notched fly edge. Reverse-side emblems are mirrored, as on a sewn-through flag.

Every flag contains a nine-joint skinned cloth mesh and four two-second animations:

- `Flutter`: subtle seamless wind loop.
- `Gust`: stronger seamless wind loop.
- `Raise`: one-shot movement from the lowered position to the top.
- `Lower`: one-shot movement from the top to the lowered position.

Set Raise/Lower to play once and clamp at the final frame. Use one clip at a time or a controlled crossfade. These are authored wind motions, not runtime cloth simulation. Emblem triangles are split at skin deformation boundaries to keep the markings attached to the fabric without image textures.

Preserve `ROOT`, `BASE`, `CARRY`, `HOIST`, `FLAG_RIG`, and `FLAG_CLOTH`. Hide `BASE` when carried and attach/transform `CARRY` to a character grip. The cloth mesh lives at scene root for glTF skin compatibility; its skeleton follows `CARRY`. Keep both the mesh and skeleton when instancing or moving the asset, and use a skeleton-aware clone in Three.js. `HOIST` is available as a fabric attachment transform; authored raising/lowering is baked into the cloth joints.

The preview provides pick-up, capture (+1), return, timeline scrubbing, and a six-faction comparison. Those scoring and attachment states are demonstration JavaScript, not game rules stored in the GLB. The three pole designs share the same flag attachment dimensions.

Rebuild and validate from the repository root:

```sh
blender --background --python-exit-code 1 --python tools/blender/build_ctf_flags.py
node tools/asset-pipeline/validate-ctf-flags.mjs
```

The manifest records individual files and sizes. Validation checks all ten GLBs, required transforms, clip names, wind deformation, seamless loop bounds, raise/lower displacement, and ground clearance.
