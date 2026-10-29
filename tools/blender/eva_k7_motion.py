"""EVA-K7 hardsuit astronaut performance. Z up, -Y forward, metres.
Analytic constant-length biped IK and contact-pivot boot rolls, not a physics simulation.
Human proportions inside a bulky armored pressure suit: 1.98 m helmet top, 1.00 m hip centre.
"""
import math
from mathutils import Vector, Quaternion, Euler
FPS=120
H={};PAR={}
def joint(n,p,parent):H[n]=Vector(p);PAR[n]=parent
joint('MOTION',(0,0,0),None)
joint('PELVIS',(0,0,1.00),'MOTION')
joint('WAIST',(0,0,1.12),'PELVIS')
joint('CHEST',(0,0,1.34),'WAIST')
joint('NECK',(0,-.01,1.58),'CHEST')
joint('HEAD',(0,-.02,1.67),'NECK')
for side,s in [('L',1),('R',-1)]:
 joint('SHOULDER_'+side,(s*.21,0,1.53),'CHEST')
 joint('UPPER_ARM_'+side,(s*.30,0,1.505),'SHOULDER_'+side)
 joint('FOREARM_'+side,(s*.36,-.03,1.215),'UPPER_ARM_'+side)
 joint('HAND_'+side,(s*.405,-.075,.945),'FOREARM_'+side)
 for i in range(4):
  x=s*.405+(i-1.5)*.022;short=.012 if i in [0,3] else 0
  joint(f'FINGER_{side}{i+1}_01',(x,-.082,.868),'HAND_'+side)
  joint(f'FINGER_{side}{i+1}_02',(x,-.097,.812+short),f'FINGER_{side}{i+1}_01')
  joint(f'FINGER_{side}{i+1}_03',(x,-.128,.772+short),f'FINGER_{side}{i+1}_02')
 joint('THUMB_'+side+'_01',(s*.352,-.088,.905),'HAND_'+side)
 joint('THUMB_'+side+'_02',(s*.322,-.120,.862),'THUMB_'+side+'_01')
 joint('HIP_'+side,(s*.13,0,1.00),'PELVIS')
 joint('KNEE_'+side,(s*.14,-.02,.56),'HIP_'+side)
 joint('ANKLE_'+side,(s*.15,.015,.125),'KNEE_'+side)
 joint('TOE_'+side,(s*.15,-.085,.04),'ANKLE_'+side)
 for name,p,parent in [('HAND',(s*.405,-.135,.84),'HAND'),('TOOL',(s*.405,-.145,.90),'HAND'),('SOLE',(s*.15,-.03,.006),'ANKLE'),('HEEL',(s*.15,.10,.006),'ANKLE'),('TOE',(s*.15,-.17,.006),'ANKLE')]:joint('SOCKET_'+name+'_'+side,p,parent+'_'+side)
joint('SOCKET_BACK',(0,.16,1.40),'CHEST')
joint('SOCKET_VISOR',(0,-.175,1.79),'HEAD')
# Canonical construction coordinates remain available to the mesh author.
# Gloves are built palm-forward and then turned so palms face inward, thumbs forward.
CANONICAL_HAND={n:p.copy() for n,p in H.items()}
HAND_TURN={side:Quaternion((0,0,1),sign*math.pi/2) for side,sign in [('L',1),('R',-1)]}
def hand_point(point,side,mirror=False):
 origin=CANONICAL_HAND['HAND_'+side];v=Vector(point)-origin
 if mirror:v.y=-v.y
 return origin+HAND_TURN[side]@v
for side in ['L','R']:
 for n in H:
  if n.startswith('FINGER_'+side) or n.startswith('THUMB_'+side) or n in ['SOCKET_HAND_'+side,'SOCKET_TOOL_'+side]:H[n]=hand_point(H[n],side,True)

CLIPS=[
 dict(name='Suit_Idle',label='Suit idle',duration_s=4.,loop=True,note='Planted stance, slow pressurised-suit breathing, weight shifts and a helmet glance.'),
 dict(name='Walk_Cycle',label='Walk',duration_s=1.3,loop=True,speed_mps=.75,duty_factor=.64,touchdown_phase={'L':0,'R':.5},flat_support_phase=[.08,.53],note='92 steps/min · 0.75 m/s. Heavy-boot heel placement, weight transfer and restrained arm swing.'),
 dict(name='Cautious_Walk_Cycle',label='Cautious',duration_s=2.2,loop=True,speed_mps=.32,duty_factor=.76,touchdown_phase={'L':0,'R':.5},flat_support_phase=[.08,.65],note='55 steps/min · 0.32 m/s. Lowered stance, short careful steps and long double support.'),
 dict(name='Survey_Scan',label='Survey',duration_s=6.,loop=False,note='Boots stay planted while the helmet and upper torso sweep the horizon.'),
 dict(name='Kneel_Inspect',label='Inspect',duration_s=5.,loop=False,note='Drop the hips 30 cm into a braced inspection crouch, hold, then stand.'),
 dict(name='Signal_Halt',label='Halt signal',duration_s=4.,loop=False,note='Raise an open right glove, hold a silent halt signal, then lower it.')]
def smooth(x):x=max(0,min(1,x));return x*x*x*(x*(6*x-15)+10)
def pulse(t,a,b,c,d):return smooth((t-a)/(b-a))*(1-smooth((t-c)/(d-c)))
def rx(a):return Quaternion((1,0,0),a)
def rz(a):return Quaternion((0,0,1),a)
def ry(a):return Quaternion((0,1,0),a)
MAX_REACH_ERROR=0

def pose(name,t):
 global MAX_REACH_ERROR
 meta=next(c for c in CLIPS if c['name']==name);phase=(t/meta['duration_s'])%1;w=phase*math.tau
 walking='speed_mps' in meta;cautious=name=='Cautious_Walk_Cycle'
 crouch=pulse(t,.25,1.65,3.05,4.75) if name=='Kneel_Inspect' else 0
 signal=pulse(t,.25,1.3,2.65,3.8) if name=='Signal_Halt' else 0
 scan=math.sin(w)*math.sin(math.pi*phase)**2 if name=='Survey_Scan' else 0
 breath=math.sin(w*2) if not walking else 0
 pos={};ori={}
 def put(n,p=None,q=None):
  parent=PAR[n];pos[n]=Vector(p) if p is not None else pos[parent]+ori[parent]@(H[n]-H[parent]);ori[n]=q if q is not None else ori[parent].copy()
 put('MOTION',(0,0,0),Quaternion())
 if walking:pelvis=Vector((.026*math.sin(w-.40),.006*math.sin(w*2),.885 if cautious else .925+.010*math.cos(w*2-.8)));pelq=Euler((.03 if cautious else .015,.015*math.sin(w-.4),.02*math.cos(w))).to_quaternion()
 else:pelvis=H['PELVIS']+Vector((.004*math.sin(w*.5) if name=='Suit_Idle' else 0,.09*crouch,-.30*crouch+.0015*breath));pelq=rx(-.10*crouch)
 put('PELVIS',pelvis,pelq);put('WAIST',q=rx(.05 if walking else .12*crouch)@rz(.11*scan))
 put('CHEST',q=Euler((-.07 if cautious else -.03 if walking else -.14*crouch+.012*breath,-.010*math.sin(w-.4) if walking else 0,-.02*math.cos(w) if walking else .21*scan)).to_quaternion())
 put('NECK');put('HEAD',q=rz(.62*scan+(.09*math.sin(w*.5) if name=='Suit_Idle' else 0) if not walking else .012*math.sin(w))@rx(.10*crouch-.03*breath*(0 if walking else 1)))
 for side,s in [('L',1),('R',-1)]:
  q=(phase+(0 if side=='L' else .5))%1;foot=H['ANKLE_'+side].copy();angle=0
  if walking:
   duty=meta['duty_factor'];stride=meta['speed_mps']*meta['duration_s'];extent=stride*duty
   heel=.06 if cautious else .11;toe=.11 if cautious else .20
   if q<duty:
    foot.y=-extent/2+stride*q
    if q<.08:angle=-heel*(1-smooth(q/.08))
    elif q>duty-.11:angle=toe*smooth((q-duty+.11)/.11)
   else:
    u=(q-duty)/(1-duty);foot.y=extent/2-extent*smooth(u);foot.z+=(.055 if cautious else .085)*math.sin(math.pi*u)**2;angle=toe+(-heel-toe)*smooth(u)
   pivot=Vector((0,(-.17 if angle>=0 else .10)-.015,-.119));foot+=pivot-rx(angle)@pivot
  hip=pos['PELVIS']+ori['PELVIS']@(H['HIP_'+side]-H['PELVIS'])
  a=(H['KNEE_'+side]-H['HIP_'+side]).length;b=(H['ANKLE_'+side]-H['KNEE_'+side]).length;d=foot-hip;length=d.length
  MAX_REACH_ERROR=max(MAX_REACH_ERROR,max(0,length-(a+b)));assert length<a+b-1e-5,(name,t,side,'unreachable',length,a+b)
  direction=d.normalized();pole=Vector((0,-1,0));pole=(pole-direction*pole.dot(direction)).normalized();along=(a*a-b*b+length*length)/(2*length);knee=hip+direction*along+pole*math.sqrt(max(0,a*a-along*along))
  put('HIP_'+side,hip,(H['KNEE_'+side]-H['HIP_'+side]).rotation_difference(knee-hip));put('KNEE_'+side,knee,(H['ANKLE_'+side]-H['KNEE_'+side]).rotation_difference(foot-knee));put('ANKLE_'+side,foot,rx(angle));put('TOE_'+side)
  put('SHOULDER_'+side,q=ori['CHEST']@ry(-s*.03*crouch))
  swing=(.08 if cautious else .20)*math.cos(math.tau*q-.18) if walking else .006*math.sin(w)
  upper=.06+swing-.30*crouch;fore=upper-(.42 if cautious else .16)-.50*crouch
  if side=='R':upper-=.50*signal;fore-=2.50*signal
  put('UPPER_ARM_'+side,q=rx(upper)@ry(-s*(.07+.20*signal if side=='R' else .07)));put('FOREARM_'+side,q=rx(fore)@ry(-s*(.16*signal if side=='R' else .03)));put('HAND_'+side,q=rx((fore+.05)*(1-signal)-math.pi*signal if side=='R' else fore+.05)@rz(-s*math.pi/2*signal if side=='R' else 0))
  turn=HAND_TURN[side];unturn=turn.conjugated()
  for i in range(4):
   n=f'FINGER_{side}{i+1}_01';opened=signal if side=='R' else 0
   put(n,q=ori['HAND_'+side]@turn@rx(.12-.30*opened)@unturn)
   put(f'FINGER_{side}{i+1}_02',q=ori['HAND_'+side]@turn@rx(.22-.62*opened)@unturn)
   put(f'FINGER_{side}{i+1}_03',q=ori['HAND_'+side]@turn@rx(.16-.52*opened)@unturn)
  put('THUMB_'+side+'_01');put('THUMB_'+side+'_02',q=ori['HAND_'+side]@turn@ry(-s*.15)@unturn)
 for n in H:
  if n.startswith('SOCKET_'):put(n)
 return pos,ori
