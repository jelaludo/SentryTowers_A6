"""Low-level authored hard-surface mesh helpers, extracted from the K9 builder.
No asset, rig, or Blender scene is constructed on import.
"""
import bpy, bmesh, math
from mathutils import Vector, Euler
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
