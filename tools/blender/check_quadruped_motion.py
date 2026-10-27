"""Fast authoring check before exporting: rig reach and full geometry floor clearance."""
import sys,json
from pathlib import Path
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parent))
import cheetah_motion as c
import build_mechanical_cheetah as cg
import build_reckon_k9 as k
results=[]
for mod,g,names in [(c,cg.shape(0),['Pounce']),(k,k.shape(0),list(k.GAITS)+['Jump'])]:
 g.ground={n:np.array([v-mod.H[n] for v,b in zip(g.v,g.b) if b==n]) for n in set(g.b)}
 for name in names:
  mod.MAX_REACH_ERROR=0;mod.WORST_REACH=None;minimum=10;worst=None
  duration=next(x['duration_s'] for x in mod.CLIPS if x['name']==name)
  for i in range(round(duration*120)+1):
   t=i/120
   p,q=mod.pose(name,t) if mod==c else mod.pose(name,t,g)
   for n,v in g.ground.items():
    z=float((v@np.array(q[n]).T+np.array(p[n]))[:,2].min())
    if z<minimum:minimum=z;worst=(t,n)
  r=dict(clip=name,reach_error_m=mod.MAX_REACH_ERROR,reach_frame=mod.WORST_REACH,minimum_geometry_z_m=minimum,lowest_frame=worst);results.append(r);print(json.dumps(r),flush=True)
assert all(r['reach_error_m']<.0001 and r['minimum_geometry_z_m']>=-.003 for r in results),'Authoring reach/floor check failed'
print('AUTHORING_CHECK_PASS',flush=True)
