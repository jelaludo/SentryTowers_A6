"""Derived editable Blender review scene; authored plain GLB remains source of truth."""
import bpy
import os
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'assets/nih-dairia-mech/previews'
OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(ROOT/'assets/nih-dairia-mech/lod0/nih_dairia_mech_d0_lod0.glb'))
scene=bpy.context.scene
scene.name='Nih-Dairia mechanical v1 / derived review'
scene['provenance']='Derived from plain LOD0 GLB. Authoring source: tools/asset-pipeline/nih-dairia-mech-shape.mjs'
world=scene.world;world.use_nodes=True
world.node_tree.nodes['Background'].inputs[0].default_value=(.10,.15,.20,1)
world.node_tree.nodes['Background'].inputs[1].default_value=.45
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.012))
ground=bpy.context.object;ground.name='REVIEW_FLOOR_NOT_EXPORTED'
mat=bpy.data.materials.new('Slate studio');mat.diffuse_color=(.025,.044,.057,1);mat.use_nodes=True
bs=mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(.025,.044,.057,1);bs.inputs['Roughness'].default_value=.8;ground.data.materials.append(mat)
target=Vector((0,0,.8))
for name,pos,power,size,color in [('KEY',(3,-5,9),1400,7,(1,.89,.73)),('RIM',(-5,3,6),1900,5,(.64,.81,1)),('FILL',(5,4,4),1000,5,(.83,.93,1))]:
 bpy.ops.object.light_add(type='AREA',location=pos);o=bpy.context.object;o.name='REVIEW_'+name;o.data.energy=power;o.data.shape='DISK';o.data.size=size;o.data.color=color;o.rotation_euler=(target-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(7.8,-9,6.1));cam=bpy.context.object;cam.name='REVIEW_CAMERA';cam.data.type='ORTHO';cam.data.ortho_scale=9.1;scene.camera=cam
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True
scene.render.resolution_x=1600;scene.render.resolution_y=1100;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast'
scene.render.image_settings.file_format='PNG'
shots=[('hero',(7.8,-9,6.1),(0,0,.8),9.1),('top',(0,0,12),(0,0,0),11.2),('side',(10,0,2.5),(0,0,.9),8.5),('actuator',(2.5,-4.5,3.1),(0,-1.8,1.15),2.8),('claws',(1.3,-4.5,1.0),(0,-3.1,.16),1.45)]
for name,pos,aim,scale in shots:
 if os.environ.get('NIH_RENDER_SHOTS') and name not in os.environ['NIH_RENDER_SHOTS'].split(','):continue
 cam.location=pos;cam.rotation_euler=(Vector(aim)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=scale
 if name=='hero':bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'source/blender/nih-dairia-mech-review.blend'))
 scene.render.filepath=str(OUT/(name+'.png'));bpy.ops.render.render(write_still=True)
 if name=='hero':bpy.data.images['Render Result'].save_render(str(ROOT/'assets/nih-dairia-mech/preview.png'))
