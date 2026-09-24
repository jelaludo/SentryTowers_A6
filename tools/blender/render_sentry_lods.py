"""Render all 33 sentry variants at all three LODs for visual review."""
import bpy,json,sys
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
BASE=ROOT/'assets/sentries'
OUT=BASE/'previews'
OUT.mkdir(parents=True,exist_ok=True)
for entry in json.loads((BASE/'manifest.json').read_text())['assets']:
    if '--' in sys.argv and not any(term in entry['id'] for term in sys.argv[sys.argv.index('--')+1:]):continue
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(BASE/entry['file']))
    for o in bpy.data.objects:o.animation_data_clear()
    bpy.context.view_layer.update()
    points=[o.matrix_world@Vector(p) for o in bpy.data.objects if o.type=='MESH' for p in o.bound_box]
    low=Vector([min(p[i] for p in points) for i in range(3)]);high=Vector([max(p[i] for p in points) for i in range(3)])
    target=(low+high)/2;span=(high-low).length
    scene=bpy.context.scene;scene.world=bpy.data.worlds.new('Studio');scene.world.use_nodes=True
    scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.22,.29,.38,1)
    scene.world.node_tree.nodes['Background'].inputs[1].default_value=.55
    for name,offset,power,color in [('Key',(1,-2,3),90,(.85,.94,1)),('Fill',(-2,-1,1),45,(1,.83,.68)),('Rim',(0,2,2),100,(.55,.8,1))]:
        bpy.ops.object.light_add(type='AREA',location=target+Vector(offset)*span)
        o=bpy.context.object;o.name=name;o.data.energy=power*span*span;o.data.size=span*2;o.data.color=color;o.rotation_euler=(target-o.location).to_track_quat('-Z','Y').to_euler()
    bpy.ops.object.camera_add(location=target+Vector((1.4,-2,1.15))*span)
    camera=bpy.context.object;camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=span*1.2;scene.camera=camera
    scene.render.engine='CYCLES';scene.cycles.samples=8;scene.cycles.use_denoising=True
    scene.render.resolution_x=420;scene.render.resolution_y=360;scene.render.resolution_percentage=100
    scene.view_settings.view_transform='AgX';scene.render.image_settings.file_format='PNG'
    scene.render.filepath=str(OUT/f"{entry['id']}_lod{entry['lod']}.png")
    bpy.ops.render.render(write_still=True)
