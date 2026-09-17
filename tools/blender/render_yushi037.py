"""Editable Bio-Dome master and consistent Workshop preview."""
import bpy
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(ROOT / "assets/yushi037/lod0/yushi037_container_d0_lod0.glb"))
scene = bpy.context.scene
scene.world.color = (0.025, 0.035, 0.031)
target = Vector((0, 0, 0.85))
bpy.ops.object.camera_add(location=(4.8, -7.8, 4.5))
camera = bpy.context.object
camera.name = "YUSHI_REVIEW_CAMERA"
camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
camera.data.lens = 48
scene.camera = camera
for name, pos, power, size, color in [
    ("YUSHI_KEY", (1, -4, 7), 850, 5, (0.90, 1.0, 0.92)),
    ("YUSHI_RIM", (-4, 2, 5), 1200, 4, (0.38, 0.84, 0.76)),
    ("YUSHI_FILL", (5, 2, 3), 600, 4, (1.0, 0.76, 0.47)),
]:
    bpy.ops.object.light_add(type="AREA", location=pos)
    light = bpy.context.object
    light.name = name
    light.data.energy = power
    light.data.size = size
    light.data.color = color
    light.rotation_euler = (target - light.location).to_track_quat("-Z", "Y").to_euler()
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 1400
scene.render.resolution_y = 1000
scene.render.resolution_percentage = 100
scene.view_settings.look = "AgX - Medium High Contrast"
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / "source/blender/yushi037-bio-dome.blend"))
scene.render.image_settings.file_format = "PNG"
scene.render.filepath = "/tmp/yushi037-bio-dome.png"
bpy.ops.render.render(write_still=True)
scene.render.image_settings.file_format = "JPEG"
scene.render.image_settings.quality = 93
scene.render.filepath = str(ROOT / "assets/workshop/yushi037.jpg")
bpy.ops.render.render(write_still=True)
