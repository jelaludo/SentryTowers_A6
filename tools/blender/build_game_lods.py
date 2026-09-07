"""Build ~40k-triangle game variants without modifying detailed source scenes.
Then run node tools/asset-pipeline/build-game-assets.mjs to batch compatible geometry.
"""
import bpy,math,json,struct
from pathlib import Path
if not bpy.app.background:raise RuntimeError('Run in background Blender')
PROJECT=Path(__file__).resolve().parents[2];OUT=PROJECT/'assets/game-ready';OUT.mkdir(parents=True,exist_ok=True)
TARGET=40000
manifest=dict(version=1,units='meters',up='+Y',forward='+Z',target_triangles=TARGET,assets=[])
for kit,source in [('launchpad','a6-launchpad.blend'),('terraformer','a6-terraformer.blend')]:
    bpy.ops.wm.open_mainfile(filepath=str(PROJECT/'source/blender'/source))
    entries=json.loads((PROJECT/'assets'/kit/'manifest.json').read_text())['assets']
    roots=[]
    for e in entries:
        col=bpy.data.collections[e['id']];root=next(o for o in col.objects if o.get('asset_id')==e['id']);root.location=(0,0,0)
        roots.append((root,col,e));objects=[o for o in col.objects if o.type=='MESH']
        def count():
            dg=bpy.context.evaluated_depsgraph_get();total=0
            for o in objects:
                mesh=o.evaluated_get(dg).to_mesh();mesh.calc_loop_triangles();total+=len(mesh.loop_triangles);o.evaluated_get(dg).to_mesh_clear()
            return total
        before=count();ratio=min(1,TARGET/before);mods=[]
        if before>TARGET*1.01:
            for o in objects:
                m=o.modifiers.new('Game LOD / silhouette reduction','DECIMATE');m.decimate_type='COLLAPSE';m.use_collapse_triangulate=True;m.ratio=ratio;mods.append(m)
            lo=0.0;hi=1.0
            for step in range(9):
                for m in mods:m.ratio=ratio
                bpy.context.view_layer.update();actual=count()
                print('BUDGET',e['id'],step,round(ratio,5),actual,flush=True)
                if abs(actual-TARGET)<600:break
                if actual>TARGET:hi=ratio
                else:lo=ratio
                ratio=(lo+hi)/2
            # Bake evaluated mesh data while retaining every object and pivot transform.
            dg=bpy.context.evaluated_depsgraph_get()
            replacements=[(o,bpy.data.meshes.new_from_object(o.evaluated_get(dg),preserve_all_data_layers=True,depsgraph=dg)) for o in objects]
            for o,mesh in replacements:o.modifiers.clear();o.data=mesh
        e.update(id=e['id']+'_game',family=e['family']+'_game',name=e['name']+' / Game',source_family=e['family'],source_file='../'+kit+'/'+e['file'],source_triangles=before,quality='game')
        e['file']=e['id']+'.glb';root['asset_id']=e['id'];root['quality']='game';e['triangles']=count()
        if not 34000<=e['triangles']<=41000:raise RuntimeError('Triangle budget missed: '+str(e))
        print('REDUCED',e['id'],before,'->',e['triangles'],flush=True)
    scene=bpy.context.scene;scene.frame_set(1)
    for root,col,e in roots:
        bpy.ops.object.select_all(action='DESELECT')
        for o in col.objects:o.select_set(True)
        bpy.context.view_layer.objects.active=root;path=OUT/e['file']
        bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_extras=True,export_animations=bool(e['animations']),export_animation_mode='SCENE',export_frame_range=True,export_force_sampling=False,export_anim_slide_to_zero=True,export_cameras=False,export_lights=False)
        data=path.read_bytes();n=struct.unpack_from('<I',data,12)[0];doc=json.loads(data[20:20+n]);blob=data[28+n:]
        for node in doc.get('nodes',[]):
            if node.get('extras',{}).get('asset_id'):node['name']='ROOT'
            if node.get('name','').startswith(('CATCHER_','CAPTURE_JAW_','CARGO_CAPSULE','CARGO_CAPTURE_SOCKET','REUSABLE_BOOSTER','LANDING_LEG_','FLAT_LANDING_FOOT_','SOCKET_','FALLEN_','J1_','J2_','J3_','J4_','J5_','J6_','GANTRY_TRAVEL','CARRIAGE_TRAVEL','TOOL_LIFT','EXTRUSION_TIP','COLLAPSED_BRIDGE')):node['name']=node['name'].split('.')[0]
        if doc.get('animations'):
            merged=dict(name=e['animations'][0],channels=[],samplers=[])
            for a in doc['animations']:
                offset=len(merged['samplers']);merged['samplers']+=a['samplers']
                for c in a['channels']:c['sampler']+=offset;merged['channels'].append(c)
            doc['animations']=[merged]
        payload=json.dumps(doc,separators=(',',':')).encode();payload+=b' '*((-len(payload))%4)
        path.write_bytes(struct.pack('<III',0x46546c67,2,28+len(payload)+len(blob))+struct.pack('<II',len(payload),0x4e4f534a)+payload+struct.pack('<II',len(blob),0x004e4942)+blob)
        e['bytes']=path.stat().st_size;manifest['assets'].append(e)
    for i,(root,col,e) in enumerate(roots):root.location.x=i*(46 if kit=='launchpad' else 58)
    bpy.ops.object.select_all(action='DESELECT');scene.name+=' / GAME 40K'
    bpy.ops.wm.save_as_mainfile(filepath=str(PROJECT/'source/blender'/source.replace('.blend','-game.blend')))
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('GAME_LODS_COMPLETE',flush=True)
