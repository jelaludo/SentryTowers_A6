"""C-08 industrial worker: original C-07-family hard-surface biped and heavy gait."""
import bpy,bmesh,math,json,struct,sys,hashlib
from pathlib import Path
from mathutils import Vector,Matrix,Euler
sys.path.insert(0,str(Path(__file__).resolve().parent))
from build_mechanical_cheetah import CheetahGeometry, COLORS
import c08_worker_motion as motion
from c08_worker_motion import H,PAR,CLIPS,FPS,pose
P=Path(__file__).resolve().parents[2];OUT=P/'assets/c08-worker';OUT.mkdir(exist_ok=True)

def material(i,distance=False):
 names=['Graphite_frame','Ochre_ceramic','Ivory_inserts','Carbon_seals','Titanium','Blue_coated_optics'];m=bpy.data.materials.new('C08_'+names[i]);m.use_nodes=True;s=m.node_tree.nodes.get('Principled BSDF');s.inputs['Base Color'].default_value=(*COLORS[i],1);m.diffuse_color=(*COLORS[i],1);s.inputs['Metallic'].default_value=[.72,.48,.38,.06,.85,.65][i];s.inputs['Roughness'].default_value=[.36,.34,.44,.68,.28,.16][i]
 if i==5:s.inputs['Emission Color'].default_value=(*COLORS[i],1);s.inputs['Emission Strength'].default_value=.35
 if distance:
  s.inputs['Metallic'].default_value=.5;n=m.node_tree.nodes.new('ShaderNodeVertexColor');n.layer_name='Palette';m.node_tree.links.new(n.outputs['Color'],s.inputs['Base Color'])
 return m

class WorkerGeometry(CheetahGeometry):
 def tube(self,*args,**kwargs):
  first=len(self.f);super().tube(*args,**kwargs)
  # Flat axle end caps preserve machined cylinders rather than inflated shading.
  self.smooth[first]=False;self.smooth[first+1]=False

def shape(lod):
 g=WorkerGeometry(lod);g.sides=[24,10,6][lod]
 def plate(points,y,thick,m,b):g.panel([(x,y,z) for x,z in points],thick,m,b)
 def joint(p,r,width,b,sign=1):
  p=Vector(p);ax=Vector((1,0,0));g.tube(p-ax*width/2,p+ax*width/2,r,0,b)
  if lod<2:
   q=p+ax*sign*width/2;g.tube(q,q+ax*sign*.018,r*.87,4,b);g.tube(q+ax*sign*.019,q+ax*sign*.025,r*.63,3,b);g.ring(q+ax*sign*.026,r*.71,.009,(1,0,0),1,b)
   if lod==0:
    for j in range(6):a=j*math.tau/6;g.bolt(q+Vector((sign*.029,math.sin(a)*r*.72,math.cos(a)*r*.72)),b,axis=(sign,0,0))
 def rails(a,b,r,bone):
  a,b=Vector(a),Vector(b);g.tube(a,a.lerp(b,.59),r,0,bone);g.tube(a.lerp(b,.48),b,r*.52,4,bone)
  if lod==0:
   for u in [.10,.22,.53]:g.ring(a.lerp(b,u),r,.004,b-a,4,bone)
 # Deep tapered chest with exposed machinery between individual armored panels.
 g.hull([(-.20,.24,1.82,.22),(-.09,.35,1.82,.25),(.16,.31,1.83,.24)],0,'CHEST')
 for s in [-1,1]:
  points=[(s*.035,2.07),(s*.23,2.08),(s*.34,1.98),(s*.30,1.77),(s*.19,1.63),(s*.055,1.69)]
  plate(points,-.213,.032,2,'CHEST')
  plate([(s*.055,2.015),(s*.305,2.015),(s*.32,1.94),(s*.22,1.90),(s*.055,1.94)],-.243,.018,1,'CHEST')
  g.side_plate([(-.17,2.01),(.10,2.05),(.19,1.88),(.13,1.68),(-.08,1.65),(-.18,1.76)],s*.305,.055,1,'CHEST')
  if lod<2:
   plate([(s*.095,1.84),(s*.21,1.88),(s*.265,1.79),(s*.195,1.66),(s*.095,1.71)],-.242,.016,3,'CHEST')
   g.box((s*.17,-.26,1.755),(.015,.014,.086),5,'CHEST',.002)
   for x,z in [(s*.10,2.04),(s*.25,1.99),(s*.28,1.82),(s*.16,1.69)]:g.bolt((x,-.267,z),'CHEST',axis=(0,-1,0))
   g.hose([(s*.27,-.12,2.01),(s*.35,-.18,1.94),(s*.35,-.18,1.76),(s*.24,-.12,1.61)],.025,3,'CHEST')
   if lod==0:
    for z in [1.79,1.83,1.87,1.91]:g.ring((s*.35,-.18,z),.026,.004,(0,0,1),4,'CHEST')
    for j in range(5):g.box((s*.335,.035,1.76+j*.027),(.018,.10,.011),3,'CHEST',.001)
 # Central removable service hatch and lower crash bar.
 g.box((0,-.225,1.72),(.13,.09,.19),0,'CHEST',.02)
 if lod<2:
  for z in [1.66,1.70,1.74,1.78]:g.box((0,-.277,z),(.095,.008,.012),4,'CHEST',.002)
  g.tube((-.20,-.20,1.60),(.20,-.20,1.60),.021,1,'CHEST')
 # Two rear field-replaceable power packs in ochre roll cages.
 for s in [-1,1]:
  g.box((s*.18,.26,1.86),(.26,.23,.41),0,'CHEST',.025)
  g.box((s*.18,.389,1.87),(.21,.025,.32),3,'CHEST',.012)
  if lod<2:
   for xx in [s*.18-.135,s*.18+.135]:g.tube((xx,.405,1.63),(xx,.405,2.10),.018,1,'CHEST')
   for z in [1.65,2.07]:g.tube((s*.18-.135,.405,z),(s*.18+.135,.405,z),.018,1,'CHEST')
   g.box((s*.18,.412,1.70),(.16,.025,.046),1,'CHEST',.006)
   for z in [1.79,1.84,1.89,1.94]:g.box((s*.18,.408,z),(.15,.016,.012),4,'CHEST',.002)
   for xx in [s*.18-.075,s*.18+.075]:g.bolt((xx,.43,1.70),'CHEST',axis=(0,1,0))
   g.hose([(s*.25,.24,1.64),(s*.28,.24,1.51),(s*.13,.10,1.42)],.021,3,'WAIST')
 # Hydraulic trunk, with open negative space at the waist.
 g.tube((0,0,1.24),(0,0,1.62),.092,3,'WAIST')
 for s in [-1,1]:
  rails((s*.11,-.07,1.24),(s*.17,-.09,1.62),.027,'WAIST')
  if lod<2:
   rails((s*.11,.085,1.25),(s*.17,.10,1.58),.025,'WAIST')
   for z in [1.32,1.40,1.48,1.56]:g.ring((0,0,z),.093,.014,(0,0,1),0,'WAIST')
 g.box((0,-.12,1.36),(.13,.09,.15),2,'WAIST',.012)
 # Pelvis transmission and split protective apron.
 joint((0,0,1.10),.16,.47,'PELVIS')
 g.box((0,-.153,1.11),(.27,.12,.18),1,'PELVIS',.024)
 if lod<2:g.box((0,-.223,1.11),(.11,.023,.10),0,'PELVIS',.007)
 for s in [-1,1]:
  plate([(s*.12,1.21),(s*.255,1.18),(s*.27,1.05),(s*.15,1.00),(s*.11,1.05)],-.178,.035,1,'PELVIS')
 # Small recessed rectangular sensor mast. No anthropomorphic face.
 g.tube((0,-.055,1.99),(0,-.055,2.13),.055,4,'NECK')
 g.hull([(-.205,.073,2.14,.115),(-.09,.10,2.15,.12),(.035,.075,2.14,.105)],0,'HEAD')
 g.hull([(-.22,.065,2.251,.014),(-.07,.101,2.275,.016),(.04,.08,2.25,.014)],2,'HEAD')
 for s in [-1,1]:g.box((s*.084,-.10,2.15),(.025,.19,.205),1,'HEAD',.009)
 g.box((0,-.216,2.14),(.126,.031,.188),3,'HEAD',.015)
 # One blue coated objective and a smaller rangefinder inside the same cassette.
 for x,z,r in [(-.018,2.165,.033),(.028,2.091,.016)]:
  g.tube((x,-.225,z),(x,-.243,z),r*1.25,4,'SENSOR_YAW');g.tube((x,-.245,z),(x,-.248,z),r,5,'SENSOR_YAW')
  if lod==0:g.ring((x,-.25,z),r,.003,(0,1,0),0,'SENSOR_YAW')
 if lod<2:
  for s in [-1,1]:g.tube((s*.115,-.215,2.04),(s*.115,-.20,2.28),.012,0,'HEAD')
  g.tube((-.115,-.20,2.28),(.115,-.20,2.28),.012,0,'HEAD')
 # Massive separate shoulder yokes and layered arm armor.
 for side,s in [('L',1),('R',-1)]:
  b='SHOULDER_'+side;joint(H[b],.16,.19,b,s)
  g.side_plate([(-.14,2.095),(.12,2.09),(.19,1.95),(.12,1.80),(-.15,1.80),(-.20,1.96)],s*.535,.065,1,b)
  if lod<2:
   # Front shoulder cap and matching service tab provide broad manufacturing surfaces.
   plate([(s*.43,2.075),(s*.59,2.06),(s*.65,1.98),(s*.62,1.84),(s*.54,1.83),(s*.45,1.96)],-.17,.027,2,b)
   g.box((s*.55,-.193,2.02),(.10,.018,.038),1,b,.004)
   for z in [1.875,1.91,1.945]:g.box((s*.598,-.192,z),(.024,.012,.010),3,b,.001)
   if lod==0:
    for z in [1.86,2.025]:g.bolt((s*.61,-.19,z),b,axis=(0,-1,0))
   g.label('C-08',(s*.602,-.075,1.99),b,s,.058)
   g.label('WORKS',(s*.604,-.062,1.925),b,s,.025)
  for j,(bone,end,width,r) in enumerate([('UPPER_ARM_'+side,'FOREARM_'+side,.12,.095),('FOREARM_'+side,'HAND_'+side,.105,.10)]):
   a,c=H[bone],H[end];joint(a,r,.16,bone,s);g.strut(a.lerp(c,.16),a.lerp(c,.88),width,0,bone)
   g.shell(a,c,width,2 if j==0 else 1,bone,s,offset=.07)
   # Forward-facing long ivory panels leave an exposed piston channel on the inside.
   p=a.lerp(c,.22);q=a.lerp(c,.76)
   g.box((p+q)/2+Vector((0,-.07,0)),(.13,.045,(q-p).length),2,bone,.01,(c-a).to_track_quat('Z','Y').to_euler())
   if lod<2:
    # Forearm dark inset, narrow ribs and contrasting end cuff.
    mid=a.lerp(c,.54)
    g.box(mid+Vector((0,-.102,0)),(.055,.012,.12),0,bone,.005,(c-a).to_track_quat('Z','Y').to_euler())
    for t in [.43,.51,.59]:g.box(a.lerp(c,t)+Vector((0,-.112,0)),(.043,.009,.012),4,bone,.002)
    off=Vector((-s*.055,-.02,0));rails(a.lerp(c,.15)+off,a.lerp(c,.86)+off,.022,bone)
    if lod==0:
     g.hose([a+Vector((s*.03,.08,0)),a.lerp(c,.5)+Vector((s*.04,.09,0)),c+Vector((s*.02,.06,.03))],.016,3,bone)
     for f in [.30,.66]:
      v=a.lerp(c,f)+Vector((0,-.099,0));g.bolt(v,bone,axis=(0,-1,0))
  hand='HAND_'+side;joint(H[hand],.062,.16,hand,s);g.box(H[hand]+Vector((0,0,-.055)),(.19,.085,.135),0,hand,.014)
  g.box(H[hand]+Vector((0,-.054,-.052)),(.16,.025,.09),2,hand,.008)
  for i in range(4):
   n=f'FINGER_{side}{i+1}_01';nn=f'FINGER_{side}{i+1}_02';a,c=H[n],H[nn];end=c+Vector((0,-.022,-.052))
   g.strut(a,c,.032,4,n)
   g.strut(c,end,.029,0,nn)
   if lod<2:
    joint(a,.021,.035,n,s);joint(c,.020,.033,nn,s);g.box(c+Vector((0,.004,-.022)),(.024,.027,.033),3,nn,.004)
  a,c=H['THUMB_'+side+'_01'],H['THUMB_'+side+'_02'];g.strut(a,c,.043,4,'THUMB_'+side+'_01');g.strut(c,c+Vector((s*.013,-.027,-.046)),.036,0,'THUMB_'+side+'_02')
  # Hip/thigh and knee/shin share C-07's axle caps and floating sculpted shell forms.
  for j,(bone,end,width) in enumerate([('HIP_'+side,'KNEE_'+side,.13),('KNEE_'+side,'ANKLE_'+side,.11)]):
   a,c=H[bone],H[end];joint(a,.135 if j==0 else .115,.22 if j==0 else .18,bone,s)
   g.strut(a.lerp(c,.14),a.lerp(c,.89),.12 if j==0 else .10,0,bone)
   g.shell(a,c,width,2 if j==0 else 1,bone,s,offset=.09 if j==0 else .07)
   p=a.lerp(c,.21);q=a.lerp(c,.82)
   plate([(p.x-.09,p.z+.02),(p.x+.09,p.z+.015),(q.x+.075,q.z-.02),(q.x-.075,q.z-.02)],-.185 if j==0 else -.13,.032,2,bone)
   if j==1:g.box((a.x,-.205,a.z-.04),(.17,.07,.16),1,bone,.02)
   if lod<2:
    yy=-.207 if j==0 else -.152
    # Raised removable cassette, recessed seam strips, and load-rated orange end tab.
    mid=a.lerp(c,.49)
    g.box((mid.x,yy,mid.z),(.092,.012,.145),0,bone,.007)
    g.box((mid.x,yy-.009,mid.z+.012),(.072,.012,.098),2,bone,.004)
    for f in [.30,.72]:
     v=a.lerp(c,f);g.box((v.x,yy,v.z),(.12,.012,.012),3,bone,.002)
    v=a.lerp(c,.78);g.box((v.x,yy-.003,v.z),(.10,.014,.03),1,bone,.003)
    for xs in [-1,1]:
     off=Vector((xs*.078,.025,0));rails(a.lerp(c,.14)+off,a.lerp(c,.89)+off,.024,bone)
    if lod==0:
     g.hose([a+Vector((0,.10,-.03)),a.lerp(c,.5)+Vector((0,.13,0)),c+Vector((0,.08,.03))],.019,3,bone)
     for f in [.30,.72]:
      v=a.lerp(c,f);v.y=(-.205 if j==0 else -.15);g.bolt(v,bone,axis=(0,-1,0))
  b='ANKLE_'+side;a=H[b];joint(a,.085,.18,b,s)
  # Flat rubber sole (6 mm clearance), broad heel, and split armored toe pieces.
  g.box((a.x,-.07,.041),(.31,.45,.070),3,b,.008)
  start=len(g.v);g.hull([(.13,.12,.087,.043),(-.02,.145,.13,.066),(-.19,.15,.101,.049),(-.30,.135,.072,.029)],0,b)
  for v in g.v[start:]:v.x+=a.x
  g.box((a.x,-.045,.17),(.17,.18,.058),1,b,.012)
  for k in [-1,0,1]:
   xx=a.x+k*.09;g.box((xx,-.237,.107),(.079,.132,.042),2 if k==0 else 1,'TOE_'+side,.009)
   if lod<2:g.box((xx,-.302,.065),(.061,.018,.026),4,'TOE_'+side,.003)
  if lod<2:
   for z in [.08,.12]:g.bolt((a.x+s*.151,-.05,z),b,axis=(s,0,0))
   for k in range(5):g.box((a.x,.10-k*.075,.013),(.28,.018,.009),0,b,.002)
 return g


def make_arm(col):
 d=bpy.data.armatures.new('C08_BIPED_SKELETON');arm=bpy.data.objects.new('C08_RIG',d);col.objects.link(arm);bpy.context.view_layer.objects.active=arm;arm.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
 for n in H:
  b=d.edit_bones.new(n);b.head=H[n];b.tail=H[n]+Vector((0,0,.035));b.use_deform=not n.startswith('SOCKET_')
  if PAR[n]:b.parent=d.edit_bones[PAR[n]]
 bpy.ops.object.mode_set(mode='OBJECT');arm.show_in_front=True;arm['rig']='C08 original industrial biped; rigid armor, constant-length leg IK, articulated fingers and sensor gimbal';return arm


def make_skin(g,col,arm,lod):
 d=bpy.data.meshes.new('C08_GEOMETRY');d.from_pydata(g.v,[],g.f);d.update();o=bpy.data.objects.new('C08_SKIN',d);col.objects.link(o)
 if lod==2:
  d.materials.append(material(0,True));colors=d.color_attributes.new(name='Palette',type='FLOAT_COLOR',domain='CORNER')
  for p,m in zip(d.polygons,g.mi):
   for li in p.loop_indices:colors.data[li].color=(*COLORS[m],1)
 else:
  for i in range(6):d.materials.append(material(i))
  for p,m,sm in zip(d.polygons,g.mi,g.smooth):p.material_index=m;p.use_smooth=sm
 bm=bmesh.new();bm.from_mesh(d);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(d);bm.free()
 if lod<2:
  for n in H:
   indices=[i for i,b in enumerate(g.b) if b==n]
   if indices:o.vertex_groups.new(name=n).add(indices,1,'REPLACE')
  mod=o.modifiers.new('C08_RigidArmor','ARMATURE');mod.object=arm
 return o


def animate(arm):
 arm.animation_data_create()
 for clip in CLIPS:
  action=bpy.data.actions.new(clip['name']);arm.animation_data.action=action;frames=round(clip['duration_s']*FPS)
  for frame in range(frames+1):
   pos,ori=pose(clip['name'],frame/FPS);matrices={}
   for n in H:
    bone=arm.data.bones[n];parent=PAR[n];matrix=Matrix.Translation(pos[n])@ori[n].to_matrix().to_4x4()@bone.matrix_local.to_3x3().to_4x4();matrices[n]=matrix
    args=dict(parent_matrix=matrices[parent],parent_matrix_local=arm.data.bones[parent].matrix_local) if parent else {}
    pb=arm.pose.bones[n];pb.rotation_mode='QUATERNION';pb.matrix_basis=bone.convert_local_to_pose(matrix,bone.matrix_local,invert=True,**args)
    if n.startswith('SOCKET_') or n=='SENSOR_YAW':continue
    pb.keyframe_insert(data_path='location',frame=frame);pb.keyframe_insert(data_path='rotation_quaternion',frame=frame)
  for layer in action.layers:
   for strip in layer.strips:
    for bag in strip.channelbags:
     for curve in bag.fcurves:
      for p in curve.keyframe_points:p.interpolation='LINEAR'
  arm.animation_data.action=None;tr=arm.animation_data.nla_tracks.new();tr.name=clip['name'];tr.strips.new(clip['name'],0,action);tr.mute=True;print('ACTION',clip['name'],flush=True)
 for pb in arm.pose.bones:pb.matrix_basis=Matrix.Identity(4)
 for tr in arm.animation_data.nla_tracks:tr.mute=False


def build():
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 scene=bpy.context.scene;scene.name='C08_INDUSTRIAL_WORKER';scene.render.fps=FPS;scene.frame_start=0;scene.frame_end=600;assets=[]
 for lod in [0,1,2]:
  col=bpy.data.collections.new('C08_LOD'+str(lod));scene.collection.children.link(col);root=bpy.data.objects.new('ROOT',None);col.objects.link(root);root['forward']='+Z in glTF';root['damage_level']=0
  g=shape(lod);arm=make_arm(col);arm.parent=root;skin=make_skin(g,col,arm,lod)
  if lod<2:animate(arm)
  bpy.ops.object.select_all(action='DESELECT')
  for o in col.objects:o.select_set(True)
  scene.frame_set(0);path=OUT/f'c08_d0_lod{lod}.glb'
  bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_extras=True,export_animations=lod<2,export_animation_mode='NLA_TRACKS',export_frame_range=False,export_force_sampling=True,export_cameras=False,export_lights=False)
  raw=path.read_bytes();n=struct.unpack_from('<I',raw,12)[0];doc=json.loads(raw[20:20+n]);e=dict(file=path.name,lod=lod,damage_level=0,static=lod==2,derived=False,bytes=len(raw),triangles=sum(doc['accessors'][p['indices']]['count']//3 for m in doc.get('meshes',[]) for p in m['primitives']),draw_calls=sum(len(m['primitives']) for m in doc.get('meshes',[])),plot_m=[1.6,1.3],clips=CLIPS if lod<2 else [],credit='Models by jelaludo');assets.append(e);print('EXPORT',e,flush=True)
  if lod==0:
   for tr in arm.animation_data.nla_tracks:tr.mute=tr.name!='Standby_Idle'
   scene.frame_set(0)
   for screen in bpy.data.screens:
    for area in screen.areas:
     if area.type=='VIEW_3D':area.spaces.active.region_3d.view_location=(0,0,1.2);area.spaces.active.region_3d.view_distance=4.;area.spaces.active.shading.type='MATERIAL'
   bpy.ops.wm.save_as_mainfile(filepath=str(P/'source/blender/a6-c08-worker.blend'))
  for o in list(col.objects):bpy.data.objects.remove(o,do_unlink=True)
  bpy.data.collections.remove(col)
  for data in [bpy.data.armatures,bpy.data.actions,bpy.data.meshes,bpy.data.materials,bpy.data.curves]:
   for item in list(data):
    if item.users==0:data.remove(item)
 manifest=dict(family='c08-worker',label='C-08 / Industrial Worker',plain_glb_source_of_truth=True,coordinate_system=dict(units='metres',up='+Y',forward='+Z',origin='ground at standing hip centre'),damage_states={'d0':'intact only'},animation=dict(fps=FPS,skeleton_joints=len(H),placement_node='instance wrapper around complete glTF scene',motion_node='MOTION',engine_driven_excluded=['SENSOR_YAW'],gait='Original alternating biped gait: heel contact, flat support, toe roll and swing; double support, lateral weight transfer, counter-rotation and delayed arms; not a force simulation'),lod_selection=dict(initial=2,approach_distance_m=30,hysteresis_m=8,lod0='Detailed recording master',lod1='All animated gameplay; retain while moving',lod2='Static standing map/loading silhouette; no animation'),assets=assets)
 (OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');print('MAX_REACH_ERROR',motion.MAX_REACH_ERROR,flush=True);print('C08_COMPLETE',flush=True)
if __name__=='__main__':build()
