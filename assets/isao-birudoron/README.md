# ISAO-Birudorōn / ビルドローン

ISAO is the Japanese-built airborne construction specialist that assembles Stålheart before the Terraformer fabricates MÖRK vehicles. The name is a joke on ビルドローン—“build drone.” This folder contains a new production-alpha character family and preserves the supplied draft unchanged as its initial concept.

[Interactive production viewer](../../isao-birudoron/) · [Detailed LOD0](isao_birudoron_lod0.glb) · [Game LOD1](isao_birudoron_lod1.glb) · [Static LOD2](isao_birudoron_lod2.glb) · [Preserved concept](isao_birudoron_initial_concept.glb) · [Concept sheet](isao_birudoron_concept_sheet.png)

## Production-alpha delivery

All three authored tiers use metres, +Y up, +Z forward and `ISAO_ROOT` at ground level. Plain GLB is the source of truth; no compressed derivative is supplied at this alpha stage. LOD0 and LOD1 share the functional hierarchy, socket identifiers, clip names and animation pivots. LOD2 retains the same named control/socket empties for lookup, but its single merged visible mesh is explicitly static.

| Tier | Purpose | Triangles | Draw calls | Plain bytes | Materials | Textures | Animations |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| LOD0 | Detailed master / close shots and recording | 45,780 | 99 | 3,362,660 | 11 | 0 | 17 |
| LOD1 | Reduced game and animation review tier | 17,264 | 49 | 1,570,944 | 7 | 0 | 17 |
| LOD2 | Static distant-flight / background tier | 1,800 | 1 | 177,028 | 1 | 0 | 0 |

LOD0 dimensions are 1.758 × 1.665 × 1.281 m; LOD1 is 1.758 × 1.665 × 1.275 m; LOD2 is 1.758 × 1.665 × 1.266 m. The 17,264-triangle game tier remains below the 25,000-triangle unit guideline. LOD0 is the richer recording master and is not intended for runtime use. The game tier’s 49 draw calls and the detailed tier’s 99 are explicit optimization targets before final integration; no performance or FPS improvement is claimed. The increase from the earlier alpha is the measured cost of five new performances and their alternate LED meshes.

LOD2 exists because ISAO is normally seen beyond facial readability. It keeps the recognizable body, four protected rotors, hanging limbs, center nozzle, stable root/control/socket names and a single cyan functional panel signal. Its visible geometry is one static vertex-colour mesh: facial dots, limb acting, rotor clips and nozzle animation are intentionally omitted. The engine may translate and rotate `ISAO_ROOT`; swap to LOD1 before the face or limb performance becomes readable. Tune that swap by projected screen size on reference hardware, not the landmark 150 m threshold.

The remake retains the inset LED face, four-limb silhouette and central construction tool while translating the shell into the MÖRK/KORP family: faceted graphite armor, recessed cyan lift and tool hardware, protected rotor rings, amber maker/service marks, sturdy chamfers and exposed mechanical joints. This is a production alpha for art-direction and gameplay review, not a final or `game_ready` asset.

## Rig, sockets and performance

The visible geometry is parented to stable, unique, dot-free engine transforms. Key chains are:

- `ISAO_ROOT → BODY_PITCH → LED_PANEL → FACE_*`
- `ROTOR_FL_MOUNT → ROTOR_FL_SPIN`, repeated for FR, RL and RR
- `LEG_FL_HIP → LEG_FL_KNEE → LEG_FL_CLAW`, repeated for FR, RL and RR
- `TOOL_NOZZLE_YAW → TOOL_NOZZLE_PITCH → TOOL_NOZZLE_EXTEND → TOOL_HEAD → TOOL_TIP`

Gameplay sockets are `SOCKET_LIFT_FL/FR/RL/RR`, `SOCKET_CLAW_FL/FR/RL/RR`, `SOCKET_CENTER_OF_MASS`, `CARGO_GRIP`, `TOOL_TIP` and `TERRAFORMER_ASSEMBLY_ORIGIN`. Positions are measured in [manifest.json](manifest.json) and match across the production tiers.

Every emotion clip combines four performance channels: LED dot pattern, LED pattern animation where useful, limb/body animation and emotion-family color. The face is not the whole performance. The neutral face is the exported rest expression.

The Curious scan adapts the readability principle from Braille Lab: the mouth and eye framing remain fixed while only the pupils travel left–center–right. ISAO uses original 8 × 6 LED glyphs rather than Braille cells or encoded characters. Reference:

https://kai-denrei.github.io/braille-lab/emotions/index.html

Amber covers Neutral, Curious, Skeptical, Determined and Surprised; green covers Happy, Glee and adjacent positive states; red covers Alarm, Angry and adjacent states; purple covers Sad, Worried and Sleepy; cyan is reserved for functional Working feedback; pink is used only for the rare Love performance. Neutral is deliberately flat: two level eyes and a level four-dot mouth.

LED state changes use glTF `STEP` interpolation. Hidden states are truly zero-scale and each sampled emotion frame has exactly one full-size visible face, preventing the former shrink-through-miniature glitch between glyphs. Body and limb channels retain smooth interpolation.

| Clip | Duration | Playback | Main channels |
| --- | ---: | --- | --- |
| `Rotor_Cycle` | 1.0 s | Loop | Four rotor spin pivots |
| `Hover_Idle` | 4.0 s | Loop | Body hover and pitch |
| `Emotion_Neutral` | 4.0 s | Loop | Neutral LED state |
| `Emotion_Happy` | 1.6 s | One-shot | Green smile and open limb gesture |
| `Emotion_Curious` | 2.4 s | Loop | Amber pupil scan and asymmetric reach |
| `Emotion_Working` | 2.0 s | Loop | Cyan working glyph and braced limb rhythm |
| `Emotion_Alarm` | 1.2 s | One-shot | Red alarm glyph and recoil |
| `Emotion_Determined` | 2.0 s | Loop | Amber focus glyph and four-limb brace |
| `Emotion_Sad` | 3.2 s | Loop | Purple frown, body droop and tucked wrists |
| `Emotion_Skeptical` | 2.4 s | Loop | Amber brow shift, side lean and wrist tap |
| `Emotion_Love` | 2.2 s | One-shot | Rare pink heart pulse and self-hug |
| `Emotion_Glee` | 1.8 s | Loop | Alternating green sparkle smile, buoyant body bounce and open limbs |
| `Emotion_Worried` | 2.4 s | Loop | Purple quivering eyes, tremor and tucked limbs |
| `Emotion_Angry` | 1.6 s | Loop | Red glare/teeth alternation, forward shake and clenched manipulators |
| `Emotion_Surprised` | 1.4 s | One-shot | Amber blink-to-wide face, fast recoil and limbs thrown open |
| `Emotion_Sleepy` | 4.0 s | Loop | Purple eyelid cycle, slow nod and hanging limbs |
| `Tool_Fabricate` | 2.0 s | Loop | Nozzle yaw, pitch and extension |

Do not bake engine-driven pivots. Combine `Rotor_Cycle` and `Hover_Idle` with one emotion clip; trigger `Tool_Fabricate` when ISAO is actively assembling Stålheart. Animation transitions, collision policy and the exact Terraformer assembly interaction still require gameplay review.

## Preserved initial concept

`isao_birudoron_initial_concept.glb` is the supplied `isao_draft_01.glb`, preserved byte-for-byte rather than rewritten to appear compliant. It measures 4,174 triangles, 28 draw calls, 451,336 bytes, 66 nodes, 28 materials and no embedded animation clips. glTF Validator reports zero errors and zero warnings.

The draft has 26 unnamed mesh nodes, no gameplay sockets or damage states, and its visible limb meshes are not parented to its nominal leg pivots. It faces local -Z instead of project +Z. The viewer’s procedural face fix uses the draft’s UV orientation correctly, so its expressions no longer appear upside down; this viewer-only correction does not mutate the preserved file.

## Known alpha work

- Review silhouette, proportions, expression vocabulary and MÖRK/KORP family resemblance in game context.
- Consolidate geometry/material primitives to reduce draw calls, especially on LOD0.
- Define colliders and D1–D3 damage-state identifiers without treating damage as LOD.
- Tune and measure the LOD2→LOD1 projected-size threshold in the actual game camera and reference hardware.
- Decide animation blending, foot/claw interaction and Stålheart assembly timing with the game developer.

## Rebuild and validation

The editable animated master is `source/blender/isao-birudoron.blend`; the static reduction source is `source/blender/isao-birudoron-distance.blend`. `tools/blender/build_isao_birudoron.py` authors LOD0/1, while `tools/blender/build_unit_distance_lods.py` regenerates LOD2 from the game tier. `tools/blender/render_isao_birudoron.py` creates the neutral-pose QA render used for the gallery preview.

```sh
blender --background --factory-startup --python tools/blender/build_isao_birudoron.py
blender --background --factory-startup --python tools/blender/render_isao_birudoron.py
blender --background --factory-startup --python tools/blender/build_unit_distance_lods.py
node tools/asset-pipeline/validate-isao-birudoron.mjs
node tools/asset-pipeline/validate-unit-distance-lods.mjs
```

The validation checks hashes and measured geometry, glTF errors/warnings, degenerate triangles, bounds, ground/root placement, sockets, hierarchy parity, unique dot-free names, clip names and durations, expression/limb bindings, tool and rotor targets, texture counts and budget ceilings. It also checks that every LED scale sampler is `STEP`, hidden rest states are exactly zero-scale and every sampled emotion frame resolves to one full-size face with no miniature intermediate.

Production GLB SHA-256 values:

- LOD0: `5d0c92c62745d4c956d0aea2a346cfa71cd33829579f3e9f4da299d84878e073`
- LOD1: `2e9a389a4729f625fa9a7fd018bad8b78db86ac3254ebdcff9df230fba344088`
- LOD2: `f486b8f3e267bb8a6c333cf629872178a3c70e2a8517aa3ebb8c6081376f9baf`
- Preserved concept: `7beda296d8dc630ca2ee4b5474125dfac145138bf6d7905e948b033e5f98cc71`
- Concept sheet: `e23b59b06d12985fa8f7c02c9877a517db5dd45ee07a1febdc6729f934fcf481`
