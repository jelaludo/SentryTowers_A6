"""Review-only lighting/cameras; not part of the authored asset."""
import bpy,sys
from pathlib import Path
from mathutils import Vector
P=Path(__file__).resolve().parents[2];OUT=P/'assets/eva-k7'
bpy.ops.wm.open_mainfile(filepath=str(P/'source/blender/a6-eva-k7.blend'))
s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.samples=24;s.cycles.use_denoising=True;s.render.resolution_x=1200;s.render.resolution_y=1100;s.render.resolution_percentage=100;s.view_settings.view_transform='AgX'
s.world.use_nodes=True;s.world.node_tree.nodes['Background'].inputs[0].default_value=(.15,.17,.19,1);s.world.node_tree.nodes['Background'].inputs[1].default_value=.55

def aim(o,p):o.rotation_euler=(Vector(p)-o.location).to_track_quat('-Z','Y').to_euler()
for name,loc,power,size,color in [('Key',(3,-4,4),700,4,(1,.92,.80)),('Fill',(-3,-2,2.5),480,4,(.74,.86,1)),('Rim',(1,3,3.5),900,3,(1,.94,.82))]:
 d=bpy.data.lights.new(name,'AREA');o=bpy.data.objects.new(name,d);s.collection.objects.link(o);o.location=loc;d.energy=power;d.shape='DISK';d.size=size;d.color=color;aim(o,(0,0,1.0))
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.002));floor=bpy.context.object;floor.name='REVIEW_GROUND';m=bpy.data.materials.new('Studio_floor');m.use_nodes=True;m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.09,.10,.105,1);m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.8;floor.data.materials.append(m)
d=bpy.data.cameras.new('REVIEW_CAMERA');cam=bpy.data.objects.new('REVIEW_CAMERA',d);s.collection.objects.link(cam);d.type='ORTHO';s.camera=cam;arm=bpy.data.objects['EVAK7_RIG']
poses=[('preview','Suit_Idle',0,'hero'),('front','Suit_Idle',0,'front'),('rear','Suit_Idle',0,'rear'),('helmet-detail','Suit_Idle',0,'helmet'),('chest-detail','Suit_Idle',0,'chest'),('gloves-detail','Suit_Idle',0,'gloves'),('boots-detail','Suit_Idle',0,'boots'),('tank-detail','Suit_Idle',0,'tank'),('walk','Walk_Cycle',.49,'hero'),('cautious','Cautious_Walk_Cycle',.70,'hero'),('scan','Survey_Scan',1.8,'hero'),('inspect','Kneel_Inspect',2.4,'hero'),('signal','Signal_Halt',2.4,'hero')]
if '--hero' in sys.argv:poses=[p for p in poses if p[0]=='preview']
if '--pose' in sys.argv:poses=[p for p in poses if p[0]==sys.argv[sys.argv.index('--pose')+1]]
if '--gait-study' in sys.argv:poses=[('step-'+str(i),'Walk_Cycle',t,'side') for i,t in enumerate([0,.104,.325,.65,.845,.975])]
for file,clip,t,view in poses:
 for tr in arm.animation_data.nla_tracks:tr.mute=tr.name!=clip
 s.frame_set(int(t*s.render.fps),subframe=t*s.render.fps%1)
 cam.location=Vector({'hero':(3,-5,2.2),'front':(0,-6,1.0),'rear':(-3,5,2.2),'helmet':(1.6,-3,1.95),'side':(5,-.15,1.0),'chest':(1.2,-3,1.55),'gloves':(1.4,-3,.95),'boots':(2,-4,.35),'tank':(-1.4,3,1.75)}[view]);target,scale={'helmet':((0,-.02,1.78),.56),'chest':((0,-.05,1.36),.72),'gloves':((.40,-.08,.86),.52),'boots':((0,-.03,.14),.78),'tank':((0,.15,1.50),.80)}.get(view,((0,0,.99),2.46));aim(cam,target);d.ortho_scale=scale
 s.render.filepath=str(OUT/(file+'.png'));bpy.ops.render.render(write_still=True)
print('EVAK7_REVIEW_COMPLETE',flush=True)
