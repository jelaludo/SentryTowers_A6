"""B-REK37 original recon performance. Z up, -Y forward, metres.
Analytic constant-length biped IK and contact-pivot foot rolls, not a physics simulation.
"""
import math
from mathutils import Vector, Quaternion, Euler
FPS=120
H={};PAR={}
def joint(n,p,parent):H[n]=Vector(p);PAR[n]=parent
joint('MOTION',(0,0,0),None)
joint('PELVIS',(0,0,1.38),'MOTION')
joint('WAIST',(0,0,1.58),'PELVIS')
joint('CHEST',(0,0,1.82),'WAIST')
joint('NECK',(0,-.025,2.115),'CHEST')
joint('HEAD',(0,-.065,2.275),'NECK')
joint('SENSOR_YAW',(0,-.17,2.275),'HEAD')
for side,s in [('L',1),('R',-1)]:
 joint('SHOULDER_'+side,(s*.315,0,1.99),'CHEST')
 joint('UPPER_ARM_'+side,(s*.36,0,1.96),'SHOULDER_'+side)
 joint('FOREARM_'+side,(s*.42,-.018,1.585),'UPPER_ARM_'+side)
 joint('HAND_'+side,(s*.455,-.055,1.235),'FOREARM_'+side)
 for i in range(4):
  x=s*.455+(i-1.5)*.027
  joint(f'FINGER_{side}{i+1}_01',(x,-.06,1.155),'HAND_'+side)
  joint(f'FINGER_{side}{i+1}_02',(x,-.07,1.09+(abs(i-1.5)-.5)*.008),f'FINGER_{side}{i+1}_01')
 joint('THUMB_'+side+'_01',(s*.395,-.065,1.20),'HAND_'+side)
 joint('THUMB_'+side+'_02',(s*.365,-.09,1.15),'THUMB_'+side+'_01')
 joint('HIP_'+side,(s*.158,0,1.38),'PELVIS')
 joint('KNEE_'+side,(s*.19,-.07,.815),'HIP_'+side)
 joint('ANKLE_'+side,(s*.205,0,.205),'KNEE_'+side)
 joint('TOE_'+side,(s*.205,-.14,.075),'ANKLE_'+side)
 for name,p,parent in [('HAND',(s*.455,-.09,1.18),'HAND'),('TOOL',(s*.455,-.12,1.205),'HAND'),('SOLE',(s*.205,-.055,.006),'ANKLE'),('HEEL',(s*.205,.095,.006),'ANKLE'),('TOE',(s*.205,-.245,.006),'ANKLE')]:joint('SOCKET_'+name+'_'+side,p,parent+'_'+side)
joint('SOCKET_BACK',(0,.225,1.90),'CHEST')
joint('SOCKET_SENSOR',(0,-.235,2.275),'SENSOR_YAW')
CLIPS=[
 dict(name='Recon_Idle',label='Recon idle',duration_s=4.,loop=True,note='Planted stance, quiet balance corrections and a slow optical check.'),
 dict(name='Patrol_Walk_Cycle',label='Patrol',duration_s=1.5,loop=True,speed_mps=.70,duty_factor=.66,touchdown_phase={'L':0,'R':.5},flat_support_phase=[.08,.55],note='80 steps/min · 0.70 m/s. Heel placement, weight transfer and opposing arm swing.'),
 dict(name='Stealth_Walk_Cycle',label='Stealth',duration_s=2.4,loop=True,speed_mps=.28,duty_factor=.78,touchdown_phase={'L':0,'R':.5},flat_support_phase=[.08,.67],note='50 steps/min · 0.28 m/s. Lowered stance, short quiet steps and extended double support.'),
 dict(name='Survey_Scan',label='Survey',duration_s=6.,loop=False,note='Feet remain planted while the head and upper torso sweep the surroundings.'),
 dict(name='Crouch_Observe',label='Observe',duration_s=5.,loop=False,note='Drop the pelvis 38 cm, hold a low observation position, then return.'),
 dict(name='Signal_Halt',label='Halt signal',duration_s=4.,loop=False,note='Raise an open right hand, hold a silent halt signal, then return.')]
def smooth(x):x=max(0,min(1,x));return x*x*x*(x*(6*x-15)+10)
def pulse(t,a,b,c,d):return smooth((t-a)/(b-a))*(1-smooth((t-c)/(d-c)))
def rx(a):return Quaternion((1,0,0),a)
def rz(a):return Quaternion((0,0,1),a)
def ry(a):return Quaternion((0,1,0),a)
MAX_REACH_ERROR=0

def pose(name,t):
 global MAX_REACH_ERROR
 meta=next(c for c in CLIPS if c['name']==name);phase=(t/meta['duration_s'])%1;w=phase*math.tau
 walking='speed_mps' in meta;stealth=name=='Stealth_Walk_Cycle'
 crouch=pulse(t,.25,1.65,3.05,4.75) if name=='Crouch_Observe' else 0
 signal=pulse(t,.25,1.3,2.65,3.8) if name=='Signal_Halt' else 0
 scan=math.sin(w)*math.sin(math.pi*phase)**2 if name=='Survey_Scan' else 0
 pos={};ori={}
 def put(n,p=None,q=None):
  parent=PAR[n];pos[n]=Vector(p) if p is not None else pos[parent]+ori[parent]@(H[n]-H[parent]);ori[n]=q if q is not None else ori[parent].copy()
 put('MOTION',(0,0,0),Quaternion())
 if walking:pelvis=Vector((.032*math.sin(w-.40),.008*math.sin(w*2),1.23 if stealth else 1.295+.012*math.cos(w*2-.8)));pelq=Euler((.015,.018*math.sin(w-.4),.025*math.cos(w))).to_quaternion()
 else:pelvis=H['PELVIS']+Vector((0,.11*crouch,-.38*crouch+.0015*math.sin(w)));pelq=rx(-.09*crouch)
 put('PELVIS',pelvis,pelq);put('WAIST',q=rx(.055 if walking else .11*crouch)@rz(.13*scan))
 put('CHEST',q=Euler((-.065 if stealth else -.025 if walking else -.15*crouch,-.012*math.sin(w-.4) if walking else 0,-.025*math.cos(w) if walking else .23*scan)).to_quaternion())
 put('NECK');put('HEAD',q=rz(.68*scan+.07*math.sin(w) if not walking else .015*math.sin(w))@rx(.045*crouch));put('SENSOR_YAW')
 for side,s in [('L',1),('R',-1)]:
  q=(phase+(0 if side=='L' else .5))%1;foot=H['ANKLE_'+side].copy();angle=0
  if walking:
   duty=meta['duty_factor'];stride=meta['speed_mps']*meta['duration_s'];extent=stride*duty
   heel=.07 if stealth else .12;toe=.13 if stealth else .23
   if q<duty:
    foot.y=-extent/2+stride*q
    if q<.08:angle=-heel*(1-smooth(q/.08))
    elif q>duty-.11:angle=toe*smooth((q-duty+.11)/.11)
   else:
    u=(q-duty)/(1-duty);foot.y=extent/2-extent*smooth(u);foot.z+=(.075 if stealth else .12)*math.sin(math.pi*u)**2;angle=toe+(-heel-toe)*smooth(u)
   pivot=Vector((0,-.245 if angle>=0 else .095,-.199));foot+=pivot-rx(angle)@pivot
  hip=pos['PELVIS']+ori['PELVIS']@(H['HIP_'+side]-H['PELVIS'])
  a=(H['KNEE_'+side]-H['HIP_'+side]).length;b=(H['ANKLE_'+side]-H['KNEE_'+side]).length;d=foot-hip;length=d.length
  MAX_REACH_ERROR=max(MAX_REACH_ERROR,max(0,length-(a+b)));assert length<a+b-1e-5,(name,t,side,'unreachable',length,a+b)
  direction=d.normalized();pole=Vector((0,-1,0));pole=(pole-direction*pole.dot(direction)).normalized();along=(a*a-b*b+length*length)/(2*length);knee=hip+direction*along+pole*math.sqrt(max(0,a*a-along*along))
  put('HIP_'+side,hip,(H['KNEE_'+side]-H['HIP_'+side]).rotation_difference(knee-hip));put('KNEE_'+side,knee,(H['ANKLE_'+side]-H['KNEE_'+side]).rotation_difference(foot-knee));put('ANKLE_'+side,foot,rx(angle));put('TOE_'+side)
  put('SHOULDER_'+side)
  swing=(.10 if stealth else .24)*math.cos(math.tau*q-.18) if walking else .008*math.sin(w)
  upper=.045+swing-.22*crouch;fore=upper-(.40 if stealth else .13)-.55*crouch
  if side=='R':upper-=.55*signal;fore-=2.55*signal
  put('UPPER_ARM_'+side,q=rx(upper)@ry(-s*(.045+.20*signal if side=='R' else .045)));put('FOREARM_'+side,q=rx(fore)@ry(-s*(.16*signal if side=='R' else .02)));put('HAND_'+side,q=rx(fore+.06))
  for i in range(4):
   n=f'FINGER_{side}{i+1}_01';opened=signal if side=='R' else 0;put(n,q=ori['HAND_'+side]@rx(-.18*(1-opened)));put(f'FINGER_{side}{i+1}_02',q=ori[n]@rx(-.25*(1-opened)))
  put('THUMB_'+side+'_01');put('THUMB_'+side+'_02',q=ori['HAND_'+side]@ry(-s*.18))
 for n in H:
  if n.startswith('SOCKET_'):put(n)
 return pos,ori
