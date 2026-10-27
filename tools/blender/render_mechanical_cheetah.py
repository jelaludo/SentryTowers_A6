"""Derived C-07 beauty and side-on locomotion review renders from authored Blender master."""
import bpy,sys
from pathlib import Path
from mathutils import Vector
P=Path(__file__).resolve().parents[2];OUT=P/'assets/mechanical-cheetah'
bpy.ops.wm.open_mainfile(filepath=str(P/'source/blender/a6-mechanical-cheetah.blend'))
s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.samples=24;s.cycles.use_denoising=True;s.render.resolution_x=1300;s.render.resolution_y=850;s.render.resolution_percentage=100;s.view_settings.view_transform='AgX'
s.world.use_nodes=True;s.world.node_tree.nodes['Background'].inputs[0].default_value=(.15,.17,.19,1);s.world.node_tree.nodes['Background'].inputs[1].default_value=.65

def aim(o,p):o.rotation_euler=(Vector(p)-o.location).to_track_quat('-Z','Y').to_euler()
for name,loc,power,size,color in [('Key',(2,-3,4),370,3,(1,.92,.79)),('Fill',(-3,-1,2.2),230,3,(.74,.86,1)),('Rim',(0,3,3),400,2.4,(1,.94,.82))]:
 d=bpy.data.lights.new(name,'AREA');o=bpy.data.objects.new(name,d);s.collection.objects.link(o);o.location=loc;d.energy=power;d.shape='DISK';d.size=size;d.color=color;aim(o,(0,.2,.45))
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.003));floor=bpy.context.object;floor.name='REVIEW_GROUND';m=bpy.data.materials.new('Warm_graphite_studio');m.use_nodes=True;m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.09,.10,.105,1);m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.8;floor.data.materials.append(m)
d=bpy.data.cameras.new('REVIEW_CAMERA');cam=bpy.data.objects.new('REVIEW_CAMERA',d);s.collection.objects.link(cam);d.type='ORTHO';s.camera=cam;arm=bpy.data.objects['C07_RIG']
poses=[('preview','Watch_Idle',0,'hero'),('walk','Feline_Walk_Cycle',.4,'hero'),('stalk','Stalk_Cycle',.7,'hero'),('fore-support','Gallop_Cycle',.052,'side'),('gathered','Gallop_Cycle',.148,'side'),('hind-support','Gallop_Cycle',.244,'side'),('extended','Gallop_Cycle',.348,'side'),('sit','Sit_Down',2.4,'hero'),('pounce','Pounce',1.0775,'hero'),('roll','Roll_Over',2.6,'hero'),('hand','Give_Paw',2.1,'hero')]
if '--hero' in sys.argv:poses=poses[:1]
if '--social-study' in sys.argv:poses=[('social-sit','Sit_Down',2.4,'hero'),('social-offer','Give_Paw',1.65,'hero'),('social-shake','Give_Paw',2.1,'hero'),('social-roll-side','Roll_Over',1.97,'hero'),('social-roll-back','Roll_Over',2.6,'hero'),('social-recover','Roll_Over',5.4,'hero')]
if '--jump-study' in sys.argv:
 sys.path.insert(0,str(Path(__file__).resolve().parent))
 from quadruped_motion import JUMPS
 poses=[('jump-'+name,'Pounce',t,'side') for name,t in JUMPS['cheetah']['landmarks_s'].items()]

if '--jump-study' in sys.argv:
 marks=bpy.data.materials.new('Review_distance_marks');marks.diffuse_color=(.18,.30,.36,1)
 for i in range(5):
  bpy.ops.mesh.primitive_cube_add(size=1,location=(0,-3*i/4,-.001))
  o=bpy.context.object;o.name='REVIEW_DISTANCE_'+str(i);o.dimensions=(.65 if i%4==0 else .35,.012,.002);o.data.materials.append(marks)
 # Broad lighting covers the fixed takeoff-to-landing frame.
 for o in s.objects:
  if o.type=='LIGHT':o.location.y+=-1.2;o.data.size*=1.5;o.data.energy*=1.5;aim(o,(0,-1.2,.5))

if '--pose' in sys.argv:poses=[p for p in poses if p[0]==sys.argv[sys.argv.index('--pose')+1]]
for file,clip,t,view in poses:
 for tr in arm.animation_data.nla_tracks:tr.mute=tr.name!=clip
 s.frame_set(int(t*s.render.fps),subframe=t*s.render.fps%1);base=arm.pose.bones['MOTION'].head.copy()
 cam.location=base+Vector((3.6,.30,1.0) if view=='side' else (2.3,-3.25,1.65));aim(cam,base+Vector((0,.30,.58 if clip=='Pounce' else .47)));d.ortho_scale=3.15 if view=='side' else 2.85
 if '--jump-study' in sys.argv:cam.location=Vector((5,-1.2,1.1));aim(cam,(0,-1.2,.70));d.ortho_scale=6.2
 s.render.filepath=str(OUT/(file+'.png'));bpy.ops.render.render(write_still=True)
print('CHEETAH_REVIEW_COMPLETE',flush=True)
