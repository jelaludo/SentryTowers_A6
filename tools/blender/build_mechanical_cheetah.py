"""C-07 mechanical cheetah: original geometry, rigid armor rig and feline actions.
Run in background Blender. Reference artwork/animation stays outside the repository.
"""
import bpy,bmesh,math,json,struct,sys
from pathlib import Path
from mathutils import Vector,Matrix,Euler
sys.path.insert(0,str(Path(__file__).resolve().parent))
from quadruped_geometry import Build
import cheetah_motion as motion
from cheetah_motion import H,PAR,LEGS,TAIL,CLIPS,FPS,pose
P=Path(__file__).resolve().parents[2];OUT=P/'assets/mechanical-cheetah';OUT.mkdir(exist_ok=True)
COLORS=[(.025,.036,.042),(.68,.365,.048),(.62,.65,.61),(.009,.014,.018),(.26,.31,.33),(.035,.40,.76)]

def material(i,distance=False):
 names=['Graphite_frame','Ochre_ceramic','Ivory_inserts','Carbon_seals','Titanium','Ice_optics'];m=bpy.data.materials.new('C07_'+names[i]);m.use_nodes=True;s=m.node_tree.nodes.get('Principled BSDF');s.inputs['Base Color'].default_value=(*COLORS[i],1);m.diffuse_color=(*COLORS[i],1);s.inputs['Metallic'].default_value=[.72,.48,.38,.06,.85,.2][i];s.inputs['Roughness'].default_value=[.36,.34,.44,.68,.28,.21][i]
 if i==5:s.inputs['Emission Color'].default_value=(*COLORS[i],1);s.inputs['Emission Strength'].default_value=2.2
 if distance:
  s.inputs['Metallic'].default_value=.5;n=m.node_tree.nodes.new('ShaderNodeVertexColor');n.layer_name='Palette';m.node_tree.links.new(n.outputs['Color'],s.inputs['Base Color'])
 return m

class CheetahGeometry(Build):
 def __init__(self,lod):super().__init__(lod);self.sides=[32,12,6][lod]
 def ellipsoid(self,c,r,mat,bone,rot=None):
  n=[32,12,8][self.lod];rings=[16,8,4][self.lod];q=Euler(rot or (0,0,0)).to_matrix();v=[Vector(c)+q@Vector((0,0,-r[2]))]
  for j in range(1,rings):
   lat=-math.pi/2+math.pi*j/rings
   for i in range(n):
    a=math.tau*i/n;v.append(Vector(c)+q@Vector((r[0]*math.cos(lat)*math.cos(a),r[1]*math.cos(lat)*math.sin(a),r[2]*math.sin(lat))))
  top=len(v);v.append(Vector(c)+q@Vector((0,0,r[2])));f=[]
  for i in range(n):f.append((0,1+(i+1)%n,1+i));f.append((top,1+(rings-2)*n+i,1+(rings-2)*n+(i+1)%n))
  for j in range(rings-2):
   for i in range(n):a=1+j*n+i;b=1+j*n+(i+1)%n;f.append((a,b,b+n,a+n))
  self.add(v,f,mat,bone,True)
 def side_plate(self,points,x,bulge,mat,bone):
  """Closed sculpted armor plate, perimeter in YZ and a raised faceted crown."""
  n=len(points);s=1 if x>=0 else -1;center=Vector((x+s*bulge,sum(p[0] for p in points)/n,sum(p[1] for p in points)/n));v=[(x,y,z) for y,z in points]+[center]+[(x-s*.012,y,z) for y,z in points];f=[]
  for i in range(n):f.append((i,(i+1)%n,n));f.append((i,n+1+i,n+1+(i+1)%n,(i+1)%n))
  f.append(tuple(range(n+1,2*n+1)));self.add(v,f,mat,bone)
 def shell(self,a,b,width,mat,bone,sign,offset=.04):
  a,b=Vector(a),Vector(b);d=b-a;across=Vector((0,-d.z,d.y)).normalized();contour=[(.08,-.52),(.22,-1),(.64,-.87),(.92,-.40),(.86,.43),(.55,.88),(.13,.72)]
  vs=[a+d*u+across*w*width+Vector((sign*offset,0,0)) for u,w in contour]
  self.side_plate([(v.y,v.z) for v in vs],a.x+sign*offset,width*.4,mat,bone)
 def hose(self,points,r,mat,bone):
  for a,b in zip(points,points[1:]):self.tube(a,b,r,mat,bone,sides=10 if self.lod==0 else 6)
 def label(self,text,loc,bone,sign,size=.045):
  if self.lod==2:return
  d=bpy.data.curves.new('TemporaryLabel','FONT');d.body=text;d.size=size;d.align_x='CENTER';d.resolution_u=4 if self.lod==0 else 2;d.fill_mode='BOTH'
  o=bpy.data.objects.new('TemporaryLabel',d);bpy.context.scene.collection.objects.link(o);bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH');me=o.data
  # Text local X runs along the body, local Y points up, face normal points outward.
  rot=Matrix(((0,0,sign),(sign,0,0),(0,1,0)));self.add([Vector(loc)+rot@v.co for v in me.vertices],[tuple(p.vertices) for p in me.polygons],0,bone);bpy.data.objects.remove(o,do_unlink=True)


def shape(lod):
 g=CheetahGeometry(lod)
 # Continuous skeletal body: deeply sprung chest, slim flexible waist, compact pelvis.
 g.ellipsoid((0,-.335,.655),(.137,.235,.128),0,'CHEST')
 g.hull([(-.48,.060,.75,.025),(-.40,.135,.79,.025),(-.28,.130,.785,.030),(-.17,.060,.748,.020)],1,'CHEST')
 g.ellipsoid((0,.42,.68),(.128,.135,.104),0,'PELVIS')
 g.ellipsoid((0,.06,.70),(.080,.075,.072),3,'LUMBAR')
 for bone,a,b,w in [('LUMBAR_REAR_LINK',H['LUMBAR'],H['SPINE_REAR'],.052),('SPINE_REAR',H['SPINE_REAR'],H['PELVIS'],.068),('LUMBAR_FRONT_LINK',H['LUMBAR'],H['SPINE_FRONT'],.060),('SPINE_FRONT',H['SPINE_FRONT'],H['CHEST'],.085)]:
  g.tube(a,b,w,3,bone,r1=w*.92)
  if lod<2:
   for s in [-1,1]:
    off=Vector((s*w*.88,0,-.005));g.tube(a+off,b+off,.009,4,bone)
    if lod==0:
     for j in range(5):
      c=a.lerp(b,.12+j*.16);g.ring(c,w*.94,.005,b-a,0,bone)
  # Separate overlapping dorsal lamellae leave the central spine visibly articulated.
  c=(a+b)/2;g.hull([(c.y-.055,w*.9,c.z+.055,.017),(c.y,w*1.12,c.z+.065,.019),(c.y+.06,w*.85,c.z+.052,.012)],1,bone)
  if lod<2:g.box((0,c.y,c.z+.087),(w*.80,.052,.008),0,bone,.002)
 for s in [-1,1]:
  # Two large curved thoracic shells and small floating flanks.
  g.side_plate([(-.51,.71),(-.455,.79),(-.30,.79),(-.17,.735),(-.16,.675),(-.30,.58),(-.44,.59)],s*.119,.035,1,'CHEST')
  g.side_plate([(-.45,.595),(-.31,.56),(-.16,.61),(-.18,.65),(-.32,.62)],s*.112,.018,2,'CHEST')
  g.side_plate([(.29,.74),(.38,.785),(.52,.75),(.55,.65),(.42,.605),(.30,.65)],s*.125,.028,1,'PELVIS')
  if lod<2:
   g.hose([(s*.11,-.15,.65),(s*.09,-.08,.64),(s*.08,.015,.67)],.009,0,'LUMBAR_FRONT_LINK')
   for y,z in [(-.43,.75),(-.23,.70),(.34,.72),(.51,.68)]:g.bolt((s*.155,y,z),'CHEST' if y<0 else 'PELVIS',axis=(s,0,0))
   for j in range(6 if lod==0 else 3):g.box((s*.145,-.29+j*.016,.68),(.008,.006,.035),3,'CHEST',.001,(-.3,0,0))
 # Long exposed cervical struts lead to a compact feline skull held below the shoulders.
 g.ellipsoid((0,-.58,.66),(.064,.115,.063),3,'NECK',rot=(.11,0,0))
 for s in [-1,1]:
  g.tube((s*.053,-.51,.69),(s*.052,-.69,.657),.013,4,'NECK',r1=.009)
  if lod<2:g.hose([(s*.055,-.51,.64),(s*.067,-.59,.63),(s*.057,-.69,.63)],.011,0,'NECK')
  g.side_plate([(-.54,.706),(-.63,.714),(-.72,.674),(-.67,.661),(-.58,.675)],s*.056,.018,1,'NECK')
 g.hull([(-.63,.070,.672,.062),(-.71,.098,.675,.072),(-.81,.090,.655,.055),(-.90,.060,.628,.037),(-.94,.037,.622,.025)],0,'HEAD')
 g.hull([(-.64,.052,.725,.016),(-.73,.072,.739,.019),(-.83,.065,.701,.018),(-.91,.036,.655,.013)],1,'HEAD')
 g.hull([(-.70,.063,.603,.021),(-.82,.065,.593,.017),(-.91,.048,.597,.016)],2,'JAW')
 g.ellipsoid((0,-.916,.622),(.052,.031,.026),2,'HEAD')
 g.hull([(-.94,.034,.639,.012),(-.955,.021,.634,.010)],3,'HEAD')
 for s in [-1,1]:
  g.side_plate([(-.68,.708),(-.76,.715),(-.87,.666),(-.865,.635),(-.78,.619),(-.71,.653)],s*.082,.013,1,'HEAD')
  # Narrow luminous eye above the cheetah-like dark tear channel.
  g.side_plate([(-.743,.696),(-.783,.694),(-.866,.660),(-.841,.660),(-.779,.682)],s*.099,.001,5,'HEAD')
  g.side_plate([(-.842,.654),(-.818,.664),(-.811,.627),(-.844,.610),(-.855,.614)],s*.089,.002,3,'HEAD')
  if lod<2:g.bolt((s*.103,-.735,.674),'HEAD',axis=(s,0,0))
  b='EAR_'+('L' if s>0 else 'R');x=s*.082
  g.panel([(x-s*.028,-.643,.724),(x+s*.032,-.633,.728),(x+s*.031,-.619,.793),(x+s*.008,-.620,.809),(x-s*.025,-.64,.774)],.016,1,b)
  if lod<2:g.panel([(x-s*.012,-.653,.745),(x+s*.017,-.648,.745),(x+s*.014,-.641,.790)],.004,3,b)
  g.tube((s*.065,-.716,.611),(s*.084,-.716,.611),.021,4,'JAW')
 # Scapular shells ride on the shoulder carriage, independently of the arm swing.
 for id in ['FL','FR']:
  s=1 if id.endswith('L') else -1;b='SCAPULA_'+id
  g.side_plate([(-.48,.73),(-.46,.815),(-.38,.849),(-.265,.807),(-.205,.70),(-.25,.585),(-.31,.555),(-.395,.625)],s*.175,.045,1,b)
  if lod<2:
   g.side_plate([(-.28,.77),(-.235,.70),(-.27,.60),(-.30,.58),(-.31,.70)],s*.187,.018,2,b)
   g.tube((s*.176,-.39,.63),(s*.229,-.39,.63),.047,0,b)
   g.ring((s*.232,-.39,.63),.036,.005,(1,0,0),4,b)
   g.label('C-07',(s*.214,-.365,.765),b,s,.042)
   for y,z in [(-.44,.79),(-.28,.71),(-.32,.60)]:g.bolt((s*.199,y,z),b,axis=(s,0,0))
 # Deep haunches and long tapered limbs. Mechanical rails stay inside each rigid segment.
 for id in LEGS:
  s=1 if id.endswith('L') else -1
  for j,(bone,endbone,width) in enumerate([('UPPER_'+id,'LOWER_'+id,.060 if id[0]=='F' else .080),('LOWER_'+id,'ANKLE_'+id,.036),('ANKLE_'+id,'PAW_'+id,.025)]):
   a,b=H[bone],H[endbone];d=b-a;u=d.normalized();r=[.053 if id[0]=='F' else .061,.038,.026][j]
   g.tube(a-Vector((.035,0,0)),a+Vector((.035,0,0)),r,3,bone)
   if lod<2 or j==0:g.tube(a+Vector((s*.034,0,0)),a+Vector((s*.047,0,0)),r*.84,4,bone)
   if lod<2:g.tube(a+Vector((s*.047,0,0)),a+Vector((s*.049,0,0)),r*.52,0,bone);g.ring(a+Vector((s*.049,0,0)),r*.66,.003,(1,0,0),1,bone)
   if lod<2 or j==0:g.tube(a+Vector((s*.048,0,0)),a+Vector((s*.053,0,0)),.008,4,bone,sides=6)
   p=a+u*r*.5;q=b-u*.025
   if id[0]=='H' and j==0:
    rotation=Vector((0,0,1)).rotation_difference(d.normalized()).to_euler()
    g.ellipsoid(a.lerp(b,.42),(.056,.071,d.length*.41),0,bone,rotation)
   g.strut(p,q,width*.65,0,bone)
   if lod<2:
    for sign in [-1,1]:
     off=Vector((sign*width*.39,0,0));g.tube(p+off,q+off,.008 if j<2 else .005,4,bone)
    off=Vector((0,.022,0));g.tube(p+off,p.lerp(q,.6)+off,.013 if j<2 else .008,3,bone);g.tube(p.lerp(q,.5)+off,q+off,.006,4,bone)
   if lod<2 or j<2:g.shell(p,q,width,1 if j==0 or (id[0]=='H' and j==1) else 2,bone,s,offset=.034 if j==0 else .022)
   if lod==0:
    g.shell(p.lerp(q,.17),p.lerp(q,.82),width*.4,0,bone,s,offset=.036 if j==0 else .024)
    for f in [.18,.78]:g.bolt(p.lerp(q,f)+Vector((s*(.044 if j==0 else .03),0,0)),bone,axis=(s,0,0))
    g.hose([p+Vector((-s*.023,-.017,0)),p.lerp(q,.4)+Vector((-s*.033,-.022,0)),q+Vector((-s*.018,-.013,0))],.006,3,bone)
  p=H['PAW_'+id];bone='PAW_'+id;toe='TOES_'+id
  start=len(g.v);g.hull([(p.y+.035,.040,p.z-.005,.026),(p.y-.035,.048,p.z-.010,.030),(p.y-.064,.037,p.z-.018,.025)],0,bone)
  for v in g.v[start:]:v.x+=p.x
  g.box(p+Vector((0,-.012,-.041)),(.078,.097,.024),3,bone,.006)
  # Four small feline toe capsules, rather than broad canine boots.
  for digit in range(4):
   x=(digit-1.5)*.023;yy=p.y-.069-(.007 if digit in [1,2] else 0)
   g.box((p.x+x,yy,p.z-.022),(.021,.052,.036),2,toe,.006)
   if lod<2:g.tube((p.x+x,yy-.018,p.z-.026),(p.x+x,yy-.043,p.z-.035),.009,0,toe,r1=.002,sides=8)
   else:g.add([(p.x+x-.009,yy-.018,p.z-.035),(p.x+x+.009,yy-.018,p.z-.035),(p.x+x,yy-.018,p.z-.018),(p.x+x,yy-.043,p.z-.035)],[(0,2,1),(0,1,3),(1,2,3),(2,0,3)],0,toe)
  if lod<2:g.shell(p+Vector((0,.02,.02)),p+Vector((0,-.035,.02)),.031,1,bone,s,offset=0)
 # Long segmented rudder with alternating dorsal plates and exposed ventral cable.
 for i,a in enumerate(map(Vector,TAIL)):
  bone='TAIL_'+str(i+1).zfill(2);b=Vector(TAIL[i+1]) if i<7 else Vector((0,1.70,.37));r=.028-i*.0024
  g.tube(a,b,r,0,bone,r1=max(.007,r-.004))
  c=a.lerp(b,.5)
  if lod<2:g.hull([(c.y-.047,r*.90,c.z+.015,.009),(c.y,r*1.15,c.z+.023,.011),(c.y+.045,r*.70,c.z+.013,.008)],1 if i%3!=2 else 2,bone)
  else:g.box((0,c.y,c.z+.02),(r*1.8,.085,.018),1 if i%3!=2 else 2,bone)
  if lod<2:
   g.ring(a,r,.004,b-a,4,bone)
   if lod==0:
    for side in [-1,1]:g.tube(a+Vector((side*r*.6,0,-r*.7)),b+Vector((side*r*.4,0,-r*.6)),.003,4,bone)
 # Sharpened tail-tip vane preserves the long feline silhouette at every tier.
 g.hull([(1.64,.022,.37,.015),(1.75,.039,.363,.014),(1.82,.004,.356,.004)],0,'TAIL_08')
 return g


def make_arm(col):
 d=bpy.data.armatures.new('C07_FELINE_SKELETON');arm=bpy.data.objects.new('C07_RIG',d);col.objects.link(arm);bpy.context.view_layer.objects.active=arm;arm.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
 for n in H:
  b=d.edit_bones.new(n);b.head=H[n];b.tail=H[n]+Vector((0,0,.035));b.use_deform=not n.startswith('SOCKET_')
  if PAR[n]:b.parent=d.edit_bones[PAR[n]]
 bpy.ops.object.mode_set(mode='OBJECT');arm.show_in_front=True;arm['rig']='C07 original feline rigid armor rig; six flexible spine frames, independent scapulae, eight tail sections';return arm


def make_skin(g,col,arm,lod):
 d=bpy.data.meshes.new('C07_GEOMETRY');d.from_pydata(g.v,[],g.f);d.update();o=bpy.data.objects.new('C07_SKIN',d);col.objects.link(o)
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
  mod=o.modifiers.new('C07_RigidArmor','ARMATURE');mod.object=arm
 return o


def animate(arm):
 arm.animation_data_create()
 for clip in CLIPS:
  action=bpy.data.actions.new(clip['name']);arm.animation_data.action=action;frames=round(clip['duration_s']*FPS)
  for frame in range(frames+1):
   pos,ori=pose(clip['name'],frame/FPS);matrices={}
   for n in H:
    bone=arm.data.bones[n];parent=PAR[n];matrix=Matrix.Translation(pos[n])@ori[n].to_4x4()@bone.matrix_local.to_3x3().to_4x4();matrices[n]=matrix
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
 scene=bpy.context.scene;scene.name='C07_MECHANICAL_CHEETAH';scene.render.fps=FPS;scene.frame_start=0;scene.frame_end=384;assets=[]
 for lod in [0,1,2]:
  col=bpy.data.collections.new('C07_LOD'+str(lod));scene.collection.children.link(col);root=bpy.data.objects.new('ROOT',None);col.objects.link(root);root['forward']='+Z in glTF';root['damage_level']=0
  g=shape(lod);arm=make_arm(col);arm.parent=root;skin=make_skin(g,col,arm,lod)
  if lod<2:animate(arm)
  bpy.ops.object.select_all(action='DESELECT')
  for o in col.objects:o.select_set(True)
  scene.frame_set(0);path=OUT/f'c07_d0_lod{lod}.glb'
  bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_extras=True,export_animations=lod<2,export_animation_mode='NLA_TRACKS',export_frame_range=False,export_force_sampling=True,export_cameras=False,export_lights=False)
  raw=path.read_bytes();n=struct.unpack_from('<I',raw,12)[0];doc=json.loads(raw[20:20+n]);e=dict(file=path.name,lod=lod,damage_level=0,static=lod==2,derived=False,bytes=len(raw),triangles=sum(doc['accessors'][p['indices']]['count']//3 for m in doc.get('meshes',[]) for p in m['primitives']),draw_calls=sum(len(m['primitives']) for m in doc.get('meshes',[])),plot_m=[.65,3.0],clips=CLIPS if lod<2 else [],credit='Models by jelaludo');assets.append(e);print('EXPORT',e,flush=True)
  if lod==0:
   for tr in arm.animation_data.nla_tracks:tr.mute=tr.name!='Watch_Idle'
   scene.frame_set(0)
   for screen in bpy.data.screens:
    for area in screen.areas:
     if area.type=='VIEW_3D':area.spaces.active.region_3d.view_location=(0,.3,.5);area.spaces.active.region_3d.view_distance=3.;area.spaces.active.shading.type='MATERIAL'
   bpy.ops.wm.save_as_mainfile(filepath=str(P/'source/blender/a6-mechanical-cheetah.blend'))
  for o in list(col.objects):bpy.data.objects.remove(o,do_unlink=True)
  bpy.data.collections.remove(col)
  for data in [bpy.data.armatures,bpy.data.actions,bpy.data.meshes,bpy.data.materials,bpy.data.curves]:
   for item in list(data):
    if item.users==0:data.remove(item)
 manifest=dict(family='mechanical-cheetah',label='C-07 / Mechanical Cheetah',plain_glb_source_of_truth=True,coordinate_system=dict(units='metres',up='+Y',forward='+Z',origin='ground at torso centre; long tail extends aft'),damage_states={'d0':'intact only'},animation=dict(fps=FPS,skeleton_joints=len(H),placement_node='instance wrapper around complete glTF scene',motion_node='MOTION',engine_driven_excluded=['SENSOR_YAW'],gallop='Rotary contacts FL, FR, HR, HL; gathered and extended airborne phases; independently articulated lumbar, pelvis, thorax, scapulae and tail',walk_reference='Local user-supplied cat-walk inspected for phase timing and shoulder motion; all exported motion authored independently'),lod_selection=dict(initial=2,approach_distance_m=30,hysteresis_m=8,lod0='Detailed recording master',lod1='All animated gameplay; retain while moving',lod2='Static standing map/loading silhouette; no animation'),assets=assets)
 (OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');print('MAX_REACH_ERROR',motion.MAX_REACH_ERROR,motion.WORST_REACH,flush=True);print('CHEETAH_COMPLETE',flush=True)

if __name__=='__main__':build()
