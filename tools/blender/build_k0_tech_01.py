"""K0-TECH-01 / Felis: original lynx-point mechanical house-cat family.
Own geometry, compact rigid rig and all eight C-07-derived motion patterns.
"""
import bpy,bmesh,math,json,struct,sys
from pathlib import Path
from mathutils import Vector,Matrix,Euler
sys.path.insert(0,str(Path(__file__).resolve().parent))
import build_mechanical_cheetah as cheetah
import k0_tech_motion as motion
from k0_tech_motion import H,PAR,LEGS,TAIL,CLIPS,FPS,pose,mapped
P=Path(__file__).resolve().parents[2];OUT=P/'assets/k0-tech-01';OUT.mkdir(exist_ok=True)
COLORS=[(.030,.037,.041),(.62,.48,.32),(.82,.79,.69),(.012,.016,.019),(.31,.34,.33),(.018,.32,.95),(.19,.135,.086)]

def material(i,distance=False):
 names=['Graphite_frame','Warm_beige_ceramic','Porcelain_white','Carbon_seals','Satin_titanium','Sapphire_blue_eyes','Lynx_taupe_stripes']
 m=bpy.data.materials.new('K0_'+names[i]);m.use_nodes=True;s=m.node_tree.nodes.get('Principled BSDF');s.inputs['Base Color'].default_value=(*COLORS[i],1);m.diffuse_color=(*COLORS[i],1)
 s.inputs['Metallic'].default_value=[.7,.25,.20,.05,.85,.35,.20][i];s.inputs['Roughness'].default_value=[.35,.43,.38,.72,.30,.16,.49][i]
 if i==5:s.inputs['Emission Color'].default_value=(*COLORS[i],1);s.inputs['Emission Strength'].default_value=2.3
 if distance:
  s.inputs['Metallic'].default_value=.35;n=m.node_tree.nodes.new('ShaderNodeVertexColor');n.layer_name='Palette';m.node_tree.links.new(n.outputs['Color'],s.inputs['Base Color'])
 return m

class FelisGeometry(cheetah.CheetahGeometry):
 def ellipsoid(self,c,r,mat,bone,rot=None):
  if self.lod<2:return super().ellipsoid(c,r,mat,bone,rot)
  n=6;q=Euler(rot or (0,0,0)).to_matrix();v=[Vector(c)+q@Vector((0,0,-r[2]))]
  for lat in [-math.pi/6,math.pi/6]:
   for i in range(n):
    a=i*math.tau/n;v.append(Vector(c)+q@Vector((r[0]*math.cos(lat)*math.cos(a),r[1]*math.cos(lat)*math.sin(a),r[2]*math.sin(lat))))
  v.append(Vector(c)+q@Vector((0,0,r[2])));f=[]
  for i in range(n):f.extend([(0,1+(i+1)%n,1+i),(13,7+i,7+(i+1)%n),(1+i,1+(i+1)%n,7+(i+1)%n,7+i)])
  self.add(v,f,mat,bone,True)

def split_painted_face(g,points,mat,bone,sm,a,b,lod):
 """Split existing armor along pigment bands: no floating stripe geometry."""
 direction=b-a;length=direction.length_squared
 phase=lambda p:(p-a).dot(direction)/length
 bands=[(.26,.35),(.56,.65),(.80,.88)] if lod<2 else [(.40,.61)]
 cuts=sorted({-100.,100.,*(x for pair in bands for x in pair)})
 for lo,hi in zip(cuts,cuts[1:]):
  poly=[p.copy() for p in points]
  for edge,sign in [(lo,1),(hi,-1)]:
   result=[]
   for p,q in zip(poly,poly[1:]+poly[:1]):
    vp,vq=(phase(p)-edge)*sign,(phase(q)-edge)*sign
    if vp>=-1e-9:result.append(p)
    if (vp>0 and vq<0) or (vp<0 and vq>0):result.append(p.lerp(q,vp/(vp-vq)))
   poly=result
  if len(poly)<3:continue
  # Remove adjacent duplicate clipping vertices before triangulation.
  clean=[]
  for p in poly:
   if not clean or (p-clean[-1]).length>1e-7:clean.append(p)
  if len(clean)>2 and (clean[0]-clean[-1]).length<1e-7:clean.pop()
  if len(clean)<3:continue
  area=sum((clean[i]-clean[0]).cross(clean[i+1]-clean[0]).length for i in range(1,len(clean)-1))
  if area<1e-10:continue
  pigment=6 if any(l<=(lo+hi)/2<=h for l,h in bands) else mat
  g.add(clean,[tuple(range(len(clean)))],pigment,bone,sm)

def shape(lod,reference=None):
 g=FelisGeometry(lod);old=reference or cheetah.shape(lod)
 # Retain our proven mechanical limb/waist construction. The face, ears, neck,
 # torso armor, shoulder covers, pelvis and tail are authored for this cat.
 replaced={'CHEST','PELVIS','NECK','HEAD','JAW','EAR_L','EAR_R','SCAPULA_FL','SCAPULA_FR'}|{'TAIL_'+str(i).zfill(2) for i in range(1,9)}
 remap={}
 for face,mat,sm in zip(old.f,old.mi,old.smooth):
  if old.b[face[0]] in replaced:continue
  bone=old.b[face[0]]
  if bone.startswith('PAW_') and mat==0:mat=1
  if bone.startswith(('LOWER_','ANKLE_')) and mat in [1,2]:
   end=('ANKLE_' if bone.startswith('LOWER_') else 'PAW_')+bone[-2:]
   split_painted_face(g,[old.v[index] for index in face],mat,bone,sm,cheetah.H[bone],cheetah.H[end],lod);continue
  for index in face:
   if index not in remap:remap[index]=len(g.v);g.v.append(old.v[index].copy());g.b.append(old.b[index])
  g.f.append(tuple(remap[i] for i in face));g.mi.append(mat);g.smooth.append(sm)
 # Fuller pear-shaped rib cage, white breast and broad cream haunches.
 g.ellipsoid((0,-.30,.65),(.158,.235,.143),0,'CHEST')
 g.hull([(-.48,.082,.75,.027),(-.39,.15,.79,.028),(-.25,.153,.785,.030),(-.14,.095,.73,.025)],2,'CHEST')
 g.ellipsoid((0,.405,.66),(.151,.147,.128),0,'PELVIS')
 for s in [-1,1]:
  g.side_plate([(-.48,.72),(-.43,.79),(-.29,.79),(-.14,.72),(-.14,.65),(-.24,.535),(-.40,.555),(-.49,.63)],s*.144,.035,1,'CHEST')
  g.side_plate([(-.48,.65),(-.40,.575),(-.26,.545),(-.18,.59),(-.20,.63),(-.36,.66)],s*.132,.029,2,'CHEST')
  g.side_plate([(.25,.72),(.33,.78),(.48,.79),(.565,.71),(.53,.59),(.41,.54),(.29,.60)],s*.15,.035,2,'PELVIS')
  g.side_plate([(.31,.74),(.38,.77),(.51,.75),(.535,.70),(.47,.665),(.35,.67)],s*.172,.013,1,'PELVIS')
  if lod<2:
   for y,z in [(-.42,.74),(-.20,.67),(.32,.70),(.50,.66)]:g.bolt((s*.176,y,z),'CHEST' if y<0 else 'PELVIS',axis=(s,0,0))
   for j in range(4):g.box((s*.178,-.33+j*.02,.68),(.006,.008,.044),3,'CHEST',.001,(-.2,0,0))
  # Chunkier shoulder shells, carrying the family marking instead of C-07.
  b='SCAPULA_'+('FL' if s>0 else 'FR')
  g.side_plate([(-.49,.71),(-.46,.81),(-.37,.855),(-.26,.815),(-.20,.70),(-.25,.585),(-.33,.55),(-.43,.61)],s*.187,.05,2,b)
  g.side_plate([(-.45,.80),(-.37,.83),(-.29,.80),(-.26,.73),(-.32,.70),(-.42,.73)],s*.218,.015,1,b)
  if lod<2:
   g.tube((s*.19,-.39,.63),(s*.246,-.39,.63),.049,0,b);g.ring((s*.249,-.39,.63),.037,.006,(1,0,0),4,b)
   g.label('K0',(s*.246,-.36,.764),b,s,.044);g.label('TECH',(s*.244,-.36,.731),b,s,.021)
   for y,z in [(-.44,.79),(-.28,.70),(-.34,.59)]:g.bolt((s*.226,y,z),b,axis=(s,0,0))
 # Short-looking, deep neck with a white throat bib, exposed actuator rails.
 g.ellipsoid((0,-.575,.663),(.087,.11,.078),3,'NECK')
 g.hull([(-.51,.075,.665,.055),(-.58,.086,.656,.060),(-.67,.072,.642,.048)],2,'NECK')
 for s in [-1,1]:
  g.tube((s*.083,-.515,.70),(s*.081,-.687,.68),.012,4,'NECK',r1=.009)
  if lod<2:g.hose([(s*.09,-.53,.638),(s*.09,-.59,.62),(s*.075,-.68,.632)],.009,0,'NECK')
 # Rounder skull, shorter muzzle, pale cheeks and a dark lynx-point eye mask.
 g.ellipsoid((0,-.715,.682),(.112,.112,.088),0,'HEAD')
 g.hull([(-.63,.079,.737,.029),(-.69,.103,.755,.030),(-.76,.097,.74,.030),(-.82,.066,.698,.025),(-.87,.041,.659,.018)],1,'HEAD')
 g.hull([(-.69,.068,.618,.023),(-.79,.079,.602,.026),(-.872,.052,.611,.017)],2,'JAW')
 for s in [-1,1]:
  g.side_plate([(-.66,.716),(-.725,.74),(-.805,.705),(-.84,.666),(-.80,.631),(-.70,.629),(-.65,.665)],s*.097,.016,2,'HEAD')
  # Eyes face forward with a blue iris and slim dark pupil.
  g.ellipsoid((s*.067,-.797,.696),(.037,.023,.025),6,'HEAD')
  g.ellipsoid((s*.067,-.816,.695),(.027,.010,.014),5,'HEAD')
  if lod<2:
   g.ellipsoid((s*.067,-.825,.696),(.0055,.0025,.011),3,'HEAD')
   g.ellipsoid((s*.060,-.8255,.700),(.003,.002,.003),2,'HEAD')
  g.ellipsoid((s*.039,-.859,.634),(.047,.036,.031),2,'HEAD')
  # Brow stripes and cheek bars are actual small closed armor patches.
  g.panel([(s*.016,-.785,.749),(s*.035,-.779,.762),(s*.074,-.769,.766),(s*.071,-.779,.755),(s*.035,-.791,.752)],.003,6,'HEAD')
  for y,z in [(-.735,.668),(-.712,.65)]:g.side_plate([(y-.026,z+.010),(y+.013,z+.014),(y+.026,z+.002),(y-.022,z-.005)],s*.113,.002,6,'HEAD')
  ear='EAR_'+('L' if s>0 else 'R');x=s*.09
  g.panel([(x-s*.035,-.638,.728),(x+s*.041,-.635,.735),(x+s*.057,-.615,.895),(x+s*.032,-.629,.874),(x-s*.026,-.65,.786)],.022,1,ear)
  g.panel([(x-s*.018,-.655,.755),(x+s*.029,-.654,.761),(x+s*.044,-.638,.866)],.005,6,ear)
  if lod<2:
   for j in range(3 if lod==0 else 2):
    g.hose([(s*.065,-.867,.636-j*.009),(s*.13,-.887,.641-j*.016),(s*(.195+j*.009),-.876-j*.022,.654-j*.027)],.0016,4,'HEAD')
   g.bolt((s*.119,-.703,.69),'HEAD',axis=(s,0,0))
 g.panel([(-.018,-.891,.651),(.018,-.891,.651),(0,-.91,.631)],.014,3,'HEAD')
 if lod<2:g.tube((0,-.898,.63),(0,-.899,.612),.002,6,'HEAD',sides=6)
 # Broad pale toes and repeated transverse taupe markings on lower legs/paws.
 for id in LEGS:
  s=1 if id.endswith('L') else -1
  p=cheetah.H['PAW_'+id]
  if lod<2:
   for j in range(2):g.box(p+Vector((0,-.008-j*.026,.027)),(.075,.010,.006),6,'PAW_'+id,.001)
 # Shorter, thick, ringed tail; no cheetah rudder vane. The terminal cap rounds off.
 for i,a in enumerate(map(Vector,cheetah.TAIL)):
  bone='TAIL_'+str(i+1).zfill(2);b=Vector(cheetah.TAIL[i+1]) if i<7 else Vector((0,1.695,.385));r=.039-i*.0026
  if lod==2:
   q=(b-a).to_track_quat('Z','Y');vertices=[]
   for u in [0,.35,.65,1]:
    c=a.lerp(b,u)
    for j in range(4):vertices.append(c+q@Vector((r*math.cos(j*math.tau/4),r*math.sin(j*math.tau/4),0)))
   faces=[(3,2,1,0),(12,13,14,15)]+[(k*4+j,k*4+(j+1)%4,(k+1)*4+(j+1)%4,(k+1)*4+j) for k in range(3) for j in range(4)]
   offset=len(g.mi);g.add(vertices,faces,2,bone,True)
   for f in range(6,10):g.mi[offset+f]=6
   continue
  g.tube(a,b,r,0,bone,r1=max(.014,r-.002))
  g.tube(a.lerp(b,.10),a.lerp(b,.54),r*1.10,1 if i%2==0 else 2,bone,r1=r*1.05)
  g.tube(a.lerp(b,.56),a.lerp(b,.80),r*1.06,6,bone,r1=r*.99)
  g.tube(a.lerp(b,.82),a.lerp(b,.95),r*.98,2,bone,r1=r*.93)
  if lod==0:g.ring(a.lerp(b,.05),r,.003,b-a,4,bone)
  if i==7:g.ellipsoid(b,(r,r*1.2,r),6,bone)
 # Apply proportions once to mesh/rest coordinates, never to animated armor.
 g.v=[mapped(v,b) for v,b in zip(g.v,g.b)]
 return g

def make_arm(col):
 d=bpy.data.armatures.new('K0_TECH_01_FELINE_SKELETON');arm=bpy.data.objects.new('K0_TECH_01_RIG',d);col.objects.link(arm);bpy.context.view_layer.objects.active=arm;arm.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
 for n in H:
  b=d.edit_bones.new(n);b.head=H[n];b.tail=H[n]+Vector((0,0,.035));b.use_deform=not n.startswith('SOCKET_')
  if PAR[n]:b.parent=d.edit_bones[PAR[n]]
 bpy.ops.object.mode_set(mode='OBJECT');arm.show_in_front=True;arm['rig']='K0_TECH_01 domestic-cat rigid armor rig; compact proportions, independent scapulae and eight shortened tail sections';return arm


def make_skin(g,col,arm,lod):
 d=bpy.data.meshes.new('K0_TECH_01_GEOMETRY');d.from_pydata(g.v,[],g.f);d.update();o=bpy.data.objects.new('K0_TECH_01_SKIN',d);col.objects.link(o)
 if lod==2:
  d.materials.append(material(0,True));colors=d.color_attributes.new(name='Palette',type='FLOAT_COLOR',domain='CORNER')
  for p,m in zip(d.polygons,g.mi):
   for li in p.loop_indices:colors.data[li].color=(*COLORS[m],1)
 else:
  for i in range(len(COLORS)):d.materials.append(material(i))
  for p,m,sm in zip(d.polygons,g.mi,g.smooth):p.material_index=m;p.use_smooth=sm
 bm=bmesh.new();bm.from_mesh(d);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(d);bm.free()
 if lod<2:
  for n in H:
   indices=[i for i,b in enumerate(g.b) if b==n]
   if indices:o.vertex_groups.new(name=n).add(indices,1,'REPLACE')
  mod=o.modifiers.new('K0_TECH_01_RigidArmor','ARMATURE');mod.object=arm
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
 scene=bpy.context.scene;scene.name='K0_TECH_01_FELIS';scene.render.fps=FPS;scene.frame_start=0;scene.frame_end=round(max(c['duration_s'] for c in CLIPS)*FPS);assets=[]
 reference=cheetah.shape(0);cheetah.motion.configure_floor(reference)
 master=shape(0,reference);motion.configure_floor(master)
 for lod in [0,1,2]:
  col=bpy.data.collections.new('K0_TECH_01_LOD'+str(lod));scene.collection.children.link(col);root=bpy.data.objects.new('ROOT',None);col.objects.link(root);root['forward']='+Z in glTF';root['damage_level']=0
  g=master if lod==0 else shape(lod);arm=make_arm(col);arm.parent=root;skin=make_skin(g,col,arm,lod)
  if lod<2:animate(arm)
  bpy.ops.object.select_all(action='DESELECT')
  for o in col.objects:o.select_set(True)
  scene.frame_set(0);path=OUT/f'k0_tech_01_d0_lod{lod}.glb'
  bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_extras=True,export_animations=lod<2,export_animation_mode='NLA_TRACKS',export_frame_range=False,export_force_sampling=True,export_cameras=False,export_lights=False)
  raw=path.read_bytes();n=struct.unpack_from('<I',raw,12)[0];doc=json.loads(raw[20:20+n]);e=dict(file=path.name,lod=lod,damage_level=0,static=lod==2,derived=False,bytes=len(raw),triangles=sum(doc['accessors'][p['indices']]['count']//3 for m in doc.get('meshes',[]) for p in m['primitives']),draw_calls=sum(len(m['primitives']) for m in doc.get('meshes',[])),plot_m=[.40,1.35],clips=CLIPS if lod<2 else [],credit='Models by jelaludo');assets.append(e);print('EXPORT',e,flush=True)
  if lod==0:
   for tr in arm.animation_data.nla_tracks:tr.mute=tr.name!='Watch_Idle'
   scene.frame_set(0)
   for screen in bpy.data.screens:
    for area in screen.areas:
     if area.type=='VIEW_3D':area.spaces.active.region_3d.view_location=(0,.12,.25);area.spaces.active.region_3d.view_distance=1.5;area.spaces.active.shading.type='MATERIAL'
   bpy.ops.wm.save_as_mainfile(filepath=str(P/'source/blender/a6-k0-tech-01.blend'))
  for o in list(col.objects):bpy.data.objects.remove(o,do_unlink=True)
  bpy.data.collections.remove(col)
  for data in [bpy.data.armatures,bpy.data.actions,bpy.data.meshes,bpy.data.materials,bpy.data.curves]:
   for item in list(data):
    if item.users==0:data.remove(item)
 manifest=dict(family='k0-tech-01',label='K0-TECH-01 / Lynx-point house cat',plain_glb_source_of_truth=True,coordinate_system=dict(units='metres',up='+Y',forward='+Z',origin='ground at torso centre; shortened striped tail extends aft'),damage_states={'d0':'intact only'},animation=dict(fps=FPS,skeleton_joints=len(H),placement_node='instance wrapper around complete glTF scene',motion_node='MOTION',engine_driven_excluded=['SENSOR_YAW'],gallop='Rotary contacts FL, FR, HR, HL; gathered and extended airborne phases; independently articulated lumbar, pelvis, thorax, scapulae and tail',walk_reference='Local user-supplied cat-walk inspected for phase timing and shoulder motion; all exported motion authored independently'),lod_selection=dict(initial=2,approach_distance_m=18,hysteresis_m=5,lod0='Detailed recording master',lod1='All animated gameplay; retain while moving',lod2='Static standing map/loading silhouette; no animation'),assets=assets)
 manifest['animation']['retarget_audit']={'maximum_requested_target_clamp_m':motion.MAX_REACH_ERROR,'worst_frame':motion.WORST_REACH,'note':'Unreachable targets clamp without changing rigid chain lengths; final exports are independently validated.'}
 (OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');print('MAX_REACH_ERROR',motion.MAX_REACH_ERROR,motion.WORST_REACH,flush=True);print('K0_TECH_COMPLETE',flush=True)


if __name__=='__main__':build()
