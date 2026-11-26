"""TAKAASHI-01 / mechanical Japanese spider crab.

Original procedural openwork geometry, rigid skin, nine authored clips and three
detail tiers. Joint table, IK and motion live in takaashi_motion.py.
Run: blender -b --factory-startup --python-exit-code 1 --python tools/blender/build_takaashi.py
Options after "--": --lods 0,1,2   --no-anim   --no-save
The user-supplied concept image stays outside the repository (hash in the manifest).
"""
import bpy, bmesh, math, json, struct, sys, random, time
from pathlib import Path
from mathutils import Vector, Matrix
sys.path.insert(0, str(Path(__file__).resolve().parent))
import takaashi_motion as M
from quadruped_geometry import Build

P = Path(__file__).resolve().parents[2]
OUT = P/'assets/takaashi01'; OUT.mkdir(parents=True, exist_ok=True)
SOURCE = P/'source/blender/a6-takaashi01.blend'
ARGS = sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
LODS = [int(x) for x in ARGS[ARGS.index('--lods')+1].split(',')] if '--lods' in ARGS else [0, 1, 2]
ANIMATE = '--no-anim' not in ARGS
T0 = time.time()
def log(*a): print('[%6.1fs]' % (time.time()-T0), *a, flush=True)

NAMES = ['Gunmetal_frame', 'Ivory_cable', 'Brass_fasteners', 'Carbon_core', 'Horn_spines', 'Blue_optics']
COLORS = [(.17, .175, .18), (.58, .55, .48), (.46, .31, .15), (.012, .014, .017), (.48, .40, .28), (.05, .25, 1.0)]
METAL = [.82, 0., .90, .35, .12, .10]
ROUGH = [.34, .64, .30, .50, .40, .15]
# Distance palette: legs read as silver-and-rope at range, so the frame is lighter.
DIST = [(.42, .42, .42), (.62, .58, .50), (.48, .33, .16), (.05, .055, .06), (.50, .42, .30), (.10, .35, 1.0)]
FRAME, CABLE, BRASS, CORE, HORN, OPTIC = range(6)

def principled(m):
    return next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')

def material(i, distance=False):
    m = bpy.data.materials.new('TK01_'+('Distance_palette' if distance else NAMES[i]))
    s = principled(m); c = DIST[i] if distance else COLORS[i]   # Blender 5.x materials always use nodes
    s.inputs['Base Color'].default_value = (*c, 1); m.diffuse_color = (*c, 1)
    s.inputs['Metallic'].default_value = .55 if distance else METAL[i]
    s.inputs['Roughness'].default_value = .40 if distance else ROUGH[i]
    if i == OPTIC and not distance:
        s.inputs['Emission Color'].default_value = (*c, 1); s.inputs['Emission Strength'].default_value = 3.0
    if distance:
        n = m.node_tree.nodes.new('ShaderNodeVertexColor'); n.layer_name = 'Palette'
        m.node_tree.links.new(n.outputs['Color'], s.inputs['Base Color'])
    return m

def V3(t): return Vector((float(t[0]), float(t[1]), float(t[2])))

class Crab(Build):
    def __init__(self, lod):
        super().__init__(lod); self.sides = [16, 8, 5][lod]
    # ----- frame helpers: u along the segment, v hinge axis, w dorsal side
    def at(self, bone, u, v=0., w=0.):
        F = M.FRAME[bone]; h = M.H[bone]
        return Vector(tuple(h[i]+F[i][0]*u+F[i][1]*v+F[i][2]*w for i in range(3)))
    def axis(self, bone, j):
        F = M.FRAME[bone]; return Vector((F[0][j], F[1][j], F[2][j]))
    # ----- primitives
    def cyl(self, a, b, r, m, bone, r1=None, sides=None, smooth=True, caps=True):
        a, b = Vector(a), Vector(b); n = sides or self.sides; r1 = r if r1 is None else r1
        q = (b-a).to_track_quat('Z', 'Y')
        ring = lambda p, rad: [p+q@Vector((rad*math.cos(j*math.tau/n), rad*math.sin(j*math.tau/n), 0)) for j in range(n)]
        if r1 < 1e-5:
            self.add(ring(a, r)+[b], [(j, (j+1) % n, n) for j in range(n)], m, bone, smooth)
        else:
            self.add(ring(a, r)+ring(b, r1), [(j, (j+1) % n, (j+1) % n+n, j+n) for j in range(n)], m, bone, smooth)
            if caps: self.add(ring(b, r1), [tuple(range(n))], m, bone)
        if caps and r > 1e-5: self.add(ring(a, r), [tuple(range(n-1, -1, -1))], m, bone)
    def disc(self, c, ax, r, t, m, bone, sides=None):
        c, ax = Vector(c), Vector(ax).normalized(); self.cyl(c-ax*t/2, c+ax*t/2, r, m, bone, sides=sides, smooth=False)
    def sweep(self, pts, radii, m, bone, sides=None, up=None, squash=1., smooth=True):
        """Tube along a polyline with parallel-transport frames; radius 0 at the end gives a point."""
        n = sides or self.sides; pts = [Vector(p) for p in pts]; T = []
        for i in range(len(pts)):
            a = pts[max(0, i-1)]; b = pts[min(len(pts)-1, i+1)]; T.append((b-a).normalized())
        N = (Vector(up)-T[0]*Vector(up).dot(T[0])).normalized() if up else T[0].orthogonal().normalized()
        verts = []; faces = []; rings = []
        for i, p in enumerate(pts):
            if i: N = T[i-1].rotation_difference(T[i])@N; N = (N-T[i]*N.dot(T[i])).normalized()
            Bn = T[i].cross(N)
            if radii[i] < 1e-5:
                rings.append([len(verts)]); verts.append(p); continue
            rings.append(list(range(len(verts), len(verts)+n)))
            for j in range(n):
                a = j*math.tau/n; verts.append(p+radii[i]*(math.cos(a)*N*squash+math.sin(a)*Bn))
        for A, B in zip(rings, rings[1:]):
            if len(B) == 1: faces += [(A[j], A[(j+1) % n], B[0]) for j in range(n)]
            elif len(A) == 1: faces += [(A[0], B[(j+1) % n], B[j]) for j in range(n)]
            else: faces += [(A[j], A[(j+1) % n], B[(j+1) % n], B[j]) for j in range(n)]
        self.add(verts, faces, m, bone, smooth)
        if len(rings[0]) > 1: self.add([verts[k] for k in rings[0]], [tuple(range(n-1, -1, -1))], m, bone)
        if len(rings[-1]) > 1: self.add([verts[k] for k in rings[-1]], [tuple(range(n))], m, bone)
    def quad_box(self, pts, m, bone):
        """8 corner points ordered (u0/u1, v-/v+, w-/w+)."""
        self.add(pts, [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)], m, bone)
    def fbox(self, bone, u0, u1, hv, hw, m, w0=0.):
        self.quad_box([self.at(bone, u, v, w0+w) for u in (u0, u1) for v in (-hv, hv) for w in (-hw, hw)], m, bone)
    # ----- openwork pieces
    def plate(self, bone, u0, u1, hfun, v0, t, ncell, fu, fw, m=FRAME):
        """Closed side plate with rounded windows, in the bone's (u, w) plane at lateral offset v0."""
        N = 16 if self.lod == 0 else 8; q = N//4; sg = 1 if v0 > 0 else -1
        verts = []; idx = {}; faces = []
        def V(u, w, side):
            key = (round(u, 7), round(w, 7), side)
            if key not in idx:
                idx[key] = len(verts); verts.append(self.at(bone, u, v0+(sg if side == 0 else -sg)*t/2, w))
            return idx[key]
        def quad(a, b, c, d, ns):   # (a,b,c,d) counter-clockwise in (u, w) faces -e2
            faces.append((d, c, b, a) if ns > 0 else (a, b, c, d))
        for c in range(ncell):
            ua = u0+(u1-u0)*c/ncell; ub = u0+(u1-u0)*(c+1)/ncell; ha = hfun(ua)/2; hb = hfun(ub)/2
            ring = []
            for k in range(q): f = k/q; ring.append((ua+(ub-ua)*f, -(ha+(hb-ha)*f)))
            for k in range(q): f = k/q; ring.append((ub, -hb+2*hb*f))
            for k in range(q): f = k/q; ring.append((ub+(ua-ub)*f, hb+(ha-hb)*f))
            for k in range(q): f = k/q; ring.append((ua, ha-2*ha*f))
            uc = (ua+ub)/2; hu = (ub-ua)/2; hc = hfun(uc)/2; A = max(.003, hu-fu); Bw = max(.003, hc-fw)
            hole = []
            for (u, w) in ring:
                th = math.atan2(w/hc, (u-uc)/hu); cx, sx = math.cos(th), math.sin(th)
                hole.append((uc+A*math.copysign(abs(cx)**.5, cx), Bw*math.copysign(abs(sx)**.5, sx)))
            hv = {}
            for side, ns in ((0, sg), (1, -sg)):
                hv[side] = list(range(len(verts), len(verts)+N))
                verts += [self.at(bone, u, v0+(sg if side == 0 else -sg)*t/2, w) for u, w in hole]
                for i in range(N):
                    j = (i+1) % N; quad(V(*ring[i], side), V(*ring[j], side), hv[side][j], hv[side][i], ns)
            for i in range(N):
                j = (i+1) % N; faces.append((hv[0][i], hv[0][j], hv[1][j], hv[1][i]))
            edges = list(range(0, q))+list(range(2*q, 3*q))
            if c == ncell-1: edges += list(range(q, 2*q))
            if c == 0: edges += list(range(3*q, N))
            for i in edges:
                j = (i+1) % N; faces.append((V(*ring[i], 0), V(*ring[j], 0), V(*ring[j], 1), V(*ring[i], 1)))
        self.add(verts, faces, m, bone)
    def strap(self, bone, u0, u1, hfun, hv, sw, th, m=FRAME):
        pts = []
        for u in (u0, u1):
            h = hfun(u)/2
            for v in (-hv, hv):
                for w in (sw*(h-.002), sw*(h+th)):
                    pts.append(self.at(bone, u, v, w))
        self.quad_box(pts, m, bone)
    def rail(self, bone, u0, u1, hfun, vc, sw, wv, dw, m=FRAME):
        pts = []
        for u in (u0, u1):
            h = hfun(u)/2
            for v in (vc-wv/2, vc+wv/2):
                for w in (sw*(h-dw), sw*(h+.002)):
                    pts.append(self.at(bone, u, v, w))
        self.quad_box(pts, m, bone)
    def rope(self, a, b, R, bone, m=CABLE):
        if self.lod == 2: return
        a, b = Vector(a), Vector(b); d = b-a; L = d.length; z = d/L; n1 = z.orthogonal().normalized(); n2 = z.cross(n1)
        pitch = R*11.
        if self.lod == 1:
            n = 6; rings = max(3, int(L/.07)+1); verts = []
            for i in range(rings):
                s = i/(rings-1); th = math.tau*s*L/pitch; c = a+d*s
                verts += [c+R*.92*(math.cos(th+math.tau*k/n)*n1+math.sin(th+math.tau*k/n)*n2) for k in range(n)]
            faces = [(i*n+k, i*n+(k+1) % n, (i+1)*n+(k+1) % n, (i+1)*n+k) for i in range(rings-1) for k in range(n)]
            faces += [tuple(range(n-1, -1, -1)), tuple(range((rings-1)*n, rings*n))]
            self.add(verts, faces, m, bone, False); return
        rs = R*.50; ro = R*.56; rings = max(5, int(L/(pitch/14))+1)
        for k in range(3):
            pts = []
            for i in range(rings):
                s = i/(rings-1); th = math.tau*s*L/pitch+math.tau*k/3
                pts.append(a+d*s+ro*(math.cos(th)*n1+math.sin(th)*n2))
            self.sweep(pts, [rs]*rings, m, bone, sides=8)
    def rivets(self, bone, u0, u1, hfun, hv, fw, step=.042):
        if self.lod > 0: return
        e2 = self.axis(bone, 1); n = max(2, int((u1-u0)/step))
        for i in range(n+1):
            u = u0+(u1-u0)*(i+.5)/(n+1)
            for sg in (-1, 1):
                for sw in (-1, 1):
                    c = self.at(bone, u, sg*hv, sw*(hfun(u)/2-fw*.5)); self.cyl(c, c+e2*sg*.003, .0042, BRASS, bone, sides=6, smooth=False)
    def hub(self, c, ax, r, bone, led=False):
        """Bolted pulley hub on the outside of a joint lobe."""
        ax = Vector(ax).normalized(); c = Vector(c)
        if self.lod == 2: return
        self.cyl(c, c+ax*.007, r*.36, BRASS, bone, sides=8 if self.lod == 0 else 6, smooth=False)
        if self.lod == 0:
            self.cyl(c+ax*.007, c+ax*.011, r*.16, CORE if not led else OPTIC, bone, sides=6, smooth=False)
            o1 = ax.orthogonal().normalized(); o2 = ax.cross(o1)
            for k in range(6):
                p = c+(math.cos(k*math.tau/6)*o1+math.sin(k*math.tau/6)*o2)*r*.62
                self.cyl(p, p+ax*.004, .0045, BRASS, bone, sides=6, smooth=False)
        elif led:
            self.cyl(c+ax*.007, c+ax*.010, r*.16, OPTIC, bone, sides=6, smooth=False)
    def segment(self, bone, L, h0, h1, W, cells, rope=True, lobes=1., led=False, drum=True, lobe_at=None):
        """Openwork limb segment from its joint head (u=0) to the next joint (u=L)."""
        hf = lambda u: h0+(h1-h0)*u/L; e2 = self.axis(bone, 1)
        if self.lod == 2:
            self.cyl(self.at(bone, 0), self.at(bone, L), .5*h0*.95, FRAME, bone, r1=.5*h1*.95, sides=5, smooth=False); return
        t = .005 if self.lod == 0 else .006; rd = .46*h0
        if drum:
            c = self.at(bone, 0); self.cyl(c-e2*(W/2-.004), c+e2*(W/2-.004), rd, CORE, bone, sides=[16, 10][self.lod], smooth=True)
        u0 = rd*.85; n = cells[self.lod]
        for sg in (-1, 1): self.plate(bone, u0, L, hf, sg*W/2, t, n, .016 if self.lod == 0 else .02, .014 if self.lod == 0 else .018)
        # Edge rails plus cross rungs keep the dorsal and ventral faces open like the sides.
        for sw in (-1, 1):
            for sg in (-1, 1): self.rail(bone, u0, L, hf, sg*W/2, sw, t+.005, .010)
            if self.lod == 0:
                for c in range(n+1):
                    u = min(L-.008, max(u0+.008, u0+(L-u0)*c/n)); h = hf(u)/2
                    self.quad_box([self.at(bone, uu, v, sw*w) for uu in (u-.005, u+.005) for v in (-W/2, W/2) for w in (h-.007, h+.001)], FRAME, bone)
        self.rivets(bone, u0, L, hf, W/2+t, .014)
        if rope: self.rope(self.at(bone, u0*.6), self.at(bone, L-.3*h1), .30*min(h0, W), bone)
        if lobes:
            uu, ww = lobe_at or (L, 0.); r = lobes*.62*hf(uu)
            for sg in (-1, 1):
                c = self.at(bone, uu, sg*(W/2+t+.004), ww); self.disc(c, e2, r, .008, FRAME, bone, sides=[18, 10][self.lod])
                self.hub(c+e2*sg*.004, e2*sg, r, bone, led)
                if self.lod == 0 and lobes > 1:
                    self.add_groove(c+e2*sg*.004, e2*sg, r*.82, bone)
    def add_groove(self, c, ax, r, bone):
        self.ring(c, r, .0028, ax, BRASS, bone)
    def tooth(self, bone, u, w, height, base, thick, dirw, rake=.35):
        a0 = (u-base/2, w); a1 = (u+base/2, w); ap = (u+rake*base, w+dirw*height)
        pts = [self.at(bone, uu, vv, ww) for vv in (-thick/2, thick/2) for (uu, ww) in (a0, a1, ap)]
        self.add(pts, [(0, 1, 2), (3, 5, 4), (0, 3, 4, 1), (1, 4, 5, 2), (2, 5, 3, 0)], HORN, bone)

# ------------------------------------------------------------------ carapace
CENTER = Vector((0., .02, .61))
def cara(p, scale=1.):
    x, y, z = p
    def g(cx, cy, cz, s): return math.exp(-((x-cx)**2+(y-cy)**2+(z-cz)**2)/s)
    r = 1+.08*g(.55, .15, .55, .10)+.08*g(-.55, .15, .55, .10)+.06*g(0, -.45, .75, .08)+.05*g(0, .55, .60, .10)
    X = x*r*.330*(.80+.10*(y+1)); Y = y*r*.370; Z = z*r*(.270 if z > 0 else .14)
    return CENTER+Vector((X, Y, Z))*scale
ZCUT = -.30

def lattice(g):
    lod = g.lod; rnd = random.Random(41+lod)
    bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=3 if lod == 0 else 2, radius=1.)
    bm.verts.ensure_lookup_table(); bm.faces.ensure_lookup_table()
    amp = .22*(.16 if lod == 0 else .22); cent = {}
    for f in bm.faces:
        c = f.calc_center_median().normalized(); j = Vector([rnd.uniform(-1, 1) for _ in range(3)])*amp; j -= c*j.dot(c)
        cent[f.index] = (c+j).normalized()
    cells = []
    for v in bm.verts:
        if v.co.z < ZCUT: continue
        n = v.co.normalized(); fs = list(v.link_faces)
        ref = (cent[fs[0].index]-n*cent[fs[0].index].dot(n)).normalized(); ref2 = n.cross(ref)
        fs.sort(key=lambda f: math.atan2(cent[f.index].dot(ref2), cent[f.index].dot(ref)))
        cells.append([f.index for f in fs])
    bm.free()
    bm = bmesh.new(); vmap = {}
    def Vd(fi):
        if fi not in vmap: vmap[fi] = bm.verts.new(cara(cent[fi]))
        return vmap[fi]
    for cell in cells:
        try: bm.faces.new([Vd(fi) for fi in cell])
        except ValueError: pass
    bm.faces.ensure_lookup_table(); bm.faces.index_update(); bm.edges.ensure_lookup_table()
    for chance in ((.48, .20) if lod == 0 else (.12,)):
        # Merge random neighbouring cells so openings vary like cast bone, not a honeycomb.
        bm.faces.index_update(); bm.edges.ensure_lookup_table()
        cand = [e for e in bm.edges if len(e.link_faces) == 2]; rnd.shuffle(cand); used = set(); kill = []
        for e in cand:
            a, b = e.link_faces
            if a.index in used or b.index in used: continue
            if rnd.random() < chance: used |= {a.index, b.index}; kill.append(e)
        bmesh.ops.dissolve_edges(bm, edges=kill, use_verts=True)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    nodes = [(v.co.copy(), v.normal.copy()) for v in bm.verts]
    bmesh.ops.wireframe(bm, faces=bm.faces[:], thickness=.017 if lod == 0 else .021, offset=0., use_replace=True,
                        use_boundary=True, use_even_offset=True, use_crease=False, crease_weight=0., use_relative_offset=False, material_offset=0)
    bm.verts.ensure_lookup_table(); bm.verts.index_update()
    g.add([v.co.copy() for v in bm.verts], [tuple(v.index for v in f.verts) for f in bm.faces], FRAME, 'BODY')
    bm.free()
    if lod == 0:
        for co, nrm in nodes:
            if rnd.random() < .30 and co.z > .60: g.cyl(co+nrm*.004, co+nrm*.0075, .0048, BRASS, 'BODY', sides=6, smooth=False)
    return rnd

def ellipsoid_mesh(g, f, rings, segs, m, bone, smooth=True, zmin=-1.):
    verts = []; faces = []
    lats = [-math.pi/2+math.pi*j/rings for j in range(rings+1)]
    lats = [l for l in lats if math.sin(l) >= zmin-1e-9] if zmin > -1 else lats
    for l in lats[1:-1] if zmin <= -1 else lats[:-1]:
        for i in range(segs):
            a = math.tau*i/segs; verts.append(f((math.cos(l)*math.cos(a), math.cos(l)*math.sin(a), math.sin(l))))
    k = len(verts)//segs
    for j in range(k-1):
        for i in range(segs): faces.append((j*segs+i, j*segs+(i+1) % segs, (j+1)*segs+(i+1) % segs, (j+1)*segs+i))
    top = len(verts); verts.append(f((0, 0, 1))); faces += [((k-1)*segs+i, (k-1)*segs+(i+1) % segs, top) for i in range(segs)]
    if zmin <= -1:
        bot = len(verts); verts.append(f((0, 0, -1))); faces += [(bot, (i+1) % segs, i) for i in range(segs)]
    else:
        faces.append(tuple(range(segs-1, -1, -1)))
    g.add(verts, faces, m, bone, smooth)

def body(g):
    lod = g.lod; rnd = random.Random(7)
    if lod < 2:
        lattice(g)
        ellipsoid_mesh(g, lambda p: cara(p, .86), [24, 12][lod], [36, 16][lod], CORE, 'BODY')
        # Rim strap along the lattice margin.
        n = [72, 28][lod]; ring = []
        for i in range(n+1):
            a = math.tau*i/n; s = math.sqrt(1-ZCUT*ZCUT); ring.append(cara((s*math.cos(a), s*math.sin(a), ZCUT)))
        g.sweep(ring, [[.012, .015][lod]]*(n+1), FRAME, 'BODY', sides=[8, 5][lod])
    else:
        ellipsoid_mesh(g, lambda p: cara(p, .97), 7, 12, CORE, 'BODY', smooth=False)
    # Sternum and ventral frame where the legs attach.
    n = [32, 14, 8][lod]; e = [Vector((.255*math.cos(math.tau*i/n), .03+.30*math.sin(math.tau*i/n), 0)) for i in range(n)]
    top = [p+Vector((0, 0, .545)) for p in e]; bot = [p*.92+Vector((0, .002, .465)) for p in e]
    g.add(top+bot, [tuple(range(n)), tuple(range(2*n-1, n-1, -1))]+[(i, i+n, (i+1) % n+n, (i+1) % n) for i in range(n)], FRAME, 'BODY')
    if lod == 0:
        for k in range(5):
            y = -.18+.09*k; g.box((0, y, .462), (.34-.06*abs(k-2), .018, .012), CORE, 'BODY', .003)
    # Internal cable bundles from the body core to each leg base.
    if lod < 2:
        for id in M.LEGS+M.CHELAE:
            pv = Vector((M.LEG[id] if id in M.LEG else M.CHELA[id])['pivot']); s = 1 if pv.x > 0 else -1
            g.rope(Vector((s*.06, pv.y*.5, .575)), pv+Vector((0, 0, .03)), .016, 'BODY')
    # Dorsal and marginal spines.
    count = [30, 14, 7][lod]; pts = []; tries = 0
    while len(pts) < count and tries < 4000:
        tries += 1; v = Vector((rnd.gauss(0, 1), rnd.gauss(0, 1), abs(rnd.gauss(0, 1)))).normalized()
        if v.z < .25 or v.y > .7: continue
        if any((v-q).length < (.30 if lod == 0 else .45) for q in pts): continue
        pts.append(v)
    for v in pts:
        base = cara(v); nrm = (cara(v*1.02)-cara(v*.98)).normalized(); nrm = (nrm+Vector((0, .45, .25))).normalized()
        L = .035+.045*max(0., -v.y*.5+v.z*.6)+.012*rnd.random(); r = .010+.004*rnd.random()
        g.cyl(base-nrm*.01, base+nrm*L, r, HORN, 'BODY', r1=0., sides=[8, 5, 4][lod], smooth=lod < 2)
    # Pre-orbital spines and the twin rostral horns.
    for s in (-1, 1):
        a = Vector((s*.118, -.285, .748)); g.sweep([a, a+Vector((s*.030, -.045, .030)), a+Vector((s*.050, -.085, .075))], [.010, .006, 0.], HORN, 'BODY', sides=[8, 5, 4][lod])
        a = Vector((s*.022, -.335, .735))
        g.sweep([a, a+Vector((s*.010, -.060, .020)), a+Vector((s*.030, -.110, .065)), a+Vector((s*.042, -.135, .115))], [.013, .010, .006, 0.], HORN, 'BODY', sides=[8, 5, 4][lod])
    # Eyes on short stalks; orbit sockets on the body.
    for side, s in (('L', 1), ('R', -1)):
        h = V3(M.H['EYESTALK_'+side]); bone = 'EYESTALK_'+side
        g.disc(h+Vector((0, .010, 0)), (0, 1, 0), .030, .010, CORE, 'BODY', sides=[16, 8, 5][lod])
        tip = h+Vector((s*.004, -.034, .004))
        if lod < 2:
            g.cyl(h, tip, .011, FRAME, bone, r1=.0095, sides=[10, 6][lod])
            if lod == 0: g.ring(tip, .0215, .0035, (0, -1, 0), BRASS, bone)
            ellipsoid_mesh(g, lambda p, c=tip: c+Vector(p)*.021, [10, 6][lod], [16, 8][lod], OPTIC, bone)
        else:
            g.box(tip, (.04, .03, .04), OPTIC, bone, 0)
    # Antennae, mouthparts and the engine-aimed sensor.
    for side, s in (('L', 1), ('R', -1)):
        h = V3(M.H['ANTENNA_'+side])
        if lod < 2:
            g.sweep([h, h+Vector((s*.012, -.06, .030)), h+Vector((s*.034, -.14, .075)), h+Vector((s*.060, -.22, .095))], [.0065, .005, .003, 0.], HORN, 'ANTENNA_'+side, sides=[6, 4][lod])
        h = V3(M.H['MAXILLIPED_'+side]); bone = 'MAXILLIPED_'+side
        if lod < 2:
            g.box(h+Vector((s*.010, -.012, -.036)), (.040, .012, .078), FRAME, bone, .003)
            for k in range(3):
                x = h.x+s*(-.006+k*.014); b = Vector((x, h.y-.016, h.z-.072))
                g.cyl(b, b+Vector((-s*.004, -.010, -.030+.006*k)), .0055, HORN, bone, r1=0., sides=[6, 4][lod])
            if lod == 0:
                for k in range(3): g.bolt((h.x+s*(.002+k*.012), h.y-.019, h.z-.010), bone, axis=(0, -1, 0))
        else:
            g.box(h+Vector((s*.010, -.012, -.040)), (.04, .012, .08), FRAME, bone, 0)
        h = V3(M.H['MANDIBLE_'+side])
        if lod < 2:
            g.sweep([h, h+Vector((s*.004, -.020, -.040)), h+Vector((-s*.004, -.034, -.075)), h+Vector((-s*.012, -.040, -.098))], [.012, .010, .006, 0.], HORN, 'MANDIBLE_'+side, sides=[8, 5][lod])
    g.box((0, -.345, .565), (.12, .04, .10), CORE, 'BODY', .004 if lod == 0 else 0)
    h = V3(M.H['SENSOR_YAW'])
    if lod < 2:
        g.cyl(h-Vector((0, 0, .012)), h+Vector((0, 0, .008)), .020, CORE, 'SENSOR_YAW', sides=[12, 6][lod])
        g.cyl(h+Vector((0, -.012, .0)), h+Vector((0, -.030, 0)), .009, OPTIC, 'SENSOR_YAW', sides=[10, 6][lod])
    # Body-side coxa sockets.
    for id in M.LEGS+M.CHELAE:
        pv = V3((M.LEG[id] if id in M.LEG else M.CHELA[id])['pivot'])
        if lod < 2: g.cyl(pv+Vector((0, 0, .030)), pv+Vector((0, 0, .046)), .060 if id in M.LEG else .052, FRAME, 'BODY', sides=[16, 8][lod], smooth=False)

# ------------------------------------------------------------------ limbs
def walking_leg(g, id):
    L = M.LEG[id]; k = L['k']; kt = (.70+.30*k)*1.15; lod = g.lod
    cx, bs = 'COXA_'+id, 'BASIS_'+id
    pv = V3(L['pivot'])
    if lod < 2:
        g.cyl(pv-Vector((0, 0, .030)), pv+Vector((0, 0, .032)), .046*kt, CORE, cx, sides=[14, 8][lod])
        g.fbox(cx, .0, L['coxa']+.012, .030*kt, .026*kt, CORE)
        if lod == 0: g.ring(pv+Vector((0, 0, .033)), .046*kt, .004, (0, 0, 1), BRASS, cx)
        e2 = g.axis(bs, 1); c = g.at(bs, 0)
        g.cyl(c-e2*.032*kt, c+e2*.032*kt, .030*kt, CORE, bs, sides=[12, 8][lod])
        g.fbox(bs, .0, L['basis'], .028*kt, .026*kt, FRAME)
        for sg in (-1, 1):
            c = g.at(bs, L['basis'], sg*.042*kt); g.disc(c, e2, .040*kt, .008, FRAME, bs, sides=[16, 8][lod]); g.hub(c+e2*sg*.004, e2*sg, .040*kt, bs)
    else:
        g.cyl(g.at(cx, 0), g.at(bs, L['basis']), .035*kt, FRAME, cx, sides=4, smooth=False)
    g.segment('MERUS_'+id, L['merus'], .086*kt, .072*kt, .072*kt, (5, 2), lobes=1.25, led=True)
    g.segment('CARPUS_'+id, L['carpus'], .076*kt, .070*kt, .066*kt, (1, 1), lobes=1.)
    g.segment('PROPODUS_'+id, L['propodus'], .068*kt, .050*kt, .058*kt, (4, 2), lobes=.95)
    # Long tapered dactyl ending in a point exactly at SOCKET_TIP.
    bone = 'DACTYL_'+id; Ld = L['dactyl']; r0 = .026*kt
    if lod == 2:
        g.cyl(g.at(bone, 0), g.at(bone, Ld), r0, FRAME, bone, r1=0., sides=4, smooth=False); return
    e2 = g.axis(bone, 1); c = g.at(bone, 0); g.cyl(c-e2*(.054*kt/2-.003), c+e2*(.054*kt/2-.003), .022*kt, CORE, bone, sides=[12, 8][lod])
    st = [12, 6][lod]; pts = []; rad = []
    for i in range(st+1):
        f = i/st; pts.append(g.at(bone, Ld*f, 0., -.035*Ld*math.sin(math.pi*f))); rad.append(r0*(1-f)**.85 if i < st else 0.)
    g.sweep(pts, rad, FRAME, bone, sides=[10, 6][lod], up=g.axis(bone, 2))
    if lod == 0:
        hf = lambda u: 2*r0*(1-u/Ld)**.85*1.05
        for sg in (-1, 1): g.plate(bone, .02, .30*Ld, hf, sg*r0*.9, .004, 2, .010, .008)
        g.ring(g.at(bone, .03*Ld), r0*1.02, .003, g.axis(bone, 0), BRASS, bone)
        g.ring(g.at(bone, .62*Ld), r0*.44, .0024, g.axis(bone, 0), OPTIC, bone)

def cheliped(g, id):
    C = M.CHELA[id]; lod = g.lod; cx, bs = 'COXA_'+id, 'BASIS_'+id; pv = V3(C['pivot'])
    if lod < 2:
        g.cyl(pv-Vector((0, 0, .028)), pv+Vector((0, 0, .030)), .040, CORE, cx, sides=[14, 8][lod])
        g.fbox(cx, 0., C['coxa']+.012, .032, .030, FRAME)
        e2 = g.axis(bs, 1); c = g.at(bs, 0); g.cyl(c-e2*.032, c+e2*.032, .030, CORE, bs, sides=[12, 8][lod])
        g.fbox(bs, 0., C['basis'], .030, .032, FRAME)
        for sg in (-1, 1):
            c = g.at(bs, C['basis'], sg*.044); g.disc(c, e2, .044, .008, FRAME, bs, sides=[16, 8][lod]); g.hub(c+e2*sg*.004, e2*sg, .044, bs)
    else:
        g.cyl(g.at(cx, 0), g.at(bs, C['basis']), .035, FRAME, cx, sides=4, smooth=False)
    g.segment('MERUS_'+id, C['merus'], .090, .086, .080, (3, 1), lobes=1.25, led=True)
    g.segment('CARPUS_'+id, C['carpus'], .092, .088, .086, (1, 1), lobes=1.2, led=True)
    if lod < 2:
        e2 = g.axis('CARPUS_'+id, 1)
        for sg in (-1, 1):   # heavy wrist boss, as in the concept
            c = g.at('CARPUS_'+id, .5*C['carpus'], sg*(.043+.010), 0.); g.disc(c, e2, .040, .010, FRAME, 'CARPUS_'+id, sides=[18, 10][lod]); g.hub(c+e2*sg*.005, e2*sg, .040, 'CARPUS_'+id)
    palm = 'PROPODUS_'+id; Lp = C['palm']; hu, hw = C['hinge_u'], C['hinge_w']
    g.segment(palm, Lp, .118, .078, .088, (2, 1), lobes=.62, lobe_at=(hu, hw))
    # Fixed finger (pollex) with saw teeth toward the dactyl.
    st = [16, 6, 2][lod]; pts = []; rad = []; tip_u = Lp+C['finger']-.01; u0f = Lp-.04
    for i in range(st+1):
        f = i/st; u = u0f+(tip_u-u0f)*f; pts.append(g.at(palm, u, 0., -.030+.046*f*f)); rad.append(.042*(1-f)**.75 if i < st else 0.)
    if lod == 2:
        g.cyl(pts[0], pts[-1], .03, FRAME, palm, r1=0., sides=4, smooth=False)
    else:
        g.sweep(pts, rad, FRAME, palm, sides=[12, 6][lod], up=g.axis(palm, 2), squash=1.3)
        nt = [12, 6][lod]
        for i in range(nt):
            f = (i+.7)/(nt+.9); u = u0f+(tip_u-u0f)*f; w = -.030+.046*f*f+.042*(1-f)**.75*1.2
            g.tooth(palm, u, w-.003, (.020 if i % 2 == 0 or lod else .012)*(1-.5*f), .026*(1-.35*f), .018*(1-.4*f), 1)
    # Movable finger (dactyl), modelled closed in its own frame; the bind pose opens it by G0.
    bone = 'DACTYL_'+id; Ld = C['dactyl']; pts = []; rad = []
    e2 = g.axis(bone, 1)
    if lod < 2:
        c = g.at(bone, 0); g.cyl(c-e2*.036, c+e2*.036, .026, CORE, bone, sides=[14, 8][lod])
    for i in range(st+1):
        f = i/st; u = -.012+(Ld+.012)*f; pts.append(g.at(bone, u, .014*f*f, -.058*f*f)); rad.append(.036*(1-f)**.75 if i < st else 0.)
    if lod == 2:
        g.cyl(pts[0], pts[-1], .025, FRAME, bone, r1=0., sides=4, smooth=False); return
    g.sweep(pts, rad, FRAME, bone, sides=[12, 6][lod], up=g.axis(bone, 2), squash=1.3)
    nt = [11, 6][lod]
    for i in range(nt):
        f = (i+.9)/(nt+.9); u = .03+(Ld-.08)*f; ff = (u+.012)/(Ld+.012); w = -.058*ff**2-.036*(1-ff)**.75*1.2
        g.tooth(bone, u, w+.003, (.017 if i % 2 == 0 or lod else .010)*(1-.45*f), .024*(1-.35*f), .016*(1-.4*f), -1)
    if lod == 0:
        hf = lambda u: .046*(1-u/Ld)
        for sg in (-1, 1): g.plate(bone, .03, .19, hf, sg*.024, .004, 2, .010, .008)

def shape(lod):
    g = Crab(lod); body(g)
    for id in M.LEGS: walking_leg(g, id)
    for id in M.CHELAE: cheliped(g, id)
    return g

# ------------------------------------------------------------------ rig, skin, clips, export
def make_arm(col):
    d = bpy.data.armatures.new('TK01_SKELETON'); arm = bpy.data.objects.new('TK01_RIG', d); col.objects.link(arm)
    bpy.context.view_layer.objects.active = arm; arm.select_set(True); bpy.ops.object.mode_set(mode='EDIT')
    for n in M.ORDER:
        b = d.edit_bones.new(n); b.head = V3(M.H[n]); b.tail = V3(M.H[n])+Vector((0, 0, .03)); b.use_deform = not n.startswith('SOCKET_')
        if M.PAR[n]: b.parent = d.edit_bones[M.PAR[n]]
    bpy.ops.object.mode_set(mode='OBJECT'); arm.show_in_front = True
    arm['rig'] = 'TAKAASHI-01 rigid openwork rig: 8 walking legs and 2 chelipeds of 6 segments, eyestalks, antennae, maxillipeds, mandibles'
    return arm

def make_skin(g, col, arm, lod):
    d = bpy.data.meshes.new('TK01_GEOMETRY'); d.from_pydata([tuple(v) for v in g.v], [], g.f); d.update()
    o = bpy.data.objects.new('TK01_SKIN', d); col.objects.link(o)
    if lod == 2:
        d.materials.append(material(0, True)); colors = d.color_attributes.new(name='Palette', type='FLOAT_COLOR', domain='CORNER')
        for p, m in zip(d.polygons, g.mi):
            for li in p.loop_indices: colors.data[li].color = (*DIST[m], 1)
        for p in d.polygons: p.use_smooth = False
    else:
        for i in range(6): d.materials.append(material(i))
        for p, m, sm in zip(d.polygons, g.mi, g.smooth): p.material_index = m; p.use_smooth = sm
    bm = bmesh.new(); bm.from_mesh(d); bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces)); bm.to_mesh(d); bm.free()
    if lod < 2:
        groups = {}
        for i, b in enumerate(g.b): groups.setdefault(b, []).append(i)
        for n in M.ORDER:
            if n in groups: o.vertex_groups.new(name=n).add(groups[n], 1., 'REPLACE')
        mod = o.modifiers.new('TK01_RigidOpenwork', 'ARMATURE'); mod.object = arm
    return o

POSES = {}
def sampled(clip, frame):
    key = (clip, frame)
    if key not in POSES: POSES[key] = M.pose(clip, frame/M.FPS)[:2]
    return POSES[key]

def animate(arm):
    arm.animation_data_create(); skip = {n for n in M.ORDER if n.startswith('SOCKET_')} | {'SENSOR_YAW'}
    bones = arm.data.bones; pbs = arm.pose.bones
    for clip in M.CLIPS:
        name = clip['name']; action = bpy.data.actions.new(name); arm.animation_data.action = action
        frames = round(clip['duration_s']*M.FPS)
        for frame in range(frames+1):
            pos, ori = sampled(name, frame); mats = {}
            for n in M.ORDER:
                bone = bones[n]; parent = M.PAR[n]
                rot = Matrix(ori[n]).to_4x4()
                mat = Matrix.Translation(V3(pos[n]))@rot@bone.matrix_local.to_3x3().to_4x4(); mats[n] = mat
                kw = dict(parent_matrix=mats[parent], parent_matrix_local=bones[parent].matrix_local) if parent else {}
                pb = pbs[n]; pb.rotation_mode = 'QUATERNION'; pb.matrix_basis = bone.convert_local_to_pose(mat, bone.matrix_local, invert=True, **kw)
                if n in skip: continue
                pb.keyframe_insert(data_path='location', frame=frame); pb.keyframe_insert(data_path='rotation_quaternion', frame=frame)
        for layer in action.layers:
            for strip in layer.strips:
                for bag in strip.channelbags:
                    for curve in bag.fcurves:
                        for p in curve.keyframe_points: p.interpolation = 'LINEAR'
        arm.animation_data.action = None; tr = arm.animation_data.nla_tracks.new(); tr.name = name; tr.strips.new(name, 0, action); tr.mute = True
        log('ACTION', name, frames+1, 'frames')
    for pb in arm.pose.bones: pb.matrix_basis = Matrix.Identity(4)
    for tr in arm.animation_data.nla_tracks: tr.mute = False

def measure(path):
    raw = path.read_bytes(); n = struct.unpack_from('<I', raw, 12)[0]; doc = json.loads(raw[20:20+n])
    return dict(bytes=len(raw), triangles=sum(doc['accessors'][p['indices']]['count']//3 for m in doc.get('meshes', []) for p in m['primitives']),
                draw_calls=sum(len(m['primitives']) for m in doc.get('meshes', [])))

def build():
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
    scene = bpy.context.scene; scene.name = 'TAKAASHI01_SPIDER_CRAB'; scene.render.fps = M.FPS; scene.frame_start = 0
    scene.frame_end = round(max(c['duration_s'] for c in M.CLIPS)*M.FPS); assets = []
    for lod in LODS:
        col = bpy.data.collections.new('TK01_LOD'+str(lod)); scene.collection.children.link(col)
        root = bpy.data.objects.new('ROOT', None); col.objects.link(root); root['forward'] = '+Z in glTF'; root['damage_level'] = 0
        g = shape(lod); log('LOD', lod, 'built', len(g.f), 'faces', len(g.v), 'verts')
        arm = make_arm(col); arm.parent = root; skin = make_skin(g, col, arm, lod)
        if lod < 2 and ANIMATE: animate(arm)
        bpy.ops.object.select_all(action='DESELECT')
        for o in col.objects: o.select_set(True)
        scene.frame_set(0); path = OUT/f'takaashi01_d0_lod{lod}.glb'
        bpy.ops.export_scene.gltf(filepath=str(path), export_format='GLB', use_selection=True, export_extras=True,
                                  export_animations=lod < 2 and ANIMATE, export_animation_mode='NLA_TRACKS', export_frame_range=False,
                                  export_force_sampling=True, export_cameras=False, export_lights=False)
        e = dict(file=path.name, lod=lod, damage_level=0, static=lod == 2, derived=False, **measure(path), clips=M.CLIPS if lod < 2 else [],
                 credit='Model and animation by Jelaludo'); assets.append(e); log('EXPORT', e['file'], e['triangles'], 'tris', e['draw_calls'], 'draws', e['bytes'], 'bytes')
        if lod == 0 and '--no-save' not in ARGS:
            if ANIMATE:
                for tr in arm.animation_data.nla_tracks: tr.mute = tr.name != 'Watch_Idle'
            scene.frame_set(0); SOURCE.parent.mkdir(parents=True, exist_ok=True)
            bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE)); log('SAVED', SOURCE.name)
        for o in list(col.objects): bpy.data.objects.remove(o, do_unlink=True)
        bpy.data.collections.remove(col)
        for data in [bpy.data.armatures, bpy.data.actions, bpy.data.meshes, bpy.data.materials, bpy.data.curves]:
            for item in list(data):
                if item.users == 0: data.remove(item)
    old = json.loads((OUT/'manifest.json').read_text()) if (OUT/'manifest.json').exists() else {}
    keep = {a['lod']: a for a in old.get('assets', []) if a['lod'] not in LODS}
    assets = sorted(list(keep.values())+assets, key=lambda a: a['lod'])
    manifest = dict(family='takaashi01', label='TAKAASHI-01 / Mechanical Spider Crab', plain_glb_source_of_truth=True,
        coordinate_system=dict(units='metres', up='+Y', forward='+Z', origin='ground under the carapace centre; crab left is +X'),
        damage_states={'d0': 'intact only'},
        animation=dict(fps=M.FPS, skeleton_joints=len(M.ORDER), motion_node='MOTION', body_node='BODY', engine_driven_excluded=['SENSOR_YAW'],
                       gait_topology='Lateral: alternating tetrapod L1 R2 L3 R4 / R1 L2 R3 L4. Forward: posterior-to-anterior wave, one leg per side in swing.'),
        lod_selection=dict(initial=2, approach_distance_m=30, hysteresis_m=8, lod0='Detailed recording master', lod1='Animated gameplay tier; keep while moving', lod2='Static standing distance/loading silhouette; no animation'),
        assets=assets)
    (OUT/'manifest.json').write_text(json.dumps(manifest, indent=2)+'\n'); log('TAKAASHI_COMPLETE')

if __name__ == '__main__':
    build()
