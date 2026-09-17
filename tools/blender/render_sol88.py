"""Create the editable SOL-88 review scene and render its Workshop poster."""
import bpy
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
MODEL = ROOT / "assets/sol88/lod0/sol88_platform_detailed.glb"
BLEND = ROOT / "source/blender/sol88-orbital-laser.blend"
POSTER = ROOT / "assets/workshop/sol88.jpg"
QA = Path("/tmp/sol88-orbital-laser.png")

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(MODEL))
for action in bpy.data.actions:
    action.use_fake_user = True
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
target = Vector((0.0, 0.0, 5.0))
bpy.ops.object.camera_add(location=(54.0, -85.0, 40.0))
camera = bpy.context.object
camera.name = "SOL88_REVIEW_CAMERA"
camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
camera.data.lens = 42
scene.camera = camera

for name, location, energy, size, color in [
    ("SOL88_KEY", (-18, -28, 34), 65000, 23, (0.68, 0.90, 1.0)),
    ("SOL88_RIM", (28, 8, 18), 48000, 18, (0.22, 0.65, 1.0)),
    ("SOL88_WARM", (-5, 24, 10), 35000, 16, (1.0, 0.74, 0.45)),
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
print("SOL88_BLEND", BLEND)
print("SOL88_RENDER", QA)
print("SOL88_POSTER", POSTER)
