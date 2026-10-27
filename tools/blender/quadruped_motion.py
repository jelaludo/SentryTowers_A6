"""Reusable event-based motion patterns. Reference observations and authored timing
are kept separately in source/motion-patterns/quadruped-patterns.json.
Pure Python math; rig adapters retain their own bones, lengths, axes and IK.
"""
import json,math
from pathlib import Path
PATTERNS=json.loads((Path(__file__).resolve().parents[2]/'source/motion-patterns/quadruped-patterns.json').read_text())
GAITS=PATTERNS['k9_gaits'];JUMPS=PATTERNS['jumps']

def smooth(a,b,t):
 u=max(0.,min(1.,(t-a)/(b-a)));return u*u*(3-2*u)
def hermite(a,b,ma,mb,u,dt):return (2*u**3-3*u*u+1)*a+(u**3-2*u*u+u)*dt*ma+(-2*u**3+3*u*u)*b+(u**3-u*u)*dt*mb
def curve(keys,t):
 if t<=keys[0][0]:return keys[0][1]
 if t>=keys[-1][0]:return keys[-1][1]
 for a,b in zip(keys,keys[1:]):
  if a[0]<=t<=b[0]:return hermite(a[1],b[1],a[2] if len(a)>2 else 0,b[2] if len(b)>2 else 0,(t-a[0])/(b[0]-a[0]),b[0]-a[0])
def duty(meta,id):return meta['duty_factor'][id] if isinstance(meta['duty_factor'],dict) else meta['duty_factor']
def gait_foot(meta,id,u):
 """Relative Y/Z target and stance flag; stance has constant world speed."""
 d=duty(meta,id);stride=meta['speed_mps']*meta['duration_s']*d;p=(u-meta['touchdown_phase'][id])%1
 if p<d:return -stride/2+stride*p/d,0.,True
 q=(p-d)/(1-d);y=hermite(stride/2,-stride/2,stride/d,stride/d,q,1-d)
 lift={'walk':.055,'trot':.12,'pace':.07,'canter':.15,'rotary gallop':.17,'double-suspension gallop':.19}[meta['gait']]
 return y,lift*math.sin(math.pi*q)**2,False

def jump_meta(rig):
 p=JUMPS[rig]
 return dict(source_ids=p['source_ids'],pattern_revision=PATTERNS['revision'],release_s=p['release_s'],touchdown_s=p['touchdown_s'],phase_landmarks_s=p['landmarks_s'],flight_interval_s=[max(p['release_s'].values()),min(p['touchdown_s'].values())],travel_m=p['travel_m'],trajectory='Authored ballistic-style torso arc; separate paw anchors and articulated pose curves')
def root_y(p,t):
 if not p['travel_m']:return 0.
 a=max(p['release_s'].values());b=min(p['touchdown_s'].values());r=a-.17;e=b+.20;v=p['travel_m']/(b-a+(a-r)/2+(e-b)/2)
 # Accelerate while pushing, travel at constant forward speed in air, decelerate
 # after fore contact. The integral keeps the final distance exact.
 if t<=r:d=0
 elif t<a:d=.5*v*(t-r)**2/(a-r)
 elif t<b:d=.5*v*(a-r)+v*(t-a)
 elif t<e:
  q=t-b;d=.5*v*(a-r)+v*(b-a)+v*q-.5*v*q*q/(e-b)
 else:d=p['travel_m']
 return -d

def jump_body(rig,t):
 p=JUMPS[rig];a=max(p['release_s'].values());b=min(p['touchdown_s'].values());T=b-a;apex=(a+b)/2;c=p['landmarks_s']['crouch'];absorb=p['landmarks_s']['absorb'];end=p['recovery_s'];h=p['flight_height_m'];z0=p['launch_offset_m'];z1=p['landing_offset_m'];v0=(z1-z0+4*h)/T;v1=(z1-z0-4*h)/T
 if t<a:z=curve([(0,0),(.12,0),(c,-p['crouch_m']),(a,z0,v0)],t)
 elif t<=b:
  u=(t-a)/T;z=z0+(z1-z0)*u+4*h*u*(1-u)
 else:z=curve([(b,z1,v1),(absorb,-p['compression_m']),(end,0)],t)
 pitch=curve([(0,0),(c,.08),(a,p['launch_pitch']),(apex,-.015),(b,p['landing_pitch']),(absorb,.06),(end,0)],t)
 flex=curve([(0,0),(c,.30),(a,-.12),(apex,.18),(b,-.15),(absorb,.20),(end,0)],t)
 gaze=curve([(0,0),(.18,-.09),(a,-.07),(apex,.02),(b,.17),(absorb,.02),(end,0)],t)
 fore_response=.20*smooth(b,b+.075,t)*(1-smooth(b+.12,b+.22,t))
 return dict(z=z,pitch=pitch,flex=flex,fore_response=fore_response,gaze=gaze,root_y=root_y(p,t),compression=smooth(b,b+.055,t)*(1-smooth(absorb,end,t)),air=a<t<b,apex_s=apex)

def jump_foot(rig,id,t,rest):
 """Return local XYZ paw target, sole pitch and stance flag.
 World paw anchors stay fixed before release and after contact, including when
 the torso's forward motion continues into the landing compression.
 """
 p=JUMPS[rig];release=p['release_s'][id];land=p['touchdown_s'][id];a=max(p['release_s'].values());b=min(p['touchdown_s'].values());apex=(a+b)/2;front=id[0]=='F';x,y,z=rest;root=root_y(p,t)
 if t<=release:return (x,y-root,z),0.,True
 if t>=land:return (x,y-p['travel_m']-root,z),0.,True
 tuck=p['fore_tuck_m'] if front else p['hind_tuck_m'];landy=y-p['travel_m'];apexy=root_y(p,apex)+y+tuck
 if front:
  wy=curve([(release,y),(a,root_y(p,a)+y+tuck*.7),(apex,apexy),(land,landy)],t)
  height=curve([(release,z),(a,p['fore_launch_height_m']),(apex,p['fore_apex_height_m']),(land-.06,.19,-1.6),(land,z)],t)
 else:
  wy=curve([(release,y),(apex,apexy),(b,root_y(p,b)+y+.055),(land,landy)],t)
  height=curve([(release,z),(apex,p['hind_apex_height_m']),(b,p['hind_forecontact_height_m']),(land,z)],t)
 q=(t-release)/(land-release);pitch=curve([(release,0),(apex,-.22),(land-.07,.16),(land,0)],t)
 # Preserve toe clearance as the paw rotates; anchors flatten at touchdown.
 height+=max(0,math.sin(pitch))*(.10 if rig=='cheetah' else .08)
 x*=1-(.07 if front else .025)*math.sin(math.pi*q)**2
 return (x,wy-root,height),pitch,False

def jump_tail(rig,t,index):
 p=JUMPS[rig];a=max(p['release_s'].values());b=min(p['touchdown_s'].values());apex=(a+b)/2
 return curve([(0,0),(a,.08 if rig=='cheetah' else -.18),(apex,.02 if rig=='cheetah' else -.03),(b,.48),(p['landmarks_s']['absorb']+.1,.25),(p['recovery_s'],0)],t-index*.018)
