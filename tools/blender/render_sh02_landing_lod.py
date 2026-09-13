"""Render source composition and SH02 landing-island LOD2 for visual QA."""
import bpy
from pathlib import Path
from mathutils import Vector

PROJECT = Path(__file__).resolve().parents[2]
ROCKET = PROJECT / "assets/sh-rocket/sh_rocket.glb"
SLAB = PROJECT / "assets/base-kit-game/foundation_slab.glb"
DISTANCE = PROJECT / "assets/sh-rocket/sh02_landing_island_d0_lod2.glb"


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)


def import_candidate(kind):
    if kind == "source":
        before = set(bpy.context.scene.objects)
        bpy.ops.import_scene.gltf(filepath=str(SLAB))
        imported = set(bpy.context.scene.objects) - before
        for obj in imported:
            if obj.parent is None:
                obj.scale.x = 0.4
                obj.scale.y = 0.4
        bpy.ops.import_scene.gltf(filepath=str(ROCKET))
    else:
        bpy.ops.import_scene.gltf(filepath=str(DISTANCE))


def add_lighting(center, distance):
    bpy.context.scene.world.color = (0.006, 0.015, 0.022)
    for direction, energy, size, color in [
        ((-1.0, -1.0, 1.7), 2200, 12, (0.68, 0.88, 1.0)),
        ((1.0, 0.2, 1.0), 1500, 10, (0.20, 0.72, 1.0)),
        ((0.0, 1.0, 0.7), 1100, 8, (1.0, 0.64, 0.25)),
    ]:
        location = center + Vector(direction).normalized() * distance * 0.7
        bpy.ops.object.light_add(type="AREA", location=location)
        light = bpy.context.object
        light.data.energy = energy
        light.data.shape = "DISK"
        light.data.size = size
        light.data.color = color
        light.rotation_euler = (center - light.location).to_track_quat("-Z", "Y").to_euler()


for kind in ("source", "lod2"):
    clear_scene()
    import_candidate(kind)
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    corners = [obj.matrix_world @ Vector(corner) for obj in meshes for corner in obj.bound_box]
    minimum = Vector(tuple(min(point[axis] for point in corners) for axis in range(3)))
    maximum = Vector(tuple(max(point[axis] for point in corners) for axis in range(3)))
    center = (minimum + maximum) * 0.5
    span = maximum - minimum
    distance = max(span) * 1.6

    bpy.ops.mesh.primitive_plane_add(size=34, location=(0, 0, minimum.z - 0.03))
    ground = bpy.context.object
    material = bpy.data.materials.get("SH02 QA ground") or bpy.data.materials.new("SH02 QA ground")
    material.diffuse_color = (0.012, 0.032, 0.04, 1)
    ground.data.materials.append(material)
    add_lighting(center, distance)

    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 900
    scene.render.resolution_y = 900
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    for view, direction, scale in [
        ("perspective", Vector((1.0, -1.25, 0.82)), max(span.x, span.y, span.z) * 1.18),
        ("map", Vector((0.18, -0.20, 1.0)), max(span.x, span.y) * 1.18),
    ]:
        bpy.ops.object.camera_add(location=center + direction.normalized() * distance)
        camera = bpy.context.object
        camera.rotation_euler = (center - camera.location).to_track_quat("-Z", "Y").to_euler()
        camera.data.type = "ORTHO"
        camera.data.ortho_scale = scale
        scene.camera = camera
        scene.render.filepath = f"/tmp/sh02_landing_{kind}_{view}.png"
        bpy.ops.render.render(write_still=True)
        print("SH02_RENDER", scene.render.filepath)
        bpy.data.objects.remove(camera, do_unlink=True)
