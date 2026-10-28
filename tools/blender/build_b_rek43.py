"""B-REK43: lean C-07-family reconnaissance biped."""
import bpy,bmesh,math,json,struct,sys,hashlib
from pathlib import Path
from mathutils import Vector,Matrix,Euler
sys.path.insert(0,str(Path(__file__).resolve().parent))
from build_mechanical_cheetah import CheetahGeometry
import b_rek43_motion as motion
from b_rek43_motion import H,PAR,CLIPS,FPS,pose,CANONICAL_HAND,hand_point
P=Path(__file__).resolve().parents[2];OUT=P/'assets/b-rek43';OUT.mkdir(exist_ok=True)

COLORS=[(.025,.036,.042),(.026,.047,.082),(.62,.65,.61),(.009,.014,.018),(.26,.31,.33),(.035,.40,.76)]

def material(i,distance=False):
 names=['Graphite_frame','Navy_ceramic','Ivory_inserts','Carbon_seals','Titanium','Blue_coated_optics'];m=bpy.data.materials.new('BREK43_'+names[i]);m.use_nodes=True;s=m.node_tree.nodes.get('Principled BSDF');s.inputs['Base Color'].default_value=(*COLORS[i],1);m.diffuse_color=(*COLORS[i],1);s.inputs['Metallic'].default_value=[.72,.62,.48,.06,.85,.65][i];s.inputs['Roughness'].default_value=[.36,.34,.44,.68,.28,.16][i]
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
 def plate(points,back,front,m,b,crown=0):
  # Closed shallow chamfer, with actual depth rather than a flat printed face.
  n=len(points);cx=sum(x for x,z in points)/n;cz=sum(z for x,z in points)/n
  vs=[]
  for y,scale in [(back,.94),(front+.008,1),(front,.91)]:vs += [(cx+(x-cx)*scale,y,cz+(z-cz)*scale) for x,z in points]
  fs=[tuple(range(n-1,-1,-1))]
  if crown:
   vs.append((cx,front-crown,cz));fs += [(2*n+i,2*n+(i+1)%n,3*n) for i in range(n)]
  else:fs.append(tuple(range(2*n,3*n)))
  for j in range(2):
   for i in range(n):fs.append((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i))
  g.add(vs,fs,m,b)
 def joint(p,r,width,b,s=1):
  if lod==2 and r<.024:return
  p=Vector(p);ax=Vector((1,0,0));g.tube(p-ax*width/2,p+ax*width/2,r,0,b)
  if lod<2:
   for sign in [s,-s] if r>.035 else [s]:
    q=p+ax*sign*width/2;g.tube(q,q+ax*sign*.008,r*.89,4,b);g.tube(q+ax*sign*.009,q+ax*sign*.013,r*.63,3,b);g.ring(q+ax*sign*.014,r*.71,.003,(1,0,0),4,b)
   if lod==0 and r>.03:
    q=p+ax*s*width/2
    for j in range(5):
     a=j*math.tau/5;g.bolt(q+Vector((s*.015,math.sin(a)*r*.75,math.cos(a)*r*.75)),b,axis=(s,0,0))
 def rail(a,b,r,bone):
  a,b=Vector(a),Vector(b);g.tube(a,a.lerp(b,.55),r,0,bone);g.tube(a.lerp(b,.46),b,r*.48,4,bone)
  if lod==0:
   for f in [.10,.46,.54]:g.ring(a.lerp(b,f),r,.0028,b-a,4,bone)
 def carapace(a,b,w,depth,m,bone):
  # Tapered, bowed armor leaf: double skin with closed edges. Retained in LOD1.
  a,b=Vector(a),Vector(b);d=b-a;F=Vector((0,d.z,-d.y)).normalized();X=d.cross(F).normalized();steps=[10,5,2][lod]
  profiles=[(0,.33),(.15,.80),(.48,1),(.81,.67),(1,.17)] if lod<2 else [(0,.33),(.48,1),(1,.17)];vs=[]
  for inner in [False,True]:
   for u,scale in profiles:
    for k in range(steps+1):
     theta=-1.24+2.48*k/steps;vs.append(a+d*u+X*(w*scale*math.sin(theta))+F*((depth*scale-(.008 if inner else 0))*math.cos(theta)))
  n=steps+1;count=len(profiles)*n;fs=[]
  for layer in [0,1]:
   off=layer*count
   for j in range(len(profiles)-1):
    for k in range(steps):
     f=(off+j*n+k,off+j*n+k+1,off+(j+1)*n+k+1,off+(j+1)*n+k);fs.append(f if not layer else f[::-1])
  border=list(range(n))+[j*n+steps for j in range(1,len(profiles))]+list(range(count-2,count-n-1,-1))+[j*n for j in range(len(profiles)-2,0,-1)]
  for i,k in enumerate(border):l=border[(i+1)%len(border)];fs.append((k,k+count,l+count,l))
  g.add(vs,fs,m,bone)
  def surface(u,theta):
   for (u0,w0),(u1,w1) in zip(profiles,profiles[1:]):
    if u0<=u<=u1:
     scale=w0+(w1-w0)*(u-u0)/(u1-u0);point=a+d*u+X*(w*scale*math.sin(theta))+F*(depth*scale*math.cos(theta));normal=(X*(math.sin(theta)/w)+F*(math.cos(theta)/depth)).normalized();return point,normal
   raise ValueError('Armor surface parameter outside leaf')
  return surface
 def strip(a,b,bone):
  if lod<2:
   a,b=Vector(a),Vector(b);g.strut(a,b,.017,3,bone);g.tube(a+Vector((0,-.009,0)),b+Vector((0,-.009,0)),.0035,5,bone,sides=8 if lod==0 else 6)
 def shoulder_cap(p,s,bone):
  p=Vector(p);n=[16,8,3][lod];vs=[]
  for inner in [False,True]:
   for side in [-1,0,1]:
    for i in range(n+1):
     t=-1.12+2.24*i/n;r=.105+.019*(1-side*side)-(.009 if inner else 0);vs.append(p+Vector((s*(.064+side*.053),math.sin(t)*r,math.cos(t)*r)))
  step=n+1;skin=3*step;fs=[]
  for layer in [0,1]:
   off=layer*skin
   for row in [0,1]:
    for i in range(n):fs.append((off+row*step+i,off+row*step+i+1,off+(row+1)*step+i+1,off+(row+1)*step+i))
  for row in [0,2]:
   for i in range(n):k=row*step+i;fs.append((k,k+1,k+1+skin,k+skin))
  for i in [0,n]:
   for row in [0,1]:k=row*step+i;fs.append((k,k+step,k+step+skin,k+skin))
  g.add(vs,fs,1,bone)
  # A real radial bracket connects the shell to the shoulder bearing.
  for t in [-.72,.72]:
   ray=Vector((0,math.sin(t),math.cos(t)));center=p+Vector((s*.064,0,0));g.strut(center+ray*.068,center+ray*.114,.019,0,bone)
 # Raised six-sided thorax. Sloping front facets are 11 cm deep.
 g.hull([(.08,.16,2.17,.16),(-.055,.215,2.17,.15),(-.105,.14,2.16,.11)],0,'CHEST')
 hexagon=[(0,2.335),(.151,2.259),(.141,2.092),(0,2.011),(-.141,2.092),(-.151,2.259)]
 plate(hexagon,-.084,-.201,1,'CHEST',.026)
 g.box((0,-.225,2.184),(.037,.017,.101),0,'CHEST',.006)
 strip((0,-.238,2.158),(0,-.238,2.216),'CHEST')
 for s in [-1,1]:
  plate([(s*.125,2.303),(s*.244,2.268),(s*.264,2.177),(s*.204,2.033),(s*.151,2.053),(s*.180,2.197)],-.055,-.147,1,'CHEST')
  # Three small ivory access facets lie on the sloping flank, separated by seams.
  for j in range(3):
   z=2.211-j*.057;x=s*(.224-j*.012)
   plate([(x-s*.022,z+.026),(x+s*.025,z+.019),(x+s*.021,z-.020),(x-s*.025,z-.027)],-.149,-.169,2,'CHEST')
  if lod<2:
   g.tube((s*.13,.013,2.04),(s*.264,.005,2.24),.029,0,'CHEST')
   g.hose([(s*.208,.075,2.27),(s*.242,.095,2.13),(s*.173,.095,1.985),(s*.085,.04,1.976)],.012,3,'CHEST')
   for j in range(4 if lod==0 else 2):
    z=2.05+j*.035;g.tube((s*.137,.065,z),(s*.226,.063,z+.044),.008,4,'CHEST')
   for x,z,y in [(s*.065,2.285,-.204),(s*.112,2.116,-.204),(s*.231,2.244,-.17),(s*.198,2.089,-.17)]:g.bolt((x,y,z),'CHEST',axis=(0,-1,0))
 # Slender segmented spine and external hydraulic triangle.
 for bone,z0,z1,r in [('WAIST',1.84,2.015,.032),('PELVIS',1.705,1.84,.038)]:
  g.tube((0,0,z0),(0,0,z1),r,0,bone)
  if lod<2:
   for s in [-1,1]:rail((s*.046,-.003,z0+.005),(s*.057,-.016,z1-.008),.012,bone)
   for z in [z0+.032,z1-.026]:g.ring((0,0,z),r+.003,.004,(0,0,1),4,bone)
   if lod==0:
    for s in [-1,1]:g.hose([(s*.03,.03,z0),(s*.047,.052,(z0+z1)/2),(s*.035,.03,z1)],.007,3,bone)
 # The whole pelvis reads as two compact balls on a thin cross tube.
 g.tube((-.155,0,1.70),(.155,0,1.70),.022,4,'PELVIS')
 if lod<2:
  g.tube((-.040,0,1.70),(.040,0,1.70),.038,0,'PELVIS')
  for s in [-1,1]:g.ring((s*.052,0,1.70),.028,.005,(1,0,0),0,'PELVIS')
 for side,s in [('L',1),('R',-1)]:
  b='HIP_'+side;p=H[b];g.ellipsoid(p,(.083,.079,.079),0,b)
  if lod<2:
   g.ring(p,.079,.003,(1,0,0),4,b);g.tube(p+Vector((s*.074,0,0)),p+Vector((s*.089,0,0)),.037,4,b);g.tube(p+Vector((s*.090,0,0)),p+Vector((s*.092,0,0)),.026,3,b)
 # Small radio pack with a separate receiver cassette and a protected whip.
 g.box((0,.132,2.175),(.204,.105,.235),0,'CHEST',.018)
 g.box((-.034,.192,2.174),(.117,.024,.194),1,'CHEST',.012)
 g.box((.063,.194,2.188),(.063,.045,.211),3,'CHEST',.008)
 if lod<2:
  for j in range(5):g.box((-.035,.209,2.105+j*.025),(.075,.010,.005),3,'CHEST',.001)
  for z in [2.12,2.15,2.18]:g.tube((.062,.219,z),(.062,.228,z),.008,4,'CHEST',sides=8)
  g.box((.061,.222,2.231),(.037,.008,.024),5,'CHEST',.002)
  g.hose([(.081,.18,2.28),(.116,.17,2.25),(.116,.17,2.06),(.078,.14,2.04)],.006,0,'CHEST')
 g.tube((.066,.17,2.29),(.066,.17,2.385),.013,0,'CHEST');g.tube((.066,.17,2.385),(.066,.17,2.715),.0045,3,'CHEST',r1=.0025)
 if lod==0:
  for j in range(6):g.ring((.066,.17,2.31+j*.009),.014,.002,(0,0,1),4,'CHEST')
 # Tiny compound optical head, carried by a visibly mechanical cervical link.
 g.tube((0,-.025,2.32),(0,-.062,2.505),.026,0,'NECK')
 if lod<2:
  for s in [-1,1]:rail((s*.034,-.04,2.365),(s*.035,-.077,2.49),.010,'NECK');g.hose([(s*.025,.01,2.35),(s*.04,.015,2.425),(s*.027,-.01,2.50)],.007,3,'NECK')
 joint((0,-.067,2.475),.028,.087,'HEAD')
 g.box((0,-.062,2.533),(.192,.152,.113),0,'HEAD',.016)
 g.hull([(.02,.074,2.559,.027),(-.075,.107,2.583,.020),(-.152,.082,2.567,.013)],1,'HEAD')
 g.box((0,-.157,2.517),(.204,.038,.135),3,'SENSOR_YAW',.014)
 for x,z,r in [(-.055,2.532,.041),(.049,2.555,.023),(.067,2.488,.020),(-.007,2.474,.015)]:
  g.box((x,-.178,z),(r*2.5,.043,r*2.4),0,'SENSOR_YAW',.008)
  g.tube((x,-.19,z),(x,-.218,z),r*1.15,0,'SENSOR_YAW')
  if lod<2:g.ring((x,-.219,z),r,.003,(0,1,0),4,'SENSOR_YAW')
  g.tube((x,-.221,z),(x,-.223,z),r*.76,5,'SENSOR_YAW')
  if lod==0:g.ellipsoid((x,-.224,z),(r*.53,.006,r*.53),5,'SENSOR_YAW');g.tube((x,-.230,z),(x,-.231,z),r*.25,3,'SENSOR_YAW')
 strip((.016,-.196,2.490),(.016,-.196,2.534),'SENSOR_YAW')
 for s in [-1,1]:
  g.side_plate([(-.144,2.582),(-.021,2.585),(.025,2.549),(.015,2.483),(-.07,2.464),(-.148,2.493)],s*.109,.009,2,'HEAD')
  if lod<2:joint((s*.112,-.03,2.525),.026,.012,'HEAD',s)
  if lod==0:
   for y,z in [(-.119,2.565),(.008,2.503)]:g.bolt((s*.122,y,z),'HEAD',axis=(s,0,0))
 # Curved shoulder carapaces, tapered arms and long hooked mechanical fingers.
 for side,s in [('L',1),('R',-1)]:
  b='SHOULDER_'+side;p=H[b];joint(p,.078,.123,b,s);shoulder_cap(p,s,b)
  if lod<2:g.label('B-43',(s*.411,.018,2.296),b,s,.024)
  for j,(bone,end,w) in enumerate([('UPPER_ARM_'+side,'FOREARM_'+side,.066),('FOREARM_'+side,'HAND_'+side,.063)]):
   a,c=H[bone],H[end];joint(a,.052 if j==0 else .049,.083,bone,s)
   g.strut(a.lerp(c,.10),a.lerp(c,.92),.041,0,bone)
   armor=carapace(a.lerp(c,.13)+Vector((0,-.025,0)),a.lerp(c,.91)+Vector((0,-.025,0)),w,.046,1,bone)
   if lod<2:
    for xs in [-1,1]:
     off=Vector((xs*.027,.018,0));rail(a.lerp(c,.14)+off,a.lerp(c,.91)+off,.010,bone)
    if j==1:strip(a.lerp(c,.36)+Vector((0,-.073,0)),a.lerp(c,.69)+Vector((0,-.073,0)),bone)
    if lod==0:
     g.hose([a+Vector((0,.035,-.035)),a.lerp(c,.48)+Vector((0,.049,0)),c+Vector((0,.023,.026))],.007,3,bone)
     for u in [.15,.81]:
      point,normal=armor(u,-s*.992);g.bolt(point+normal*.001,bone,axis=normal)
  hand_start=len(g.v)
  b='HAND_'+side;a=CANONICAL_HAND[b];joint(a,.029,.085,b,s)
  g.strut(a,a+Vector((0,0,-.095)),.048,0,b)
  plate([(a.x-.052,a.z-.02),(a.x+.052,a.z-.02),(a.x+.059,a.z-.095),(a.x+.037,a.z-.115),(a.x-.045,a.z-.11)],-.046,-.074,1,b)
  for i in range(4):
   names=[f'FINGER_{side}{i+1}_{j:02}' for j in [1,2,3]];points=[CANONICAL_HAND[n] for n in names];points.append(points[-1]+Vector((0,-.066,-.019)))
   for j,(n,p,q) in enumerate(zip(names,points,points[1:])):
    joint(p,.0135-j*.001,.021-j*.002,n,s)
    g.strut(p if lod==2 else p.lerp(q,.13),q if lod==2 else p.lerp(q,.93),.016-j*.002,0,n)
    if lod<2:
     for sign in [-1,1]:g.tube(p.lerp(q,.14)+Vector((sign*.008,0,0)),p.lerp(q,.88)+Vector((sign*.007,0,0)),.0035,4,n,sides=8 if lod==0 else 6)
    if j==2:g.tube(p.lerp(q,.43),q,.011,1,n,r1=.005,sides=10 if lod<2 else 6);g.tube(q,q+Vector((0,-.010,.007)),.005,4,n,r1=.002,sides=8 if lod<2 else 4)
  n='THUMB_'+side+'_01';nn='THUMB_'+side+'_02';a,c=CANONICAL_HAND[n],CANONICAL_HAND[nn];joint(a,.018,.025,n,s);g.strut(a,c,.023,4,n);joint(c,.015,.023,nn,s);g.tube(c,c+Vector((s*.006,-.057,-.052)),.016,0,nn,r1=.005)
  # Correct the entire wrist/hand assembly once; only digits reverse their
  # flexion side, so the protective back plate stays opposite the palm.
  for i in range(hand_start,len(g.v)):
   digit=g.b[i].startswith('FINGER_') or g.b[i].startswith('THUMB_')
   g.v[i]=hand_point(g.v[i],side,mirror=digit)
  # Long, slightly splayed legs. Thighs taper into small exposed knees.
  for j,(bone,end) in enumerate([('HIP_'+side,'KNEE_'+side),('KNEE_'+side,'ANKLE_'+side)]):
   a,c=H[bone],H[end]
   if j:joint(a,.063,.115,bone,s)
   g.strut(a.lerp(c,.12),a.lerp(c,.92),.046 if j==0 else .029,0,bone)
   off=Vector((0,-.027,0));armor=carapace(a.lerp(c,.19 if j==0 else .08)+off,a.lerp(c,.88 if j==0 else .38)+off,.091 if j==0 else .079,.069 if j==0 else .054,1,bone)
   if j==1:carapace(a.lerp(c,.74)+off,a.lerp(c,.91)+off,.048,.033,1,bone)
   if lod<2:
    for xs in [-1,1]:
     off=Vector((xs*.036,.02,0));rail(a.lerp(c,.15)+off,a.lerp(c,.92)+off,.016 if j==0 else .012,bone)
    g.shell(a.lerp(c,.30 if j==0 else .16),a.lerp(c,.76 if j==0 else .34),.032,2,bone,s,offset=.070 if j==0 else .060)
    strip(a.lerp(c,.43 if j==0 else .16)+Vector((0,-.098 if j==0 else -.081,0)),a.lerp(c,.67 if j==0 else .28)+Vector((0,-.098 if j==0 else -.081,0)),bone)
    if lod==0:
     for u in [.15,.81]:
      point,normal=armor(u,-s*.992);g.bolt(point+normal*.001,bone,axis=normal)
     g.hose([a+Vector((0,.061,-.05)),a.lerp(c,.52)+Vector((0,.075,0)),c+Vector((0,.035,.027))],.009,3,bone)
     if j==1:
      for f in [.47,.67,.91]:g.box(a.lerp(c,f)+Vector((0,.02,0)),(.086,.046,.013),0,bone,.003)
      joint(a.lerp(c,.86)+Vector((s*.019,0,0)),.027,.071,bone,s)
  # Three separated claw digits, carried by the existing ankle/toe pivots.
  # Preserve the 6 mm sole and the original heel/toe roll contact extrema.
  b='ANKLE_'+side;a=H[b];joint(a,.037,.089,b,s)
  def claw_piece(stations,m,bone):
   # Closed chamfered sections; static LOD keeps the separate toe silhouettes.
   section=[(-1,-1),(1,-1),(1,.35),(.6,1),(-.6,1),(-1,.35)] if lod<2 else [(-1,-1),(1,-1),(1,1),(-1,1)]
   n=len(section);vs=[(a.x+x+u*w,y,z+v*h) for x,y,z,w,h in stations for u,v in section];fs=[tuple(range(n-1,-1,-1)),tuple(range((len(stations)-1)*n,len(stations)*n))]
   for j in range(len(stations)-1):
    for i in range(n):fs.append((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i))
   g.add(vs,fs,m,bone)
  for k in [-1,1]:rail(a+Vector((k*.027,0,-.012)),(a.x+k*.035,.006,.139),.013,b)
  g.box((a.x,.012,.137),(.115,.072,.043),0,b,.006)
  # Short rear stabilizer: a narrow heel claw, not a full-length boot sole.
  claw_piece([(0,.025,.099,.026,.021),(0,.067,.036,.029,.030),(0,.095,.014,.018,.008)],0,b)
  if lod<2:joint((a.x,.038,.082),.021,.058,b,s)
  toe='TOE_'+side
  for k in [-1,0,1]:
   x=k*.045;tipx=k*.069;end=-.145 if k==0 else -.130
   root=Vector((a.x+x,-.011,.121));knuckle=Vector((a.x+k*.059,-.072,.058))
   if lod<2:
    joint(root,.020,.045,toe,s);joint(knuckle,.019,.043,toe,s)
    g.strut(root,knuckle,.026,0,toe)
   else:g.tube(knuckle-Vector((.022,0,0)),knuckle+Vector((.022,0,0)),.019,0,toe,sides=6)
   claw_piece([(x,-.015,.136,.019,.014),(k*.052,-.039,.113,.022,.020),(k*.058,-.061,.079,.016,.012)],1,toe)
   # Down-curved, replaceable titanium tips leave daylight between all digits.
   claw_piece([(k*.060,-.080,.054,.018,.020),(k*.065,end+.022,.028,.017,.022),(tipx,end,.012,.009,.006)],4,toe)
   if lod<2:
    g.tube(root+Vector((0,.009,-.010)),knuckle+Vector((0,.013,-.007)),.007,4,toe,sides=10 if lod==0 else 6)
    if lod==0:g.bolt((a.x+k*.052,-.037,.135),toe,axis=(0,-.65,.76))
 return g

def make_arm(col):
 d=bpy.data.armatures.new('BREK43_BIPED_SKELETON');arm=bpy.data.objects.new('BREK43_RIG',d);col.objects.link(arm);bpy.context.view_layer.objects.active=arm;arm.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
 for n in H:
  b=d.edit_bones.new(n);b.head=H[n];b.tail=H[n]+Vector((0,0,.035));b.use_deform=not n.startswith('SOCKET_')
  if PAR[n]:b.parent=d.edit_bones[PAR[n]]
 bpy.ops.object.mode_set(mode='OBJECT');arm.show_in_front=True;arm['rig']='BREK43 original reconnaissance biped; rigid armor, constant-length leg IK, articulated fingers and sensor gimbal';return arm


def make_skin(g,col,arm,lod):
 d=bpy.data.meshes.new('BREK43_GEOMETRY');d.from_pydata(g.v,[],g.f);d.update();o=bpy.data.objects.new('BREK43_SKIN',d);col.objects.link(o)
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
  mod=o.modifiers.new('BREK43_RigidArmor','ARMATURE');mod.object=arm
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
 scene=bpy.context.scene;scene.name='BREK43_RECON_BIPED';scene.render.fps=FPS;scene.frame_start=0;scene.frame_end=720;only_distance="--distance-only" in sys.argv;assets=json.loads((OUT/"manifest.json").read_text())["assets"][:2] if only_distance else []
 for lod in ([2] if only_distance else [0,1,2]):
  col=bpy.data.collections.new('BREK43_LOD'+str(lod));scene.collection.children.link(col);root=bpy.data.objects.new('ROOT',None);col.objects.link(root);root['forward']='+Z in glTF';root['damage_level']=0
  g=shape(lod);arm=make_arm(col);arm.parent=root;skin=make_skin(g,col,arm,lod)
  if lod<2:animate(arm)
  bpy.ops.object.select_all(action='DESELECT')
  for o in col.objects:o.select_set(True)
  scene.frame_set(0);path=OUT/f'b_rek43_d0_lod{lod}.glb'
  bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_extras=True,export_animations=lod<2,export_animation_mode='NLA_TRACKS',export_frame_range=False,export_force_sampling=True,export_cameras=False,export_lights=False)
  raw=path.read_bytes();n=struct.unpack_from('<I',raw,12)[0];doc=json.loads(raw[20:20+n]);e=dict(file=path.name,lod=lod,damage_level=0,static=lod==2,derived=False,bytes=len(raw),triangles=sum(doc['accessors'][p['indices']]['count']//3 for m in doc.get('meshes',[]) for p in m['primitives']),draw_calls=sum(len(m['primitives']) for m in doc.get('meshes',[])),plot_m=[1.3,1.0],clips=CLIPS if lod<2 else [],credit='Models by jelaludo');assets.append(e);print('EXPORT',e,flush=True)
  if lod==0:
   for tr in arm.animation_data.nla_tracks:tr.mute=tr.name!='Recon_Idle'
   scene.frame_set(0)
   for screen in bpy.data.screens:
    for area in screen.areas:
     if area.type=='VIEW_3D':area.spaces.active.region_3d.view_location=(0,0,1.2);area.spaces.active.region_3d.view_distance=4.;area.spaces.active.shading.type='MATERIAL'
   bpy.ops.wm.save_as_mainfile(filepath=str(P/'source/blender/a6-b-rek43.blend'))
  for o in list(col.objects):bpy.data.objects.remove(o,do_unlink=True)
  bpy.data.collections.remove(col)
  for data in [bpy.data.armatures,bpy.data.actions,bpy.data.meshes,bpy.data.materials,bpy.data.curves]:
   for item in list(data):
    if item.users==0:data.remove(item)
 manifest=dict(family='b-rek43',label='B-REK43 / Recon Biped',plain_glb_source_of_truth=True,coordinate_system=dict(units='metres',up='+Y',forward='+Z',origin='ground at standing hip centre'),damage_states={'d0':'intact only'},animation=dict(fps=FPS,skeleton_joints=len(H),placement_node='instance wrapper around complete glTF scene',motion_node='MOTION',engine_driven_excluded=['SENSOR_YAW'],gait='Original alternating biped gait: heel contact, flat support, toe roll and swing; double support, lateral weight transfer, counter-rotation and delayed arms; not a force simulation'),lod_selection=dict(initial=2,approach_distance_m=30,hysteresis_m=8,lod0='Detailed recording master',lod1='All animated gameplay; retain while moving',lod2='Static standing map/loading silhouette; no animation'),assets=assets)
 (OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');print('MAX_REACH_ERROR',motion.MAX_REACH_ERROR,flush=True);print('BREK43_COMPLETE',flush=True)
if __name__=='__main__':build()
