"""Preserve the MIT STEP original; tessellate a static inspection derivative (millimetres).
Run with cadquery-ocp 7.7.2. Output is temporary geometry, consumed by import-hand-references.mjs.
"""
from pathlib import Path
import json,sys,array
from OCP.STEPControl import STEPControl_Reader
from OCP.IFSelect import IFSelect_RetDone
from OCP.BRepMesh import BRepMesh_IncrementalMesh
from OCP.BRep import BRep_Tool
from OCP.TopExp import TopExp_Explorer
from OCP.TopAbs import TopAbs_FACE,TopAbs_REVERSED,TopAbs_SOLID
from OCP.TopoDS import TopoDS
from OCP.TopLoc import TopLoc_Location
root=Path(__file__).resolve().parents[2]
r=STEPControl_Reader();assert r.ReadFile(str(root/'assets/hand-lab/references/liberhand/source/Liberhand_V1.STEP'))==IFSelect_RetDone;r.TransferRoots();shape=r.OneShape()
BRepMesh_IncrementalMesh(shape,.25,False,.35,True).Perform()
parts=[];pts=array.array('f');explorer=TopExp_Explorer(shape,TopAbs_SOLID)
while explorer.More():
 solid=explorer.Current();faces=TopExp_Explorer(solid,TopAbs_FACE);start=len(pts)//3
 while faces.More():
  face=TopoDS.Face_s(faces.Current());loc=TopLoc_Location();tri=BRep_Tool.Triangulation_s(face,loc)
  if tri:
   tr=loc.Transformation()
   for i in range(1,tri.NbTriangles()+1):
    idx=list(tri.Triangle(i).Get())
    if face.Orientation()==TopAbs_REVERSED:idx[1],idx[2]=idx[2],idx[1]
    for j in idx:
     p=tri.Node(j).Transformed(tr);pts.extend([p.X(),p.Y(),p.Z()])
  faces.Next()
 parts.append({'start':start,'count':len(pts)//3-start});explorer.Next()
with open('/tmp/hand-lab-liberhand.positions','wb') as f:pts.tofile(f)
Path('/tmp/hand-lab-liberhand.json').write_text(json.dumps({'parts':parts,'coordinates':'STEP millimetres; unmodified assembly transforms','deflection_mm':.25,'angular_deflection_rad':.35}))
print('Tessellated',len(parts),'solids;',len(pts)//9,'triangles')
