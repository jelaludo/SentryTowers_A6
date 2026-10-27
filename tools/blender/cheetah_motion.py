"""Original C-07 feline motion authoring. Z up, -Y forward, metres.
Walk timing is informed by inspection of the user's cat GLB; no source keys are copied.
Gallop has sequential fore contacts, gathered flight, hind contacts, extended flight.
"""
import math
from mathutils import Vector,Matrix
from quadruped_motion import jump_meta,jump_body,jump_foot,jump_tail
H={};PAR={};FPS=120

def joint(name,p,parent):H[name]=Vector(p);PAR[name]=parent
joint('MOTION',(0,0,0),None)
joint('LUMBAR',(0,.06,.70),'MOTION')
joint('LUMBAR_REAR_LINK',(0,.06,.70),'LUMBAR');joint('SPINE_REAR',(0,.23,.69),'LUMBAR_REAR_LINK');joint('PELVIS',(0,.42,.68),'SPINE_REAR')
joint('LUMBAR_FRONT_LINK',(0,.06,.70),'LUMBAR');joint('SPINE_FRONT',(0,-.14,.71),'LUMBAR_FRONT_LINK');joint('CHEST',(0,-.37,.70),'SPINE_FRONT')
joint('NECK',(0,-.52,.675),'CHEST');joint('HEAD',(0,-.69,.65),'NECK');joint('JAW',(0,-.73,.605),'HEAD')
for side,s in [('L',1),('R',-1)]:joint('EAR_'+side,(s*.082,-.635,.725),'HEAD')
TAIL=[(0,.535,.70),(0,.68,.68),(0,.825,.64),(0,.97,.58),(0,1.115,.51),(0,1.26,.44),(0,1.405,.39),(0,1.55,.37)]
for i,p in enumerate(TAIL):joint('TAIL_'+str(i+1).zfill(2),p,'PELVIS' if i==0 else 'TAIL_'+str(i).zfill(2))
LEGS=['FL','FR','HL','HR']
for id in LEGS:
 s=1 if id.endswith('L') else -1
 if id[0]=='F':
  joint('SCAPULA_'+id,(s*.125,-.37,.735),'CHEST')
  joint('UPPER_'+id,(s*.185,-.39,.625),'SCAPULA_'+id)
  joint('LOWER_'+id,(s*.175,-.235,.345),'UPPER_'+id)
  joint('ANKLE_'+id,(s*.14,-.455,.125),'LOWER_'+id)
  joint('PAW_'+id,(s*.14,-.49,.055),'ANKLE_'+id)
 else:
  joint('UPPER_'+id,(s*.165,.40,.665),'PELVIS')
  joint('LOWER_'+id,(s*.175,.205,.405),'UPPER_'+id)
  joint('ANKLE_'+id,(s*.14,.445,.225),'LOWER_'+id)
  joint('PAW_'+id,(s*.14,.37,.055),'ANKLE_'+id)
 p=H['PAW_'+id];joint('TOES_'+id,p+Vector((0,-.045,-.017)),'PAW_'+id);joint('SOCKET_PAW_'+id,p+Vector((0,-.05,-.052)),'PAW_'+id)
joint('SOCKET_MOUTH',(0,-.935,.608),'HEAD');joint('SOCKET_PAYLOAD',(0,-.11,.765),'SPINE_FRONT');joint('SENSOR_YAW',(0,-.69,.70),'HEAD');joint('SOCKET_SENSOR',(0,-.78,.695),'SENSOR_YAW')
WALK_TOUCH={'HR':0.,'FR':.22,'HL':.5,'FL':.72}
GALLOP_TOUCH={'FL':0.,'FR':.08,'HR':.48,'HL':.56}
CLIPS=[
 {'name':'Watch_Idle','duration_s':3.,'loop':True},
 {'name':'Feline_Walk_Cycle','duration_s':1.6,'loop':True,'speed_mps':.52/(.60*1.6),'duty_factor':.60,'touchdown_phase':WALK_TOUCH},
 {'name':'Stalk_Cycle','duration_s':2.4,'loop':True,'speed_mps':.38/(.78*2.4),'duty_factor':.78,'touchdown_phase':WALK_TOUCH},
 {'name':'Gallop_Cycle','duration_s':.8,'loop':True,'speed_mps':.44/(.18*.8),'duty_factor':.18,'touchdown_phase':GALLOP_TOUCH,'flight_intervals':{'gathered':[.26,.48],'extended':[.74,1.0]},'phase_landmarks':{'fore_support':.13,'gathered':.37,'hind_support':.61,'extended':.87}},
 {'name':'Sit_Down','duration_s':2.4,'loop':False},
 {'name':'Pounce','duration_s':3.2,'loop':False,'root_motion':True,**jump_meta('cheetah')}
]

def rx(a):return Matrix.Rotation(a,3,'X')
def ry(a):return Matrix.Rotation(a,3,'Y')
def rz(a):return Matrix.Rotation(a,3,'Z')
def smooth(a,b,t):
 u=max(0,min(1,(t-a)/(b-a)));return u*u*(3-2*u)
def pulse(a,b,c,d,t):return smooth(a,b,t)*(1-smooth(c,d,t))

def hermite(a,b,ma,mb,u,dt):
 return (2*u**3-3*u*u+1)*a+(u**3-2*u*u+u)*dt*ma+(-2*u**3+3*u*u)*b+(u**3-u*u)*dt*mb

def curve(keys,u):
 """Periodic hand-authored position curve, with explicit stance endpoint velocities."""
 while u<keys[0][0]:u+=1
 while u>keys[-1][0]:u-=1
 for (a,va,ma),(b,vb,mb) in zip(keys,keys[1:]):
  if a<=u<=b:return hermite(va,vb,ma,mb,(u-a)/(b-a),b-a)
 return keys[-1][1]

def foot_path(id,clip,u):
 """Return absolute local target, swing fraction, contact. Target is a paw joint."""
 p=H['PAW_'+id].copy();contact=True;q=0.
 if clip in ['Feline_Walk_Cycle','Stalk_Cycle']:
  stalk=clip=='Stalk_Cycle';duty=.78 if stalk else .60;stride=.38 if stalk else .52;phase=(u-WALK_TOUCH[id])%1
  start=(-.64 if id[0]=='F' else .036) if not stalk else (-.60 if id[0]=='F' else .12)
  if phase<duty:p.y=start+stride*phase/duty
  else:
   contact=False;q=(phase-duty)/(1-duty)
   # Equal endpoint velocity to the stance motion; soft low feline swing.
   p.y=hermite(start+stride,start,stride/duty,stride/duty,q,1-duty)
   p.z+=(.038 if stalk else .080)*math.sin(math.pi*q)**2
 elif clip=='Gallop_Cycle':
  phase=(u-GALLOP_TOUCH[id])%1;duty=.18;contact=phase<duty;q=0 if contact else (phase-duty)/(1-duty)
  start=-.70 if id[0]=='F' else -.02
  if contact:p.y=start+.44*phase/duty
  else:
   # World-phase landmarks make both limbs gather/extend together while contacts remain staggered.
   shift=GALLOP_TOUCH[id];end=shift+.18;next_touch=shift+1;uu=u
   while uu<end:uu+=1
   if id[0]=='F':
    keys=[(end,start+.44,.44/.18),(max(end+.06,.38),.045,0),(.64,-.53,-2.2),(.86,-.94,0),(next_touch,start,.44/.18)]
    heights=[(end,.055,0),(.38,.29,0),(.64,.34,0),(.86,.255,-.2),(next_touch,.055,0)]
   else:
    # Hind legs trail at extended flight, then sweep far underneath during gathered flight.
    keys=[(end,start+.44,.44/.18),(.87,.86,0),(1.12,.51,-2.6),(1.37,-.17,0),(next_touch,start,.44/.18)]
    heights=[(end,.055,0),(.87,.265,0),(1.12,.33,0),(1.37,.25,-.5),(next_touch,.055,0)]
   p.y=curve(keys,uu);p.z=curve(heights,uu)
   if id[0]=='H':
    # Pass outside the forelimbs while gathered, then settle onto the narrow
    # stance track before touchdown. A swing-only offset must fade to zero.
    settle=1-smooth(1-.08/(1-duty),1,q)
    p.x+=(1 if id.endswith('L') else -1)*.055*max(0,math.cos(math.tau*(u-.37)))**2*settle
 return p,q,contact

MAX_REACH_ERROR=0.;WORST_REACH=None

def ik(a,c,L1,L2,pole,tag):
 global MAX_REACH_ERROR,WORST_REACH
 d=c-a;raw=d.length;err=max(0,raw-(L1+L2),abs(L1-L2)-raw)
 if err>MAX_REACH_ERROR:MAX_REACH_ERROR=err;WORST_REACH=tag
 dist=min(L1+L2-1e-6,max(abs(L1-L2)+1e-6,raw));u=d.normalized();v=Vector((0,pole,0));v=(v-u*v.dot(u)).normalized();along=(L1*L1-L2*L2+dist*dist)/(2*dist);height=math.sqrt(max(0,L1*L1-along*along));return a+u*along+v*height

def pose(clip,t):
 duration=next(c['duration_s'] for c in CLIPS if c['name']==clip);u=(t/duration)%1;wave=math.tau*u;pos={};ori={};flex=0;stalk=clip=='Stalk_Cycle';gallop=clip=='Gallop_Cycle';walk=clip in ['Feline_Walk_Cycle','Stalk_Cycle'];sit=smooth(.1,1.9,t) if clip=='Sit_Down' else 0
 base=Vector((0,0,0));lumbar=H['LUMBAR'].copy();bodyroll=0;bodyyaw=0;jump=0;crouch=0;jump_state=None;pitch=0
 if walk:lumbar.z-=.17 if stalk else .035;lumbar.z+=.007*math.cos(2*wave);lumbar.x=.009*math.sin(wave);bodyroll=.017*math.sin(wave);bodyyaw=.018*math.sin(wave+.5)
 if gallop:
  arch=math.cos(math.tau*(u-.37));flex=.70*arch+.30;lumbar.z=.66+.075*math.cos(2*math.tau*(u-.37))+.08*arch;lumbar.x=.004*math.sin(wave)
 if sit:lumbar+=Vector((0,.08,-.14))*sit
 if clip=='Pounce':
  jump_state=jump_body('cheetah',t);lumbar.z+=jump_state['z'];pitch=jump_state['pitch'];flex=jump_state['flex'];base.y=jump_state['root_y']
 pos['MOTION']=base;ori['MOTION']=Matrix.Identity(3);pos['LUMBAR']=lumbar;ori['LUMBAR']=ry(bodyroll)@rz(bodyyaw)
 def bone(n,r=None,offset=None):
  p=PAR[n];pos[n]=pos[p]+ori[p]@(H[n]-H[p])+(offset or Vector((0,0,0)));ori[n]=r if r is not None else ori[p]
 bone('LUMBAR_REAR_LINK',rx(pitch-flex*.35-.35*sit)@rz(bodyyaw));bone('SPINE_REAR',rx(pitch-flex*.65-.80*sit)@rz(bodyyaw));bone('PELVIS',rx(pitch-flex-.80*sit)@rz(-bodyyaw))
 bone('LUMBAR_FRONT_LINK',rx(pitch+flex*.35-.30*sit)@ry(-bodyroll));bone('SPINE_FRONT',rx(pitch+flex*.65-.45*sit+(jump_state['fore_response'] if jump_state else 0))@ry(-bodyroll));bone('CHEST',rx(pitch+flex-.45*sit)@rz(-bodyyaw))
 bone('NECK',rx((.12 if stalk else .015)-.13*sit+.08*math.sin(wave) if gallop else (.12 if stalk else .015)-.13*sit))
 bone('HEAD',rx(.025+.04*stalk)@rz(.07*math.sin(wave) if clip=='Watch_Idle' else .015*math.sin(wave)))
 if jump_state:ori['HEAD']=rx(jump_state['gaze'])
 bone('JAW',ori['HEAD']@rx(.06 if gallop else 0))
 for side in ['L','R']:bone('EAR_'+side,ori['HEAD']@rx((.16 if gallop else 0)+.045*math.sin(wave+(0 if side=='L' else 1.3))))
 for i in range(8):
  tail_sit=[-.45,-.15,.28,.38,.40,.30,.15,0][i]
  n='TAIL_'+str(i+1).zfill(2);bone(n,rx(jump_tail('cheetah',t,i) if jump_state else .05*math.sin(wave-i*.3)+.20*max(flex,0)+tail_sit*sit)@rz(.075*math.sin(wave-i*.45)))
 for n in ['SOCKET_MOUTH','SOCKET_PAYLOAD','SENSOR_YAW','SOCKET_SENSOR']:bone(n)
 for id in LEGS:
  if id[0]=='F':
   phase=wave-math.tau*WALK_TOUCH[id];offset=Vector((0,.035*math.sin(phase),.012*math.cos(phase))) if walk else Vector((0,.027*math.sin(wave),0)) if gallop else None
   if jump_state:offset=Vector((0,.015*jump_state['compression'],.018*jump_state['compression']))
   bone('SCAPULA_'+id,ori['CHEST']@rx(.10*math.sin(phase) if walk else .10*math.sin(wave)),offset)
  upper='UPPER_'+id;lower='LOWER_'+id;ankle='ANKLE_'+id;foot='PAW_'+id
  parent=PAR[upper];a=pos[parent]+ori[parent]@(H[upper]-H[parent]);target,q,contact=foot_path(id,clip,u)
  if sit and id[0]=='H':target.y-=.05*sit
  paw_pitch=None
  if jump_state:
   target,paw_pitch,contact=jump_foot('cheetah',id,t,H[foot]);target=Vector(target)
   q=0 if contact else (t-CLIPS[-1]['release_s'][id])/(CLIPS[-1]['touchdown_s'][id]-CLIPS[-1]['release_s'][id])
  # Distal segment swings toward the toe on takeoff; exact length is retained.
  distal=H[ankle]-H[foot]
  ankleangle=(.28*math.sin(math.pi*q) if id[0]=='F' else -.18*math.sin(math.pi*q)) if not contact else 0
  c=target+rx(ankleangle)@distal
  b=ik(a,c,(H[lower]-H[upper]).length,(H[ankle]-H[lower]).length,1 if id[0]=='F' else -1,(clip,t,id))
  for n,p,v,rest in [(upper,a,b,H[lower]-H[upper]),(lower,b,c,H[ankle]-H[lower]),(ankle,c,target,H[foot]-H[ankle])]:pos[n]=p;ori[n]=rest.rotation_difference(v-p).to_matrix()
  pos[foot]=target;ori[foot]=rx(paw_pitch if paw_pitch is not None else -.20*math.sin(math.pi*q)**2 if not contact else 0)
  bone('TOES_'+id,ori[foot]@rx(.18*math.sin(math.pi*q)**2 if not contact else 0));bone('SOCKET_PAW_'+id)
 for n in pos:
  if n!='MOTION':pos[n]+=base
 return pos,ori
