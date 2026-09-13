# ISAO-Birudorōn / ビルドローン

ISAO is the Japanese-built airborne construction specialist that assembles Stålheart before the Terraformer fabricates MÖRK vehicles. The name is a joke on ビルドローン—“build drone.” This folder contains a new production-alpha character family and preserves the supplied draft unchanged as its initial concept.

[Interactive production viewer](../../isao-birudoron/) · [Detailed LOD0](isao_birudoron_lod0.glb) · [Game LOD1](isao_birudoron_lod1.glb) · [Preserved concept](isao_birudoron_initial_concept.glb) · [Concept sheet](isao_birudoron_concept_sheet.png)

## Production-alpha delivery

Both authored tiers use metres, +Y up, +Z forward and `ISAO_ROOT` at ground level. Plain GLB is the source of truth; no compressed derivative is supplied at this alpha stage. The two tiers share the same functional engine hierarchy, socket identifiers, clip names and animation pivots.

| Tier | Purpose | Triangles | Draw calls | Plain bytes | Materials | Textures | Animations |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| LOD0 | Detailed master / close shots and recording | 34,116 | 89 | 2,485,808 | 11 | 0 | 12 |
| LOD1 | Reduced game and animation review tier | 12,512 | 39 | 1,171,336 | 7 | 0 | 12 |

LOD0 dimensions are 1.758 × 1.665 × 1.281 m; LOD1 is 1.758 × 1.665 × 1.275 m. The 12,512-triangle game tier remains below the 25,000-triangle unit guideline. LOD0 is the richer recording master and is not intended for runtime use. The game tier’s 39 draw calls and the detailed tier’s 89 are explicit optimization targets before final integration; no performance or FPS improvement is claimed.

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

Amber covers Neutral, Curious, Skeptical and Determined; green covers Happy and adjacent positive states; red covers Alarm and angry-adjacent states; purple covers Sad; cyan is reserved for functional Working feedback; pink is used only for the rare Love performance.

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
| `Tool_Fabricate` | 2.0 s | Loop | Nozzle yaw, pitch and extension |

Do not bake engine-driven pivots. Combine `Rotor_Cycle` and `Hover_Idle` with one emotion clip; trigger `Tool_Fabricate` when ISAO is actively assembling Stålheart. Animation transitions, collision policy and the exact Terraformer assembly interaction still require gameplay review.

## Preserved initial concept

`isao_birudoron_initial_concept.glb` is the supplied `isao_draft_01.glb`, preserved byte-for-byte rather than rewritten to appear compliant. It measures 4,174 triangles, 28 draw calls, 451,336 bytes, 66 nodes, 28 materials and no embedded animation clips. glTF Validator reports zero errors and zero warnings.

The draft has 26 unnamed mesh nodes, no gameplay sockets or damage states, and its visible limb meshes are not parented to its nominal leg pivots. It faces local -Z instead of project +Z. The viewer’s procedural face fix uses the draft’s UV orientation correctly, so its expressions no longer appear upside down; this viewer-only correction does not mutate the preserved file.

## Known alpha work

- Review silhouette, proportions, expression vocabulary and MÖRK/KORP family resemblance in game context.
- Consolidate geometry/material primitives to reduce draw calls, especially on LOD0.
- Define colliders and D1–D3 damage-state identifiers without treating damage as LOD.
- Add a static LOD2 only if the actual camera or loading sequence demonstrates a need.
- Decide animation blending, foot/claw interaction and Stålheart assembly timing with the game developer.

## Rebuild and validation

The editable master is `source/blender/isao-birudoron.blend`; `tools/blender/build_isao_birudoron.py` is the reproducible procedural authoring/export script. `tools/blender/render_isao_birudoron.py` creates the neutral-pose QA render used for the gallery preview.

```sh
blender --background --factory-startup --python tools/blender/build_isao_birudoron.py
blender --background --factory-startup --python tools/blender/render_isao_birudoron.py
node tools/asset-pipeline/validate-isao-birudoron.mjs
```

The validation checks hashes and measured geometry, glTF errors/warnings, degenerate triangles, bounds, ground/root placement, sockets, hierarchy parity, unique dot-free names, clip names and durations, expression/limb bindings, tool and rotor targets, texture counts and budget ceilings.

Production GLB SHA-256 values:

- LOD0: `daefd51e032ba51f61c2153ba8e24287fafc0eaf537da30cf6af987818a7b488`
- LOD1: `cb0289d331da02da64673c05ce6483c8a26d80a8033e3d75e2c052f73f81d6b9`
- Preserved concept: `7beda296d8dc630ca2ee4b5474125dfac145138bf6d7905e948b033e5f98cc71`
- Concept sheet: `e23b59b06d12985fa8f7c02c9877a517db5dd45ee07a1febdc6729f934fcf481`
