# Hand Lab / Reference attributions

Reviewed 4 November 2026. These reference models remain separate from the original AUREL-01 geometry. The pinned originals are preserved, and every browser conversion is marked `derived`. `sources.lock.json` records the source paths, commits, byte counts and SHA-256 hashes; `catalog.json` records preview measurements and modifications.

## LiberHand V1

Author and copyright: PPML-G, copyright 2025. MIT license, reproduced verbatim in `liberhand/LICENSE`.

https://github.com/PPML-Group/LiberHand_V1

Pinned commit: `816769183b53bd5dd8180a98b264471508eaf3f0`

Original: `3D Model/Liberhand_V1.STEP`, preserved as `liberhand/source/Liberhand_V1.STEP`.

Browser derivative: OpenCascade tessellation at 0.25 mm linear and 0.35 rad angular deflection, followed by a reduced mesh for inspection. The complete assembly's source placement is preserved before a documented display transform. A neutral material replaces CAD presentation, and the displayed assembly is normalized to 0.25 m high. No joints are inferred; the reference is a static assembly. This review copy is not a manufacturing replacement for the STEP original. The source project describes 15 DoF; the viewer does not implement its controls.

## LibHand / Human hand model

Model credit: Marin Šarić / LibHand, 2011.

https://github.com/libhand/libhand

https://www.libhand.org/

https://www.libhand.org/license.html

Pinned commit: `d4e85aea22cd4e591e97befb3a24ab37dcd05664`

Original: `hand_model/blender/hand.blend`, preserved as `libhand/source/hand.blend`.

The **model** is licensed under Creative Commons Attribution 3.0 Unported. Its original notice is reproduced verbatim in `libhand/MODEL-LICENSE.txt`.

https://creativecommons.org/licenses/by/3.0/

https://creativecommons.org/licenses/by/3.0/legalcode

The repository's **software** has a different permissive license with an academic citation condition. That notice is preserved in `libhand/SOFTWARE-LICENSE.txt`; no LibHand C++ or MATLAB code is bundled or used in the browser.

Changes to the model: Blender-to-GLB conversion, static geometry baked from the supplied rest rig, neutral palette materials, display orientation and normalization to 0.25 m high, plus an optional Meshopt derivative. The original articulated rig remains in the untouched `.blend`. The review GLB is a static anatomical reference, not an animated replacement for the original model. No endorsement by the original authors is implied.

## Robot Hand Anatomy / Linked reference

https://github.com/salikshah/robot-hand-anatomy

Reviewed commit: `9f5a34bfec845670dd58e438baf2b84b5302c5cb`

The repository contains `kit/LICENSE`, an MIT notice crediting Ryan for the rendering toolkit. At this revision we did not find an explicit license covering the hand-specific source, geometry or compiled figures. Its description as open source does not resolve that scope. The lab therefore includes an outbound link and a short description of its public interaction ideas. No hand-specific code, figures, screenshots, audio, video or model data are redistributed. Importing that hand remains pending clarification of the applicable permission.

## Original AUREL-01

AUREL-01 is an original procedural mechanical design by jelaludo / Model Workshop, directed by the user's supplied `handmodel.png` concept. No geometry or implementation from the three references is combined into its GLBs. The studies inform general design choices: graduated proportions, independent and coupled finger control, thumb opposition, modular joints and inspectable assemblies. The original concept image stays external; only its SHA-256 is recorded.

All imported references retain their own licenses. Do not apply a repository-wide license to these third-party models in place of their included notices.
