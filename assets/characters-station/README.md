# A6 station crew

Three original low-poly characters: astronaut (EVA armor and life support), scientist (specimen pack and wrist scanner), and worker (tool belt, work light and reinforced knees). Each wears a sealed helmet and suit. No image textures or external dependencies are needed by the GLBs.

Each GLB contains a shared 20-joint humanoid skeleton, one skinned mesh with seven material primitives, and seven looping clips: `Idle`, `Walk`, `Run`, `Kneel`, `Scared`, `Point`, and `Lie`. Geometry uses rigid vertex weights on segmented suit components with overlapping joint seals; this is a stylized articulated character rig, without facial animation or fully articulated fingers. Index fingers can point independently.

Units are metres, +Y is up, and +Z is forward. Walk and run are in-place cycles; apply game-side movement in +Z, nominally 1.15 and 3 m/s respectively. The preview's travel checkbox demonstrates this. Stop the previous animation before playing another, or use a controlled crossfade. Kneel, scared, and lying clips start in their target pose and loop; stand-to-kneel and fall transitions are not included. Terrain adaptation, collision, navigation and gameplay state transitions belong to the game.

Ground contact is authored against each character's actual armor geometry. The lying pose rests on the backpack; limbs can remain above the floor. Clips share joint names and timing across all roles, while root heights accommodate role equipment. `manifest.json` records triangle counts, file sizes, clip durations and preview speeds.

Preview: [Station crew](../../station-crew/). Editable source: [Blender scene](../../source/blender/a6-station-characters.blend).

Rebuild from the repository root:

```sh
blender --background --python-exit-code 1 --python tools/blender/build_station_characters.py
node tools/asset-pipeline/validate-station-characters.mjs
```

Validation checks glTF validity, normalized skin weights, matching skeletons, all seven clips, loop seams, sampled deformed ground contact, lowered kneeling/lying poses, and forward gait mechanics. The browser preview supports pause, scrubbing, speed, skeleton display, and movement testing.
