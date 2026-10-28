"""B-REK37: lean C-07-family reconnaissance biped."""
import bpy,bmesh,math,json,struct,sys,hashlib
from pathlib import Path
from mathutils import Vector,Matrix,Euler
sys.path.insert(0,str(Path(__file__).resolve().parent))
from build_mechanical_cheetah import CheetahGeometry
import b_rek37_motion as motion
from b_rek37_motion import H,PAR,CLIPS,FPS,pose
P=Path(__file__).resolve().parents[2];OUT=P/'assets/b-rek37';OUT.mkdir(exist_ok=True)

COLORS=[(.025,.036,.042),(.026,.047,.082),(.62,.65,.61),(.009,.014,.018),(.26,.31,.33),(.035,.40,.76)]

def material(i,distance=False):
 names=['Graphite_frame','Navy_ceramic','Ivory_inserts','Carbon_seals','Titanium','Blue_coated_optics'];m=bpy.data.materials.new('BREK37_'+names[i]);m.use_nodes=True;s=m.node_tree.nodes.get('Principled BSDF');s.inputs['Base Color'].default_value=(*COLORS[i],1);m.diffuse_color=(*COLORS[i],1);s.inputs['Metallic'].default_value=[.72,.62,.48,.06,.85,.65][i];s.inputs['Roughness'].default_value=[.36,.34,.44,.68,.28,.16][i]
 if i==5:s.inputs['Emission Color'].default_value=(*COLORS[i],1);s.inputs['Emission Strength'].default_value=.35
 if distance:
  s.inputs['Metallic'].default_value=.5;n=m.node_tree.nodes.new('ShaderNodeVertexColor');n.layer_name='Palette';m.node_tree.links.new(n.outputs['Color'],s.inputs['Base Color'])
 return m

class ReconGeometry(CheetahGeometry):
 def tube(self,*args,**kwargs):
  first=len(self.f);super().tube(*args,**kwargs)
  # Flat axle end caps preserve machined cylinders rather than inflated shading.
  self.smooth[first]=False;self.smooth[first+1]=False

def shape(lod):
 g=ReconGeometry(lod);g.sides=[28,10,6][lod]
 def plate(points,y,thick,m,b):
  if lod==2:g.panel([(x,y,z) for x,z in points],thick,m,b);return
  bm=bmesh.new();verts=[bm.verts.new((x,y+dy,z)) for dy in [-thick/2,thick/2] for x,z in points];n=len(points)
  for ids in [tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]:bm.faces.new([verts[i] for i in ids])
  bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bmesh.ops.bevel(bm,geom=list(bm.edges),offset=min(.003,thick*.16),segments=2 if lod==0 else 1,affect='EDGES',clamp_overlap=True)
  bm.verts.ensure_lookup_table();g.add([v.co for v in bm.verts],[[v.index for v in f.verts] for f in bm.faces],m,b);bm.free()
 def joint(p,r,width,b,s=1):
  p=Vector(p);ax=Vector((1,0,0));g.tube(p-ax*width/2,p+ax*width/2,r,0,b)
  if lod<2:
   q=p+ax*s*width/2;g.tube(q,q+ax*s*.011,r*.88,4,b);g.tube(q+ax*s*.012,q+ax*s*.018,r*.63,3,b);g.ring(q+ax*s*.019,r*.69,.004,(1,0,0),4,b)
   if r>.03:
    q2=p-ax*s*width/2;g.tube(q2,q2-ax*s*.006,r*.88,4,b);g.tube(q2-ax*s*.007,q2-ax*s*.010,r*.63,3,b);g.ring(q2-ax*s*.011,r*.71,.003,(1,0,0),4,b)
   if lod==0:
    g.tube(q+ax*s*.019,q+ax*s*.024,r*.23,0,b,sides=12)
    for j in range(6):
     a=j*math.tau/6;g.bolt(q+Vector((s*.020,math.sin(a)*r*.75,math.cos(a)*r*.75)),b,axis=(s,0,0))
 def rail(a,b,r,bone):
  a,b=Vector(a),Vector(b);g.tube(a,a.lerp(b,.57),r,0,bone);g.tube(a.lerp(b,.46),b,r*.50,4,bone)
  if lod==0:
   for f in [.10,.47,.56]:g.ring(a.lerp(b,f),r,.003,b-a,4,bone)
 def front_strip(x,y,z,length,b):
  if lod<2:g.box((x,y,z),(.025,.014,length+.022),3,b,.003);g.box((x,y-.009,z),(.008,.007,length),5,b,.002)
 # An open spine and two diagonal rib beams carry separate armor leaves.
 g.tube((0,.012,1.72),(0,.012,2.04),.075,3,'CHEST')
 for s in [-1,1]:
  g.strut((s*.07,0,1.73),(s*.245,0,2.00),.073,0,'CHEST')
  plate([(s*.015,2.046),(s*.15,2.055),(s*.252,1.979),(s*.204,1.931),(s*.047,1.969)],-.122,.031,1,'CHEST')
  plate([(s*.047,1.951),(s*.199,1.915),(s*.179,1.804),(s*.086,1.729),(s*.026,1.831)],-.126,.029,1,'CHEST')
  plate([(s*.217,1.922),(s*.248,1.952),(s*.224,1.846),(s*.192,1.795)],-.128,.024,1,'CHEST')
  if lod<2:
   g.tube((s*.145,-.10,1.80),(s*.215,-.10,1.94),.024,0,'CHEST')
   for j in range(3):g.box((s*(.095+j*.030),-.145,1.956-j*.009),(.016,.018,.011),4,'CHEST',.002)
  plate([(s*.033,2.071),(s*.148,2.078),(s*.239,2.013),(s*.188,1.983),(s*.042,2.025)],-.14,.018,1,'CHEST')
  g.side_plate([(-.105,2.015),(.055,2.02),(.118,1.91),(.075,1.77),(-.067,1.76),(-.13,1.86)],s*.215,.031,1,'CHEST')
  plate([(s*.157,1.965),(s*.226,1.936),(s*.193,1.836),(s*.146,1.792),(s*.116,1.821)],-.149,.017,2,'CHEST')
  if lod<2:
   for x,z in [(s*.06,2.032),(s*.21,1.97),(s*.18,1.85),(s*.087,1.75)]:g.bolt((x,-.155,z),'CHEST',axis=(0,-1,0))
   g.hose([(s*.175,.05,2.02),(s*.255,.065,1.91),(s*.23,.085,1.72),(s*.12,.04,1.68)],.011,3,'CHEST')
   for j in range(3 if lod==1 else 6):g.box((s*.224,.018,1.82+j*.018),(.014,.084,.006),3,'CHEST',.001)
 front_strip(0,-.149,1.857,.08,'CHEST')
 # Two short spinal cartridges retain negative space around the waist.
 for bone,a,b in [('WAIST',(0,0,1.58),(0,0,1.78)),('PELVIS',(0,0,1.41),(0,0,1.58))]:
  g.tube(a,b,.045,0,bone)
  if lod<2:
   for s in [-1,1]:rail(Vector(a)+Vector((s*.063,-.005,0)),Vector(b)+Vector((s*.063,-.005,0)),.017,bone)
   for z in [a[2]+.035,b[2]-.035]:g.ring((0,0,z),.047,.006,(0,0,1),4,bone)
  if lod==0:
   for s in [-1,1]:g.hose([(s*.055,.045,a[2]),(s*.075,.07,(a[2]+b[2])/2),(s*.05,.045,b[2])],.009,3,bone)
 g.tube((-.155,0,1.38),(.155,0,1.38),.080,0,'PELVIS')
 for s in [-1,1]:
  plate([(s*.02,1.52),(s*.13,1.515),(s*.18,1.43),(s*.13,1.32),(s*.045,1.28)],-.096,.023,1,'PELVIS')
  plate([(s*.025,1.39),(s*.11,1.36),(s*.075,1.27),(s*.018,1.30)],-.114,.014,2,'PELVIS')
  if lod<2:g.bolt((s*.11,-.114,1.47),'PELVIS',axis=(0,-1,0))
 # Compact dorsal recon electronics, recessed heat exchanger, protected antenna root.
 g.box((0,.151,1.921),(.235,.122,.325),0,'CHEST',.02)
 g.box((0,.22,1.935),(.202,.028,.273),1,'CHEST',.012)
 if lod<2:
  for j in range(8 if lod==0 else 4):g.box((0,.237,1.84+j*(.022 if lod==0 else .044)),(.13,.012,.007),3,'CHEST',.001)
  for s in [-1,1]:g.tube((s*.108,.19,1.79),(s*.108,.19,2.07),.012,4,'CHEST');g.bolt((s*.073,.241,2.045),'CHEST',axis=(0,1,0))
 g.tube((.103,.17,2.07),(.103,.17,2.16),.018,0,'CHEST')
 g.tube((.103,.17,2.16),(.103,.17,2.425),.006,3,'CHEST',r1=.003)
 g.tube((-.093,.17,2.07),(-.093,.17,2.23),.005,3,'CHEST',r1=.003)
 # Exposed neck: long slim cervical link and paired actuator rods.
 g.tube((0,-.025,2.075),(0,-.055,2.265),.029,0,'NECK')
 if lod<2:
  for s in [-1,1]:
   rail((s*.039,-.05,2.108),(s*.041,-.075,2.24),.012,'NECK')
   g.hose([(s*.028,.005,2.115),(s*.049,.008,2.18),(s*.03,-.01,2.25)],.009,3,'NECK')
 joint((0,-.06,2.225),.032,.094,'HEAD')
 # Small asymmetric multi-aperture head. The lens pod has an independent yaw pivot.
 g.box((0,-.065,2.286),(.241,.177,.156),0,'HEAD',.022)
 g.hull([(.025,.085,2.315,.045),(-.075,.12,2.34,.027),(-.159,.09,2.329,.016)],1,'HEAD')
 g.box((0,-.164,2.278),(.23,.047,.145),3,'SENSOR_YAW',.018)
 for x,z,r in [(-.063,2.297,.045),(.055,2.321,.024),(.073,2.251,.021),(-.009,2.235,.017)]:
  g.tube((x,-.184,z),(x,-.222,z),r*1.22,0,'SENSOR_YAW')
  if lod<2:g.ring((x,-.224,z),r*1.03,.004,(0,1,0),4,'SENSOR_YAW');g.tube((x,-.223,z),(x,-.229,z),r*.91,3,'SENSOR_YAW')
  g.tube((x,-.230,z),(x,-.232,z),r*.74,5,'SENSOR_YAW')
  if lod==0:g.ellipsoid((x,-.235,z),(r*.55,.007,r*.55),5,'SENSOR_YAW');g.ring((x,-.235,z),r*.50,.002,(0,1,0),0,'SENSOR_YAW');g.tube((x,-.242,z),(x,-.243,z),r*.28,3,'SENSOR_YAW')
 front_strip(.018,-.198,2.277,.048,'SENSOR_YAW')
 for s in [-1,1]:
  g.side_plate([(-.15,2.346),(-.01,2.348),(.035,2.30),(.023,2.235),(-.065,2.218),(-.15,2.244)],s*.12,.009,2,'HEAD')
  if lod<2:
   joint((s*.121,-.045,2.282),.031,.013,'HEAD',s)
   for y,z in [(-.118,2.326),(.012,2.267)]:g.bolt((s*.134,y,z),'HEAD',axis=(s,0,0))
   if lod==0:
    for j in range(4):g.box((s*.134,-.03+j*.012,2.331),(.006,.005,.013),3,'HEAD',.001)
 # Light shoulder petals, narrow arms and mechanically articulate hands.
 for side,s in [('L',1),('R',-1)]:
  b='SHOULDER_'+side;p=H[b];joint(p,.092,.12,b,s)
  g.side_plate([(-.065,2.087),(.035,2.091),(.099,2.025),(.087,1.92),(.015,1.881),(-.067,1.925),(-.102,2.02)],s*.413,.020,1,b)
  plate([(s*.278,2.075),(s*.355,2.094),(s*.403,2.031),(s*.385,1.965),(s*.334,1.984)],-.091,.022,1,b)
  if lod<2:
   g.side_plate([(.043,2.075),(.096,2.018),(.079,1.952),(.044,1.971)],s*.39,.009,2,b)
   g.label('B-37',(s*.410,-.007,2.003),b,s,.025)
  for j,(bone,end,w) in enumerate([('UPPER_ARM_'+side,'FOREARM_'+side,.061),('FOREARM_'+side,'HAND_'+side,.064)]):
   a,c=H[bone],H[end];joint(a,.064 if j==0 else .058,.09,bone,s)
   g.strut(a.lerp(c,.1),a.lerp(c,.9),.053,0,bone)
   g.shell(a.lerp(c,.10),a.lerp(c,.90),w,1,bone,s,offset=.039)
   p=a.lerp(c,.20);q=a.lerp(c,.79)
   plate([(p.x-.04,p.z),(p.x+.045,p.z+.012),(q.x+.035,q.z),(q.x-.027,q.z-.016)],-.074 if j==0 else -.089,.019,1,bone)
   if lod<2:
    for xs in [-1,1]:
     off=Vector((xs*.032,.019,0));rail(a.lerp(c,.17)+off,a.lerp(c,.87)+off,.011,bone)
    if j==1:front_strip((p.x+q.x)/2,-.104,(p.z+q.z)/2,.125,bone)
    for f in [.25,.76]:g.bolt(a.lerp(c,f)+Vector((s*.057,0,0)),bone,axis=(s,0,0))
   if lod==0:g.hose([a+Vector((0,.041,-.035)),a.lerp(c,.5)+Vector((0,.056,0)),c+Vector((0,.025,.026))],.008,3,bone)
  b='HAND_'+side;a=H[b];joint(a,.036,.083,b,s);g.box(a+Vector((0,0,-.048)),(.109,.052,.092),0,b,.009);g.box(a+Vector((0,-.031,-.044)),(.087,.016,.068),1,b,.005)
  for i in range(4):
   n=f'FINGER_{side}{i+1}_01';nn=f'FINGER_{side}{i+1}_02';a,c=H[n],H[nn]
   g.strut(a,c,.018,4,n);g.strut(c,c+Vector((0,-.016,-.045)),.017,0,nn)
   if lod<2:joint(a,.013,.019,n,s);joint(c,.012,.018,nn,s)
  n='THUMB_'+side+'_01';nn='THUMB_'+side+'_02';a,c=H[n],H[nn];g.strut(a,c,.023,4,n);g.strut(c,c+Vector((s*.005,-.018,-.037)),.021,0,nn)
  # Long thighs, even longer exposed lower leg actuators; no oversized boots.
  for j,(bone,end) in enumerate([('HIP_'+side,'KNEE_'+side),('KNEE_'+side,'ANKLE_'+side)]):
   a,c=H[bone],H[end];joint(a,.089 if j==0 else .075,.14 if j==0 else .12,bone,s)
   g.strut(a.lerp(c,.12),a.lerp(c,.91),.065 if j==0 else .039,0,bone)
   g.shell(a.lerp(c,.08),a.lerp(c,.81 if j==0 else .43),.087 if j==0 else .074,1,bone,s,offset=.055)
   p=a.lerp(c,.17);q=a.lerp(c,.77 if j==0 else .40)
   plate([(p.x-.058,p.z+.026),(p.x+.054,p.z),(q.x+.043,q.z-.02),(q.x-.038,q.z-.036)],-.113 if j==0 else -.151,.024,1,bone)
   if lod<2:
    # Ivory diagonal flank insert and restrained blue maintenance strip.
    g.shell(a.lerp(c,.25),a.lerp(c,.70 if j==0 else .38),.031,2,bone,s,offset=.079)
    front_strip((p.x+q.x)/2,-.132 if j==0 else -.169,(p.z+q.z)/2,.11 if j==0 else .055,bone)
    for xs in [-1,1]:
     off=Vector((xs*.037,.015,0));rail(a.lerp(c,.13)+off,a.lerp(c,.93)+off,.018 if j==0 else .013,bone)
    if j==1:
     r=a.lerp(c,.72);g.box(r+Vector((0,-.035,0)),(.085,.055,.11),1,bone,.01)
    for f in ([.22,.65] if j==0 else [.22,.34]):g.bolt(a.lerp(c,f)+Vector((s*.082,0,0)),bone,axis=(s,0,0))
    if lod==0:
     for f in ([.26,.70] if j==0 else [.22,.34]):
      v=a.lerp(c,f);g.bolt((v.x-.036,-.131 if j==0 else -.168,v.z),bone,axis=(0,-1,0))
     # Service ribs and exposed damper clevises instead of smooth unbroken rails.
     for f in [.45,.60,.83]:
      v=a.lerp(c,f);g.box(v+Vector((0,.018,0)),(.095,.052,.018),0,bone,.004)
     v=a.lerp(c,.90);joint(v,.032,.082,bone,s)
   if lod==0:
    g.hose([a+Vector((0,.067,-.035)),a.lerp(c,.53)+Vector((0,.08,0)),c+Vector((0,.044,.035))],.011,3,bone)
  b='ANKLE_'+side;a=H[b];joint(a,.047,.103,b,s)
  # Narrow heel and three independently silhouetted toes share the ground plane.
  g.box((a.x,.025,.035),(.143,.14,.058),3,b,.005)
  g.strut(a,(a.x,-.08,.075),.055,0,b)
  g.box((a.x,-.042,.093),(.13,.12,.055),1,b,.008)
  for k in [-1,0,1]:
   xx=a.x+k*.056;g.strut((xx,-.045,.08),(xx,-.161,.054),.034,4,b)
   g.box((xx,-.182,.025),(.047,.126,.038),3,'TOE_'+side,.004)
   plate([(xx-.021,.071),(xx+.021,.071),(xx+.018,.036),(xx-.018,.036)],-.204,.055,1 if k else 2,'TOE_'+side)
   if lod<2:g.tube((xx,-.232,.039),(xx,-.241,.025),.017,4,'TOE_'+side,r1=.006,sides=8)
   if lod<2:joint((xx,-.10,.066),.020,.037,'TOE_'+side,s)
 return g

def make_arm(col):
 d=bpy.data.armatures.new('BREK37_BIPED_SKELETON');arm=bpy.data.objects.new('BREK37_RIG',d);col.objects.link(arm);bpy.context.view_layer.objects.active=arm;arm.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
 for n in H:
  b=d.edit_bones.new(n);b.head=H[n];b.tail=H[n]+Vector((0,0,.035));b.use_deform=not n.startswith('SOCKET_')
  if PAR[n]:b.parent=d.edit_bones[PAR[n]]
 bpy.ops.object.mode_set(mode='OBJECT');arm.show_in_front=True;arm['rig']='BREK37 original reconnaissance biped; rigid armor, constant-length leg IK, articulated fingers and sensor gimbal';return arm


def make_skin(g,col,arm,lod):
 d=bpy.data.meshes.new('BREK37_GEOMETRY');d.from_pydata(g.v,[],g.f);d.update();o=bpy.data.objects.new('BREK37_SKIN',d);col.objects.link(o)
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
  mod=o.modifiers.new('BREK37_RigidArmor','ARMATURE');mod.object=arm
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
 scene=bpy.context.scene;scene.name='BREK37_RECON_BIPED';scene.render.fps=FPS;scene.frame_start=0;scene.frame_end=600;assets=[]
 for lod in [0,1,2]:
  col=bpy.data.collections.new('BREK37_LOD'+str(lod));scene.collection.children.link(col);root=bpy.data.objects.new('ROOT',None);col.objects.link(root);root['forward']='+Z in glTF';root['damage_level']=0
  g=shape(lod);arm=make_arm(col);arm.parent=root;skin=make_skin(g,col,arm,lod)
  if lod<2:animate(arm)
  bpy.ops.object.select_all(action='DESELECT')
  for o in col.objects:o.select_set(True)
  scene.frame_set(0);path=OUT/f'b_rek37_d0_lod{lod}.glb'
  bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_extras=True,export_animations=lod<2,export_animation_mode='NLA_TRACKS',export_frame_range=False,export_force_sampling=True,export_cameras=False,export_lights=False)
  raw=path.read_bytes();n=struct.unpack_from('<I',raw,12)[0];doc=json.loads(raw[20:20+n]);e=dict(file=path.name,lod=lod,damage_level=0,static=lod==2,derived=False,bytes=len(raw),triangles=sum(doc['accessors'][p['indices']]['count']//3 for m in doc.get('meshes',[]) for p in m['primitives']),draw_calls=sum(len(m['primitives']) for m in doc.get('meshes',[])),plot_m=[1.2,1.0],clips=CLIPS if lod<2 else [],credit='Models by jelaludo');assets.append(e);print('EXPORT',e,flush=True)
  if lod==0:
   for tr in arm.animation_data.nla_tracks:tr.mute=tr.name!='Recon_Idle'
   scene.frame_set(0)
   for screen in bpy.data.screens:
    for area in screen.areas:
     if area.type=='VIEW_3D':area.spaces.active.region_3d.view_location=(0,0,1.2);area.spaces.active.region_3d.view_distance=4.;area.spaces.active.shading.type='MATERIAL'
   bpy.ops.wm.save_as_mainfile(filepath=str(P/'source/blender/a6-b-rek37.blend'))
  for o in list(col.objects):bpy.data.objects.remove(o,do_unlink=True)
  bpy.data.collections.remove(col)
  for data in [bpy.data.armatures,bpy.data.actions,bpy.data.meshes,bpy.data.materials,bpy.data.curves]:
   for item in list(data):
    if item.users==0:data.remove(item)
 manifest=dict(family='b-rek37',label='B-REK37 / Recon Biped',plain_glb_source_of_truth=True,coordinate_system=dict(units='metres',up='+Y',forward='+Z',origin='ground at standing hip centre'),damage_states={'d0':'intact only'},animation=dict(fps=FPS,skeleton_joints=len(H),placement_node='instance wrapper around complete glTF scene',motion_node='MOTION',engine_driven_excluded=['SENSOR_YAW'],gait='Original alternating biped gait: heel contact, flat support, toe roll and swing; double support, lateral weight transfer, counter-rotation and delayed arms; not a force simulation'),lod_selection=dict(initial=2,approach_distance_m=30,hysteresis_m=8,lod0='Detailed recording master',lod1='All animated gameplay; retain while moving',lod2='Static standing map/loading silhouette; no animation'),assets=assets)
 (OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');print('MAX_REACH_ERROR',motion.MAX_REACH_ERROR,flush=True);print('BREK37_COMPLETE',flush=True)
if __name__=='__main__':build()
