"""Review baked livery examples; originals and gameplay assets remain untouched."""
import bpy
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'assets/hover-tank/customization/previews'
OUT.mkdir(parents=True,exist_ok=True)
for preset in ['bunny-overdrive','night-circuit','field-notes']:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(ROOT/f'assets/hover-tank/customization/derived/examples/{preset}.glb'))
    for o in bpy.data.objects: o.animation_data_clear()
    bpy.context.view_layer.update()
    scene=bpy.context.scene
    scene.world=bpy.data.worlds.new('Studio')
    scene.world.use_nodes=True
    scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.14,.19,.25,1)
    scene.world.node_tree.nodes['Background'].inputs[1].default_value=.45
    bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.03))
    ground=bpy.context.object
    ground.name='REVIEW_GROUND_NOT_EXPORTED'
    mat=bpy.data.materials.new('Studio floor');mat.diffuse_color=(.075,.10,.14,1);ground.data.materials.append(mat)
    target=Vector((0,-1.5,1.25))
    for name,pos,power,size,color in [('KEY',(5,-7,13),2200,9,(.85,.93,1)),('FILL',(-8,-1,8),1700,8,(1,.84,.92)),('RIM',(3,8,12),2500,7,(.5,.8,1))]:
        bpy.ops.object.light_add(type='AREA',location=pos);light=bpy.context.object;light.name=name;light.data.energy=power;light.data.shape='DISK';light.data.size=size;light.data.color=color;light.rotation_euler=(target-light.location).to_track_quat('-Z','Y').to_euler()
    bpy.ops.object.camera_add(location=(12,-17,12))
    cam=bpy.context.object;cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=16.7;scene.camera=cam
    scene.render.engine='CYCLES';scene.cycles.samples=24
    scene.render.resolution_x=1500;scene.render.resolution_y=1050;scene.render.resolution_percentage=100
    scene.view_settings.view_transform='AgX';scene.render.image_settings.file_format='PNG'
    scene.render.filepath=str(OUT/f'{preset}.png')
    bpy.ops.render.render(write_still=True)
