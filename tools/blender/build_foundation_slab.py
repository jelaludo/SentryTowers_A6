"""Texture-free scalable island slab. Blender Z-up -> glTF Y-up."""
import bpy, bmesh, json, struct
from pathlib import Path
P=Path(__file__).resolve().parents[2];OUT=P/'assets/base-kit-game';OUT.mkdir(exist_ok=True)
if not bpy.app.background:raise RuntimeError('Run in background mode')
bpy.ops.wm.read_factory_settings(use_empty=True)
root=bpy.data.objects.new('ROOT',None);bpy.context.collection.objects.link(root)
root['credit']='Models by jelaludo';root['reference_size_m']=[40,40];root['top_y_m']=0;root['scale_axes']='Scale X and Z only in glTF; keep Y=1 to retain 1.2 m skirt'
def material(name,color,rough):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True;s=m.node_tree.nodes.get('Principled BSDF');s.inputs['Base Color'].default_value=(*color,1);s.inputs['Roughness'].default_value=rough;return m
concrete=material('Slab / concrete',(.42,.47,.45),.86);carbon=material('Skirt / carbon',(.045,.062,.065),.92)
def ring(half,z):return [(-half,-half,z),(half,-half,z),(half,half,z),(-half,half,z)]
def bridge(a,b):return [(a+i,a+(i+1)%4,b+(i+1)%4,b+i) for i in range(4)]
def mesh(name,vertices,faces,mat):
 data=bpy.data.meshes.new(name);data.from_pydata(vertices,[],faces);data.update()
 bm=bmesh.new();bm.from_mesh(data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(data);bm.free()
 obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj);obj.parent=root;data.materials.append(mat);return obj
# Full, flat 40 m top. Rim bevel lies below it, without any raised top features.
mesh('SLAB',ring(20,0)+ring(20,-.12)+ring(19.85,-.28),[(0,1,2,3)]+bridge(0,4)+bridge(4,8),concrete)
# Inset continuous dark skirt behind the rim, down to the specified fill depth.
mesh('SKIRT',ring(19.85,0)+ring(19.85,-1.2),bridge(0,4)+[(7,6,5,4)],carbon)
support=bpy.data.objects.new('SUPPORT',None);bpy.context.collection.objects.link(support);support.parent=root;support.location=(0,0,-1.2)
bpy.ops.export_scene.gltf(filepath=str(OUT/'foundation_slab.glb'),export_format='GLB',export_animations=False,export_extras=True,export_cameras=False,export_lights=False,export_texcoords=False)
bpy.ops.wm.save_as_mainfile(filepath=str(P/'source/blender/foundation-slab.blend'))
b=(OUT/'foundation_slab.glb').read_bytes();d=json.loads(b[20:20+struct.unpack_from('<I',b,12)[0]])
triangles=sum(d['accessors'][p['indices']]['count']//3 for m in d['meshes'] for p in m['primitives'])
entry={'id':'foundation_slab','name':'Scalable island slab','file':'foundation_slab.glb','state':'Intact','plot_m':[40,40],'reference_size_m':[40,40],'triangles':triangles,'bytes':len(b),'draw_calls':2,'materials':2,'sockets':[],'colliders':[{'id':'slab','center_m':[0,-.6,0],'size_m':[40,1.2,40],'condition':'always'}],'clearance':[],'animations':[],'credit':'Models by jelaludo','description':'Unmarked 40 × 40 m reference slab, flat top at Y=0, inset 1.2 m skirt. Scale X/Z to the island; keep Y=1.','presets':[{'name':name,'size_m':size,'scale':[size[0]/40,1,size[1]/40]} for name,size in [('Landing site',[16,16]),('Rotor socket',[8,8]),('Armored gate',[12,8]),('Solar complex',[20,20]),('HUGIN arm',[40,40]),('Stalheart',[48,56])]]}
(OUT/'foundation-slab.json').write_text(json.dumps(entry,indent=2)+'\n')
print('SLAB',triangles,'triangles',len(b),'bytes')
