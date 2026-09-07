# Reckon-Guard / RG-01

Original low-poly reconnaissance and ground-defense helo-drone. A faceted midnight-teal fuselage carries two open ducted lift fans, swept tail fins, paired forward optics, navigation lights, landing skids and a ventral pulse-projectile cannon. No textures are required.

[Interactive preview](../../reckon-guard/) · [GLB](reckon_guard.glb) · [Editable Blender source](../../source/blender/a6-reckon-guard.blend)

Metres; +Y up; +Z forward. Preserve `ROOT`, `ROTOR_L`, `ROTOR_R`, `GIMBAL`, `RECOIL`, and `MUZZLE_00`. Static geometry is merged by parent and material to reduce draw calls. The `RotorSpin` clip turns the counter-rotating fans one revolution per second; adjust playback speed in the engine. Fan rotation uses local Y in glTF.

The weapon rests 55° below horizontal. Aim `GIMBAL`'s local +Z toward a ground target; use a nominal 20–85° downward aiming envelope in gameplay. `RECOIL` moves backward along local -Z. Spawn projectiles at `MUZZLE_00`'s world position along its local +Z world direction. These axes describe the exported GLB; Blender source is Z-up / -Y-forward.

The preview demonstrates hover, target tracking, recoil, projectile travel and impacts against three stationary pads at 2–5 m altitude. Those behaviors are JavaScript demonstrations, not additional baked GLB animations or a flight/ballistics simulation. Targets darken on hits and can be reset. Damage states, collision proxies and navigation logic are not included in this model.

Rebuild and validate from the repository root:

```sh
blender --background --python-exit-code 1 --python tools/blender/build_reckon_guard.py
node tools/asset-pipeline/validate-reckon-guard.mjs
```
