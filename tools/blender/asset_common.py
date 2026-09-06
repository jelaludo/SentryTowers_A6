"""Shared Blender geometry helpers for modular base authoring.
Run: blender --background --python-exit-code 1 --python tools/blender/build_wall_kit.py
Blender uses Z up; glTF exporter converts to +Y up, +Z forward (-Y in Blender).
"""
import bpy, bmesh, math, json, random
from pathlib import Path
from mathutils import Vector

PROJECT=Path(__file__).resolve().parents[2]
OUT=PROJECT/'assets/base-kit';SOURCE=PROJECT/'source/blender'
OUT.mkdir(parents=True,exist_ok=True);SOURCE.mkdir(parents=True,exist_ok=True)
# Background build only: do not replace an artist's live scene.
if not bpy.app.background:raise RuntimeError('Run this builder in background mode.')
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
for c in list(bpy.data.collections):
    if c.name!='Collection' and c.users==0:bpy.data.collections.remove(c)

def material(name,color,metal=.0,rough=.5,emission=0):
    m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
    bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*color,1);bs.inputs['Metallic'].default_value=metal;bs.inputs['Roughness'].default_value=rough
    if emission:bs.inputs['Emission Color'].default_value=(*color,1);bs.inputs['Emission Strength'].default_value=emission
    return m
M={
 'armor':material('Ceramic armor / limestone',(.48,.54,.51),.38,.43),
 'edge':material('Edge metal / graphite',(.075,.11,.13),.72,.35),
 'frame':material('Structural frame / blue steel',(.16,.23,.26),.7,.45),
 'dark':material('Recess / carbon',(.017,.027,.03),.3,.7),
 'concrete':material('Fractured geopolymer',(.27,.29,.27),.0,.88),
 'raw':material('Fresh fracture / mineral',(.43,.40,.32),.0,.94),
 'rust':material('Oxidized reinforcement',(.32,.16,.075),.65,.68),
 'yellow':material('Caution / amber',(.95,.51,.065),.25,.45),
 'signal':material('Status / mint',(.12,.9,.68),.25,.28,2.1),
 'fault':material('Fault / amber',(.95,.17,.025),.1,.4,1.5),
 'white':material('Stencil / ivory',(.78,.84,.77),.0,.55),
}
active_root=None;active_collection=None;manifest=[];roots=[]
def register(obj,name,mat=None,parent=None):
    obj.name=name
    for c in list(obj.users_collection):c.objects.unlink(obj)
    active_collection.objects.link(obj)
    obj.parent=parent or active_root
    if mat:obj.data.materials.append(M[mat])
    return obj
def empty(name,loc=(0,0,0),parent=None):
    obj=bpy.data.objects.new(name,None);active_collection.objects.link(obj);obj.parent=parent or active_root;obj.location=loc;obj.empty_display_size=.18
    return obj
def finish(obj,bevel):
    if bevel:
        mod=obj.modifiers.new('Manufactured edge bevel','BEVEL');mod.width=bevel;mod.segments=2
        bpy.context.view_layer.objects.active=obj;bpy.ops.object.modifier_apply(modifier=mod.name)
    return obj
def box(name,loc,size,mat='armor',bevel=.025,parent=None,rot=(0,0,0)):
    bpy.ops.mesh.primitive_cube_add(size=1,location=(0,0,0));o=register(bpy.context.object,name,mat,parent);o.location=loc;o.dimensions=size
    bpy.context.view_layer.objects.active=o;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    finish(o,min(bevel,min(size)*.2));o.rotation_euler=rot;return o
def cylinder(name,loc,radius,depth,mat='frame',axis='Z',parent=None,vertices=12):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=radius,depth=depth,location=(0,0,0));o=register(bpy.context.object,name,mat,parent);o.location=loc
    if axis=='Y':o.rotation_euler[0]=math.pi/2
    elif axis=='X':o.rotation_euler[1]=math.pi/2
    return finish(o,.009)
def prism(name,outline,y0,y1,mat='armor',parent=None,bevel=.015):
    # Extrude a counterclockwise X/Z polygon through the wall's depth.
    count=len(outline);verts=[(x,y,z) for y in (y0,y1) for x,z in outline]
    faces=[tuple(range(count)),tuple(range(count*2-1,count-1,-1))]
    faces += [(i,(i+1)%count,(i+1)%count+count,i+count) for i in range(count)]
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update();obj=bpy.data.objects.new(name,mesh);active_collection.objects.link(obj);obj.parent=parent or active_root;mesh.materials.append(M[mat]);return finish(obj,bevel)
def beam(name,a,b,radius=.025,mat='rust',parent=None):
    delta=Vector(b)-Vector(a);o=cylinder(name,(Vector(a)+Vector(b))/2,radius,delta.length,mat,parent=parent,vertices=8);o.rotation_euler=delta.to_track_quat('Z','Y').to_euler();return o
def text(name,value,loc,size=.14,mat='white',parent=None):
    curve=bpy.data.curves.new(name,'FONT');curve.body=value;curve.size=size;curve.align_x='CENTER';curve.extrude=.001
    o=bpy.data.objects.new(name,curve);active_collection.objects.link(o);o.parent=parent or active_root;o.location=loc;o.rotation_euler=(math.pi/2,0,0);curve.materials.append(M[mat]);return o
def begin(id,title,state,plot,description):
    global active_root,active_collection
    active_collection=bpy.data.collections.new(id);bpy.context.scene.collection.children.link(active_collection)
    active_root=bpy.data.objects.new('ROOT',None);active_collection.objects.link(active_root);active_root['asset_id']=id;active_root['damage_state']=state
    active_root['up']='+Y in GLB';active_root['forward']='+Z in GLB';active_root['meters']=True
    entry=dict(id=id,name=title,state=state,file=id+'.glb',plot_m=plot,description=description,sockets=[],colliders=[],clearance=[],animations=[])
    roots.append((active_root,active_collection,entry));manifest.append(entry);return entry
def socket(entry,id,kind,position,normal,available=True,width=None):
    x,y,z=position;o=empty('SOCKET_'+id,(x,-z,y));o['kind']=kind;o['available']=available
    # Empty local +Z points outward in GLB after the export coordinate conversion.
    direction=Vector((normal[0],-normal[2],normal[1]));o.rotation_euler=direction.to_track_quat('-Y','Z').to_euler()
    entry['sockets'].append(dict(id=id,kind=kind,position_m=position,normal=normal,available=available,width_m=width))
def collider(entry,name,center,size,condition='always'):
    entry['colliders'].append(dict(id=name,center_m=center,size_m=size,condition=condition))
