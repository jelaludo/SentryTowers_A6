"""Render a static unit distance tier for silhouette and palette QA."""
import bpy
import os
from pathlib import Path
from mathutils import Vector

P = Path(__file__).resolve().parents[2]
family = os.environ.get("DISTANCE_ASSET", "mork").lower()
view = os.environ.get("DISTANCE_VIEW", "perspective").lower()
files = {
    "mork": P / "assets/hover-tank/mork_hover_tank_d0_lod2.glb",
    "isao": P / "assets/isao-birudoron/isao_birudoron_lod2.glb",
}
if family not in files:
    raise RuntimeError("DISTANCE_ASSET must be mork or isao")
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(files[family]))

bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 0, -0.015))
ground = bpy.context.object
material = bpy.data.materials.new("Distance QA ground")
material.diffuse_color = (0.018, 0.045, 0.055, 1)
ground.data.materials.append(material)

scene = bpy.context.scene
scene.world.color = (0.012, 0.025, 0.032)
for location, energy, size, color in [
    ((-7, -8, 12), 1300, 6, (1.0, 0.82, 0.62)),
    ((8, 2, 8), 1600, 5, (0.18, 0.78, 1.0)),
    ((-4, 8, 5), 900, 4, (0.30, 0.48, 0.55)),
]:
    bpy.ops.object.light_add(type="AREA", location=location)
    light = bpy.context.object
    light.data.energy = energy
    light.data.shape = "DISK"
    light.data.size = size
    light.data.color = color
    light.rotation_euler = (Vector((0, 0, 1)) - light.location).to_track_quat("-Z", "Y").to_euler()

if family == "mork":
    camera_location, target, scale = ((13.0, -1.0, 7.0), (0, -1.5, 1.5), 16.5) if view == "side" else ((10.5, -15.0, 8.5), (0, 0.8, 1.6), 16.5)
else:
    camera_location, target, scale = (2.7, -4.0, 2.35), (0, 0, 0.78), 3.0
bpy.ops.object.camera_add(location=camera_location)
camera = bpy.context.object
camera.rotation_euler = (Vector(target) - camera.location).to_track_quat("-Z", "Y").to_euler()
camera.data.type = "ORTHO"
camera.data.ortho_scale = scale
scene.camera = camera
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 1000
scene.render.resolution_y = 800
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.filepath = f"/tmp/{family}-distance-lod2-{view}.png"
bpy.ops.render.render(write_still=True)
print("DISTANCE_RENDER", scene.render.filepath)
