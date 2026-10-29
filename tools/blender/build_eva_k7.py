"""EVA-K7: gritty military-exploration hardsuit astronaut with an opaque visor."""
import bpy,bmesh,math,json,struct,sys
from pathlib import Path
from mathutils import Vector,Matrix,Euler
sys.path.insert(0,str(Path(__file__).resolve().parent))
from build_mechanical_cheetah import CheetahGeometry
import eva_k7_motion as motion
from eva_k7_motion import H,PAR,CLIPS,FPS,pose,CANONICAL_HAND,hand_point
P=Path(__file__).resolve().parents[2];OUT=P/'assets/eva-k7';OUT.mkdir(exist_ok=True)

COLORS=[(.028,.030,.033),(.235,.245,.23),(.50,.36,.14),(.013,.014,.015),(.40,.42,.44),(.045,.034,.026)]

def material(i,distance=False):
 names=['Carbon_plate','Quilted_suit','Brass_fittings','Rubber_seals','Steel','Opaque_visor'];m=bpy.data.materials.new('EVAK7_'+names[i]);m.use_nodes=True;s=m.node_tree.nodes.get('Principled BSDF');s.inputs['Base Color'].default_value=(*COLORS[i],1);m.diffuse_color=(*COLORS[i],1);s.inputs['Metallic'].default_value=[.40,.0,.95,.05,.90,.95][i];s.inputs['Roughness'].default_value=[.42,.78,.30,.80,.32,.09][i]
 if distance:
  s.inputs['Metallic'].default_value=.4;n=m.node_tree.nodes.new('ShaderNodeVertexColor');n.layer_name='Palette';m.node_tree.links.new(n.outputs['Color'],s.inputs['Base Color'])
 return m

class SuitGeometry(CheetahGeometry):
 def tube(self,*args,**kwargs):
  first=len(self.f);super().tube(*args,**kwargs)
  # Flat machined end caps; only the barrel is smooth-shaded.
  self.smooth[first]=False;self.smooth[first+1]=False
 def vhull(self,stations,m,bone):
  """Smooth vertical body section: stations of (z, half width x, half depth y, centre y)."""
  n=[24,12,8][self.lod];vs=[]
  for z,w,d,cy in stations:
   for i in range(n):a=math.tau*i/n;vs.append((w*math.cos(a),cy+d*math.sin(a),z))
  k=len(stations);fs=[tuple(range(n-1,-1,-1)),tuple(range((k-1)*n,k*n))]+[(j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i) for j in range(k-1) for i in range(n)]
  first=len(self.f);self.add(vs,fs,m,bone,True);self.smooth[first]=False;self.smooth[first+1]=False
 def patch(self,c,r,axis,az,el,thickness,m,bone,up=(0,0,1)):
  """Closed double-skin ellipsoid patch facing `axis`; returns the outer border points."""
  c=Vector(c);n=Vector(axis).normalized();u=Vector(up);u=(u-n*u.dot(n)).normalized();t=u.cross(n).normalized();na,ne=[16,8,4][self.lod],[12,6,3][self.lod]
  def point(i,j,inner):
   a=az[0]+(az[1]-az[0])*j/na;e=el[0]+(el[1]-el[0])*i/ne;d=n*(math.cos(e)*math.cos(a))+t*(math.cos(e)*math.sin(a))+u*math.sin(e)
   p=c+n*(r[0]*math.cos(e)*math.cos(a))+t*(r[1]*math.cos(e)*math.sin(a))+u*(r[2]*math.sin(e))
   return p-d*thickness if inner else p
  vs=[point(i,j,inner) for inner in [False,True] for i in range(ne+1) for j in range(na+1)];w=na+1;count=(ne+1)*w;fs=[]
  for layer in [0,1]:
   off=layer*count
   for i in range(ne):
    for j in range(na):f=(off+i*w+j,off+i*w+j+1,off+(i+1)*w+j+1,off+(i+1)*w+j);fs.append(f if not layer else f[::-1])
  border=list(range(w))+[i*w+na for i in range(1,ne+1)]+list(range(count-2,count-w-1,-1))+[i*w for i in range(ne-1,0,-1)]
  for i,k in enumerate(border):l=border[(i+1)%len(border)];fs.append((k,k+count,l+count,l))
  self.add(vs,fs,m,bone,True);return [vs[k] for k in border]
 def text(self,body,loc,rot,size,bone,m=4):
  if self.lod==2:return
  d=bpy.data.curves.new('TemporaryLabel','FONT');d.body=body;d.size=size;d.align_x='CENTER';d.resolution_u=3 if self.lod==0 else 2;d.fill_mode='BOTH'
  o=bpy.data.objects.new('TemporaryLabel',d);bpy.context.scene.collection.objects.link(o);bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH');me=o.data
  self.add([Vector(loc)+rot@v.co for v in me.vertices],[tuple(p.vertices) for p in me.polygons],m,bone);bpy.data.objects.remove(o,do_unlink=True)

def shape(lod):
 g=SuitGeometry(lod);g.sides=[28,12,6][lod]
 def plate(points,back,front,m,b,crown=0):
  # Closed shallow chamfered armor plate in the XZ plane, with real depth.
  n=len(points);cx=sum(x for x,z in points)/n;cz=sum(z for x,z in points)/n;sign=1 if front<back else -1
  vs=[]
  for y,scale in [(back,.94),(front+.008*sign,1),(front,.91)]:vs += [(cx+(x-cx)*scale,y,cz+(z-cz)*scale) for x,z in points]
  fs=[tuple(range(n-1,-1,-1))]
  if crown:
   vs.append((cx,front-crown*sign,cz));fs += [(2*n+i,2*n+(i+1)%n,3*n) for i in range(n)]
  else:fs.append(tuple(range(2*n,3*n)))
  for j in range(2):
   for i in range(n):fs.append((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i))
  g.add(vs,fs,m,b)
 def carapace(a,b,w,depth,m,bone,face):
  # Tapered, bowed armor leaf: double skin with closed edges. Retained in all tiers.
  a,b=Vector(a),Vector(b);d=b-a;dn=d.normalized();F=Vector(face);F=(F-dn*F.dot(dn)).normalized();X=dn.cross(F).normalized();steps=[10,5,2][lod]
  profiles=[(0,.33),(.15,.80),(.48,1),(.81,.72),(1,.22)] if lod<2 else [(0,.33),(.48,1),(1,.22)];vs=[]
  for inner in [False,True]:
   for u,scale in profiles:
    for k in range(steps+1):
     theta=-1.24+2.48*k/steps;vs.append(a+d*u+X*(w*scale*math.sin(theta))+F*((depth*(.55+.45*scale)-(.008 if inner else 0))*math.cos(theta)))
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
     scale=w0+(w1-w0)*(u-u0)/(u1-u0);point=a+d*u+X*(w*scale*math.sin(theta))+F*(depth*(.55+.45*scale)*math.cos(theta));normal=(X*(math.sin(theta)/w)+F*(math.cos(theta)/depth)).normalized();return point,normal
   raise ValueError('Armor surface parameter outside leaf')
  return surface
 def band(a,b,u,r,bone,m=1,width=.010):
  # Quilting seam or strap: a short, slightly proud sleeve around a soft limb.
  if lod==2:return
  a,b=Vector(a),Vector(b);d=(b-a).normalized();c=a.lerp(b,u);g.tube(c-d*width/2,c+d*width/2,r,m,bone)
 def buckle(p,axis,bone,size=(.022,.008,.030)):
  if lod==2:return
  g.box(p,size,2,bone,.002,Vector(axis).to_track_quat('Y','Z').to_euler())
 def hull_at(x,stations,m,bone):
  start=len(g.v);g.hull(stations,m,bone)
  for v in g.v[start:]:v.x+=x
 # ---- Helmet: opaque bronze-black visor set into a carbon dome, bellows collar below.
 C=Vector((0,-.015,1.80))
 g.ellipsoid(C,(.150,.160,.165),0,'HEAD')
 border=g.patch(C,(.158,.168,.173),(0,-1,0),(-1.02,1.02),(-.66,.62),.005,5,'HEAD')
 if lod<2:
  for p,q in zip(border,border[1:]+border[:1]):g.tube(p,q,.0065,4,'HEAD',sides=8 if lod==0 else 6)
  g.box((0,-.116,1.905),(.19,.05,.016),0,'HEAD',.004,(.42,0,0))
  g.box((0,.0,1.953),(.046,.12,.026),0,'HEAD',.003)
  for s in [-1,1]:
   g.tube((s*.158,-.030,1.85),(s*.158,-.078,1.85),.016,4,'HEAD');g.tube((s*.158,-.078,1.85),(s*.158,-.081,1.85),.012,5,'HEAD')
   g.ellipsoid((s*.146,.0,1.79),(.022,.056,.056),0,'HEAD');g.ring((s*.165,.0,1.79),.034,.004,(1,0,0),2,'HEAD')
   if lod==0:
    for a in range(6):t=a*math.tau/6;g.bolt((s*.166,.040*math.cos(t),1.79+.040*math.sin(t)),'HEAD',axis=(s,0,0))
 g.box((0,.118,1.895),(.08,.05,.05),0,'HEAD',.006,(-.55,0,0))
 g.box((0,-.118,1.672),(.16,.07,.045),0,'HEAD',.008,(.35,0,0))
 g.tube((0,-.01,1.595),(0,-.01,1.66),.125,3,'NECK')
 if lod<2:
  g.ring((0,-.01,1.655),.133,.008,(0,0,1),2,'NECK');g.ring((0,-.01,1.606),.131,.006,(0,0,1),4,'NECK')
  for a in range(4):t=math.pi/4+a*math.pi/2;g.box((.128*math.cos(t),-.01+.128*math.sin(t),1.632),(.022,.016,.030),4,'NECK',.003,(0,0,t))
 # ---- Torso: quilted pressure garment in three skinned sections, carbon plates over it.
 g.vhull([(.885,.150,.105,.010),(.95,.175,.120,0),(1.03,.180,.125,0)],1,'PELVIS')
 g.vhull([(1.02,.180,.125,0),(1.13,.170,.120,0),(1.25,.175,.125,0)],1,'WAIST')
 g.vhull([(1.24,.175,.125,0),(1.36,.195,.135,-.005),(1.47,.210,.140,-.010),(1.55,.200,.130,-.010),(1.61,.130,.100,0)],1,'CHEST')
 if lod<2:
  for z,w,d,bone in [(1.19,.173,.123,'WAIST'),(1.30,.183,.129,'CHEST'),(1.41,.205,.139,'CHEST'),(.925,.168,.115,'PELVIS')]:g.vhull([(z-.006,w+.004,d+.004,-.004 if z>1.3 else 0),(z+.006,w+.004,d+.004,-.004 if z>1.3 else 0)],3,bone)
 plate([(-.17,1.29),(.17,1.29),(.20,1.40),(.19,1.53),(.10,1.585),(-.10,1.585),(-.19,1.53),(-.20,1.40)],-.146,-.178,0,'CHEST',.010)
 plate([(-.15,1.165),(.15,1.165),(.165,1.275),(-.165,1.275)],-.126,-.150,0,'WAIST')
 plate([(-.10,.925),(.10,.925),(.115,1.03),(.10,1.08),(-.10,1.08),(-.115,1.03)],-.106,-.130,0,'PELVIS')
 if lod<2:
  for s in [-1,1]:plate([(s*.045,1.455),(s*.165,1.435),(s*.155,1.535),(s*.085,1.565)],-.176,-.190,0,'CHEST');g.box((s*.145,-.015,1.578),(.10,.09,.018),0,'CHEST',.004,(0,s*.28,0))
 plate([(-.16,1.27),(.16,1.27),(.18,1.50),(.08,1.575),(-.08,1.575),(-.18,1.50)],.134,.162,0,'CHEST')
 g.box((0,-.192,1.425),(.10,.030,.092),4,'CHEST',.005);g.box((0,-.208,1.432),(.064,.006,.042),5,'CHEST',.002)
 if lod<2:
  for s in [-1,1]:g.box((s*.046,-.207,1.395),(.012,.006,.018),2,'CHEST',.002);g.box((s*.030,-.207,1.46),(.014,.004,.010),2,'CHEST',.001)
  for s in [-1,1]:
   g.side_plate([(-.10,1.30),(.06,1.30),(.09,1.46),(-.05,1.52),(-.13,1.42)],s*.213,.012,0,'CHEST')
   g.strut((s*.095,-.185,1.30),(s*.135,-.150,1.565),.034,3,'CHEST');buckle((s*.115,-.190,1.43),(s*.14,-.11,1),'CHEST')
   g.strut((s*.10,.170,1.30),(s*.13,.160,1.56),.030,3,'CHEST')
  g.text('EVA-K7',(0,-.1515,1.205),Matrix(((1,0,0),(0,0,-1),(0,1,0))),.026,'WAIST')
 if lod==0:
  for x,z in [(-.17,1.33),(.17,1.33),(-.165,1.52),(.165,1.52)]:g.bolt((x,-.176,z),'CHEST',axis=(0,-1,0))
 # Belt, pouches and brass buckle at the waist.
 g.vhull([(1.090,.186,.133,0),(1.148,.186,.133,0)],3,'WAIST')
 g.box((0,-.147,1.118),(.072,.022,.046),2,'WAIST',.003)
 for s in [-1,1]:
  g.box((s*.12,-.115,1.095),(.072,.055,.090),0,'WAIST',.008,(0,0,-s*.18));g.box((s*.19,.0,1.095),(.040,.080,.092),0,'WAIST',.008)
  if lod<2:g.box((s*.12,-.146,1.075),(.030,.006,.026),2,'WAIST',.001,(0,0,-s*.18));g.box((s*.212,.0,1.115),(.006,.044,.020),4,'WAIST',.001)
 # ---- Air tank on the upper back with bracket, straps, valve and helmet feed hose.
 g.box((0,.170,1.405),(.17,.022,.27),0,'CHEST',.006)
 g.tube((0,.216,1.24),(0,.216,1.54),.062,4,'CHEST');g.ellipsoid((0,.216,1.54),(.062,.062,.040),4,'CHEST');g.ellipsoid((0,.216,1.24),(.062,.062,.034),4,'CHEST')
 g.tube((0,.216,1.575),(0,.216,1.612),.020,2,'CHEST');g.ring((0,.216,1.618),.018,.005,(0,0,1),4,'CHEST')
 if lod<2:
  for z in [1.30,1.48]:g.ring((0,.216,z),.063,.006,(0,0,1),3,'CHEST')
  g.hose([(0,.214,1.616),(0,.218,1.70),(0,.184,1.755)],.013,3,'CHEST');g.hose([(0,.184,1.755),(0,.150,1.79)],.013,3,'HEAD');g.tube((0,.158,1.79),(0,.128,1.79),.017,2,'HEAD')
  g.box((.058,.195,1.33),(.028,.026,.060),4,'CHEST',.003)
 # ---- Arms: quilted sleeves, carbon shoulder/upper-arm/gauntlet armor, brass wrist rings.
 for side,s in [('L',1),('R',-1)]:
  sh=H['SHOULDER_'+side];a=H['UPPER_ARM_'+side];c=H['FOREARM_'+side];h=H['HAND_'+side]
  g.patch(a+Vector((0,0,.018)),(.104,.120,.122),(s,0,0),(-1.28,1.28),(-.72,1.30),.008,0,'SHOULDER_'+side)
  if lod<2:g.patch(a+Vector((s*.012,0,-.055)),(.098,.104,.088),(s,0,-.3),(-1.0,1.0),(-.55,.40),.007,0,'SHOULDER_'+side)
  g.tube(sh,a+Vector((s*.03,0,0)),.055,1,'SHOULDER_'+side);g.ellipsoid(a+Vector((0,0,.01)),(.082,.090,.084),1,'SHOULDER_'+side)
  g.tube(a.lerp(c,.03),c.lerp(a,.04),.072,1,'UPPER_ARM_'+side,r1=.062)
  for u in [.34,.58,.82]:band(a,c,u,.071,'UPPER_ARM_'+side)
  armor=carapace(a.lerp(c,.28)+Vector((s*.050,0,0)),a.lerp(c,.88)+Vector((s*.046,0,0)),.056,.038,0,'UPPER_ARM_'+side,(s,0,0))
  if lod==0:
   for u in [.2,.8]:point,normal=armor(u,0);g.bolt(point+normal*.001,'UPPER_ARM_'+side,axis=normal)
  if lod<2:carapace(a.lerp(c,.34)+Vector((s*.016,-.056,0)),a.lerp(c,.86)+Vector((s*.010,-.050,0)),.044,.030,0,'UPPER_ARM_'+side,(s*.3,-1,0))
  g.ellipsoid(c,(.054,.050,.050),0,'FOREARM_'+side)
  if lod<2:g.ring(c+Vector((s*.045,0,0)),.034,.005,(1,0,0),2,'FOREARM_'+side)
  g.tube(c.lerp(h,.04),h.lerp(c,.06),.064,1,'FOREARM_'+side,r1=.054)
  for u in [.30,.56]:band(c,h,u,.064,'FOREARM_'+side)
  armor=carapace(c.lerp(h,.16)+Vector((s*.038,.034,0)),c.lerp(h,.84)+Vector((s*.034,.030,0)),.052,.034,0,'FOREARM_'+side,(s*.7,.7,0))
  if lod==0:
   for u in [.2,.8]:point,normal=armor(u,0);g.bolt(point+normal*.001,'FOREARM_'+side,axis=normal)
  if s<0 and lod<2:carapace(c.lerp(h,.18)+Vector((s*.020,-.050,0)),c.lerp(h,.82)+Vector((s*.014,-.044,0)),.042,.028,0,'FOREARM_'+side,(s*.4,-1,0))
  if s>0 and lod<2:
   rot=(h-c).to_track_quat('Z','Y').to_euler();p=c.lerp(h,.50)+Vector((0,-.062,0));g.box(p,(.040,.014,.058),4,'FOREARM_'+side,.003,rot)
   if lod==0:
    for k in range(3):g.box(p+Vector((.008,-.008,.016-k*.016)),(.006,.004,.009),2,'FOREARM_'+side,.001,rot)
    g.box(p+Vector((-.010,-.008,0)),(.014,.003,.040),5,'FOREARM_'+side,.001,rot)
  g.tube(h.lerp(c,.09),h.lerp(c,.02),.052,4,'HAND_'+side)
  if lod<2:g.ring(h.lerp(c,.06),.053,.007,h-c,2,'HAND_'+side)
  # Glove: rubber palm, carbon back plate, three-link fingers with knuckle guards, two-link thumb.
  hand_start=len(g.v);b='HAND_'+side;ca=CANONICAL_HAND[b]
  g.box(ca+Vector((0,.004,-.050)),(.096,.050,.104),3,b,.014);g.box(ca+Vector((0,-.028,-.044)),(.084,.012,.080),0,b,.004)
  if lod<2:g.box(ca+Vector((0,-.014,-.100)),(.096,.034,.014),0,b,.003)
  for i in range(4):
   names=[f'FINGER_{side}{i+1}_{j:02}' for j in [1,2,3]];points=[CANONICAL_HAND[n] for n in names];points.append(points[-1]+Vector((0,-.016,-.030)))
   for j,(n,p,q) in enumerate(zip(names,points,points[1:])):
    r=.0155-j*.001;g.tube(p.lerp(q,.02),q,r,3,n,r1=r*.92,sides=10 if lod==0 else 6)
    if lod<2:g.ellipsoid(p,(r*1.02,r*1.02,r*1.02),3,n);g.box(p.lerp(q,.5)+Vector((0,r*.78,0)),(r*1.4,.006,(q-p).length*.62),0,n,.001,(q-p).to_track_quat('Z','Y').to_euler())
    if j==2 and lod<2:g.ellipsoid(q,(r*.95,r*.95,r*.95),3,n)
  n='THUMB_'+side+'_01';nn='THUMB_'+side+'_02';p,q=CANONICAL_HAND[n],CANONICAL_HAND[nn];tip=q+Vector((-s*.022,-.026,-.026))
  g.tube(p,q,.016,3,n,r1=.015,sides=10 if lod==0 else 6);g.tube(q,tip,.014,3,nn,r1=.011,sides=10 if lod==0 else 6)
  if lod<2:g.ellipsoid(tip,(.010,.010,.010),3,nn)
  if lod<2:g.box(q.lerp(tip,.5)+Vector((-s*.006,.008,0)),(.016,.006,(tip-q).length*.7),0,nn,.001,(tip-q).to_track_quat('Z','Y').to_euler())
  for i in range(hand_start,len(g.v)):
   digit=g.b[i].startswith('FINGER_') or g.b[i].startswith('THUMB_')
   g.v[i]=hand_point(g.v[i],side,mirror=digit)
  # ---- Legs: quilted thigh/shin, carbon thigh plate, side plate and shin guard, knee cap, heavy boot.
  hip=H['HIP_'+side];k=H['KNEE_'+side];an=H['ANKLE_'+side]
  g.side_plate([(-.09,.93),(.07,.93),(.11,1.04),(-.02,1.085),(-.12,1.02)],s*.205,.014,0,'PELVIS')
  g.tube(hip.lerp(k,.07),k.lerp(hip,.05),.086,1,'HIP_'+side,r1=.074)
  for u in [.30,.55,.80]:band(hip,k,u,.094 if u<.5 else .088,'HIP_'+side)
  if lod<2:band(hip,k,.64,.090,'HIP_'+side,0,.024);buckle(hip.lerp(k,.64)+Vector((s*.02,-.092,0)),(0,-1,0),'HIP_'+side)
  armor=carapace(hip.lerp(k,.11)+Vector((s*.024,-.056,0)),hip.lerp(k,.88)+Vector((s*.010,-.048,0)),.086,.056,0,'HIP_'+side,(s*.45,-1,0))
  if lod==0:
   for u in [.2,.5,.8]:point,normal=armor(u,.15*s);g.bolt(point+normal*.001,'HIP_'+side,axis=normal)
  if lod<2:carapace(hip.lerp(k,.25)+Vector((s*.060,.0,0)),hip.lerp(k,.80)+Vector((s*.054,.0,0)),.048,.032,0,'HIP_'+side,(s,.15,0))
  g.ellipsoid(k,(.062,.060,.060),0,'KNEE_'+side);g.patch(k+Vector((0,-.006,0)),(.078,.074,.080),(0,-1,0),(-1.15,1.15),(-.75,.80),.008,0,'KNEE_'+side)
  if lod<2:g.ring(k+Vector((s*.058,0,0)),.040,.006,(1,0,0),2,'KNEE_'+side);g.ring(k+Vector((-s*.058,0,0)),.040,.006,(1,0,0),4,'KNEE_'+side)
  g.tube(k.lerp(an,.03),an.lerp(k,.02),.072,1,'KNEE_'+side,r1=.062)
  for u in [.32,.58]:band(k,an,u,.072,'KNEE_'+side)
  armor=carapace(k.lerp(an,.14)+Vector((0,-.050,0)),k.lerp(an,.80)+Vector((0,-.046,0)),.060,.040,0,'KNEE_'+side,(0,-1,0))
  if lod<2:carapace(k.lerp(an,.18)+Vector((0,.050,0)),k.lerp(an,.70)+Vector((0,.046,0)),.048,.028,0,'KNEE_'+side,(0,1,0))
  if lod==0:
   for u in [.25,.75]:point,normal=armor(u,0);g.bolt(point+normal*.001,'KNEE_'+side,axis=normal)
  hull_at(an.x,[(.117,.060,.090,.064),(.03,.068,.094,.074),(-.07,.068,.080,.062),(-.13,.064,.066,.052),(-.162,.058,.056,.044),(-.182,.044,.046,.030)],0,'ANKLE_'+side)
  g.box((an.x,-.035,.020),(.138,.316,.028),3,'ANKLE_'+side,.010)
  g.tube((an.x,.012,.130),(an.x,.012,.215),.077,0,'ANKLE_'+side);g.tube((an.x,.012,.212),(an.x,.012,.255),.070,3,'ANKLE_'+side)
  if lod<2:
   g.ring((an.x,.012,.213),.078,.006,(0,0,1),2,'ANKLE_'+side)
   for y,z in [(-.035,.160),(-.095,.128)]:g.box((an.x,y,z),(.140,.020,.014),0,'ANKLE_'+side,.003,(-.35 if y<-.05 else -.15,0,0));buckle((an.x+s*.068,y,z),(s,0,0),'ANKLE_'+side,(.012,.024,.020))
   g.box((an.x,.108,.070),(.090,.030,.070),0,'ANKLE_'+side,.006)
 return g

def make_arm(col):
 d=bpy.data.armatures.new('EVAK7_HARDSUIT_SKELETON');arm=bpy.data.objects.new('EVAK7_RIG',d);col.objects.link(arm);bpy.context.view_layer.objects.active=arm;arm.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
 for n in H:
  b=d.edit_bones.new(n);b.head=H[n];b.tail=H[n]+Vector((0,0,.035));b.use_deform=not n.startswith('SOCKET_')
  if PAR[n]:b.parent=d.edit_bones[PAR[n]]
 bpy.ops.object.mode_set(mode='OBJECT');arm.show_in_front=True;arm['rig']='EVAK7 original hardsuit astronaut; rigid armor segments, constant-length leg IK, articulated gloves';return arm


def make_skin(g,col,arm,lod):
 d=bpy.data.meshes.new('EVAK7_GEOMETRY');d.from_pydata(g.v,[],g.f);d.update();o=bpy.data.objects.new('EVAK7_SKIN',d);col.objects.link(o)
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
  mod=o.modifiers.new('EVAK7_RigidSuit','ARMATURE');mod.object=arm
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
    if n.startswith('SOCKET_'):continue
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
 scene=bpy.context.scene;scene.name='EVAK7_HARDSUIT';scene.render.fps=FPS;scene.frame_start=0;scene.frame_end=720;only_distance="--distance-only" in sys.argv;assets=json.loads((OUT/"manifest.json").read_text())["assets"][:2] if only_distance else []
 for lod in ([2] if only_distance else [0,1,2]):
  col=bpy.data.collections.new('EVAK7_LOD'+str(lod));scene.collection.children.link(col);root=bpy.data.objects.new('ROOT',None);col.objects.link(root);root['forward']='+Z in glTF';root['damage_level']=0
  g=shape(lod);arm=make_arm(col);arm.parent=root;skin=make_skin(g,col,arm,lod)
  if lod<2:animate(arm)
  bpy.ops.object.select_all(action='DESELECT')
  for o in col.objects:o.select_set(True)
  scene.frame_set(0);path=OUT/f'eva_k7_d0_lod{lod}.glb'
  bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_extras=True,export_animations=lod<2,export_animation_mode='NLA_TRACKS',export_frame_range=False,export_force_sampling=True,export_cameras=False,export_lights=False)
  raw=path.read_bytes();n=struct.unpack_from('<I',raw,12)[0];doc=json.loads(raw[20:20+n]);e=dict(file=path.name,lod=lod,damage_level=0,static=lod==2,derived=False,bytes=len(raw),triangles=sum(doc['accessors'][p['indices']]['count']//3 for m in doc.get('meshes',[]) for p in m['primitives']),draw_calls=sum(len(m['primitives']) for m in doc.get('meshes',[])),plot_m=[.9,.7],clips=CLIPS if lod<2 else [],credit='Models by jelaludo');assets.append(e);print('EXPORT',e,flush=True)
  if lod==0:
   for tr in arm.animation_data.nla_tracks:tr.mute=tr.name!='Suit_Idle'
   scene.frame_set(0)
   for screen in bpy.data.screens:
    for area in screen.areas:
     if area.type=='VIEW_3D':area.spaces.active.region_3d.view_location=(0,0,1.0);area.spaces.active.region_3d.view_distance=3.2;area.spaces.active.shading.type='MATERIAL'
   bpy.ops.wm.save_as_mainfile(filepath=str(P/'source/blender/a6-eva-k7.blend'))
  for o in list(col.objects):bpy.data.objects.remove(o,do_unlink=True)
  bpy.data.collections.remove(col)
  for data in [bpy.data.armatures,bpy.data.actions,bpy.data.meshes,bpy.data.materials,bpy.data.curves]:
   for item in list(data):
    if item.users==0:data.remove(item)
 manifest=dict(family='eva-k7',label='EVA-K7 / Hardsuit Astronaut',plain_glb_source_of_truth=True,coordinate_system=dict(units='metres',up='+Y',forward='+Z',origin='ground beneath the standing hip centre'),damage_states={'d0':'intact only'},animation=dict(fps=FPS,skeleton_joints=len([n for n in H if not n.startswith('SOCKET_')]),placement_node='instance wrapper around complete glTF scene',motion_node='MOTION',engine_driven_excluded=[],head_override='HEAD may be overridden additively by an engine look-at; clips keep it within ±36° yaw',gait='Original alternating human walk in a heavy suit: heel contact, flat support, toe roll and swing; double support, lateral weight transfer and restrained arm swing; not a force simulation'),lod_selection=dict(initial=2,approach_distance_m=30,hysteresis_m=8,lod0='Detailed recording master',lod1='All animated gameplay; retain while moving',lod2='Static standing map/loading silhouette; no animation'),assets=assets)
 (OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');print('MAX_REACH_ERROR',motion.MAX_REACH_ERROR,flush=True);print('EVAK7_COMPLETE',flush=True)
if __name__=='__main__':build()
