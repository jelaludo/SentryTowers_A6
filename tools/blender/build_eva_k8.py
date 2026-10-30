"""EVA-K8: heavy, worn hardsuit astronaut. Separate v2 family; EVA-K7 files are untouched.
Grey/black bevelled plates with panel lines and bolts over a wrinkled quilted pressure garment,
sparse muted brass hardware, angular faceted helmet, backpack tank plus secondary unit with two
ribbed hoses, 1.35x shoulders, 1.3x chest depth, 0.75x helmet, 1.4x gloves and 1.5x lugged boots.
Plain GLBs carry a palette only; the viewer generates worn PBR textures at runtime (eva-k8/materials.js).
"""
import bpy,bmesh,math,json,struct,sys
from pathlib import Path
from mathutils import Vector,Matrix,Euler,Quaternion
sys.path.insert(0,str(Path(__file__).resolve().parent))
from quadruped_geometry import Build
import eva_k8_motion as motion
from eva_k8_motion import H,PAR,CLIPS,FPS,pose,CANONICAL_HAND,hand_point,HEEL_Y,TOE_Y
P=Path(__file__).resolve().parents[2];OUT=P/'assets/eva-k8';OUT.mkdir(exist_ok=True)

# Linear palette. Nothing pure white or black; every entry stays under 15% saturation.
COLORS=[(.040,.042,.046),(.430,.405,.360),(.355,.325,.290),(.022,.023,.025),(.300,.310,.320),(.018,.017,.020),(.520,.500,.455)]
NAMES=['Carbon_plate','Quilted_suit','Brass_fittings','Rubber_seals','Steel','Visor_glass','Decal_stencil']
def material(i,distance=False):
 m=bpy.data.materials.new('EVAK8_'+NAMES[i]);m.use_nodes=True;s=m.node_tree.nodes.get('Principled BSDF');s.inputs['Base Color'].default_value=(*COLORS[i],1);m.diffuse_color=(*COLORS[i],1);s.inputs['Metallic'].default_value=[.15,.0,1.,.0,1.,.4,.0][i];s.inputs['Roughness'].default_value=[.62,.90,.50,.80,.42,.08,.70][i]
 if distance:
  s.inputs['Metallic'].default_value=.3;s.inputs['Roughness'].default_value=.7;n=m.node_tree.nodes.new('ShaderNodeVertexColor');n.layer_name='Palette';m.node_tree.links.new(n.outputs['Color'],s.inputs['Base Color'])
 return m

class K8Geometry(Build):
 def __init__(self,lod):super().__init__(lod);self.sides=[28,12,6][lod]
 def tube(self,*args,**kwargs):
  first=len(self.f);super().tube(*args,**kwargs);self.smooth[first]=False;self.smooth[first+1]=False
 def ellipsoid(self,c,r,mat,bone,rot=None,n=None,rings=None):
  n=n or [32,12,8][self.lod];rings=rings or [16,8,4][self.lod];q=Euler(rot or (0,0,0)).to_matrix();v=[Vector(c)+q@Vector((0,0,-r[2]))]
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
  n=len(points);s=1 if x>=0 else -1;center=Vector((x+s*bulge,sum(p[0] for p in points)/n,sum(p[1] for p in points)/n));v=[(x,y,z) for y,z in points]+[center]+[(x-s*.012,y,z) for y,z in points];f=[]
  for i in range(n):f.append((i,(i+1)%n,n));f.append((i,n+1+i,n+1+(i+1)%n,(i+1)%n))
  f.append(tuple(range(n+1,2*n+1)));self.add(v,f,mat,bone)
 def bolt(self,p,bone,axis=(1,0,0),game=False):
  if self.lod==2 or (self.lod==1 and not game):return
  p=Vector(p);ax=Vector(axis).normalized();self.tube(p-ax*.001,p+ax*.0045,.0085,2,bone,sides=6);self.tube(p+ax*.0045,p+ax*.0055,.0035,3,bone,sides=6)
 def facet(self,c,r,m,bone,n=10,rings=6,rot=None,hole=None):
  """Angular dome: low-count flat-shaded ellipsoid. `hole` = (forward axis, azimuth half-angle, elevation half-angle)
  removes the faces behind a visor so the interior shows through the glass."""
  if self.lod==2:n,rings=8,4
  elif self.lod==1:n,rings=max(8,n-2),max(4,rings-1)
  q=Euler(rot or (0,0,0)).to_matrix();v=[Vector(c)+q@Vector((0,0,-r[2]))]
  for j in range(1,rings):
   lat=-math.pi/2+math.pi*j/rings
   for i in range(n):a=math.tau*(i+.5)/n;v.append(Vector(c)+q@Vector((r[0]*math.cos(lat)*math.cos(a),r[1]*math.cos(lat)*math.sin(a),r[2]*math.sin(lat))))
  top=len(v);v.append(Vector(c)+q@Vector((0,0,r[2])));f=[]
  for i in range(n):f.append((0,1+(i+1)%n,1+i));f.append((top,1+(rings-2)*n+i,1+(rings-2)*n+(i+1)%n))
  for j in range(rings-2):
   for i in range(n):a=1+j*n+i;b=1+j*n+(i+1)%n;f.append((a,b,b+n,a+n))
  if hole:
   fwd,haz,hel=Vector(hole[0]).normalized(),hole[1],hole[2];keep=[]
   for face in f:
    centre=sum((v[k] for k in face),Vector())/len(face)-Vector(c);d=centre.normalized();flat=Vector((d.x,d.y,0))
    az=math.atan2(flat.cross(fwd).length,flat.dot(fwd)) if flat.length>1e-6 else math.pi;el=math.asin(max(-1,min(1,d.z)))
    if not (az<haz and abs(el)<hel):keep.append(face)
   f=keep
  self.add(v,f,m,bone,False)
 def vhull(self,stations,m,bone):
  """Smooth vertical body section: stations of (z, half width x, half depth y, centre y)."""
  n=[24,12,8][self.lod];vs=[]
  for z,w,d,cy in stations:
   for i in range(n):a=math.tau*i/n;vs.append((w*math.cos(a),cy+d*math.sin(a),z))
  k=len(stations);fs=[tuple(range(n-1,-1,-1)),tuple(range((k-1)*n,k*n))]+[(j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i) for j in range(k-1) for i in range(n)]
  first=len(self.f);self.add(vs,fs,m,bone,True);self.smooth[first]=False;self.smooth[first+1]=False
 def patch(self,c,r,axis,az,el,thickness,m,bone,up=(0,0,1),na=None,ne=None,smooth=True):
  """Closed double-skin ellipsoid patch facing `axis`; returns the outer border points."""
  c=Vector(c);n=Vector(axis).normalized();u=Vector(up);u=(u-n*u.dot(n)).normalized();t=u.cross(n).normalized();na=na or [16,8,4][self.lod];ne=ne or [12,6,3][self.lod]
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
  self.add(vs,fs,m,bone,smooth);return [vs[k] for k in border]
 def text(self,body,loc,rot,size,bone,m=6):
  if self.lod==2:return
  d=bpy.data.curves.new('TemporaryLabel','FONT');d.body=body;d.size=size;d.align_x='CENTER';d.resolution_u=3 if self.lod==0 else 2;d.fill_mode='BOTH';d.extrude=.0006
  o=bpy.data.objects.new('TemporaryLabel',d);bpy.context.scene.collection.objects.link(o);bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH');me=o.data
  self.add([Vector(loc)+rot@v.co for v in me.vertices],[tuple(p.vertices) for p in me.polygons],m,bone);bpy.data.objects.remove(o,do_unlink=True)
 @staticmethod
 def chamfer(points,c):
  out=[];n=len(points)
  for i,(x,z) in enumerate(points):
   ax,az=points[i-1];bx,bz=points[(i+1)%n];da=Vector((ax-x,az-z));db=Vector((bx-x,bz-z))
   if da.length>3*c and db.length>3*c:da.normalize();db.normalize();out+=[(x+da.x*c,z+da.y*c),(x+db.x*c,z+db.y*c)]
   else:out.append((x,z))
  return out
 def plate(self,points,back,front,m,bone,crown=0.,bolts=(),chamfer=.012,inset=True,game_bolts=False):
  """Closed armor plate in the XZ plane facing -Y (front<back) or +Y: bevelled edge rings,
  chamfered corners, an inset panel-line groove and optional bolt heads."""
  pts=self.chamfer(points,chamfer) if self.lod<2 and chamfer else list(points);n=len(pts);cx=sum(x for x,z in pts)/n;cz=sum(z for x,z in pts)/n;sign=1 if front<back else -1;depth=abs(front-back)
  if self.lod==0:prof=[(0,.90),(.004,.965),(depth*.55,1),(depth-.006,.995),(depth-.0025,.975),(depth,.95)]+([(depth,.885),(depth-.002,.875),(depth-.002,.835),(depth,.825)] if inset else [])
  elif self.lod==1:prof=[(0,.92),(depth*.5,1),(depth,.95)]+([(depth,.87),(depth-.002,.84)] if inset else [])
  else:prof=[(0,.94),(depth,.97)]
  vs=[]
  for off,sc in prof:
   y=back-sign*off;vs+=[(cx+(x-cx)*sc,y,cz+(z-cz)*sc) for x,z in pts]
  k=len(prof);fs=[tuple(range(n-1,-1,-1))]
  for j in range(k-1):
   for i in range(n):fs.append((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i))
  last=(k-1)*n
  if crown and self.lod<2:vs.append((cx,front-crown*sign,cz));fs+=[(last+i,last+(i+1)%n,k*n) for i in range(n)]
  else:fs.append(tuple(range(last,last+n)))
  self.add(vs,fs,m,bone)
  for x,z in bolts:self.bolt((x,front-.0005*sign,z),bone,axis=(0,-sign,0),game=game_bolts)
 def side_armor(self,points,x,bulge,m,bone,bolts=()):
  """Side plate (YZ plane) with a raised inset panel and optional bolts."""
  self.side_plate(points,x,bulge,m,bone)
  if self.lod<2:
   s=1 if x>=0 else -1;cy=sum(p[0] for p in points)/len(points);cz=sum(p[1] for p in points)/len(points)
   self.side_plate([(cy+(y-cy)*.72,cz+(z-cz)*.72) for y,z in points],x+s*bulge*.55,bulge*.35,m,bone)
   for y,z in bolts:self.bolt((x+s*bulge*.92,y,z),bone,axis=(s,0,0))
 def carapace(self,a,b,w,depth,m,bone,face,rim=True,bolts=(),slab=False):
  """Tapered bowed armor leaf, double skin with closed edges, plus a raised inner panel."""
  a,b=Vector(a),Vector(b);d=b-a;dn=d.normalized();F=Vector(face);F=(F-dn*F.dot(dn)).normalized();X=dn.cross(F).normalized();steps=[10,5,2][self.lod]
  if slab:profiles=[(0,.62),(.12,.93),(.5,1),(.88,.93),(1,.62)] if self.lod<2 else [(0,.62),(.5,1),(1,.62)]
  else:profiles=[(0,.33),(.15,.80),(.48,1),(.81,.72),(1,.22)] if self.lod<2 else [(0,.33),(.48,1),(1,.22)]
  vs=[]
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
  self.add(vs,fs,m,bone)
  def surface(u,theta):
   for (u0,w0),(u1,w1) in zip(profiles,profiles[1:]):
    if u0<=u<=u1:
     scale=w0+(w1-w0)*(u-u0)/(u1-u0);point=a+d*u+X*(w*scale*math.sin(theta))+F*(depth*(.55+.45*scale)*math.cos(theta));normal=(X*(math.sin(theta)/w)+F*(math.cos(theta)/depth)).normalized();return point,normal
   raise ValueError('Armor surface parameter outside leaf')
  if rim and self.lod<2:self.carapace(a.lerp(b,.16)+F*.0025,a.lerp(b,.84)+F*.0025,w*.70,depth*1.02,m,bone,face,rim=False,slab=slab)
  for u,theta in bolts:
   point,normal=surface(u,theta);self.bolt(point+normal*.001,bone,axis=normal)
  return surface
 def fabric(self,a,b,r0,r1,m,bone,bunch=(.8,.8),seed=0.):
  """Soft limb sleeve: a tube with displaced wrinkles that bunch toward the joints at each end."""
  a,b=Vector(a),Vector(b);q=(b-a).to_track_quat('Z','Y');L=(b-a).length;n=self.sides;k=[14,6,2][self.lod];amp0=[1,.6,0][self.lod];vs=[]
  for j in range(k+1):
   u=j/k;base=r0+(r1-r0)*u;amp=amp0*(.035+.085*(bunch[0]*(1-u)**3+bunch[1]*u**3))
   for i in range(n):
    th=math.tau*i/n
    w=.5*math.sin(th*3+seed+u*7)*math.sin(u*math.pi*5+seed*1.7)+.3*math.sin(th*5-u*11+seed*2.3)+.2*math.sin(u*math.pi*9+th*2+seed)
    r=base*(1+amp*w);vs.append(a+q@Vector((r*math.cos(th),r*math.sin(th),u*L)))
  fs=[tuple(range(n-1,-1,-1)),tuple(range(k*n,(k+1)*n))]+[(j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i) for j in range(k) for i in range(n)]
  first=len(self.f);self.add(vs,fs,m,bone,True);self.smooth[first]=False;self.smooth[first+1]=False
 def hose(self,points,r,m,bone,ribbed=True,coupling=4):
  """Ribbed rubber hose along a Catmull-Rom curve through `points`, with steel couplings at the ends."""
  pts=[Vector(p) for p in points];per=[10,5,2][self.lod];samples=[]
  for i in range(len(pts)-1):
   p0=pts[max(i-1,0)];p1=pts[i];p2=pts[i+1];p3=pts[min(i+2,len(pts)-1)]
   for k in range(per):
    t=k/per;t2=t*t;t3=t2*t;samples.append(.5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t2+(-p0+3*p1-3*p2+p3)*t3))
  samples.append(pts[-1]);sides=[10,6,4][self.lod]
  for i,(p,q) in enumerate(zip(samples,samples[1:])):
   rad=r*((1.12 if i%2 else .94) if ribbed and self.lod<2 else 1);self.tube(p,q,rad,m,bone,sides=sides)
  if self.lod<2 and coupling is not None:
   for p,q in [(samples[0],samples[1]),(samples[-1],samples[-2])]:
    d=(q-p).normalized();self.tube(p-d*.004,p+d*.022,r*1.3,coupling,bone,sides=sides);self.ring(p+d*.009,r*1.32,.003,d,coupling,bone)

def shape(lod):
 g=K8Geometry(lod)
 def band(a,b,u,r,bone,m=3,width=.012):
  if lod==2:return
  a,b=Vector(a),Vector(b);d=(b-a).normalized();c=a.lerp(b,u);g.tube(c-d*width/2,c+d*width/2,r,m,bone)
 def buckle(p,axis,bone,size=(.024,.008,.032)):
  if lod==2:return
  g.box(p,size,2,bone,.002,Vector(axis).to_track_quat('Y','Z').to_euler())
 def hull_at(x,stations,m,bone):
  start=len(g.v);g.hull(stations,m,bone)
  for v in g.v[start:]:v.x+=x
 def stripe(points,bone,m=6,size=(.016,.004,.030)):
  # Worn warning stripe: alternating pale stencil blocks laid on a surface by (point, normal) pairs.
  if lod==2:return
  for p,nrm in points:g.box(Vector(p)+Vector(nrm)*.0015,size,m,bone,.001,Vector(nrm).to_track_quat('Y','Z').to_euler())
 # ---- Helmet: angular faceted shell with a five-face visor, thick rim, two lamps, locking collar.
 C=Vector((0,-.010,1.812))
 g.facet(C,(.124,.132,.136),0,'HEAD',n=14,rings=7,hole=((0,-1,0),.80,.56))
 border=g.patch(C+Vector((0,-.004,-.012)),(.129,.139,.141),(0,-1,0),(-.92,.92),(-.50,.50),.006,5,'HEAD',na=5,ne=2,smooth=False)
 g.ellipsoid(C+Vector((0,.052,-.016)),(.072,.078,.090),3,'HEAD')    # interior headform, a hint through the glass
 if lod<2:
  for p,q in zip(border,border[1:]+border[:1]):g.tube(p,q,.0095,4,'HEAD',sides=8 if lod==0 else 6)
  if lod==0:
   for p in border:g.ellipsoid(p,(.0095,.0095,.0095),4,'HEAD',n=8,rings=4)
  g.box((0,-.096,1.902),(.17,.040,.018),0,'HEAD',.004,(.35,0,0))      # brow lip
  g.box((0,.015,1.950),(.048,.11,.022),0,'HEAD',.003)                   # top ridge
  g.box((0,-.108,1.700),(.16,.060,.030),0,'HEAD',.006,(.25,0,0))       # jaw guard
  for s in [-1,1]:
   # Lamps: short steel barrels with pale lenses, angled down and forward.
   lp=Vector((s*.082,-.112,1.884));ax=Vector((s*.12,-1,-.25)).normalized()
   g.tube(lp-ax*.012,lp+ax*.014,.011,4,'HEAD',sides=8 if lod==0 else 6);g.tube(lp+ax*.014,lp+ax*.017,.0085,6,'HEAD',sides=8 if lod==0 else 6)
   g.ellipsoid((s*.118,.012,1.80),(.020,.050,.050),0,'HEAD');g.ring((s*.134,.012,1.80),.030,.004,(1,0,0),2,'HEAD')
  g.tube((.122,.012,1.80),(.146,.012,1.80),.012,4,'HEAD',sides=8);g.tube((.146,.012,1.80),(.150,.012,1.80),.016,2,'HEAD',sides=8)     # left ear pod cap
  g.box((-.128,.040,1.80),(.026,.046,.030),4,'HEAD',.003)                                                                            # right comm block
  g.box((0,.110,1.86),(.09,.056,.060),0,'HEAD',.006,(-.5,0,0),)
  if lod==0:
   for a in range(6):t=a*math.tau/6;g.bolt((.118+.014,.012+.030*math.cos(t),1.80+.030*math.sin(t)),'HEAD',axis=(1,0,0))
   for z in [1.84,1.88]:g.bolt((-.141,.040,z),'HEAD',axis=(-1,0,0))
 g.tube((0,-.008,1.655),(0,-.008,1.705),.107,0,'HEAD')                     # helmet skirt seats into the collar
 g.tube((0,-.008,1.595),(0,-.008,1.660),.112,3,'NECK')                     # rubber bellows
 if lod<2:
  g.ring((0,-.008,1.660),.118,.010,(0,0,1),4,'NECK');g.ring((0,-.008,1.610),.116,.006,(0,0,1),3,'NECK');g.ring((0,-.008,1.633),.116,.005,(0,0,1),3,'NECK')
  for a in range(4):t=math.pi/4+a*math.pi/2;g.box((.116*math.cos(t),-.008+.116*math.sin(t),1.648),(.026,.018,.034),4,'NECK',.003,(0,0,t))
  g.box((.0,-.122,1.648),(.040,.014,.026),2,'NECK',.002)                   # front latch, brass
 # ---- Torso: quilted pressure garment in three skinned sections, deeper chest, reduced waist pinch.
 g.vhull([(.885,.155,.140,.010),(.95,.180,.155,0),(1.03,.185,.160,0)],1,'PELVIS')
 g.vhull([(1.02,.185,.160,0),(1.13,.182,.158,0),(1.25,.188,.162,0)],1,'WAIST')
 g.vhull([(1.24,.198,.165,0),(1.36,.252,.180,-.005),(1.47,.292,.190,-.010),(1.55,.278,.178,-.010),(1.61,.150,.128,0)],1,'CHEST')
 if lod<2:
  for z,w,d,bone in [(1.19,.184,.160,'WAIST'),(1.41,.272,.186,'CHEST'),(.925,.172,.150,'PELVIS')]:g.vhull([(z-.006,w+.002,d+.002,-.004 if z>1.3 else 0),(z+.006,w+.002,d+.002,-.004 if z>1.3 else 0)],3,bone)
 # Layered chest: lower breastplate, upper yoke, central control block; shoulder caps overlap the yoke.
 g.plate([(-.20,1.27),(.20,1.27),(.245,1.40),(.23,1.50),(-.23,1.50),(-.245,1.40)],-.186,-.222,0,'CHEST',bolts=[(-.18,1.31),(.18,1.31),(-.19,1.46),(.19,1.46)],game_bolts=True)
 g.plate([(-.30,1.485),(.30,1.485),(.29,1.565),(.125,1.605),(-.125,1.605),(-.29,1.565)],-.170,-.206,0,'CHEST',bolts=[(-.265,1.52),(.265,1.52),(0,1.585)],game_bolts=True)
 g.plate([(-.165,1.165),(.165,1.165),(.18,1.262),(-.18,1.262)],-.160,-.192,0,'WAIST',bolts=[(-.15,1.19),(.15,1.19)],game_bolts=True)
 g.plate([(-.115,.925),(.115,.925),(.13,1.03),(.115,1.075),(-.115,1.075),(-.13,1.03)],-.142,-.172,0,'PELVIS',bolts=[(-.10,.95),(.10,.95)])
 g.plate([(-.215,1.26),(.215,1.26),(.26,1.50),(.105,1.585),(-.105,1.585),(-.26,1.50)],.158,.192,0,'CHEST',bolts=[(-.19,1.30),(.19,1.30),(-.20,1.50),(.20,1.50)])
 g.box((0,-.236,1.425),(.112,.036,.094),4,'CHEST',.005);g.box((0,-.255,1.438),(.070,.006,.038),5,'CHEST',.002)       # control block and display
 if lod<2:
  for i,x in enumerate([-.034,-.012,.010]):g.box((x,-.256,1.397),(.016,.006,.012),2 if i!=1 else 6,'CHEST',.001)
  g.box((.034,-.257,1.397),(.014,.008,.014),4,'CHEST',.001)
  for s in [-1,1]:g.ring((s*.066,-.238,1.425),.012,.0035,(0,1,0),2,'CHEST')
  g.text('EVA-K8',(0,-.1925,1.213),Matrix(((1,0,0),(0,0,-1),(0,1,0))),.028,'WAIST')
  g.text('K8-0088',(.12,-.2225,1.33),Matrix(((1,0,0),(0,0,-1),(0,1,0))),.012,'CHEST')
  for s in [-1,1]:
   g.box((s*.175,-.035,1.652),(.11,.10,.020),0,'CHEST',.004,(0,s*.30,0))                           # clavicle guards
   # Webbing harness: rubber straps with a brass buckle each, asymmetric buckle heights.
   g.strut((s*.10,-.21,1.29),(s*.15,-.17,1.58),.036,3,'CHEST');buckle((s*.12,-.215,1.40 if s>0 else 1.47),(s*.14,-.11,1),'CHEST')
   g.strut((s*.11,.19,1.29),(s*.14,.18,1.57),.032,3,'CHEST')
 # Belt: thick ring, webbing strap, brass buckle, three pouches, tool holster on the right side only.
 g.vhull([(1.082,.200,.176,0),(1.158,.200,.176,0)],3,'WAIST')
 if lod<2:g.vhull([(1.098,.204,.180,0),(1.140,.204,.180,0)],1,'WAIST')
 g.box((0,-.185,1.118),(.078,.024,.048),2,'WAIST',.003)
 g.box((.125,-.148,1.095),(.080,.060,.096),0,'WAIST',.008,(0,0,-.18));g.box((-.115,-.150,1.090),(.070,.058,.090),0,'WAIST',.008,(0,0,.14));g.box((.205,.02,1.092),(.044,.090,.098),0,'WAIST',.008)
 g.box((-.215,.06,1.085),(.046,.060,.120),0,'WAIST',.006,(0,0,.08))                               # holster, right side
 if lod<2:
  g.tube((-.218,.06,1.135),(-.218,.06,1.205),.012,4,'WAIST',sides=8);g.box((-.218,.06,1.215),(.030,.030,.020),3,'WAIST',.003)   # tool handle in the holster
  for x,r in [(.125,-.18),(-.115,.14)]:g.box((x,-.183 if x>0 else -.184,1.072),(.034,.006,.028),2,'WAIST',.001,(0,0,r));g.box((x,-.182,1.118),(.060,.008,.012),3,'WAIST',.001,(0,0,r))
  g.box((.228,.02,1.112),(.006,.046,.022),4,'WAIST',.001)
  g.box((-.238,.085,1.10),(.008,.020,.060),3,'WAIST',.001)
 # ---- Life support: cylindrical tank on the left, secondary box unit on the right, webbing, two ribbed hoses.
 g.box((0,.205,1.405),(.24,.026,.28),0,'CHEST',.006)
 tank=Vector((.095,.262,0))
 g.tube((tank.x,tank.y,1.215),(tank.x,tank.y,1.575),.070,4,'CHEST');g.ellipsoid((tank.x,tank.y,1.575),(.070,.070,.042),4,'CHEST');g.ellipsoid((tank.x,tank.y,1.215),(.070,.070,.036),4,'CHEST')
 g.tube((tank.x,tank.y,1.612),(tank.x,tank.y,1.648),.022,4,'CHEST');g.ring((tank.x,tank.y,1.655),.020,.0055,(0,0,1),2,'CHEST')
 g.box((-.105,.252,1.395),(.165,.095,.275),0,'CHEST',.008)
 if lod<2:
  for z in [1.285,1.47]:g.box((tank.x,tank.y,z),(.150,.150,.022),3,'CHEST',.003)          # webbing bands around the tank
  for z in [1.30,1.49]:g.box((-.105,.252,z),(.172,.102,.020),3,'CHEST',.003)
  for s in [-1,1]:g.strut((s*.12,.19,1.56),(s*.15,-.17,1.58),.034,3,'CHEST')              # over-shoulder webbing
  for i in range(3):g.box((-.105,.303,1.33+i*.05),(.12,.006,.014),4,'CHEST',.001)         # vents
  g.box((-.105,.302,1.47),(.06,.006,.03),6,'CHEST',.001)                                   # stencil patch
  g.box((-.045,.302,1.29),(.04,.010,.04),2,'CHEST',.002)                                   # brass fitting
  g.bolt((-.17,.302,1.27),'CHEST',axis=(0,1,0));g.bolt((-.04,.302,1.52),'CHEST',axis=(0,1,0))
  g.text('SN 0088',(-.105,.3012,1.465),Matrix(((-1,0,0),(0,0,1),(0,1,0))),.012,'CHEST')
  g.hose([(tank.x,tank.y,1.660),(tank.x+.01,tank.y+.02,1.72),(.06,.17,1.76),(.0,.118,1.705)],.013,3,'CHEST')
  g.hose([(-.105,.252,1.535),(-.19,.23,1.60),(-.245,.09,1.648),(-.21,-.14,1.545),(-.11,-.22,1.465),(-.062,-.236,1.44)],.012,3,'CHEST')
  g.tube((0,.118,1.705),(0,.098,1.705),.016,4,'NECK',sides=8)
 # ---- Arms: wrinkled sleeves, layered plates, hinge elbows, thicker gauntlets at the wrist, 1.4x gloves.
 for side,s in [('L',1),('R',-1)]:
  sh=H['SHOULDER_'+side];a=H['UPPER_ARM_'+side];c=H['FOREARM_'+side];h=H['HAND_'+side]
  g.patch(a+Vector((0,0,.025)),(.138,.158,.160),(s,0,0),(-1.28,1.28),(-.72,1.30),.009,0,'SHOULDER_'+side)
  if lod<2:
   g.patch(a+Vector((s*.003,0,.028)),(.141,.161,.163),(s,0,0),(-.90,.90),(-.30,1.05),.004,0,'SHOULDER_'+side)      # raised panel
   g.patch(a+Vector((s*.014,0,-.068)),(.126,.138,.118),(s,0,-.3),(-1.0,1.0),(-.55,.40),.008,0,'SHOULDER_'+side)
   g.bolt(a+Vector((s*.139,0,.045)),'SHOULDER_'+side,axis=(s,0,0));g.bolt(a+Vector((s*.118,-.078,.055)),'SHOULDER_'+side,axis=(s*.8,-.6,0));g.bolt(a+Vector((s*.118,.078,.055)),'SHOULDER_'+side,axis=(s*.8,.6,0))
  if s<0 and lod<2:
   # Worn warning stripe over the right shoulder cap.
   pts=[]
   for ang in [-.55,-.25,.05,.35,.65]:
    e=.95;d=Vector((s*math.cos(e)*math.cos(ang),math.cos(e)*math.sin(ang)*(-1 if s<0 else 1),math.sin(e)))
    p=a+Vector((0,0,.025))+Vector((s*.138*math.cos(e)*math.cos(ang),.158*math.cos(e)*math.sin(ang),.160*math.sin(e)));pts.append((p,d))
   stripe(pts,'SHOULDER_'+side)
  g.tube(Vector((s*.13,0,1.565)),a+Vector((s*.02,0,.01)),.100,1,'SHOULDER_'+side);g.ellipsoid(a+Vector((0,0,.02)),(.122,.142,.142),1,'SHOULDER_'+side);g.ellipsoid((s*.20,.01,1.575),(.14,.12,.07),1,'CHEST');   # shoulder girdle: thick deltoid tube, pauldron filled to its inner skin, trapezius slope from the collar
  g.ellipsoid(a+Vector((-s*.09,.0,-.075)),(.100,.108,.130),1,'SHOULDER_'+side)   # underarm volume: bridges the chest flank and the sleeve so the arm rests on the bust
  g.fabric(a.lerp(c,.03),c.lerp(a,.04),.084,.070,1,'UPPER_ARM_'+side,(.9,1.0),seed=1.1+s)
  for u in [.36,.62]:band(a,c,u,(.084+(.070-.084)*u)*1.02,'UPPER_ARM_'+side)
  g.carapace(a.lerp(c,.24)+Vector((s*.058,0,0)),a.lerp(c,.88)+Vector((s*.050,0,0)),.066,.040,0,'UPPER_ARM_'+side,(s,0,0),bolts=[(.2,0),(.8,0)] if lod==0 else [],slab=True)
  if lod<2:g.carapace(a.lerp(c,.34)+Vector((s*.018,-.064,0)),a.lerp(c,.86)+Vector((s*.012,-.054,0)),.048,.030,0,'UPPER_ARM_'+side,(s*.3,-1,0),rim=False,bolts=[(.5,0)] if lod==0 else [],slab=True)
  g.ellipsoid(c,(.062,.058,.058),0,'FOREARM_'+side)
  if lod<2:
   g.tube(c+Vector((s*.050,0,0)),c+Vector((s*.066,0,0)),.030,4,'FOREARM_'+side,sides=10);g.ring(c+Vector((s*.067,0,0)),.024,.005,(1,0,0),2,'FOREARM_'+side)
   g.box(c+Vector((s*.060,0,.055)),(.012,.030,.090),4,'UPPER_ARM_'+side,.002);g.box(c+Vector((s*.060,0,-.055)),(.012,.030,.090),4,'FOREARM_'+side,.002)   # hinge leaves
  g.fabric(c.lerp(h,.04),h.lerp(c,.06),.062,.076,1,'FOREARM_'+side,(1.0,.5),seed=2.3+s)
  for u in [.30,.56]:band(c,h,u,(.062+(.076-.062)*u)*1.02,'FOREARM_'+side)
  g.carapace(c.lerp(h,.10)+Vector((s*.040,.036,0)),c.lerp(h,.56)+Vector((s*.040,.036,0)),.054,.032,0,'FOREARM_'+side,(s*.7,.7,0),rim=False,bolts=[(.3,0)] if lod==0 else [],slab=True)
  g.carapace(c.lerp(h,.46)+Vector((s*.046,.040,0)),c.lerp(h,.92)+Vector((s*.052,.042,0)),.066,.040,0,'FOREARM_'+side,(s*.7,.7,0),bolts=[(.45,0),(.85,0)] if lod==0 else [],slab=True)
  if s<0 and lod<2:g.carapace(c.lerp(h,.18)+Vector((s*.022,-.058,0)),c.lerp(h,.82)+Vector((s*.016,-.052,0)),.046,.028,0,'FOREARM_'+side,(s*.4,-1,0),rim=False,slab=True)
  if s>0 and lod<2:
   # Left wrist panel: steel housing, three brass keys and a small display.
   rot=(h-c).to_track_quat('Z','Y').to_euler();p=c.lerp(h,.52)+Vector((0,-.072,0));g.box(p,(.044,.016,.064),4,'FOREARM_'+side,.003,rot)
   if lod==0:
    for k in range(3):g.box(p+Vector((.010,-.009,.018-k*.016)),(.007,.004,.010),2,'FOREARM_'+side,.001,rot)
    g.box(p+Vector((-.011,-.009,0)),(.014,.003,.044),5,'FOREARM_'+side,.001,rot)
  if s<0 and lod<2:
   rot=(h-c).to_track_quat('Z','Y').to_euler();p=c.lerp(h,.40)+Vector((0,-.068,0));g.box(p,(.050,.010,.030),3,'FOREARM_'+side,.002,rot);buckle(p+Vector((.0,-.006,0)),(0,-1,0),'FOREARM_'+side,(.020,.006,.024))
  g.tube(h.lerp(c,.10),h.lerp(c,.02),.060,4,'HAND_'+side)
  if lod<2:g.ring(h.lerp(c,.065),.061,.007,h-c,2,'HAND_'+side)
  # Glove, 1.4x: rubber palm, plate back and knuckle guard, three-link fingers with dorsal guards, two-link thumb.
  hand_start=len(g.v);b='HAND_'+side;ca=CANONICAL_HAND[b];G=motion.GLOVE_SCALE
  g.box(ca+Vector((0,.004,-.050))*G,(.096*G,.050*G,.104*G),3,b,.016);g.box(ca+Vector((0,-.028,-.044))*G,(.084*G,.012*G,.080*G),0,b,.005)
  if lod<2:g.box(ca+Vector((0,-.014,-.100))*G,(.096*G,.034*G,.014*G),0,b,.003)
  if lod==0:
   for k in [-1,1]:g.bolt(ca+Vector((k*.030,-.035,-.044))*G,b,axis=(0,-1,0))
  for i in range(4):
   names=[f'FINGER_{side}{i+1}_{j:02}' for j in [1,2,3]];points=[CANONICAL_HAND[n] for n in names];points.append(points[-1]+Vector((0,-.016,-.030))*G)
   for j,(n,p,q) in enumerate(zip(names,points,points[1:])):
    r=(.0155-j*.001)*G;g.tube(p.lerp(q,.02),q,r,3,n,r1=r*.92,sides=[10,6,4][lod])
    if lod<2:g.ellipsoid(p,(r*1.02,r*1.02,r*1.02),3,n,n=16 if lod==0 else 6,rings=8 if lod==0 else 3);g.box(p.lerp(q,.5)+Vector((0,r*.78,0)),(r*1.4,.007,(q-p).length*.62),0,n,.001,(q-p).to_track_quat('Z','Y').to_euler())
    if j==2 and lod<2:g.ellipsoid(q,(r*.95,r*.95,r*.95),3,n,n=16 if lod==0 else 6,rings=8 if lod==0 else 3)
  n='THUMB_'+side+'_01';nn='THUMB_'+side+'_02';p,q=CANONICAL_HAND[n],CANONICAL_HAND[nn];tip=q+Vector((-s*.022,-.026,-.026))*G
  g.tube(p,q,.016*G,3,n,r1=.015*G,sides=[10,6,4][lod]);g.tube(q,tip,.014*G,3,nn,r1=.011*G,sides=[10,6,4][lod])
  if lod<2:g.ellipsoid(tip,(.010*G,.010*G,.010*G),3,nn,n=16 if lod==0 else 6,rings=8 if lod==0 else 3);g.box(q.lerp(tip,.5)+Vector((-s*.006,.008,0))*G,(.016*G,.007,(tip-q).length*.7),0,nn,.001,(tip-q).to_track_quat('Z','Y').to_euler())
  for i in range(hand_start,len(g.v)):
   digit=g.b[i].startswith('FINGER_') or g.b[i].startswith('THUMB_')
   g.v[i]=hand_point(g.v[i],side,mirror=digit)
  # ---- Legs: wrinkled thigh/shin, two-piece thigh and shin plates, knee hinge, 1.5x lugged boots.
  hip=H['HIP_'+side];k=H['KNEE_'+side];an=H['ANKLE_'+side]
  g.side_armor([(-.10,.93),(.08,.93),(.12,1.04),(-.02,1.09),(-.13,1.02)],s*.218,.016,0,'PELVIS',bolts=[(-.06,.96),(.07,1.03)])
  g.fabric(hip.lerp(k,.07),k.lerp(hip,.05),.094,.080,1,'HIP_'+side,(1.0,1.0),seed=3.7+s)
  for u in [.30,.56]:band(hip,k,u,(.094+(.080-.094)*u)*1.02,'HIP_'+side)
  if lod<2:band(hip,k,.66,(.094+(.080-.094)*.66)*1.03,'HIP_'+side,3,.026);buckle(hip.lerp(k,.66)+Vector((s*.02,-.098,0)),(0,-1,0),'HIP_'+side)
  g.carapace(hip.lerp(k,.08)+Vector((s*.026,-.064,0)),hip.lerp(k,.60)+Vector((s*.016,-.060,0)),.096,.058,0,'HIP_'+side,(s*.45,-1,0),bolts=[(.25,.15*s),(.72,.15*s)] if lod==0 else [],slab=True)
  g.carapace(hip.lerp(k,.52)+Vector((s*.014,-.062,0)),hip.lerp(k,.92)+Vector((s*.008,-.052,0)),.082,.048,0,'HIP_'+side,(s*.45,-1,0),rim=False,bolts=[(.6,.15*s)] if lod==0 else [],slab=True)
  if lod<2:g.carapace(hip.lerp(k,.20)+Vector((s*.070,.0,0)),hip.lerp(k,.80)+Vector((s*.062,.0,0)),.050,.030,0,'HIP_'+side,(s,.15,0),rim=False,bolts=[(.3,0),(.75,0)] if lod==0 else [],slab=True)
  g.ellipsoid(k,(.068,.064,.064),0,'KNEE_'+side);g.patch(k+Vector((0,-.008,0)),(.084,.080,.088),(0,-1,0),(-1.15,1.15),(-.75,.80),.009,0,'KNEE_'+side)
  if lod<2:
   # Knee hinge: upper leaf on the thigh, lower leaf on the shin, steel pin with a brass outer cap.
   g.box(k+Vector((s*.070,0,.070)),(.014,.034,.110),4,'HIP_'+side,.002);g.box(k+Vector((s*.070,0,-.070)),(.014,.034,.110),4,'KNEE_'+side,.002)
   g.tube(k+Vector((s*.060,0,0)),k+Vector((s*.080,0,0)),.032,4,'KNEE_'+side,sides=12);g.ring(k+Vector((s*.081,0,0)),.026,.005,(1,0,0),2,'KNEE_'+side);g.ring(k+Vector((-s*.066,0,0)),.040,.006,(1,0,0),4,'KNEE_'+side)
  g.fabric(k.lerp(an,.03),an.lerp(k,.02),.072,.086,1,'KNEE_'+side,(1.0,.7),seed=5.1+s)
  for u in [.34,.60]:band(k,an,u,(.072+(.086-.072)*u)*1.02,'KNEE_'+side)
  g.carapace(k.lerp(an,.10)+Vector((0,-.054,0)),k.lerp(an,.56)+Vector((0,-.054,0)),.064,.038,0,'KNEE_'+side,(0,-1,0),rim=False,bolts=[(.3,0)] if lod==0 else [],slab=True)
  g.carapace(k.lerp(an,.48)+Vector((0,-.058,0)),k.lerp(an,.88)+Vector((0,-.064,0)),.074,.046,0,'KNEE_'+side,(0,-1,0),bolts=[(.45,0),(.85,0)] if lod==0 else [],slab=True)
  if lod<2:g.carapace(k.lerp(an,.18)+Vector((0,.054,0)),k.lerp(an,.72)+Vector((0,.054,0)),.050,.028,0,'KNEE_'+side,(0,1,0),rim=False,slab=True)
  # Boot: 1.5x hull, plate shaft, rubber cuff, toe cap, heel counter, two instep straps and a lugged sole.
  hull_at(an.x,[(.150,.085,.105,.075),(.045,.098,.112,.086),(-.08,.098,.095,.072),(-.16,.092,.080,.060),(-.205,.080,.066,.048),(-.235,.060,.052,.034)],0,'ANKLE_'+side)
  g.box((an.x,-.045,.036),(.200,.40,.028),3,'ANKLE_'+side,.008)
  g.tube((an.x,.012,.150),(an.x,.012,.245),.098,0,'ANKLE_'+side);g.tube((an.x,.012,.242),(an.x,.012,.290),.088,3,'ANKLE_'+side)
  if lod<2:
   for yy in ([-.21,-.15,-.09,-.03,.03,.09,.14] if lod==0 else [-.18,-.08,.02,.12]):
    for xx in ([-.062,0,.062] if lod==0 else [-.045,.045]):g.box((an.x+xx,yy,.015),(.032,.040 if lod==0 else .06,.018),3,'ANKLE_'+side,.003 if lod==0 else 0)
   g.ring((an.x,.012,.243),.099,.006,(0,0,1),2,'ANKLE_'+side)
   for yy,zz in [(-.040,.185),(-.110,.150)]:g.box((an.x,yy,zz),(.200,.022,.016),0,'ANKLE_'+side,.003,(-.35 if yy<-.08 else -.15,0,0));buckle((an.x+s*.098,yy,zz),(s,0,0),'ANKLE_'+side,(.012,.026,.022))
   g.box((an.x,.135,.085),(.120,.034,.080),0,'ANKLE_'+side,.006)
   g.box((an.x,-.215,.080),(.110,.052,.044),0,'ANKLE_'+side,.006,(.25,0,0))
   g.tube((an.x+s*.095,.012,.125),(an.x+s*.108,.012,.125),.028,4,'ANKLE_'+side,sides=10);g.ring((an.x+s*.109,.012,.125),.022,.004,(1,0,0),2,'ANKLE_'+side)
   if lod==0:
    for yy in [.10,-.17]:g.bolt((an.x+s*.097,yy,.12),'ANKLE_'+side,axis=(s,0,0))
 return g

def make_arm(col):
 d=bpy.data.armatures.new('EVAK8_HARDSUIT_SKELETON');arm=bpy.data.objects.new('EVAK8_RIG',d);col.objects.link(arm);bpy.context.view_layer.objects.active=arm;arm.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
 for n in H:
  b=d.edit_bones.new(n);b.head=H[n];b.tail=H[n]+Vector((0,0,.035));b.use_deform=not n.startswith('SOCKET_')
  if PAR[n]:b.parent=d.edit_bones[PAR[n]]
 bpy.ops.object.mode_set(mode='OBJECT');arm.show_in_front=True;arm['rig']='EVAK8 heavy hardsuit astronaut; rigid armor segments, constant-length leg IK, articulated gloves';return arm

def make_skin(g,col,arm,lod):
 d=bpy.data.meshes.new('EVAK8_GEOMETRY');d.from_pydata(g.v,[],g.f);d.update();o=bpy.data.objects.new('EVAK8_SKIN',d);col.objects.link(o)
 if lod==2:
  d.materials.append(material(0,True));colors=d.color_attributes.new(name='Palette',type='FLOAT_COLOR',domain='CORNER')
  for p,m in zip(d.polygons,g.mi):
   for li in p.loop_indices:colors.data[li].color=(*COLORS[m],1)
 else:
  for i in range(len(NAMES)):d.materials.append(material(i))
  for p,m,sm in zip(d.polygons,g.mi,g.smooth):p.material_index=m;p.use_smooth=sm
 bm=bmesh.new();bm.from_mesh(d);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(d);bm.free()
 if lod<2:
  for n in H:
   indices=[i for i,b in enumerate(g.b) if b==n]
   if indices:o.vertex_groups.new(name=n).add(indices,1,'REPLACE')
  mod=o.modifiers.new('EVAK8_RigidSuit','ARMATURE');mod.object=arm
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
 scene=bpy.context.scene;scene.name='EVAK8_HARDSUIT';scene.render.fps=FPS;scene.frame_start=0;scene.frame_end=720;only_distance="--distance-only" in sys.argv;geometry_only="--geometry-only" in sys.argv;assets=json.loads((OUT/"manifest.json").read_text())["assets"][:2] if only_distance else []
 for lod in ([2] if only_distance else [0,1,2]):
  col=bpy.data.collections.new('EVAK8_LOD'+str(lod));scene.collection.children.link(col);root=bpy.data.objects.new('ROOT',None);col.objects.link(root);root['forward']='+Z in glTF';root['damage_level']=0
  g=shape(lod);arm=make_arm(col);arm.parent=root;skin=make_skin(g,col,arm,lod)
  if lod<2 and not geometry_only:animate(arm)
  bpy.ops.object.select_all(action='DESELECT')
  for o in col.objects:o.select_set(True)
  scene.frame_set(0);path=OUT/f'eva_k8_d0_lod{lod}.glb'
  bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_extras=True,export_animations=lod<2 and not geometry_only,export_animation_mode='NLA_TRACKS',export_frame_range=False,export_force_sampling=True,export_cameras=False,export_lights=False)
  raw=path.read_bytes();n=struct.unpack_from('<I',raw,12)[0];doc=json.loads(raw[20:20+n]);e=dict(file=path.name,lod=lod,damage_level=0,static=lod==2,derived=False,bytes=len(raw),triangles=sum(doc['accessors'][p['indices']]['count']//3 for m in doc.get('meshes',[]) for p in m['primitives']),draw_calls=sum(len(m['primitives']) for m in doc.get('meshes',[])),plot_m=[1.1,.8],clips=CLIPS if lod<2 else [],credit='Models by jelaludo');assets.append(e);print('EXPORT',e,flush=True)
  if lod==0 and not geometry_only:
   for tr in arm.animation_data.nla_tracks:tr.mute=tr.name!='Hero_Stance'
   scene.frame_set(0)
   for screen in bpy.data.screens:
    for area in screen.areas:
     if area.type=='VIEW_3D':area.spaces.active.region_3d.view_location=(0,0,1.0);area.spaces.active.region_3d.view_distance=3.2;area.spaces.active.shading.type='MATERIAL'
   bpy.ops.wm.save_as_mainfile(filepath=str(P/'source/blender/a6-eva-k8.blend'))
  for o in list(col.objects):bpy.data.objects.remove(o,do_unlink=True)
  bpy.data.collections.remove(col)
  for data in [bpy.data.armatures,bpy.data.actions,bpy.data.meshes,bpy.data.materials,bpy.data.curves]:
   for item in list(data):
    if item.users==0:data.remove(item)
 manifest=dict(family='eva-k8',label='EVA-K8 / Heavy Hardsuit',plain_glb_source_of_truth=True,coordinate_system=dict(units='metres',up='+Y',forward='+Z',origin='ground beneath the standing hip centre'),damage_states={'d0':'intact only'},animation=dict(fps=FPS,skeleton_joints=len([n for n in H if not n.startswith('SOCKET_')]),placement_node='instance wrapper around complete glTF scene',motion_node='MOTION',engine_driven_excluded=[],head_override='HEAD may be overridden additively by an engine look-at; clips keep it within ±36° yaw',gait='Original alternating human walk in a heavy suit: heel contact, flat support, toe roll and swing; double support, lateral weight transfer and restrained arm swing; not a force simulation'),lod_selection=dict(initial=2,approach_distance_m=30,hysteresis_m=8,lod0='Detailed recording master',lod1='All animated gameplay; retain while moving',lod2='Static standing map/loading silhouette; no animation'),materials=dict(palette_only=True,names=['EVAK8_'+n for n in NAMES],runtime_textures='eva-k8/materials.js generates worn PBR maps procedurally at load; the GLB carries no images, per the collaboration contract'),assets=assets)
 (OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');print('MAX_REACH_ERROR',motion.MAX_REACH_ERROR,flush=True);print('EVAK8_COMPLETE',flush=True)
if __name__=='__main__':build()
