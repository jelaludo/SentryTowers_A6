"""Verify that the industrial face revision changes only HEAD and JAW geometry."""
import sys,json,types,subprocess,hashlib
from pathlib import Path
P=Path(__file__).resolve().parents[2];sys.path.insert(0,str(Path(__file__).resolve().parent))
import build_k0_tech_01 as current
BASELINE='b918febcfb7783550c5a2717319b7835e6b776ca'
previous=types.ModuleType('k0_face_baseline');previous.__file__=current.__file__
exec(subprocess.check_output(['git','show',BASELINE+':tools/blender/build_k0_tech_01.py'],cwd=P),previous.__dict__)
def faces(g):
 result={}
 for face,material,smooth in zip(g.f,g.mi,g.smooth):
  bone=g.b[face[0]];result.setdefault(bone,[]).append((material,smooth,tuple(sorted(tuple(g.v[i]) for i in face))))
 return {bone:sorted(rows) for bone,rows in result.items()}
checks=[]
for lod in [0,1,2]:
 reference=current.cheetah.shape(lod);old=faces(previous.shape(lod,reference));new=faces(current.shape(lod,reference))
 assert old.keys()==new.keys()
 changed=[n for n in old if old[n]!=new[n]];assert set(changed)=={'HEAD','JAW'},changed
 checks.append({'lod':lod,'changed_geometry_bones':changed,'unchanged_geometry_bones':sorted(set(old)-set(changed)),'unchanged_faces':sum(len(v) for n,v in old.items() if n not in changed)})
report={'status':'passed','baseline_commit':BASELINE,'scope':'Source polygon positions, bone assignment, material and shading compared at all three tiers; only HEAD and JAW differ. Ears, neck and all body geometry are identical.','builder_sha256':hashlib.sha256(Path(current.__file__).read_bytes()).hexdigest(),'checks':checks}
(P/'assets/k0-tech-01/face-geometry-validation.json').write_text(json.dumps(report,indent=2)+'\n')
print('FACE_SCOPE',json.dumps(checks),flush=True)
