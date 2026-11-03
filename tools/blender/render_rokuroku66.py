"""Derived studio scene and posed renders. Plain GLBs and JS masters remain authoritative."""
import bpy,os
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
TMP=Path(os.environ.get('ROKU_REVIEW_DIR','/tmp/rokuroku66-review'))
OUT=ROOT/'assets/rokuroku66/previews';OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene;scene.name='RokuRoku-66 / derived mixed-pose studio';scene['provenance']='Derived review pose from procedural master and runtime.js; no baked engine pivots in authoritative GLBs.'
world=scene.world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.08,.14,.20,1);world.node_tree.nodes['Background'].inputs[1].default_value=.45
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.005));ground=bpy.context.object;ground.name='REVIEW_FLOOR_NOT_EXPORTED';mat=bpy.data.materials.new('Blue slate');mat.use_nodes=True;bs=mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(.017,.035,.051,1);bs.inputs['Roughness'].default_value=.8;ground.data.materials.append(mat)
for name,pos,power,size,color in [('KEY',(4,-6,10),2000,7,(1,.88,.70)),('RIM',(-6,4,8),2400,6,(.62,.80,1)),('FILL',(6,5,6),1500,6,(.85,.93,1))]:
 bpy.ops.object.light_add(type='AREA',location=pos);o=bpy.context.object;o.name='REVIEW_'+name;o.data.energy=power;o.data.shape='DISK';o.data.size=size;o.data.color=color;o.rotation_euler=(Vector((0,0,1))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add();cam=bpy.context.object;cam.name='REVIEW_CAMERA';cam.data.type='ORTHO';scene.camera=cam
scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True;scene.render.resolution_x=1600;scene.render.resolution_y=1100;scene.render.resolution_percentage=100;scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast';scene.render.image_settings.file_format='PNG'
asset=[]
def load(mode):
 global asset
 for o in asset:
  if o.name in bpy.data.objects:bpy.data.objects.remove(o,do_unlink=True)
 before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(TMP/(mode+'.glb')));asset=list(set(bpy.data.objects)-before)
for name,mode,position,target,scale in [('mixed','mixed',(8,-11,7),(0,0,1),12.7),('extended-top','extended',(0,0,15),(0,0,0),16.5),('coiled-top','spiral',(0,0,12),(0,0,0),8.4),('mixed-front','mixed',(0,-15,4.5),(0,0,1.15),12.5)]:
 if os.environ.get('ROKU_RENDER_SHOTS') and name not in os.environ['ROKU_RENDER_SHOTS'].split(','):continue
 load(mode);cam.location=position;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=scale
 if name=='mixed':bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'source/blender/rokuroku66-review.blend'))
 scene.render.filepath=str(OUT/(name+'.png'));bpy.ops.render.render(write_still=True)
 if name=='mixed':bpy.data.images['Render Result'].save_render(str(ROOT/'assets/rokuroku66/preview.png'))
