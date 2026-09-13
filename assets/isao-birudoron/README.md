# ISAO-Birudorōn / ビルドローン

Initial concept for the airborne construction specialist that assembles Stålheart. The name is a joke on ビルドローン—“build drone.” ISAO Robotics is the working in-world Japanese manufacturer identity; it can change during the production redesign.

[Interactive concept study](../../isao-birudoron/) · [Preserved concept GLB](isao_birudoron_initial_concept.glb) · [Concept sheet](isao_birudoron_concept_sheet.png)

## Delivery status

This folder preserves the supplied `isao_draft_01.glb` byte-for-byte as an **initial concept**, not as a compliant master or game export. The runtime face and motion in the browser viewer are procedural presentation code; the GLB contains no animation clips.

| Measurement | Initial concept |
| --- | ---: |
| Triangles | 4,174 |
| Draw calls / mesh primitives | 28 |
| Plain GLB bytes | 451,336 |
| Nodes | 66 |
| Materials | 28 |
| Embedded textures | 1 × 144 px PNG / 6,144 bytes |
| Animations | 0 |
| Bounds | 0.830 × 0.553 × 0.684 m |

glTF Validator reports zero errors and zero warnings. There are no degenerate triangles. The file stays within the unit triangle guideline, but 28 draw calls are unnecessarily high for this small character.

## Current hierarchy and limitations

`isao_Game_Root` contains the visual concept. Useful pivots already exist for all four rotors and the tool chain: `Boom_Yaw → Boom_Pitch → Head_Pitch → Nozzle_Tip`. Four `Leg_*` pivot chains are named and dot-free, but the visible limb meshes are merged beneath `AuxScene` rather than parented to them. Rotating those leg nodes therefore does not articulate the rendered legs.

The concept has 26 unnamed mesh nodes, no gameplay sockets, collision proxies, damage states or production LODs. Its face points local -Z, while the project contract requires +Z forward. The root is almost at ground level (minimum Y -0.0033 m). These issues are documented instead of mutating the original.

## Emotion study

The design rule is **LED expression plus physical performance**. The viewer demonstrates that intent with runtime LED pixels, hover lean and tool-head gestures for Neutral, Happy, Curious, Working and Alarm. It also spins the rotors procedurally. These are neither baked clips nor proof of limb animation in the supplied model.

The production model should make the four limbs the main secondary performance channel: open posture and lifted wrists for happiness; asymmetric reach for curiosity; braced alternating work poses; tucked elbows and backward recoil for alarm. LED color and glyphs reinforce the pose rather than carrying the emotion alone.

## Production remake contract

The remake should look as though the MÖRK/KORP designer built a compact service character: faceted graphite armor, recessed cyan lift and tool hardware, restrained amber service labels, purposeful chamfers and a durable inset LED panel. Keep the friendly silhouette and central fabrication nozzle without copying the concept topology.

Required stable, unique, dot-free transforms include:

- `ISAO_ROOT`, `BODY_PITCH`, `LED_PANEL`
- `ROTOR_FL`, `ROTOR_FR`, `ROTOR_RL`, `ROTOR_RR`
- `LEG_FL_HIP`, `LEG_FL_KNEE`, `LEG_FL_CLAW`, repeated for FR, RL and RR
- `TOOL_YAW`, `TOOL_PITCH`, `TOOL_HEAD`, `TOOL_TIP`
- `CARGO_GRIP` and `TERRAFORMER_ASSEMBLY_ORIGIN` sockets

Planned clips and explicit target durations—requirements, not delivered content—are:

| Clip | Duration | Playback |
| --- | ---: | --- |
| `Hover_Idle` | 4.0 s | Loop |
| `Emotion_Neutral` | 4.0 s | Loop |
| `Emotion_Happy` | 1.6 s | One-shot |
| `Emotion_Curious` | 2.4 s | Loop |
| `Emotion_Working` | 2.0 s | Loop |
| `Emotion_Alarm` | 1.2 s | One-shot |

Deliver a detailed LOD0 master for close shots and recording plus a reduced LOD1 game unit at or below the 25,000-triangle unit target. Preserve moving pivots and socket placement between them. A static LOD2 is conditional: the project contract does not normally distance-swap units, so add one only if the actual game camera or loading sequence benefits. Damage states, collider policy, final dimensions, animation transitions and Terraformer assembly interaction still need game-developer agreement.

## Provenance and validation

The preserved GLB SHA-256 is `7beda296d8dc630ca2ee4b5474125dfac145138bf6d7905e948b033e5f98cc71`. The supplied concept sheet SHA-256 is `e23b59b06d12985fa8f7c02c9877a517db5dd45ee07a1febdc6729f934fcf481`. `assets/workshop/isao-birudoron.jpg` is a derived 800 px gallery preview; the PNG remains the reference source. See the repository `ATTRIBUTIONS.md` for the recorded hand-off provenance.

Validate from the repository root:

```sh
cd tools/asset-pipeline
npm install
node validate-isao-birudoron.mjs
```
