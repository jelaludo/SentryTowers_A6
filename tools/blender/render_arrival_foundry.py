"""Create the editable AFR-01 review scene and render its Workshop poster."""
import bpy
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
ROCKET = ROOT / "assets/sh-rocket/sh_rocket.glb"
FOUNDRY = ROOT / "assets/arrival-foundry/afr_01_seed_foundry_d0_lod0.glb"
BLEND = ROOT / "source/blender/afr-01-seed-foundry.blend"
POSTER = ROOT / "assets/workshop/arrival-foundry.jpg"
QA = Path("/tmp/afr_01_seed_foundry.png")

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)

before = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=str(ROCKET))
rocket_objects = set(bpy.data.objects) - before
context = bpy.data.objects.new("SH02_CONTEXT", None)
bpy.context.scene.collection.objects.link(context)
for obj in [item for item in rocket_objects if item.parent not in rocket_objects]:
    world = obj.matrix_world.copy()
    obj.parent = context
    obj.matrix_world = world
context.location.x = -6.8

bpy.ops.import_scene.gltf(filepath=str(FOUNDRY))
sparks = bpy.data.objects.get("CUTTER_SPARKS")
if sparks:
    sparks.animation_data_clear()
    sparks.scale = (1, 1, 1)
panel = bpy.data.objects.get("SALVAGE_PANEL_00")
if panel:
    panel.location = (-1.45, 0, 2.05)

bpy.ops.mesh.primitive_plane_add(size=70, location=(-2, 0, -0.03))
ground = bpy.context.object
ground.name = "QA_GROUND"
ground_material = bpy.data.materials.new("AFR_QA_GROUND")
ground_material.diffuse_color = (0.018, 0.055, 0.065, 1)
ground_material.metallic = 0.08
ground_material.roughness = 0.9
ground.data.materials.append(ground_material)

scene = bpy.context.scene
scene.world.color = (0.006, 0.018, 0.025)
target = Vector((-1.0, 0.0, 2.8))
bpy.ops.object.camera_add(location=(16.5, -18.0, 9.5))
camera = bpy.context.object
camera.name = "AFR_REVIEW_CAMERA"
camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
camera.data.lens = 55
scene.camera = camera

for location, energy, size, color in [
    ((8, -10, 18), 1900, 9, (0.72, 0.9, 1.0)),
    ((-9, -4, 9), 1500, 7, (0.12, 0.72, 1.0)),
    ((5, 10, 6), 1250, 6, (1.0, 0.55, 0.18)),
]:
    bpy.ops.object.light_add(type="AREA", location=location)
    light = bpy.context.object
    light.data.energy = energy
    light.data.shape = "DISK"
    light.data.size = size
    light.data.color = color
    light.rotation_euler = (target - light.location).to_track_quat("-Z", "Y").to_euler()

scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 1200
scene.render.resolution_y = 760
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.filepath = str(QA)
scene.view_settings.look = "AgX - Medium High Contrast"
bpy.ops.wm.save_as_mainfile(filepath=str(BLEND))
bpy.ops.render.render(write_still=True)
scene.render.image_settings.file_format = "JPEG"
scene.render.image_settings.quality = 90
scene.render.filepath = str(POSTER)
bpy.ops.render.render(write_still=True)
print("AFR_BLEND", BLEND)
print("AFR_RENDER", QA)
print("AFR_POSTER", POSTER)
