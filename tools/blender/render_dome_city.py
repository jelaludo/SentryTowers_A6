"""Derived review assembly from city layout and original GLBs; never re-exports originals."""
from pathlib import Path
import json, math, bpy
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
BASE=ROOT/'assets/dome-city'
layout=json.loads((BASE/'layout.json').read_text())
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def load(file,prefix,p,yaw=0,hide=()):
    before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str((BASE/file).resolve()))
    objects=set(bpy.data.objects)-before
    wrapper=bpy.data.objects.new(prefix,None);bpy.context.scene.collection.objects.link(wrapper)
    wrapper.location=(p[0],-p[2],p[1]);wrapper.rotation_euler.z=yaw
    names={}
    for obj in objects:
        name=obj.name.split('.')[0];names[name]=obj
        if obj.parent is None:obj.parent=wrapper
        if name in hide:obj.hide_render=True;obj.hide_viewport=True
        obj.name=prefix+'_'+name
    return wrapper,names
for d in layout['domes']:
    wrapper,names=load('../dome-colony/'+d['module']+'_d0_lod0.glb',d['id'],d['position'],hide=['PORT_CAP_'+v for v in d['open_ports']])
    if d['sentry']:
        s,_=load(layout['references']['sentry']['files'][0],d['id']+'_SENTRY',[0,0,0]);s.parent=names['CRADLE_PITCH']
        names['MOUNT_YAW'].rotation_mode='XYZ';names['MOUNT_YAW'].rotation_euler.z=math.atan2(d['position'][0],d['position'][2])
        names['CRADLE_PITCH'].rotation_mode='XYZ';names['CRADLE_PITCH'].rotation_euler.x=math.pi/3
for c in layout['connections']:load('../dome-colony/bridge_long_d0_lod0.glb',c['id'],c['position'],c['yaw'])
for p in layout['props']:load(layout['references'][p['ref']]['files'][0],p['id'],p['position'],p['yaw'])
load(layout['references']['mork']['files'][0],'MORK_PATROL',[-40,.55,20])
load(layout['parked_tank']['file'],'MORK_GARAGE',layout['parked_tank']['position'])
def material(name,color):
    m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True;m.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(*color,1);m.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.9;return m
floor=material('REVIEW_REGOLITH',(.20,.25,.28));road=material('REVIEW_LANE',(.085,.13,.16));stripe=material('REVIEW_MARKING',(.65,.72,.67));rim=material('REVIEW_EDGE',(.10,.16,.19))
def cube(name,size,p,mat):
    bpy.ops.mesh.primitive_cube_add(size=1,location=p);o=bpy.context.object;o.name=name;o.dimensions=size;o.data.materials.append(mat)
cube('REVIEW_BOARD',(224,224,.8),(0,0,-.46),rim);cube('REVIEW_SURFACE',(220,220,.06),(0,0,-.035),floor)
for v in [-40,40]:
    cube('REVIEW_ROAD_NS',(10,220,.035),(v,0,.006),road);cube('REVIEW_ROAD_EW',(220,10,.035),(0,v,.007),road)
    for k in range(-104,105,8):
        cube('REVIEW_DASH_NS',(.15,3,.012),(v,k,.033),stripe);cube('REVIEW_DASH_EW',(3,.15,.012),(k,v,.034),stripe)
scene=bpy.context.scene;scene['derived_review_assembly']=True;scene['source_of_truth']='assets/dome-city/layout.json and referenced original GLBs';scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True;scene.render.resolution_x=1600;scene.render.resolution_y=1100;scene.render.resolution_percentage=100
scene.world.color=(.22,.26,.30)
def aim(o,p):o.rotation_euler=(Vector(p)-o.location).to_track_quat('-Z','Y').to_euler()
data=bpy.data.cameras.new('REVIEW_CAMERA');camera=bpy.data.objects.new('REVIEW_CAMERA',data);scene.collection.objects.link(camera);camera.location=(225,-270,250);aim(camera,(0,0,3));data.type='ORTHO';data.ortho_scale=335;scene.camera=camera
for name,loc,power,size,col in [('KEY',(-80,-80,180),900000,100,(1,.91,.78)),('FILL',(100,80,140),600000,100,(.65,.83,1))]:
    d=bpy.data.lights.new(name,'AREA');o=bpy.data.objects.new(name,d);scene.collection.objects.link(o);o.location=loc;aim(o,(0,0,0));d.energy=power;d.shape='DISK';d.size=size;d.color=col
bpy.ops.mesh.primitive_plane_add(size=2000,location=(0,0,-.92));bpy.context.object.name='REVIEW_GROUND';bpy.context.object.data.materials.append(floor)
scene.view_settings.view_transform='AgX';scene.render.filepath=str(BASE/'preview.png')
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'source/blender/dome-city.blend'))
bpy.ops.render.render(write_still=True)
