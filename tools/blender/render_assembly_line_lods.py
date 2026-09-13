"""Render every robotic assembly-line LOD candidate for visual QA."""
import bpy
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
FILES = [
    ROOT / "assets/assembly-line" / f"robotic_assembly_line_d{damage}_lod{lod}.glb"
    for damage in range(4)
    for lod in (1, 2)
]

for source in FILES:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=str(source))
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    corners = [obj.matrix_world @ Vector(corner) for obj in meshes for corner in obj.bound_box]
    minimum = Vector(tuple(min(point[axis] for point in corners) for axis in range(3)))
    maximum = Vector(tuple(max(point[axis] for point in corners) for axis in range(3)))
    center = (minimum + maximum) * 0.5
    span = maximum - minimum

    bpy.ops.mesh.primitive_plane_add(size=max(span.x, span.y) * 1.65, location=(center.x, center.y, minimum.z - 0.03))
    ground = bpy.context.object
    ground_material = bpy.data.materials.get("Assembly QA ground") or bpy.data.materials.new("Assembly QA ground")
    ground_material.diffuse_color = (0.012, 0.032, 0.04, 1)
    ground.data.materials.append(ground_material)

    scene = bpy.context.scene
    scene.world.color = (0.008, 0.018, 0.025)
    distance = max(span) * 1.5
    direction = Vector((1.0, -1.25, 0.92)).normalized()
    bpy.ops.object.camera_add(location=center + direction * distance)
    camera = bpy.context.object
    camera.rotation_euler = (center - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = max(span.z * 1.5, max(span.x, span.y) * 1.12)
    scene.camera = camera

    for light_direction, energy, size, color in [
        ((-1.0, -1.0, 1.7), 2200, 14, (0.65, 0.86, 1.0)),
        ((1.0, 0.3, 1.2), 1600, 12, (0.22, 0.78, 1.0)),
        ((0.0, 1.0, 0.8), 1100, 10, (1.0, 0.65, 0.28)),
    ]:
        location = center + Vector(light_direction).normalized() * distance * 0.7
        bpy.ops.object.light_add(type="AREA", location=location)
        light = bpy.context.object
        light.data.energy = energy
        light.data.shape = "DISK"
        light.data.size = size
        light.data.color = color
        light.rotation_euler = (center - light.location).to_track_quat("-Z", "Y").to_euler()

    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1200
    scene.render.resolution_y = 820
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = f"/tmp/{source.stem}.png"
    bpy.ops.render.render(write_still=True)
    print("ASSEMBLY_RENDER", scene.render.filepath)
    if source.stem == "robotic_assembly_line_d0_lod1":
        scene.frame_set(121)
        scene.render.filepath = f"/tmp/{source.stem}_motion.png"
        bpy.ops.render.render(write_still=True)
        print("ASSEMBLY_MOTION_RENDER", scene.render.filepath)
