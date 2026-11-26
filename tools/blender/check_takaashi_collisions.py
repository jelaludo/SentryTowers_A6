"""Self-collision check for TAKAASHI skinned tiers (BVH triangle overlap per sampled frame).

Imports a plain animated GLB, poses every clip at --hz, splits the skinned mesh by joint (rigid skin)
and tests: different limbs against each other, limbs (beyond COXA and BASIS) against the body, and
segments of one limb against each other. Neighbouring segments are tested with the triangles near
their shared joint left out, so drums, forks and sheaves (which nest by design) do not count.
Run: blender -b --factory-startup --python-exit-code 1 --python tools/blender/check_takaashi_collisions.py -- \
     --glb assets/takaashi02/takaashi02_d0_lod1.glb [--hz 30] [--out report.json]
"""
import bpy, sys, json, math, itertools
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
A = sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
def opt(k, d=None): return A[A.index(k)+1] if k in A else d
P = Path(__file__).resolve().parents[2]
glb = Path(opt('--glb')); glb = glb if glb.is_absolute() else P/glb
HZ = float(opt('--hz', '30')); EXCL = float(opt('--joint-radius', '0.075'))
bpy.ops.wm.read_factory_settings(use_empty=True); s = bpy.context.scene
bpy.ops.import_scene.gltf(filepath=str(glb))
arm = next(o for o in s.objects if o.type == 'ARMATURE'); skin = next(o for o in s.objects if o.type == 'MESH')
names = [g.name for g in skin.vertex_groups]
vbone = []
for v in skin.data.vertices:
    g = max(v.groups, key=lambda x: x.weight); vbone.append(names[g.group])
SEGS = ['COXA', 'BASIS', 'MERUS', 'CARPUS', 'PROPODUS', 'DACTYL']
def limb(b):
    for seg in SEGS:
        if b.startswith(seg+'_'): return b[len(seg)+1:], SEGS.index(seg)
    return 'BODY', -1
tris_by_bone = {}
for p in skin.data.polygons:
    b = vbone[p.vertices[0]]; tris_by_bone.setdefault(b, []).append(tuple(p.vertices))
bones = sorted(tris_by_bone)
parent = {b.name: (b.parent.name if b.parent else None) for b in arm.data.bones}
pairs = []
for a, b in itertools.combinations(bones, 2):
    (la, ia), (lb, ib) = limb(a), limb(b)
    if la == 'BODY' and lb == 'BODY': continue
    if la != lb:
        if 'BODY' in (la, lb) and max(ia, ib) < 2: continue       # coxa and basis sit in the body sockets
        if 'BODY' not in (la, lb) or True: pairs.append((a, b, None))
    else:
        joint = b if parent.get(b) == a else (a if parent.get(a) == b else None)
        pairs.append((a, b, joint))
fps = s.render.fps; report = {'file': glb.name, 'hz': HZ, 'joint_exclusion_radius_m': EXCL, 'clips': {}, 'total_overlap_frames': 0}
dg = bpy.context.evaluated_depsgraph_get()
for act in sorted(bpy.data.actions, key=lambda a: a.name):
    arm.animation_data_create(); arm.animation_data.action = act
    try:
        if act.slots: arm.animation_data.action_slot = act.slots[0]
    except Exception: pass
    f0, f1 = act.frame_range; dur = (f1-f0)/fps; n = max(1, int(round(dur*HZ))); hits = {}; frames_hit = 0
    for i in range(n+1):
        t = i/HZ; s.frame_set(int(f0+t*fps), subframe=(t*fps) % 1); dg = bpy.context.evaluated_depsgraph_get()
        ev = skin.evaluated_get(dg); me = ev.to_mesh(); M = skin.matrix_world; co = [M@v.co for v in me.vertices]
        heads = {pb.name: arm.matrix_world@pb.head for pb in arm.pose.bones}
        trees = {}; boxes = {}
        def tree(b, excl=None):
            key = (b, excl)
            if key in trees: return trees[key]
            tl = tris_by_bone[b]
            if excl is not None:
                h = heads[excl]; tl = [t for t in tl if min((co[k]-h).length for k in t) > EXCL]
            if not tl: trees[key] = None; return None
            used = sorted({k for t in tl for k in t}); remap = {k: j for j, k in enumerate(used)}
            trees[key] = BVHTree.FromPolygons([co[k] for k in used], [tuple(remap[k] for k in t) for t in tl]); return trees[key]
        def box(b):
            if b not in boxes:
                pts = [co[k] for t in tris_by_bone[b] for k in t]
                boxes[b] = (Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts))), Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts))))
            return boxes[b]
        hit = False
        for a, b, j in pairs:
            (amin, amax), (bmin, bmax) = box(a), box(b)
            if any(amax[k] < bmin[k] or bmax[k] < amin[k] for k in range(3)): continue
            ta, tb = tree(a, j), tree(b, j)
            if ta is None or tb is None: continue
            ov = ta.overlap(tb)
            if ov:
                key = a+'|'+b; h = hits.setdefault(key, {'frames': 0, 'max_pairs': 0, 'first_s': round(t, 3)}); h['frames'] += 1; h['max_pairs'] = max(h['max_pairs'], len(ov)); hit = True
        frames_hit += hit; ev.to_mesh_clear()
    name = act.name.split('|')[-1]
    report['clips'][name] = {'samples': n+1, 'frames_with_overlap': frames_hit, 'pairs': hits}; report['total_overlap_frames'] += frames_hit
    print('CLIP', name, n+1, 'samples', frames_hit, 'frames with overlap', json.dumps(hits)[:600], flush=True)
if opt('--out'): Path(opt('--out')).write_text(json.dumps(report, indent=2)+'\n')
print('COLLISION_TOTAL', report['total_overlap_frames'])
