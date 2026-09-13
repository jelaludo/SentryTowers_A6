"""Render contract-candidate landmark tiers for visual silhouette and damage review."""
import bpy
from pathlib import Path
from mathutils import Vector

P = Path(__file__).resolve().parents[2]
FILES = [
    P / "assets/launchpad/hugin_launchpad_d0_lod1.glb",
    P / "assets/launchpad/hugin_launchpad_d0_lod2.glb",
    P / "assets/launchpad/hugin_launchpad_d3_lod1.glb",
    P / "assets/terraformer/terraformer_3000_d0_lod1.glb",
    P / "assets/terraformer/terraformer_3000_d0_lod2.glb",
    P / "assets/terraformer/terraformer_3000_d3_lod1.glb",
]

for source in FILES:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=str(source))
    objects = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    corners = [obj.matrix_world @ Vector(corner) for obj in objects for corner in obj.bound_box]
    minimum = Vector((min(p.x for p in corners), min(p.y for p in corners), min(p.z for p in corners)))
    maximum = Vector((max(p.x for p in corners), max(p.y for p in corners), max(p.z for p in corners)))
    center = (minimum + maximum) * 0.5
    span = maximum - minimum

    bpy.ops.mesh.primitive_plane_add(size=max(span.x, span.y) * 1.65, location=(center.x, center.y, 0))
    ground = bpy.context.object
    ground.name = "QA_GROUND"
    ground_material = bpy.data.materials.get("Landmark QA ground") or bpy.data.materials.new("Landmark QA ground")
    ground_material.diffuse_color = (0.012, 0.032, 0.04, 1)
    ground.data.materials.append(ground_material)

    scene = bpy.context.scene
    scene.world.color = (0.008, 0.018, 0.025)
    distance = max(span.x, span.y, span.z) * 1.4
    direction = Vector((1.0, -1.25, 0.82)).normalized()
    bpy.ops.object.camera_add(location=center + direction * distance)
    camera = bpy.context.object
    camera.rotation_euler = (center - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = max(span.z * 1.32, max(span.x, span.y) * 1.08)
    scene.camera = camera

    for direction, energy, size, color in [
        ((-1.0, -1.0, 1.7), 1800, 12, (0.65, 0.86, 1.0)),
        ((1.0, 0.3, 1.2), 1400, 10, (0.22, 0.78, 1.0)),
        ((0.0, 1.0, 0.8), 900, 8, (1.0, 0.65, 0.28)),
    ]:
        location = center + Vector(direction).normalized() * distance * 0.7
        bpy.ops.object.light_add(type="AREA", location=location)
        light = bpy.context.object
        light.data.energy = energy
        light.data.shape = "DISK"
        light.data.size = size
        light.data.color = color
        light.rotation_euler = (center - light.location).to_track_quat("-Z", "Y").to_euler()

    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1100
    scene.render.resolution_y = 850
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = f"/tmp/{source.stem}.png"
    bpy.ops.render.render(write_still=True)
    print("LANDMARK_RENDER", scene.render.filepath)
