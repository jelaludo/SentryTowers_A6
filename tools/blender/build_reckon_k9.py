"""Author RECKON K9: rigid-weight canine skeleton, explicit IK clips, three tiers.
Blender Z up / -Y forward; GLB Y up / +Z forward. No external artwork.
"""
import bpy, bmesh, math, json, struct, sys
import numpy as np
from pathlib import Path
from mathutils import Vector, Matrix, Euler
P=Path(__file__).resolve().parents[2]; OUT=P/'assets/reckon-k9'; OUT.mkdir(exist_ok=True)
FPS=60
H={}; PAR={}
def joint(n,p,parent): H[n]=Vector(p); PAR[n]=parent
joint('MOTION',(0,0,0),None);joint('BODY',(0,.25,.52),'MOTION');joint('SPINE',(0,.015,.535),'BODY');joint('CHEST',(0,-.25,.55),'SPINE');joint('NECK',(0,-.32,.635),'CHEST');joint('HEAD',(0,-.425,.735),'NECK');joint('JAW',(0,-.45,.68),'HEAD')
for side,s in [('L',1),('R',-1)]:
 joint('EAR_'+side,(s*.065,-.40,.79),'HEAD')
for i,p in enumerate([(0,.36,.55),(0,.48,.49),(0,.59,.42)]):joint('TAIL_'+str(i+1),p,'BODY' if i==0 else 'TAIL_'+str(i))
LEGS=[]
for kind,y in [('F',-.25),('H',.26)]:
 for side,s in [('L',1),('R',-1)]:
  id=kind+side;LEGS.append(id); x=s*.17
  joint('UPPER_'+id,(x,y,.535 if kind=='F' else .515),'CHEST' if kind=='F' else 'BODY')
  joint('LOWER_'+id,(x,-.18,.315) if kind=='F' else (x,.12,.32),'UPPER_'+id)
  if kind=='H':joint('HOCK_'+id,(x,.335,.155),'LOWER_'+id)
  joint('PAW_'+id,(x,-.30,.055) if kind=='F' else (x,.26,.055),'LOWER_'+id if kind=='F' else 'HOCK_'+id)
  joint('SOCKET_PAW_'+id,(x,-.325,.003) if kind=='F' else (x,.235,.003),'PAW_'+id)
joint('ANTENNA_L',(.075,.05,.65),'SPINE');joint('ANTENNA_R',(-.075,.15,.65),'SPINE')
joint('SOCKET_MOUTH',(0,-.686,.668),'HEAD');joint('SOCKET_PAYLOAD',(0,.035,.65),'SPINE');joint('SENSOR_YAW',(0,-.30,.69),'CHEST');joint('SOCKET_SENSOR',(0,-.32,.71),'SENSOR_YAW')
CLIPS=[dict(name='Alert_Idle',duration_s=3,loop=True),dict(name='Walk_Cycle',duration_s=1.4,loop=True,speed_mps=.34/(.68*1.4)),dict(name='Run_Cycle',duration_s=.7,loop=True,speed_mps=.48/(.44*.7)),dict(name='Sit_Down',duration_s=2.4,loop=False),dict(name='Roll_Over',duration_s=4.8,loop=False),dict(name='Fetch_Return',duration_s=8,loop=False,root_motion=True),dict(name='Give_Paw',duration_s=4,loop=False),dict(name='Jump',duration_s=2,loop=False)]
COLORS=[(.07,.085,.092),(.27,.30,.31),(.47,.50,.49),(.018,.024,.028),(.64,.25,.045),(.02,.32,.62)]

def mat(i,distance=False):
 m=bpy.data.materials.new('K9_'+str(i));m.use_nodes=True;s=m.node_tree.nodes.get('Principled BSDF');s.inputs['Base Color'].default_value=(*COLORS[i],1);m.diffuse_color=(*COLORS[i],1);s.inputs['Metallic'].default_value=.7 if i in [0,1,2] else .15;s.inputs['Roughness'].default_value=.31 if i in [1,2,5] else .5
 if i==5:s.inputs['Emission Color'].default_value=(*COLORS[i],1);s.inputs['Emission Strength'].default_value=2.5
 if distance:
  s.inputs['Metallic'].default_value=.45;a=m.node_tree.nodes.new('ShaderNodeVertexColor');a.layer_name='Palette';m.node_tree.links.new(a.outputs['Color'],s.inputs['Base Color'])
 return m
class Build:
 def __init__(self,lod):self.lod=lod;self.v=[];self.f=[];self.mi=[];self.b=[];self.smooth=[];self.sides=[24,10,6][lod]
 def add(self,v,f,m,b,smooth=False):
  off=len(self.v);self.v.extend([Vector(x) for x in v]);self.b.extend([b]*len(v));self.f.extend([tuple(off+i for i in face) for face in f]);self.mi.extend([m]*len(f));self.smooth.extend([smooth]*len(f))
 def box(self,c,d,m,b,bevel=.008,rot=None):
  bm=bmesh.new();bmesh.ops.create_cube(bm,size=1)
  for v in bm.verts:v.co=Vector([v.co[i]*d[i] for i in range(3)])
  if self.lod<2 and bevel:bmesh.ops.bevel(bm,geom=list(bm.edges),offset=min(bevel,min(d)*.22),segments=2 if self.lod==0 else 1,affect='EDGES')
  bm.verts.ensure_lookup_table();q=Euler(rot or (0,0,0)).to_matrix();self.add([Vector(c)+q@v.co for v in bm.verts],[[v.index for v in f.verts] for f in bm.faces],m,b);bm.free()
 def tube(self,a,b,r,m,bone,r1=None,sides=None):
  a,b=Vector(a),Vector(b);q=(b-a).to_track_quat('Z','Y');n=sides or self.sides;r1=r if r1 is None else r1;vs=[]
  for p,rad in [(a,r),(b,r1)]:
   for j in range(n):vs.append(p+q@Vector((rad*math.cos(j*math.tau/n),rad*math.sin(j*math.tau/n),0)))
  self.add(vs,[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]+[(j,(j+1)%n,(j+1)%n+n,j+n) for j in range(n)],m,bone,True)
 def ring(self,c,r,w,axis,m,bone):
  if self.lod==2:return
  n=self.sides;steps=8 if self.lod==0 else 4;q=Vector(axis).to_track_quat('Z','Y');v=[]
  for i in range(n):
   a=i*math.tau/n
   for j in range(steps):
    z=j*math.tau/steps;v.append(Vector(c)+q@Vector(((r+w*math.cos(z))*math.cos(a),(r+w*math.cos(z))*math.sin(a),w*math.sin(z))))
  self.add(v,[(i*steps+j,((i+1)%n)*steps+j,((i+1)%n)*steps+(j+1)%steps,i*steps+(j+1)%steps) for i in range(n) for j in range(steps)],m,bone,True)
 def panel(self,pts,thick,m,bone):
  v=[(x,y-thick/2,z) for x,y,z in pts]+[(x,y+thick/2,z) for x,y,z in pts];n=len(pts);self.add(v,[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)],m,bone)
 def hull(self,stations,m,bone):
  v=[]
  for y,w,z,h in stations:
   v += [(w*fx,y,z+h*fz) for fx,fz in [(-.65,-1),(.65,-1),(1,-.55),(1,.55),(.65,1),(-.65,1),(-1,.55),(-1,-.55)]]
  n=len(stations);self.add(v,[tuple(range(7,-1,-1)),tuple(range((n-1)*8,n*8))]+[(j*8+i,j*8+(i+1)%8,(j+1)*8+(i+1)%8,(j+1)*8+i) for j in range(n-1) for i in range(8)],m,bone)
 def strut(self,a,b,w,m,bone):
  a,b=Vector(a),Vector(b);self.box((a+b)/2,(w,w,(b-a).length),m,bone,min(.006,w*.15),(b-a).to_track_quat('Z','Y').to_euler())
 def bolt(self,p,bone,axis=(1,0,0)):
  if self.lod>0:return
  p=Vector(p);ax=Vector(axis);self.tube(p-ax*.001,p+ax*.004,.008,2,bone,sides=6);self.tube(p+ax*.004,p+ax*.005,.003,3,bone,sides=6)

def shape(lod):
 g=Build(lod)
 # Narrow waist and deep chest establish the canine silhouette.
 g.hull([(.34,.105,.535,.065),(.23,.13,.535,.09),(.13,.10,.53,.075)],0,'BODY')
 g.hull([(.14,.095,.535,.068),(-.04,.11,.54,.08),(-.17,.125,.54,.09)],3,'SPINE')
 g.hull([(-.15,.12,.54,.09),(-.27,.145,.55,.115),(-.35,.09,.56,.08)],0,'CHEST')
 g.hull([(-.27,.07,.58,.13),(-.38,.067,.67,.10),(-.44,.065,.70,.075)],1,'NECK')
 for s in [-1,1]:
  # Separate floating side plates, battery cassettes, rail and dorsal vertebrae.
  g.box((s*.118,.025,.55),(.048,.22,.12),1,'SPINE',.014)
  g.box((s*.147,.025,.55),(.015,.158,.078),2,'SPINE',.008)
  for y in [-.045,.085]:g.box((s*.158,y,.55),(.012,.018,.125),0,'SPINE',.003)
  g.box((s*.095,-.25,.55),(.035,.18,.18),1,'CHEST',.015,(-.12,0,s*.08))
  for y in [-.305,-.195]:g.bolt((s*.159,y,.58),'CHEST',axis=(s,0,0))
  g.strut((s*.07,-.29,.65),(s*.07,-.42,.75),.025,2,'NECK')
  if lod<2:
   for i in range(5 if lod==0 else 3):
    y=-.105+i*.052;g.box((s*.06,y,.614),(.045,.023,.024),2,'SPINE',.004)
   g.tube((s*.10,-.12,.50),(s*.10,.11,.51),.012,4,'SPINE')
   for y in [-.08,.02,.12]:g.bolt((s*.17,y,.56),'SPINE',axis=(s,0,0))
 # Long wedge skull and a mechanical open jaw, three forward optics.
 g.hull([(-.39,.075,.75,.06),(-.48,.085,.735,.065),(-.60,.068,.707,.048),(-.67,.052,.70,.036)],0,'HEAD')
 g.hull([(-.43,.065,.79,.02),(-.51,.067,.771,.023),(-.62,.047,.74,.012)],2,'HEAD')
 g.hull([(-.45,.054,.679,.021),(-.55,.054,.651,.018),(-.655,.043,.654,.014)],1,'JAW')
 g.box((0,-.665,.674),(.07,.021,.018),3,'JAW',.003)
 for s in [-1,1]:
  g.tube((s*.065,-.443,.688),(s*.09,-.443,.688),.028,1,'JAW');g.ring((s*.093,-.443,.688),.019,.004,(1,0,0),4,'JAW')
  g.box((s*.081,-.525,.71),(.025,.115,.051),1,'HEAD',.009)
  for y in [-.48,-.57]:g.bolt((s*.097,y,.722),'HEAD',axis=(s,0,0))
  # Thin triangular antenna ears with a second recessed inner plate.
  b='EAR_'+('L' if s>0 else 'R');x=s*.065
  pts=[(x-s*.029,-.405,.795),(x+s*.032,-.388,.80),(x+s*.043,-.375,.955),(x-s*.012,-.40,.886)]
  g.panel(pts,.028,0,b)
  if lod<2:g.panel([(x-s*.014,-.424,.815),(x+s*.018,-.415,.815),(x+s*.030,-.404,.926)],.005,2,b)
  g.tube((x,-.417,.803),(x,-.383,.803),.025,1,b)
 for x,r in [(-.035,.019),(.025,.027)]:
  g.tube((x,-.645,.711),(x,-.692,.711),r+ .008,2,'HEAD');g.tube((x,-.693,.711),(x,-.697,.711),r,3,'HEAD');g.tube((x,-.698,.711),(x,-.701,.711),r*.73,5,'HEAD');g.ring((x,-.699,.711),r,.002,(0,1,0),4,'HEAD')
 g.box((0,-.61,.759),(.033,.035,.009),5,'HEAD',.002)
 # Modular low profile payload and folding twin whip antennas.
 g.box((0,.025,.635),(.13,.26,.024),2,'SPINE',.006)
 g.box((0,.07,.677),(.13,.14,.065),0,'SPINE',.01);g.box((0,.002,.684),(.083,.022,.035),1,'SPINE',.004)
 if lod<2:
  for x in [-.045,0,.045]:g.box((x,.07,.714),(.013,.1,.008),2,'SPINE',.002)
 for side,x,y in [('L',.075,.05),('R',-.075,.15)]:
  b='ANTENNA_'+side;g.tube((x,y,.65),(x,y,.708),.013,0,b);g.tube((x,y,.708),(x,y,.89),.0045,2,b,r1=.0025)
  if lod<2:g.ring((x,y,.72),.008,.002,(0,0,1),4,b)
 # Distinct three-section pointed tail.
 for i,end in [(1,H['TAIL_2']),(2,H['TAIL_3']),(3,Vector((0,.71,.33)))]:
  a=H['TAIL_'+str(i)];g.tube(a,end,.026 if i==1 else .02,0,'TAIL_'+str(i),r1=.017 if i<3 else .004)
  if lod<2:g.strut(a+Vector((0,0,.016)),end+Vector((0,0,.013)),.024 if i<3 else .014,2,'TAIL_'+str(i))
 # Rigid long bone housings with cut-away paired rails, servo rings and paw digits.
 for id in LEGS:
  s=1 if id.endswith('L') else -1;a=H['UPPER_'+id];b=H['LOWER_'+id];c=H['HOCK_'+id] if id[0]=='H' else H['PAW_'+id]
  segments=[('UPPER_'+id,a,b,.062),('LOWER_'+id,b,c,.043)]
  if id[0]=='H':segments.append(('HOCK_'+id,c,H['PAW_'+id],.028))
  for bone,start,end,r in segments:
   # Cylindrical trunnions face outwards for readable mechanical articulation.
   g.tube(start+Vector((-.046,0,0)),start+Vector((.046,0,0)),r,3,bone)
   g.tube(start+Vector((s*.044,0,0)),start+Vector((s*.058,0,0)),r*.90,1,bone)
   g.tube(start+Vector((s*.058,0,0)),start+Vector((s*.061,0,0)),r*.54,0,bone)
   g.tube(start+Vector((s*.061,0,0)),start+Vector((s*.069,0,0)),r*.19,2,bone)
   g.ring(start+Vector((s*.061,0,0)),r*.67,.0035,(1,0,0),2,bone)
   g.bolt(start+Vector((s*.064,0,0)),bone,axis=(s,0,0))
   d=end-start;u=d.normalized();p=start+u*r*.65;q=end-u*.035
   g.strut(p,q,r*.93,0,bone)
   for off in [-1,1]:
    o=Vector((off*r*.50,0,0));g.strut(p+o,q+o,r*.25,2,bone)
   g.strut(p+Vector((s*r*.48,-.01,0)),q+Vector((s*r*.48,-.01,0)),r*.66,1,bone)
   if lod<2:
    # Telescopic-looking rods contained within each rigid segment, no cross-joint stretch.
    o=Vector((0,.026,0));g.tube(p+o,p+d*.35+o,.012,3,bone);g.tube(p+d*.35+o,q+o,.006,2,bone)
    o=Vector((s*r*.18,-.025,0));g.tube(p+o,q+o,.006,4,bone)
   if lod==0:
    for f in [.22,.7]:g.bolt(start+d*f+Vector((s*r*.78,0,0)),bone,axis=(s,0,0))
  paw='PAW_'+id;p=H[paw]
  g.box(p+Vector((0,-.016,-.012)),(.085,.113,.060),0,paw,.01)
  g.box(p+Vector((0,-.017,-.040)),(.087,.111,.022),3,paw,.003)
  for j in [-1,0,1]:
   g.box(p+Vector((j*.029,-.079,-.024)),(.026,.055,.034),1,paw,.007,(-.13,0,0))
   if lod<2:g.box(p+Vector((j*.029,-.102,-.035)),(.021,.025,.018),3,paw,.004)
  g.box(p+Vector((0,-.015,.022)),(.048,.050,.012),2,paw,.003)
  if lod<2:g.box(p+Vector((0,-.028,.030)),(.022,.014,.005),5,paw,.001)
 # Dense master-only dorsal cooling fins, neck conduits and small fasteners.
 if lod==0:
  for s in [-1,1]:
   for i in range(9):g.box((s*.145,-.055+i*.017,.565),(.014,.006,.043),3,'SPINE',.001)
   for i in range(7):g.tube((s*.045,-.32-i*.013,.66+i*.009),(s*.065,-.32-i*.013,.66+i*.009),.013,3,'NECK')
  for y in [-.29,-.23]:
   for x in [-.06,.06]:g.bolt((x,y,.667),'CHEST',axis=(0,0,1))
 return g

def rx(a):return Matrix.Rotation(a,3,'X')
def ry(a):return Matrix.Rotation(a,3,'Y')
def rz(a):return Matrix.Rotation(a,3,'Z')
def smooth(a,b,t):
 u=max(0,min(1,(t-a)/(b-a)));return u*u*(3-2*u)
def pulse(a,b,c,d,t):return smooth(a,b,t)*(1-smooth(c,d,t))
def ik(a,c,L1,L2,front):
 d=c-a;dist=d.length;dist=min(L1+L2-1e-5,max(abs(L1-L2)+1e-5,dist));u=d.normalized();v=Vector((0,front,0));v=(v-u*v.dot(u)).normalized();along=(L1*L1-L2*L2+dist*dist)/(2*dist);height=math.sqrt(max(0,L1*L1-along*along));return a+u*along+v*height

def pose(clip,t,g):
 pos={};ori={};base=Vector((0,0,0));heading=0.;sit=0.;crouch=0.;roll=0.;jump=0.;gait=None;phase=0.;pick=0.;paw=0.
 duration=next(c['duration_s'] for c in CLIPS if c['name']==clip)
 weight=1.;turn=0.
 def travel(q):
  q=max(0,min(2,q))
  if q<.25:
   u=q/.25;return .25*(u**3-.5*u**4)*.357142857
  if q<1.75:return (q-.125)*.357142857
  u=(q-1.75)/.25;return (1.625+.25*(u-u**3+.5*u**4))*.357142857
 if clip in ['Walk_Cycle','Run_Cycle']:gait=clip;phase=t/duration
 if clip=='Sit_Down':sit=smooth(.15,1.9,t)
 if clip=='Give_Paw':sit=smooth(0,.9,t)*(1-smooth(3.35,4,t));paw=pulse(.9,1.5,2.65,3.25,t)
 if clip=='Roll_Over':
  crouch=pulse(0,.7,4.05,4.8,t);roll=math.tau*smooth(.9,3.9,t)
 if clip=='Jump':
  crouch=.7*pulse(0,.38,.44,.6,t)+.6*pulse(1.25,1.42,1.62,2,t)
  if .5<t<1.4:jump=.38*math.sin(math.pi*(t-.5)/.9)
 if clip=='Fetch_Return':
  if t<2:gait='Walk_Cycle';phase=t/1.4;base.y=-travel(t);weight=pulse(0,.25,1.75,2,t)
  elif t<3.5:base.y=-.625;pick=pulse(2,2.5,2.85,3.35,t)
  elif t<4.1:base.y=-.625;heading=math.pi*smooth(3.5,4.1,t);turn=(t-3.5)/.6
  elif t<6.1:gait='Walk_Cycle';phase=(t-4.1)/1.4;base.y=-.625+travel(t-4.1);heading=math.pi;weight=pulse(4.1,4.35,5.85,6.1,t)
  elif t<6.8:heading=math.pi*(1-smooth(6.1,6.8,t));turn=(t-6.1)/.7
  else:pick=pulse(6.8,7.25,7.6,8,t)
  crouch=.4*pick
 # Body motion is separate from the unanimated placement ROOT.
 pos['MOTION']=base;ori['MOTION']=rz(heading)
 body=H['BODY']+Vector((0,.035*sit,-.24*sit-.20*crouch-.06*pick+jump))
 pitch=-.52*sit+.40*pick
 if gait:
  run=gait=='Run_Cycle';body.z+=weight*((-.08 if run else -.035)+(.025 if run else .008)*math.sin(phase*math.tau*2));pitch+=weight*(.045 if run else .012)*math.sin(phase*math.tau)
 pos['BODY']=body;ori['BODY']=rx(pitch)@ry(roll)
 # Roll occurs about the torso, ground correction below tracks the true geometry.
 for n in ['SPINE','CHEST','NECK','HEAD','JAW','EAR_L','EAR_R','TAIL_1','TAIL_2','TAIL_3','ANTENNA_L','ANTENNA_R','SOCKET_MOUTH','SOCKET_PAYLOAD','SENSOR_YAW','SOCKET_SENSOR']:
  parent=PAR[n];local=Matrix.Identity(3)
  if n=='NECK':local=rx(.58*pick+.10*sit)
  if n=='HEAD':local=rx(.74*pick+.30*sit)@rz(.035*math.sin(t*math.tau/duration) if clip=='Alert_Idle' else 0)
  if n=='JAW':local=rx(max(.38*pick,.23*pulse(2.6,2.9,7.4,7.75,t) if clip=='Fetch_Return' else 0))
  if n.startswith('TAIL_'):local=rz(.16*math.sin(t*math.tau/duration*(2 if clip=='Alert_Idle' else 1)-int(n[-1])*.7))@rx((.75 if n=='TAIL_1' else .1)*sit)
  if n.startswith('EAR_'):local=rx(-1.3*crouch+.035*math.sin(t*math.tau/duration+(0 if n.endswith('L') else 1)))
  if n.startswith('ANTENNA_'):local=rx(1.25*crouch)
  pos[n]=pos[parent]+ori[parent]@(H[n]-H[parent]);ori[n]=ori[parent]@local
 # Ground-frame targets keep paw soles parallel and stationary during stance.
 for id in LEGS:
  upper='UPPER_'+id;lower='LOWER_'+id;foot='PAW_'+id;parent=PAR[upper]
  a=pos[parent]+ori[parent]@(H[upper]-H[parent]);target=H[foot].copy();lift=0
  if gait:
   run=gait=='Run_Cycle';duty=.44 if run else .68;stride=.48 if run else .34
   phases={'FL':0,'HR':.5,'FR':.5,'HL':0} if run else {'FL':0,'HR':.25,'FR':.5,'HL':.75}
   u=(phase+phases[id])%1
   if u<duty:target.y+=-stride/2+stride*u/duty
   else:
    q=(u-duty)/(1-duty);target.y+=stride/2-stride*(q*q*(3-2*q));lift=(.12 if run else .055)*math.sin(math.pi*q)**2
   target.z+=lift;target=H[foot].lerp(target,weight)
  if turn:target.z+=.06*math.sin(math.pi*turn)**2*math.sin(math.pi*turn*2+(0 if id in ['FL','HR'] else math.pi/2))**2
  if id[0]=='H':target.y-=.14*sit
  if clip=='Jump' and jump>0:target.z+=jump+.05*math.sin(math.pi*(t-.5)/.9);target.y+=(.05 if id[0]=='F' else -.04)*math.sin(math.pi*(t-.5)/.9)
  if id=='FL' and paw:target+=Vector((.025,-.23,.28))*paw;target.z+=.015*math.sin((t-1.5)*10)*paw
  if clip=='Roll_Over':
   target=pos['BODY']+ori['BODY']@(H[foot]-H['BODY']+Vector((0,-.03 if id[0]=='F' else -.06,.21*crouch)))
  if id[0]=='H':
   hock=target+Vector((0,.075,.10))
   if clip=='Roll_Over':hock=target+ori['BODY']@Vector((0,.075,.10))
   b=ik(a,hock,(H[lower]-H[upper]).length,(H['HOCK_'+id]-H[lower]).length,-1)
   segments=[(upper,a,b,H[lower]-H[upper]),(lower,b,hock,H['HOCK_'+id]-H[lower]),('HOCK_'+id,hock,target,H[foot]-H['HOCK_'+id])]
  else:
   b=ik(a,target,(H[lower]-H[upper]).length,(H[foot]-H[lower]).length,1);segments=[(upper,a,b,H[lower]-H[upper]),(lower,b,target,H[foot]-H[lower])]
  for n,p,q,rest in segments:pos[n]=p;ori[n]=rest.rotation_difference(q-p).to_matrix()
  pos[foot]=target;ori[foot]=ori['BODY'] if clip=='Roll_Over' else rx(-.20*paw if id=='FL' else 0)
  n='SOCKET_PAW_'+id;pos[n]=pos[foot]+ori[foot]@(H[n]-H[foot]);ori[n]=ori[foot]
 # Track actual master geometry while rolling, also prevents armor-floor penetration on pickup.
 if clip in ['Roll_Over','Fetch_Return','Give_Paw','Sit_Down']:
  lowest=1e9
  for n,verts in g.ground.items():
   vv=verts@np.array(ori[n]).T+np.array(pos[n]);lowest=min(lowest,float(vv[:,2].min()))
  correction=max(0,.002-lowest) if clip!='Roll_Over' else .002-lowest
  for n in pos:
   if n!='MOTION':pos[n].z+=correction
 # Apply trajectory uniformly to the complete skeleton.
 for n in pos:
  if n!='MOTION':pos[n]=base+ori['MOTION']@pos[n];ori[n]=ori['MOTION']@ori[n]
 return pos,ori

def make_arm(col):
 data=bpy.data.armatures.new('K9_CANINE_SKELETON');arm=bpy.data.objects.new('RECKON_RIG',data);col.objects.link(arm);bpy.context.view_layer.objects.active=arm;arm.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
 for n in H:
  b=data.edit_bones.new(n);b.head=H[n];b.tail=H[n]+Vector((0,0,.035));b.use_deform=not n.startswith('SOCKET_')
  if PAR[n]:b.parent=data.edit_bones[PAR[n]]
 bpy.ops.object.mode_set(mode='OBJECT');arm.show_in_front=True;arm['rig']='Rigid single-joint weighted armor; canine IK authored into named actions';return arm

def mesh(g,col,arm,lod):
 d=bpy.data.meshes.new('K9_GEOMETRY');d.from_pydata(g.v,[],g.f);d.update();o=bpy.data.objects.new('RECKON_SKIN',d);col.objects.link(o)
 if lod==2:
  d.materials.append(mat(0,True));colors=d.color_attributes.new(name='Palette',type='FLOAT_COLOR',domain='CORNER')
  for poly,m in zip(d.polygons,g.mi):
   for li in poly.loop_indices:colors.data[li].color=(*COLORS[m],1)
 else:
  for i in range(6):d.materials.append(mat(i))
  for p,m,sm in zip(d.polygons,g.mi,g.smooth):p.material_index=m;p.use_smooth=sm
 bm=bmesh.new();bm.from_mesh(d);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(d);bm.free()
 if lod<2:
  for n in H:
   indices=[i for i,b in enumerate(g.b) if b==n]
   if indices:o.vertex_groups.new(name=n).add(indices,1,'REPLACE')
  mod=o.modifiers.new('RigidArmorSkin','ARMATURE');mod.object=arm
 return o

def animate(arm,g):
 arm.animation_data_create()
 for clip in CLIPS:
  action=bpy.data.actions.new(clip['name']);arm.animation_data.action=action;frames=round(clip['duration_s']*FPS)
  for f in range(frames+1):
   positions,rotations=pose(clip['name'],f/FPS,g);matrices={}
   for n in H:
    bone=arm.data.bones[n];parent=PAR[n];matrix=Matrix.Translation(positions[n])@rotations[n].to_4x4()@bone.matrix_local.to_3x3().to_4x4();matrices[n]=matrix
    args=dict(parent_matrix=matrices[parent],parent_matrix_local=arm.data.bones[parent].matrix_local) if parent else {}
    pb=arm.pose.bones[n];pb.rotation_mode='QUATERNION';pb.matrix_basis=bone.convert_local_to_pose(matrix,bone.matrix_local,invert=True,**args)
    if n.startswith('SOCKET_') or n=='SENSOR_YAW':continue
    pb.keyframe_insert(data_path='location',frame=f);pb.keyframe_insert(data_path='rotation_quaternion',frame=f)
  for layer in action.layers:
   for strip in layer.strips:
    for bag in strip.channelbags:
     for curve in bag.fcurves:
      for point in curve.keyframe_points:point.interpolation='LINEAR'
  arm.animation_data.action=None;track=arm.animation_data.nla_tracks.new();track.name=clip['name'];track.strips.new(clip['name'],0,action);track.mute=True;print('CLIP',clip['name'],flush=True)
 for pb in arm.pose.bones:pb.matrix_basis=Matrix.Identity(4)
 for tr in arm.animation_data.nla_tracks:tr.mute=False

bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene;scene.name='RECKON_K9';scene.render.fps=FPS;scene.frame_start=0;scene.frame_end=240
master=shape(0);master.ground={n:np.array([v-H[n] for v,b in zip(master.v,master.b) if b==n]) for n in set(master.b)}
assets=[]
for lod in [0,1,2]:
 col=bpy.data.collections.new('RECKON_K9_LOD'+str(lod));scene.collection.children.link(col)
 root=bpy.data.objects.new('ROOT',None);col.objects.link(root);root['units']='metres';root['forward']='+Z in glTF';root['damage_level']=0
 arm=make_arm(col);arm.parent=root
 g=master if lod==0 else shape(lod);skin=mesh(g,col,arm,lod)
 if lod==2:skin.parent=None
 if lod<2:animate(arm,master)
 bpy.ops.object.select_all(action='DESELECT')
 for o in col.objects:o.select_set(True)
 scene.frame_set(0)
 path=OUT/f'reckon_k9_d0_lod{lod}.glb'
 bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_extras=True,export_animations=lod<2,export_animation_mode='NLA_TRACKS',export_frame_range=False,export_force_sampling=True,export_cameras=False,export_lights=False,export_all_influences=False)
 raw=path.read_bytes();n=struct.unpack_from('<I',raw,12)[0];doc=json.loads(raw[20:20+n]);assets.append(dict(file=path.name,lod=lod,damage_level=0,static=lod==2,derived=False,bytes=len(raw),triangles=sum(doc['accessors'][p['indices']]['count']//3 for m in doc.get('meshes',[]) for p in m['primitives']),draw_calls=sum(len(m['primitives']) for m in doc.get('meshes',[])),plot_m=[.6,1.6],clips=CLIPS if lod<2 else [],credit='Models by jelaludo'))
 print('EXPORTED',assets[-1],flush=True)
 # Save only the detailed authored source. Reduced files are rebuilt from the same recipe.
 if lod==0:
  for tr in arm.animation_data.nla_tracks:tr.mute=tr.name!='Alert_Idle'
  scene.frame_set(0);scene.name='RECKON_K9'
  for screen in bpy.data.screens:
   for area in screen.areas:
    if area.type=='VIEW_3D':area.spaces.active.region_3d.view_location=(0,0,.45);area.spaces.active.region_3d.view_distance=2;area.spaces.active.shading.type='MATERIAL'
  bpy.ops.wm.save_as_mainfile(filepath=str(P/'source/blender/a6-reckon-k9.blend'))
 for o in list(col.objects):bpy.data.objects.remove(o,do_unlink=True)
 bpy.data.collections.remove(col)
 # Clear unlinked armature data and actions to prevent suffixed names across tiers.
 for data in [bpy.data.armatures,bpy.data.actions,bpy.data.meshes,bpy.data.materials]:
  for item in list(data):
   if item.users==0:data.remove(item)
(OUT/'manifest.json').write_text(json.dumps(dict(family='reckon-k9',label='RECKON K9 / Canine reconnaissance platform',plain_glb_source_of_truth=True,canonical_dimensions_m=[.48,.96,1.42],coordinate_system=dict(units='metres',up='+Y',forward='+Z',origin='ground at plot centre'),damage_states={'d0':'intact only; other damage states not authored'},lod_selection=dict(initial=2,lod0='Close shots and recordings',lod1='Animated gameplay; retain during movement',lod2='Static standing loading/map representation',approach_distance_m=25,hysteresis_m=5,provisional=True),animation=dict(fps=FPS,placement_node='ROOT',motion_node='MOTION',engine_driven_excluded=['SENSOR_YAW'],fetch_events=[dict(time_s=2.65,event='attach_prop',socket='SOCKET_MOUTH'),dict(time_s=7.4,event='release_prop')]),assets=assets),indent=2)+'\n')
print('RECKON_K9_COMPLETE',flush=True)
