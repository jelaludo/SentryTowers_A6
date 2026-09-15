"""Create the editable SOL-82 review scene and render its Workshop poster."""
import bpy
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
MODEL = ROOT / "assets/sol82/lod0/sol82_platform_detailed.glb"
BLEND = ROOT / "source/blender/sol82-orbital-laser.blend"
POSTER = ROOT / "assets/workshop/sol82.jpg"
QA = Path("/tmp/sol82-orbital-laser.png")

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(MODEL))
for obj in bpy.data.objects:
    obj.animation_data_clear()
    if obj.type == "ARMATURE":
        for name in ("ARRAY_L", "ARRAY_R", "RADIATOR_L", "RADIATOR_R"):
            pose_bone = obj.pose.bones.get(name)
            if pose_bone:
                pose_bone.rotation_mode = "QUATERNION"
                pose_bone.rotation_quaternion = (1, 0, 0, 0)

scene = bpy.context.scene
scene.world.color = (0.005, 0.011, 0.018)
target = Vector((0.0, 0.0, 4.7))
bpy.ops.object.camera_add(location=(34.0, -78.0, 34.0))
camera = bpy.context.object
camera.name = "SOL82_REVIEW_CAMERA"
camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
camera.data.lens = 50
scene.camera = camera

for name, location, energy, size, color in [
    ("SOL82_KEY", (-18, -14, 34), 5200, 17, (0.68, 0.90, 1.0)),
    ("SOL82_RIM", (28, 8, 18), 4000, 13, (0.22, 0.48, 1.0)),
    ("SOL82_WARM", (-5, 24, 10), 2600, 11, (1.0, 0.54, 0.20)),
]:
    bpy.ops.object.light_add(type="AREA", location=location)
    light = bpy.context.object
    light.name = name
    light.data.energy = energy
    light.data.shape = "DISK"
    light.data.size = size
    light.data.color = color
    light.rotation_euler = (target - light.location).to_track_quat("-Z", "Y").to_euler()

scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 1400
scene.render.resolution_y = 820
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.filepath = str(QA)
scene.view_settings.look = "AgX - Medium High Contrast"
bpy.ops.wm.save_as_mainfile(filepath=str(BLEND))
bpy.ops.render.render(write_still=True)
scene.render.image_settings.file_format = "JPEG"
scene.render.image_settings.quality = 92
scene.render.filepath = str(POSTER)
bpy.ops.render.render(write_still=True)
print("SOL82_BLEND", BLEND)
print("SOL82_RENDER", QA)
print("SOL82_POSTER", POSTER)
