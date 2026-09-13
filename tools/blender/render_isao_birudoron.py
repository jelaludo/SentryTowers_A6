"""Render the current ISAO production alpha for visual review and gallery use."""
import bpy
import os
from pathlib import Path
from mathutils import Vector

P = Path(__file__).resolve().parents[2]
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(P / "assets/isao-birudoron/isao_birudoron_lod0.glb"))
emotion = os.environ.get("ISAO_EMOTION")
sample_seconds = float(os.environ.get("ISAO_SAMPLE_SECONDS", "0.8"))
for obj in bpy.context.scene.objects:
    if not obj.animation_data:
        continue
    if emotion:
        obj.animation_data.action = None
        for track in obj.animation_data.nla_tracks:
            track.mute = track.name != f"Emotion_{emotion}"
    else:
        obj.animation_data_clear()

bpy.ops.mesh.primitive_plane_add(size=20, location=(0, 0, -0.01))
ground = bpy.data.materials.new("ISAO review ground")
ground.diffuse_color = (0.018, 0.045, 0.055, 1)
bpy.context.object.data.materials.append(ground)

scene = bpy.context.scene
if emotion:
    scene.frame_set(round(sample_seconds * scene.render.fps))
scene.world.color = (0.012, 0.025, 0.032)
for location, energy, size, color in [
    ((-3, -4, 5), 900, 4, (1.0, 0.82, 0.62)),
    ((4, 1, 3), 1200, 3, (0.18, 0.78, 1.0)),
    ((-2, 3, 2), 700, 2, (0.30, 0.48, 0.55)),
]:
    bpy.ops.object.light_add(type="AREA", location=location)
    light = bpy.context.object
    light.data.energy = energy
    light.data.shape = "DISK"
    light.data.size = size
    light.data.color = color
    light.rotation_euler = (Vector((0, 0, 0.9)) - light.location).to_track_quat("-Z", "Y").to_euler()

bpy.ops.object.camera_add(location=(2.7, -4.0, 2.35))
camera = bpy.context.object
camera.rotation_euler = (Vector((0, 0, 0.75)) - camera.location).to_track_quat("-Z", "Y").to_euler()
camera.data.type = "ORTHO"
camera.data.ortho_scale = 3.0
scene.camera = camera
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 1000
scene.render.resolution_y = 800
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
suffix = emotion.lower() if emotion else "production-alpha"
scene.render.filepath = f"/tmp/isao-{suffix}.png"
scene.render.film_transparent = False
bpy.ops.render.render(write_still=True)
print("ISAO_RENDER", scene.render.filepath)
