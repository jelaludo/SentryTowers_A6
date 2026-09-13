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
face_sequences = {
    "Neutral": [(0.0, "NEUTRAL")], "Happy": [(0.0, "HAPPY")],
    "Glee": [(0.0, "GLEE_A"), (0.3, "GLEE_B"), (0.6, "GLEE_A"), (0.9, "GLEE_B"), (1.2, "GLEE_A")],
    "Curious": [(0.0, "CURIOUS_LEFT"), (0.6, "CURIOUS_CENTER"), (1.2, "CURIOUS_RIGHT"), (1.8, "CURIOUS_CENTER")],
    "Working": [(0.0, "WORKING")], "Alarm": [(0.0, "ALARM")],
    "Determined": [(0.0, "DETERMINED")], "Sad": [(0.0, "SAD")],
    "Skeptical": [(0.0, "SKEPTICAL_A"), (0.8, "SKEPTICAL_B"), (1.6, "SKEPTICAL_A")],
    "Love": [(0.0, "LOVE_SMALL"), (0.35, "LOVE_LARGE"), (0.7, "LOVE_SMALL"), (1.05, "LOVE_LARGE"), (1.4, "LOVE_SMALL")],
    "Worried": [(0.0, "WORRIED_A"), (0.4, "WORRIED_B"), (0.8, "WORRIED_A"), (1.2, "WORRIED_B"), (1.6, "WORRIED_A")],
    "Angry": [(0.0, "ANGRY_A"), (0.4, "ANGRY_B"), (0.8, "ANGRY_A"), (1.2, "ANGRY_B")],
    "Surprised": [(0.0, "SURPRISED_BLINK"), (0.12, "SURPRISED_OPEN"), (1.1, "SURPRISED_OPEN")],
    "Sleepy": [(0.0, "SLEEPY_OPEN"), (1.4, "SLEEPY_CLOSED"), (2.2, "SLEEPY_CLOSED"), (2.5, "SLEEPY_OPEN")],
}
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
    active_face = face_sequences[emotion][0][1]
    for start, state in face_sequences[emotion]:
        if sample_seconds >= start:
            active_face = state
    for obj in scene.objects:
        if obj.name.startswith("FACE_"):
            if obj.animation_data:
                obj.animation_data_clear()
            if obj.type == "MESH":
                # Blender's imported NLA evaluation can leave child meshes at the
                # parent's previous evaluated scale after their animation is cleared.
                # Restore their authored local scale for deterministic still QA.
                obj.scale = (1, 1, 1)
            else:
                obj.scale = (1, 1, 1) if obj.name == f"FACE_{active_face}" else (0, 0, 0)
    bpy.context.view_layer.update()
    active_parent = scene.objects.get(f"FACE_{active_face}")
    print("ISAO_FACE_QA", active_face, tuple(active_parent.scale) if active_parent else None)
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
