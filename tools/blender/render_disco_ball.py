"""Derive editable Blender review scenes and preview renders for DSC-01 Disco Ball and Stålheart Disco Diorama."""
from pathlib import Path
import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]


def setup_scene(name, bg_color=(0.06, 0.11, 0.15)):
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    scene = bpy.context.scene
    scene.name = name
    scene['derived_review_assembly'] = True
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 24
    scene.render.resolution_x = 1280
    scene.render.resolution_y = 810
    scene.render.resolution_percentage = 100
    scene.view_settings.view_transform = 'AgX'
    world = scene.world
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs[0].default_value = (*bg_color, 1)
    world.node_tree.nodes['Background'].inputs[1].default_value = 0.65
    return scene


def aim(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat('-Z', 'Y').to_euler()


def add_light(scene, name, loc, target, energy, size, color):
    data = bpy.data.lights.new(name, 'AREA')
    obj = bpy.data.objects.new(name, data)
    scene.collection.objects.link(obj)
    obj.location = loc
    aim(obj, target)
    data.energy = energy
    data.shape = 'DISK'
    data.size = size
    data.color = color
    return obj


# 1. Standalone DSC-01 Disco Ball
scene = setup_scene('DSC_01_Disco_Ball_Review', (0.05, 0.10, 0.14))
bpy.ops.import_scene.gltf(filepath=str(ROOT / 'assets/disco-ball/lod0/disco_ball_d0_lod0.glb'))
bpy.ops.mesh.primitive_plane_add(size=60, location=(0, 0, -0.02))
ground = bpy.context.object
ground.name = 'REVIEW_GROUND_NOT_EXPORTED'
mat = bpy.data.materials.new('BasaltFloor')
mat.diffuse_color = (0.08, 0.13, 0.16, 1)
ground.data.materials.append(mat)

add_light(scene, 'KEY_WARM', (6, -8, 10), (0, 0, 3.2), 1800, 5, (1.0, 0.90, 0.78))
add_light(scene, 'RIM_MAGENTA', (-6, 5, 8), (0, 0, 3.2), 2200, 4, (1.0, 0.35, 0.85))
add_light(scene, 'FILL_CYAN', (6, 6, 7), (0, 0, 3.0), 1600, 4, (0.30, 0.90, 1.0))

cam_data = bpy.data.cameras.new('REVIEW_CAMERA')
cam = bpy.data.objects.new('REVIEW_CAMERA', cam_data)
scene.collection.objects.link(cam)
cam.location = (6.8, -8.2, 5.4)
aim(cam, (0, 0, 3.15))
cam_data.lens = 38
scene.camera = cam

(ROOT / 'source/blender').mkdir(parents=True, exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / 'source/blender/disco-ball.blend'))
scene.render.filepath = str(ROOT / 'assets/disco-ball/preview.png')
bpy.ops.render.render(write_still=True)

# 2. Stålheart Celebration Disco Gantry Diorama
scene = setup_scene('Stalheart_Celebration_Diorama_Review', (0.05, 0.09, 0.13))
before = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=str(ROOT / 'assets/terraformer/terraformer_3000_d0_lod1.glb'))
stal_objs = set(bpy.data.objects) - before
tip_obj = None
for o in stal_objs:
    if o.animation_data:
        o.animation_data_clear()
    base = o.name.split('.')[0]
    if base == 'CARRIAGE_TRAVEL_X':
        o.location.x = 0.0
    elif base == 'TOOL_LIFT_Z':
        # Raise vertical lift from -7.4 m to +1.87 m in Blender's Z-up frame (+9.27 m lift)
        o.location.z = 1.87
    elif base == 'EXTRUSION_TIP':
        tip_obj = o

bpy.context.view_layer.update()
tip_world = tip_obj.matrix_world.translation.copy() if tip_obj else Vector((0.0, -2.6, 11.628))

before = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=str(ROOT / 'assets/disco-ball/lod0/disco_ball_d0_lod0.glb'))
disco_objs = set(bpy.data.objects) - before
for o in disco_objs:
    base = o.name.split('.')[0]
    if base == 'STANDALONE_CRADLE':
        o.hide_render = True
        o.hide_viewport = True
    if o.parent is None:
        # Align SOCKET_GANTRY_HOOK (+6.2 m Z in Blender) directly to EXTRUSION_TIP
        o.location = tip_world - Vector((0.0, 0.0, 6.2))

before = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=str(ROOT / 'assets/hover-tank/mork_hover_tank_low_d0.glb'))
for o in set(bpy.data.objects) - before:
    if o.parent is None:
        o.location = Vector((-6.2, 4.2, 0.31))
        o.rotation_mode = 'XYZ'
        o.rotation_euler.z = 0.42

before = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=str(ROOT / 'assets/isao-birudoron/isao_birudoron_lod1.glb'))
for o in set(bpy.data.objects) - before:
    if o.parent is None:
        o.location = Vector((5.6, 3.2, 0.0))
        o.rotation_mode = 'XYZ'
        o.rotation_euler.z = -0.6

bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, -0.04))
ground = bpy.context.object
ground.name = 'REVIEW_GROUND_NOT_EXPORTED'
mat = bpy.data.materials.new('BayFloor')
mat.diffuse_color = (0.07, 0.12, 0.15, 1)
ground.data.materials.append(mat)

add_light(scene, 'KEY', (-22, -28, 42), (0, -2, 6), 38000, 24, (1.0, 0.92, 0.80))
add_light(scene, 'PARTY_MAGENTA', (-8, -10, 12), (0, -2, 5), 14000, 8, (1.0, 0.32, 0.85))
add_light(scene, 'PARTY_CYAN', (10, -10, 12), (0, -2, 5), 14000, 8, (0.28, 0.90, 1.0))

cam_data = bpy.data.cameras.new('DIORAMA_CAMERA')
cam = bpy.data.objects.new('DIORAMA_CAMERA', cam_data)
scene.collection.objects.link(cam)
cam.location = (22, -30, 11.0)
aim(cam, (0, -2.0, 6.2))
cam_data.lens = 34
scene.camera = cam

bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / 'source/blender/stalheart-disco.blend'))
scene.render.filepath = str(ROOT / 'assets/stalheart-disco/preview.png')
bpy.ops.render.render(write_still=True)
