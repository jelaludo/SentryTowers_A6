"""Derived editable review scene and photographic renders; original geometry lives in tai09-shape.mjs."""
from pathlib import Path
import bpy
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'assets/tai09/derived/review-09-tai-01-torque'
OUT.mkdir(parents=True,exist_ok=True)
def aim(o,p): o.rotation_euler=(Vector(p)-o.location).to_track_quat('-Z','Y').to_euler()
for mode in ['closed','walk','grapple']:
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=f'/tmp/tai09-review/{mode}.glb')
    scene=bpy.context.scene;scene.name='TAI09_Derived_Review_'+mode;scene['derived']=True
    scene['source']='tools/asset-pipeline/tai09-shape.mjs; authoritative plain GLBs in assets/tai09'
    scene.render.engine='CYCLES';scene.cycles.samples=40;scene.cycles.use_denoising=True
    scene.render.resolution_x=1440;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
    scene.view_settings.view_transform='AgX'
    scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.12,.15,.18,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.35
    bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.006));floor=bpy.context.object;floor.name='REVIEW_FLOOR_NOT_EXPORTED'
    mat=bpy.data.materials.new('REVIEW_GRAPHITE');mat.diffuse_color=(.055,.063,.067,1);mat.use_nodes=True;bs=mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(.055,.063,.067,1);bs.inputs['Roughness'].default_value=.43;bs.inputs['Metallic'].default_value=.22;floor.data.materials.append(mat)
    for name,loc,power,size,color in [('KEY',(-3,-4,5),550,3,(1,.87,.68)),('FILL',(4,-1,2.8),220,2.5,(.60,.77,1)),('RIM',(1,3,4),750,2,(1,1,1))]:
        data=bpy.data.lights.new('REVIEW_'+name,'AREA');o=bpy.data.objects.new('REVIEW_'+name,data);scene.collection.objects.link(o);o.location=loc;data.energy=power;data.shape='DISK';data.size=size;data.color=color;aim(o,(0,0,.8))
    data=bpy.data.cameras.new('REVIEW_CAMERA');camera=bpy.data.objects.new('REVIEW_CAMERA',data);scene.collection.objects.link(camera);scene.camera=camera
    target=(0,0,.8);camera.location=(3.3,-4.7,2.65);data.lens=56
    if mode=='walk':camera.location=(3.6,-5.1,2.65);target=(0,0,.7);data.lens=52
    if mode=='grapple':
        target=(0,-1.0,.85);camera.location=(4.5,-5.8,3.0);data.lens=49
        curve=bpy.data.curves.new('REVIEW_TETHER','CURVE');curve.dimensions='3D';curve.bevel_depth=.008;curve.bevel_resolution=2;s=curve.splines.new('POLY');s.points.add(16)
        for i,p in enumerate(s.points):t=i/16;p.co=(0,-(.95+1.65*t),.8-.035*(4*t*(1-t)),1)
        obj=bpy.data.objects.new('REVIEW_TETHER_NOT_EXPORTED',curve);scene.collection.objects.link(obj);curve.materials.append(mat)
    aim(camera,target)
    if mode=='closed':bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'source/blender/09-tai-01-torque-review-derived.blend'))
    scene.render.filepath=str(OUT/f'{mode}.png');bpy.ops.render.render(write_still=True)
