"""K0-TECH-01: rigid retarget of our authored C-07 patterns to a domestic-cat rig.
The source trajectories are reused; target chains are rebuilt at their own rest
lengths and solved again. No animated bone or armor scale is introduced.
"""
import copy,math
import numpy as np
from mathutils import Vector,Matrix
import cheetah_motion as source
FPS=source.FPS;PAR=source.PAR.copy();LEGS=source.LEGS
SCALE=Vector((.59,.44,.47));SOLE=.003*SCALE.z

def mapped(p,bone=None):
 p=Vector(p)
 if bone and bone.startswith('TAIL_'):p.y=.535+(p.y-.535)*.78
 return Vector((p.x*SCALE.x,p.y*SCALE.y,p.z*SCALE.z))

H={n:mapped(p,n) for n,p in source.H.items()}
H['SOCKET_MOUTH']=mapped((0,-.913,.618))
TAIL=[H['TAIL_'+str(i+1).zfill(2)] for i in range(8)]
CLIPS=copy.deepcopy(source.CLIPS)
for c in CLIPS:
 if 'speed_mps' in c:c['speed_mps']*=SCALE.y
 if 'travel_m' in c:c['travel_m']*=SCALE.y
 if 'retimed_from_duration_s' in c:del c['retimed_from_duration_s']
 c['pattern_family']='C07 authored feline pattern; proportions and travel adapted for K0-TECH-01'
FLOOR_POINTS=None;MAX_REACH_ERROR=0.;WORST_REACH=None

def configure_floor(geometry):
 global FLOOR_POINTS
 FLOOR_POINTS={n:np.array([v-H[n] for v,b in zip(geometry.v,geometry.b) if b==n]) for n in set(geometry.b)}

def pose(clip,t):
 global MAX_REACH_ERROR,WORST_REACH
 old,rot=source.pose(clip,t);pos={};ori={n:r.copy() for n,r in rot.items()}
 legs={prefix+id for id in LEGS for prefix in ['UPPER_','LOWER_','ANKLE_','PAW_','TOES_','SOCKET_PAW_']}
 for n in H:
  if n in legs:continue
  parent=PAR[n]
  if parent is None or n=='LUMBAR':pos[n]=mapped(old[n]);continue
  offset=old[n]-old[parent]-rot[parent]@(source.H[n]-source.H[parent])
  pos[n]=pos[parent]+ori[parent]@(H[n]-H[parent])+mapped(offset)
 for id in LEGS:
  upper,lower,ankle,foot=['%s_%s'%(x,id) for x in ['UPPER','LOWER','ANKLE','PAW']]
  parent=PAR[upper];a=pos[parent]+ori[parent]@(H[upper]-H[parent]);target=mapped(old[foot])
  c=target-ori[ankle]@(H[foot]-H[ankle]);l1=(H[lower]-H[upper]).length;l2=(H[ankle]-H[lower]).length
  delta=c-a;raw=delta.length;err=max(0,raw-l1-l2,abs(l1-l2)-raw)
  if err>MAX_REACH_ERROR:MAX_REACH_ERROR=err;WORST_REACH=(clip,t,id)
  distance=min(l1+l2-1e-7,max(abs(l1-l2)+1e-7,raw));direction=delta.normalized()
  pole=mapped(old[lower]-old[upper]);pole-=direction*pole.dot(direction)
  if pole.length<1e-7:pole=Vector((0,1 if id[0]=='F' else -1,0));pole-=direction*pole.dot(direction)
  pole.normalize();along=(l1*l1-l2*l2+distance*distance)/(2*distance)
  # Clamp only impossible targets, recording the error for the authoring audit.
  if abs(raw-distance)>1e-8:c=a+direction*distance;target=c+ori[ankle]@(H[foot]-H[ankle])
  b=a+direction*along+pole*math.sqrt(max(0,l1*l1-along*along))
  for n,p,end,rest in [(upper,a,b,H[lower]-H[upper]),(lower,b,c,H[ankle]-H[lower]),(ankle,c,target,H[foot]-H[ankle])]:
   pos[n]=p;ori[n]=rest.rotation_difference(end-p).to_matrix()
  pos[foot]=target
  for n in ['TOES_'+id,'SOCKET_PAW_'+id]:pos[n]=pos[foot]+ori[foot]@(H[n]-H[foot])
 if clip=='Roll_Over':
  assert FLOOR_POINTS is not None
  minimum=min(float((v@np.array(ori[n]).T+np.array(pos[n]))[:,2].min()) for n,v in FLOOR_POINTS.items())
  delta=SOLE-minimum;lift=max(0,delta)+min(0,delta)*source.pulse(.2,.9,4.3,5.4,t)
  for n in pos:
   if n!='MOTION':pos[n].z+=lift
 return pos,ori
