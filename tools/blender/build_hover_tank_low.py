"""Produce a lower-poly MÖRK edition from the editable source, retaining control hierarchy."""
import bpy,json,math,struct
from mathutils import Matrix, Vector, Quaternion
from pathlib import Path
P=Path(__file__).resolve().parents[2];OUT=P/'assets/hover-tank'
if not bpy.app.background:raise RuntimeError('Build in background mode.')
bpy.ops.wm.open_mainfile(filepath=str(P/'source/blender/a6-hover-tank.blend'))
manifest=json.loads((OUT/'manifest.json').read_text());entries=[]
for e in manifest['assets']:
    col=next(c for c in bpy.data.collections if any(o.get('asset_id')==e['id'] for o in c.objects));root=next(o for o in col.objects if o.get('asset_id')==e['id']);root.location=(0,0,0)
    # Restore the shipped neutral control transforms: the editable file may contain a posed preview.
    data=(OUT/e['file']).read_bytes();doc=json.loads(data[20:20+struct.unpack_from('<I',data,12)[0]])
    controls={n['name']:n for n in doc['nodes'] if 'name' in n and 'mesh' not in n}
    conversion=Matrix.Rotation(math.pi/2,4,'X')
    for o in col.objects:
        n=controls.get(o.name.split('.')[0])
        if n and o.type=='EMPTY':
            q=n.get('rotation',[0,0,0,1]);m=Matrix.LocRotScale(Vector(n.get('translation',[0,0,0])),Quaternion((q[3],q[0],q[1],q[2])),Vector(n.get('scale',[1,1,1])))
            o.matrix_parent_inverse=Matrix.Identity(4);o.matrix_basis=conversion@m@conversion.inverted()
    for o in list(col.objects):
        if o.type=='MESH':
            o.data=o.data.copy();o.data.calc_loop_triangles();count=len(o.data.loop_triangles)
            if count>24:
                bpy.context.view_layer.objects.active=o
                mod=o.modifiers.new('Game silhouette reduction','DECIMATE');mod.ratio=max(.28,min(1,16/count));mod.use_collapse_triangulate=True
                bpy.ops.object.modifier_apply(modifier=mod.name)
        if o.animation_data:
            for track in o.animation_data.nla_tracks:track.mute=False
    bpy.context.scene.frame_set(0);bpy.ops.object.select_all(action='DESELECT')
    for o in col.objects:o.select_set(True)
    bpy.context.view_layer.objects.active=root
    entry=dict(e);entry.update(id=e['id'].replace('_d','_low_d'),file=e['file'].replace('_d','_low_d'),detail='low',source_triangles=e['triangles'],source_file=e['file']);entry['description']='Low-poly edition. '+e['description'];path=OUT/entry['file']
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_extras=True,export_animations=bool(e['animations']),export_animation_mode='NLA_TRACKS',export_force_sampling=True,export_frame_range=False,export_cameras=False,export_lights=False)
    data=path.read_bytes();length=struct.unpack_from('<I',data,12)[0];doc=json.loads(data[20:20+length])
    for node in doc.get('nodes',[]):
        if node.get('extras',{}).get('asset_id'):node['name']='ROOT';node['extras']['asset_id']=entry['id'];node['extras']['detail']='low'
        if node.get('name','').startswith(('HOVER_RIG','HULL_SUSPENSION','NACELLE_','LIFT_EMITTER_','AMMO_PORT_','AMMO_ROUND_','TURRET_YAW','GUN_PITCH','GUN_RECOIL','MUZZLE_','PLASMA_','FALLEN_','SOCKET_')):node['name']=node['name'].split('.')[0]
    payload=json.dumps(doc,separators=(',',':')).encode();payload+=b' '*((-len(payload))%4);chunks=data[20+length:];path.write_bytes(struct.pack('<III',0x46546c67,2,20+len(payload)+len(chunks))+struct.pack('<II',len(payload),0x4e4f534a)+payload+chunks)
    (OUT/entry['file'].replace('.glb','-callouts.json')).write_text((OUT/e['file'].replace('.glb','-callouts.json')).read_text())
    entries.append(entry)
    for o in col.objects:
        if o.animation_data:
            for track in o.animation_data.nla_tracks:track.mute=track.name!='Hover_Idle'
        if o.name.startswith('LIFT_EMITTER_'):o.scale=(1,1,1) if e['functional'] else (.001,.001,.001)
    root.location.x=e['damage_level']*18
    print('REDUCED',entry['id'],flush=True)
(OUT/'manifest-low.json').write_text(json.dumps(dict(version=1,units='meters',up='+Y',forward='+Z',assets=entries),indent=2)+'\n')
bpy.context.scene.name='MÖRK / Low-poly game edition';bpy.context.scene.frame_set(0)
bpy.ops.wm.save_as_mainfile(filepath=str(P/'source/blender/a6-hover-tank-low.blend'))
