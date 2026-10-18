"""Derive editable Blender review scene and preview render for the R-47X 6x6 Reconnaissance Rover."""
from pathlib import Path
import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]


def setup_scene(name, bg_color=(0.07, 0.10, 0.13)):
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    scene = bpy.context.scene
    scene.name = name
    scene['derived_review_assembly'] = True
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 28
    scene.render.resolution_x = 1280
    scene.render.resolution_y = 810
    scene.render.resolution_percentage = 100
    scene.view_settings.view_transform = 'AgX'
    world = scene.world
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs[0].default_value = (*bg_color, 1)
    world.node_tree.nodes['Background'].inputs[1].default_value = 0.85
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


scene = setup_scene('R47X_Recon_Rover_Review', (0.07, 0.10, 0.13))
bpy.ops.import_scene.gltf(filepath=str(ROOT / 'assets/recon-rover/lod0/r47x_recon_rover_d0_lod0.glb'))

# Elevate ROVER_CHASSIS_JUMP in Blender's Z-up frame (+0.32 m hop above rest 0.56 m -> 0.88 m)
# and drooped wheels (-0.06 m) so the 6 wheels, exposed hydraulic dampers, and 8 ventral/lateral cold-gas thrusters read clearly
for o in bpy.data.objects:
    base = o.name.split('.')[0]
    if base == 'ROVER_CHASSIS_JUMP':
        o.location.z = 0.88
        o.rotation_mode = 'XYZ'
        o.rotation_euler.x = -0.04
    elif base in ('WHEEL_DRIVE_L', 'WHEEL_DRIVE_R'):
        o.location.z = -0.06
    elif base == 'SENSOR_MAST_YAW':
        o.rotation_mode = 'XYZ'
        o.rotation_euler.z = 0.28
    elif base == 'COLD_GAS_PLUMES' and o.type == 'MESH':
        # Make cold-gas plumes softly translucent/emissive in Cycles preview
        m = bpy.data.materials.new('CyclesColdGasPlume')
        m.use_nodes = True
        bsdf = m.node_tree.nodes.get('Principled BSDF')
        if bsdf:
            bsdf.inputs['Base Color'].default_value = (0.62, 0.92, 1.0, 1.0)
            bsdf.inputs['Alpha'].default_value = 0.28
            if 'Emission Color' in bsdf.inputs:
                bsdf.inputs['Emission Color'].default_value = (0.45, 0.88, 1.0, 1.0)
            if 'Emission Strength' in bsdf.inputs:
                bsdf.inputs['Emission Strength'].default_value = 1.6
        o.data.materials.clear()
        o.data.materials.append(m)

bpy.ops.mesh.primitive_plane_add(size=60, location=(0, 0, -0.01))
ground = bpy.context.object
ground.name = 'REVIEW_GROUND_NOT_EXPORTED'
mat = bpy.data.materials.new('BasaltTestPad')
mat.diffuse_color = (0.09, 0.12, 0.15, 1)
ground.data.materials.append(mat)

# Three-point industrial aerospace lighting + ventral cyan bounce for undercarriage thrusters
add_light(scene, 'KEY_SUN_WARM', (-4.8, -5.4, 5.2), (0, 0, 0.8), 980, 3.8, (1.0, 0.95, 0.88))
add_light(scene, 'FILL_STEEL_COOL', (5.0, -3.6, 3.6), (0, 0, 0.8), 640, 3.5, (0.72, 0.88, 1.0))
add_light(scene, 'RIM_BACK', (2.6, 5.8, 4.4), (0, 0, 0.9), 880, 3.2, (0.85, 0.94, 1.0))
add_light(scene, 'UNDERCAB_THRUSTER_GLOW', (-1.8, -2.0, 0.22), (0, 0, 0.65), 340, 1.8, (0.42, 0.88, 1.0))

cam_data = bpy.data.cameras.new('REVIEW_CAMERA')
cam = bpy.data.objects.new('REVIEW_CAMERA', cam_data)
scene.collection.objects.link(cam)
# 3/4 low-angle front-left view showing wedge nose, all 6 wheels, exposed hydraulic shocks, COPV tanks, and 8 ventral/lateral thrusters
cam.location = (-3.75, -4.10, 1.48)
aim(cam, (0.0, -0.08, 0.78))
cam_data.lens = 42
scene.camera = cam

(ROOT / 'source/blender').mkdir(parents=True, exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / 'source/blender/recon-rover.blend'))
scene.render.filepath = str(ROOT / 'assets/recon-rover/preview.png')
bpy.ops.render.render(write_still=True)
