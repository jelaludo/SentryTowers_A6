"""Original heavy biped performance. Blender metres: Z up, -Y forward.
Foot roll is solved about the heel/toe contact, with constant-length two-bone IK.
No force/physics simulation or captured reference animation is implied.
"""
import math
from mathutils import Vector, Matrix, Quaternion, Euler
FPS=120
H={};PAR={}
def joint(n,p,parent):H[n]=Vector(p);PAR[n]=parent
joint('MOTION',(0,0,0),None)
joint('PELVIS',(0,0,1.10),'MOTION')
joint('WAIST',(0,0,1.35),'PELVIS')
joint('CHEST',(0,0,1.66),'WAIST')
joint('NECK',(0,-.055,2.045),'CHEST')
joint('HEAD',(0,-.09,2.14),'NECK')
joint('SENSOR_YAW',(0,-.205,2.14),'HEAD')
for side,s in [('L',1),('R',-1)]:
 joint('SHOULDER_'+side,(s*.48,0,1.94),'CHEST')
 joint('UPPER_ARM_'+side,(s*.55,0,1.88),'SHOULDER_'+side)
 joint('FOREARM_'+side,(s*.62,-.045,1.45),'UPPER_ARM_'+side)
 joint('HAND_'+side,(s*.65,-.12,1.055),'FOREARM_'+side)
 for i in range(4):
  x=s*.65+(i-1.5)*.043
  joint(f'FINGER_{side}{i+1}_01',(x,-.125,.96),'HAND_'+side)
  joint(f'FINGER_{side}{i+1}_02',(x,-.15,.88),f'FINGER_{side}{i+1}_01')
 joint('THUMB_'+side+'_01',(s*.55,-.115,1.02),'HAND_'+side)
 joint('THUMB_'+side+'_02',(s*.515,-.15,.96),'THUMB_'+side+'_01')
 joint('HIP_'+side,(s*.24,0,1.10),'PELVIS')
 joint('KNEE_'+side,(s*.275,-.10,.65),'HIP_'+side)
 joint('ANKLE_'+side,(s*.28,0,.20),'KNEE_'+side)
 joint('TOE_'+side,(s*.28,-.19,.10),'ANKLE_'+side)
 for name,p,parent in [('HAND',(s*.65,-.19,.99),'HAND'),('TOOL',(s*.65,-.22,1.02),'HAND'),('SOLE',(s*.28,-.07,.006),'ANKLE'),('HEEL',(s*.28,.14,.006),'ANKLE'),('TOE',(s*.28,-.31,.006),'ANKLE')]:joint('SOCKET_'+name+'_'+side,p,parent+'_'+side)
joint('SOCKET_BACK',(0,.32,1.80),'CHEST')
joint('SOCKET_SENSOR',(0,-.24,2.14),'SENSOR_YAW')
CLIPS=[
 dict(name='Standby_Idle',label='Standby',duration_s=4.,loop=True,note='Quiet hydraulic corrections; both feet planted.'),
 dict(name='Heavy_Walk_Cycle',label='Heavy walk',duration_s=1.8,loop=True,speed_mps=.55,duty_factor=.68,touchdown_phase={'L':0,'R':.5},flat_support_phase=[.08,.57],note='66.7 steps/min · 0.55 m/s · heel placement, long support and delayed arm swing.'),
 dict(name='Carry_Walk_Cycle',label='Carry walk',duration_s=2.4,loop=True,speed_mps=.36,duty_factor=.74,touchdown_phase={'L':0,'R':.5},flat_support_phase=[.08,.63],note='50 steps/min · 0.36 m/s · forearms braced for a load; attach cargo at the hand sockets.'),
 dict(name='Work_Inspect',label='Inspect',duration_s=5.,loop=False,note='Plant both feet, raise the right hand for a sensor check, then return to standby.'),
 dict(name='Crouch_Service',label='Service crouch',duration_s=5.,loop=False,note='Lower the center of mass with both soles anchored, hold, then stand.')]

def smooth(x):x=max(0,min(1,x));return x*x*x*(x*(6*x-15)+10)
def pulse(t,a,b,c,d):return smooth((t-a)/(b-a))*(1-smooth((t-c)/(d-c)))
def rx(a):return Quaternion((1,0,0),a)
def rz(a):return Quaternion((0,0,1),a)
def ry(a):return Quaternion((0,1,0),a)
MAX_REACH_ERROR=0

def pose(name,t):
 global MAX_REACH_ERROR
 meta=next(c for c in CLIPS if c['name']==name);phase=(t/meta['duration_s'])%1;w=phase*math.tau
 walking='speed_mps' in meta;carry=name=='Carry_Walk_Cycle'
 service=pulse(t,.25,1.65,3.05,4.75) if name=='Crouch_Service' else 0
 inspect=pulse(t,.35,1.8,3.0,4.7) if name=='Work_Inspect' else 0
 pos={};ori={}
 def put(n,p=None,q=None):
  parent=PAR[n];pos[n]=Vector(p) if p is not None else pos[parent]+ori[parent]@(H[n]-H[parent]);ori[n]=q if q is not None else ori[parent].copy()
 put('MOTION',(0,0,0),Quaternion())
 if walking:pelvis=Vector((.058*math.sin(w-.56),.012*math.sin(w*2),1.030+.014*math.cos(w*2-1.0)));pelq=Euler((.025, .028*math.sin(w-.56),.04*math.cos(w))).to_quaternion()
 else:pelvis=H['PELVIS']+Vector((0,.08*service,-.30*service+.0025*math.sin(w)));pelq=rx(-.08*service)
 put('PELVIS',pelvis,pelq);put('WAIST',q=rx(.055 if walking else .14*service));put('CHEST',q=Euler((-.035 if walking else -.14*service, -.018*math.sin(w-.56) if walking else 0,-.035*math.cos(w) if walking else 0)).to_quaternion());put('NECK');put('HEAD',q=rx(.18*inspect));put('SENSOR_YAW')
 for side,s in [('L',1),('R',-1)]:
  q=(phase+(0 if side=='L' else .5))%1
  foot=H['ANKLE_'+side].copy();angle=0
  if walking:
   duty=meta['duty_factor'];stride=meta['speed_mps']*meta['duration_s'];extent=stride*duty
   if q<duty:
    foot.y=-extent/2+stride*q
    if q<.08:angle=-.14*(1-smooth(q/.08))
    elif q>duty-.11:angle=.26*smooth((q-duty+.11)/.11)
   else:
    u=(q-duty)/(1-duty);foot.y=extent/2-extent*smooth(u);foot.z+=.13*math.sin(math.pi*u)**2;angle=.26+(-.14-.26)*smooth(u)
   pivot=Vector((0,-.31 if angle>=0 else .14,-.194));foot+=pivot-rx(angle)@pivot
  hip=pos['PELVIS']+ori['PELVIS']@(H['HIP_'+side]-H['PELVIS'])
  a=(H['KNEE_'+side]-H['HIP_'+side]).length;b=(H['ANKLE_'+side]-H['KNEE_'+side]).length;d=foot-hip;length=d.length
  MAX_REACH_ERROR=max(MAX_REACH_ERROR,max(0,length-(a+b)))
  assert length<a+b-1e-5,(name,t,side,'unreachable',length,a+b)
  direction=d.normalized();pole=Vector((0,-1,0));pole=(pole-direction*pole.dot(direction)).normalized();along=(a*a-b*b+length*length)/(2*length);knee=hip+direction*along+pole*math.sqrt(max(0,a*a-along*along))
  put('HIP_'+side,hip,(H['KNEE_'+side]-H['HIP_'+side]).rotation_difference(knee-hip))
  put('KNEE_'+side,knee,(H['ANKLE_'+side]-H['KNEE_'+side]).rotation_difference(foot-knee))
  put('ANKLE_'+side,foot,rx(angle));put('TOE_'+side)
  put('SHOULDER_'+side)
  swing=.18*math.cos(math.tau*q-.30) if walking else .009*math.sin(w)
  upper_angle=.08+swing if not carry else -.37+.025*math.cos(math.tau*q)
  fore_angle=upper_angle-.19 if not carry else -1.28+.025*math.cos(math.tau*q)
  if side=='R':upper_angle-=.95*inspect;fore_angle-=1.8*inspect
  upper_angle-=.20*service;fore_angle-=.33*service
  put('UPPER_ARM_'+side,q=rx(upper_angle)@ry(-s*.025));put('FOREARM_'+side,q=rx(fore_angle)@ry(-s*.02));put('HAND_'+side,q=rx(fore_angle+.10)@rz(-s*.10 if carry else 0))
  for i in range(4):
   n=f'FINGER_{side}{i+1}_01';put(n,q=ori['HAND_'+side]@rx(-.10 if carry else -.14));put(f'FINGER_{side}{i+1}_02',q=ori[n]@rx(-.36 if carry else -.22))
  put('THUMB_'+side+'_01');put('THUMB_'+side+'_02',q=ori['HAND_'+side]@ry(-s*.2))
 for n in H:
  if n.startswith('SOCKET_'):put(n)
 return pos,ori
