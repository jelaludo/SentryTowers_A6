"""Export editable-piece callouts before material batching removes mesh names."""
import json,re
from collections import defaultdict
from mathutils import Vector

def export_callouts(collection, path):
    records=[];counts=defaultdict(int)
    for obj in collection.objects:
        if obj.type!='MESH' or obj.name.startswith('COLLIDER'):continue
        anchor=obj.parent
        while anchor and not re.fullmatch(r'[A-Z][A-Z0-9_]*',anchor.name.split('.')[0]):anchor=anchor.parent
        if not anchor:continue
        node=anchor.name.split('.')[0]
        if node.startswith('AMMO_ROUND_'):continue  # Each three-light port has its own callout.
        name=re.sub(r'\.\d+$','',obj.name)
        key=node+'/'+name;counts[key]+=1
        ident=key+'/'+str(counts[key])
        center=sum((Vector(v) for v in obj.bound_box),Vector())/8
        p=anchor.matrix_world.inverted() @ obj.matrix_world @ center
        group=('Left nacelle' if 'NACELLE_L' in node or 'LIFT_EMITTER_L' in node else
               'Right nacelle' if 'NACELLE_R' in node or 'LIFT_EMITTER_R' in node else
               'Left plasma' if node=='PLASMA_YAW_L' else 'Right plasma' if node=='PLASMA_YAW_R' else
               'Cannon' if node in ('GUN_PITCH','GUN_RECOIL') else
               'Turret' if node in ('TURRET_YAW','FALLEN_TURRET') else
               'Rear magazine' if node.startswith('AMMO_') or 'Magazine' in name or 'magazine' in name else 'Hull')
        records.append(dict(id=ident,name=name,group=group,anchor=node,position=[round(p.x,5),round(p.z,5),round(-p.y,5)],source=obj.name))
    path.write_text(json.dumps(records,indent=2)+'\n')

if __name__=='__main__':
    import bpy
    from pathlib import Path
    out=Path(__file__).resolve().parents[2]/'assets/hover-tank'
    for col in bpy.data.collections:
        roots=[o for o in col.objects if o.get('asset_id','').startswith('mork_hover_tank_d')]
        if roots:
            bpy.context.view_layer.update()
            export_callouts(col,out/(roots[0]['asset_id']+'-callouts.json'))
