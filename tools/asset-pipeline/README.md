# GLB research pipeline

Install the pinned dependencies with `npm install` in this directory. Run `node optimize.mjs INPUT.glb OUTPUT_DIRECTORY` to generate the astronaut balanced/compact presets and a measurement report. The script preserves source asset attribution and existing animations. It does not create new animation clips.

The geometry reduction uses [glTF Transform simplify](https://gltf-transform.dev/modules/functions/functions/simplify), with a target ratio and error ceiling; mesh topology may prevent reaching the ratio. Texture processing uses [textureCompress](https://gltf-transform.dev/modules/functions/functions/textureCompress). Meshopt compression requires a decoder in the consuming application.

The current file names and presets target the astronaut. Add explicit profiles when processing future characters rather than overwriting an existing character's outputs. Add new exported assets to `animation-tests/catalog.json` to expose them in the shared viewer.
