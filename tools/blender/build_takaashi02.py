"""TAKAASHI-02 / braided-actuator variant of the mechanical Japanese spider crab.

Same joint table, sockets and nine clips as TAKAASHI-01 (takaashi_motion.py): one skeleton and one
motion set for both variants. New geometry: dark open carbon cages stay outside taut braided
actuators; each actuator ends in machined steel ferrules, a rod eye on a cross pin, or a crimp and a
steel tendon that wraps a sheave on the joint it drives. Sheaves, drums and the wrist ball are
round about their joint, so rigid skinning never opens a gap. Rest mesh: claws open 17 degrees,
maxillipeds and mandibles parted, so cutting edges and mouthparts stay separate.
Run: blender -b --factory-startup --python-exit-code 1 --python tools/blender/build_takaashi02.py -- \
     [--lods 0,1,2] [--no-anim] [--no-save] [--out DIR]
"""
import bpy, bmesh, math, json, sys, random, time
from pathlib import Path
from mathutils import Vector, Matrix
sys.path.insert(0, str(Path(__file__).resolve().parent))
import takaashi_motion as M
import build_takaashi as T

P = Path(__file__).resolve().parents[2]
ARGS = sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
def opt(k, d=None): return ARGS[ARGS.index(k)+1] if k in ARGS else d
OUT = Path(opt('--out', str(P/'assets/takaashi02'))); OUT.mkdir(parents=True, exist_ok=True)
SOURCE = P/'source/blender/a6-takaashi02.blend'
LODS = [int(x) for x in opt('--lods', '0,1,2').split(',')]
ANIMATE = '--no-anim' not in ARGS
T0 = time.time()
def log(*a): print('[%6.1fs]' % (time.time()-T0), *a, flush=True)

NAMES = ['Carbon_frame', 'Braided_sleeve', 'Machined_steel', 'Dark_housing', 'Claw_steel', 'Blue_optics']
COLORS = [(.030, .032, .036), (.40, .40, .385), (.66, .66, .64), (.011, .012, .014), (.50, .50, .48), (.0212, .392, 1.0)]
METAL = [.40, 0., 1., .55, .85, 0.]
ROUGH = [.44, .58, .24, .40, .30, .20]
# Distance palette: the frame is lifted a little so the silhouette does not go black at range.
DIST = [(.10, .105, .11), (.46, .46, .44), (.62, .62, .60), (.045, .048, .052), (.52, .52, .50), (.0212, .392, 1.0)]
FRAME, SLEEVE, STEEL, DARK, CLAW, LENS = range(6)
# Braid per tier: strands per family k, braid angles, rings per strand advance, relief and groove shade.
BRAID = [dict(strands=True, k=8, alpha=25., lift=.06, width=.80, per_cross=3, core=.93, core_sides=12, core_shade=.30),
         dict(n=6, k=3, alpha=20., alpha2=-20., w2=0., p=1., amp=.05, shade=.25, rings_per=2, min_rings=3)]   # same slots as TAKAASHI-01's FRAME, CABLE, BRASS, CORE, HORN, OPTIC
Z = Vector((0., 0., 1.))

def material(i, distance=False):
    m = bpy.data.materials.new('TK02_'+('Distance_palette' if distance else NAMES[i]))
    s = T.principled(m); c = DIST[i] if distance else COLORS[i]
    s.inputs['Base Color'].default_value = (*c, 1); m.diffuse_color = (*c, 1)
    s.inputs['Metallic'].default_value = .45 if distance else METAL[i]
    s.inputs['Roughness'].default_value = .42 if distance else ROUGH[i]
    if i == LENS and not distance:
        s.inputs['Emission Color'].default_value = (*c, 1); s.inputs['Emission Strength'].default_value = 2.5
    if distance:
        n = m.node_tree.nodes.new('ShaderNodeVertexColor'); n.layer_name = 'Palette'
        m.node_tree.links.new(n.outputs['Color'], s.inputs['Base Color'])
    return m

def V3(t): return Vector((float(t[0]), float(t[1]), float(t[2])))
def sm(x):
    x = min(1., max(0., x)); return x*x*(3-2*x)

class Crab2(T.Crab):
    """TAKAASHI-01 primitives plus per-vertex shade (braid grooves) and the actuator vocabulary."""
    def __init__(self, lod):
        super().__init__(lod); self.c = []; self.fixed = []
    def add(self, v, f, m, b, smooth=False, colors=None, fixed=False):
        n0 = len(self.v); super().add(v, f, m, b, smooth)
        self.c.extend(colors if colors is not None else [1.]*(len(self.v)-n0)); self.fixed.extend([fixed]*len(f))
    def xform(self, n0, c, R):
        c = Vector(c)
        for i in range(n0, len(self.v)): self.v[i] = c+R@(self.v[i]-c)
    # ----- generic solids
    def lathe(self, bone, c, ax, prof, m, n=None, smooth=True, caps=True, closed=False):
        """Surface of revolution: prof is a list of (radius, height along ax); radius 0 gives a point."""
        c, ax = Vector(c), Vector(ax).normalized(); n = n or self.sides
        o1 = ax.orthogonal().normalized(); o2 = ax.cross(o1); verts = []; rings = []
        for r, z in prof:
            if r < 1e-6: rings.append([len(verts)]); verts.append(c+ax*z); continue
            rings.append(list(range(len(verts), len(verts)+n)))
            verts += [c+ax*z+(o1*math.cos(math.tau*j/n)+o2*math.sin(math.tau*j/n))*r for j in range(n)]
        pairs = list(zip(rings, rings[1:]))+([(rings[-1], rings[0])] if closed else [])
        faces = []
        for A, B in pairs:
            if len(A) == 1 and len(B) == 1: continue
            if len(A) == 1: faces += [(A[0], B[(j+1) % n], B[j]) for j in range(n)]
            elif len(B) == 1: faces += [(A[j], A[(j+1) % n], B[0]) for j in range(n)]
            else: faces += [(A[j], A[(j+1) % n], B[(j+1) % n], B[j]) for j in range(n)]
        if caps and not closed:
            if len(rings[0]) > 1: faces.append(tuple(reversed(rings[0])))
            if len(rings[-1]) > 1: faces.append(tuple(rings[-1]))
        self.add(verts, faces, m, bone, smooth)
    def ribbon(self, bone, pts, wd, th, nax, m=FRAME, caps=True, closed=False):
        """Flat bar along a polyline: th along nax, wd across; chamfered octagon at LOD0."""
        pts = [Vector(p) for p in pts]; n = len(pts); nax = Vector(nax)
        wd = list(wd) if isinstance(wd, (list, tuple)) else [wd]*n; th = list(th) if isinstance(th, (list, tuple)) else [th]*n
        verts = []; k = 4
        for i, p in enumerate(pts):
            if closed: t = (pts[(i+1) % n]-pts[i-1]).normalized()
            else: t = (pts[min(n-1, i+1)]-pts[max(0, i-1)]).normalized()
            nv = (nax-t*nax.dot(t)).normalized(); sv = t.cross(nv); hw, ht = wd[i]/2, th[i]/2
            if self.lod == 0:
                c = min(hw, ht)*.3
                sec = [(hw-c, ht), (hw, ht-c), (hw, -ht+c), (hw-c, -ht), (-hw+c, -ht), (-hw, -ht+c), (-hw, ht-c), (-hw+c, ht)]
            else:
                sec = [(hw, ht), (hw, -ht), (-hw, -ht), (-hw, ht)]
            k = len(sec); verts += [p+sv*x+nv*y for x, y in sec]
        segs = n if closed else n-1
        faces = [(i*k+j, i*k+(j+1) % k, ((i+1) % n)*k+(j+1) % k, ((i+1) % n)*k+j) for i in range(segs) for j in range(k)]
        if caps and not closed: faces += [tuple(range(k-1, -1, -1)), tuple(range((n-1)*k, n*k))]
        self.add(verts, faces, m, bone, False)
    def bar(self, bone, A, B, nax, wd, th, m=FRAME, ext=0.):
        a = self.at(bone, *A); b = self.at(bone, *B); d = (b-a).normalized()
        nv = self.axis(bone, nax) if isinstance(nax, int) else Vector(nax)
        self.ribbon(bone, [a-d*ext, b+d*ext], wd, th, nv, m)
    def lug(self, bone, uc, wc, rc, uf, wlo, whi, v0, t, m=FRAME):
        """Plate in the bone's (u, w) plane at lateral offset v0: a round end of radius rc on (uc, wc),
        waisted toward a straight edge at u = uf spanning w = wlo..whi."""
        sg = 1 if uf > uc else -1; n = [14, 2][self.lod]; out = []
        for i in range(n+1):
            a = math.pi/2+math.pi*i/n; out.append((uc+sg*rc*math.cos(a), wc+rc*math.sin(a)))
        um = uc+(uf-uc)*.55
        out += [(um, .5*(wc-rc+wlo)+.10*rc), (uf, wlo), (uf, whi), (um, .5*(wc+rc+whi)-.10*rc)]
        k = len(out); e2 = self.axis(bone, 1)
        verts = [self.at(bone, u, v0+s*t/2, w) for s in (-1, 1) for u, w in out]
        faces = [tuple(range(k-1, -1, -1)), tuple(range(k, 2*k))]+[(i, (i+1) % k, k+(i+1) % k, k+i) for i in range(k)]
        self.add(verts, faces, m, bone, False)
    def torus(self, c, R, r, ax, m, bone, n=None, k=None):
        n = n or [14, 8][self.lod]; k = k or [6, 4][self.lod]
        c, ax = Vector(c), Vector(ax).normalized(); o1 = ax.orthogonal().normalized(); o2 = ax.cross(o1); v = []
        for i in range(n):
            d = o1*math.cos(math.tau*i/n)+o2*math.sin(math.tau*i/n)
            for j in range(k): b = math.tau*j/k; v.append(c+d*(R+r*math.cos(b))+ax*r*math.sin(b))
        self.add(v, [(i*k+j, ((i+1) % n)*k+j, ((i+1) % n)*k+(j+1) % k, i*k+(j+1) % k) for i in range(n) for j in range(k)], m, bone, True)
    def ball(self, c, r, m, bone, rings=None, segs=None):
        rings = rings or [12, 7][self.lod]; segs = segs or [20, 10][self.lod]; c = Vector(c)
        T.ellipsoid_mesh(self, lambda p: c+Vector(p)*r, rings, segs, m, bone)
    # ----- joints
    def axle(self, bone, c, ax, half, r, rp):
        """Steel pin through a fork with a dark hub cap, steel bearing face and centre bolt outside each cheek."""
        c, ax = Vector(c), Vector(ax).normalized(); lod = self.lod; n = [18, 6][lod]
        if lod:   # game tier: one dark barrel through the fork
            self.cyl(c-ax*(half+.006), c+ax*(half+.006), r, DARK, bone, sides=n); return
        self.cyl(c-ax*(half+.004), c+ax*(half+.004), rp, STEEL, bone, sides=10)
        for s in (-1, 1):
            o = c+ax*s*half
            self.cyl(o, o+ax*s*.006, r, DARK, bone, sides=n)
            if lod == 0:
                self.cyl(o+ax*s*.006, o+ax*s*.0078, r*.66, STEEL, bone, sides=n)
                self.cyl(o+ax*s*.0078, o+ax*s*.0125, r*.24, DARK, bone, sides=6, smooth=False)

    def sheave(self, bone, c, ax, rc, grooves, hw, rt):
        """Pulley on a joint axle: dark core, steel flanges and a cable ring of radius rc in each groove."""
        c, ax = Vector(c), Vector(ax).normalized(); lod = self.lod; n = [24, 6][lod]
        if lod:
            self.cyl(c-ax*hw, c+ax*hw, rc+rt, STEEL, bone, sides=n); return
        self.cyl(c-ax*hw, c+ax*hw, rc-rt*.5, DARK, bone, sides=n)
        for o in grooves:
            for s in (-1, 1):
                f = c+ax*(o+s*(rt+.0012))
                self.cyl(f, f+ax*s*.0022, rc+rt+.0035, STEEL, bone, sides=n)
            if lod == 0: self.torus(c+ax*o, rc, rt, ax, STEEL, bone, 20, 5)
    def pin(self, bone, u, w, half, rp):
        e2 = self.axis(bone, 1); a = self.at(bone, u, -half, w); b = self.at(bone, u, half, w)
        self.cyl(a-e2*.003, b+e2*.003, rp, STEEL, bone, sides=[8, 4][self.lod])
        if self.lod == 0:
            for p, s in ((a, -1), (b, 1)): self.cyl(p+e2*s*.0035, p+e2*s*.0065, rp*1.9, STEEL, bone, sides=6, smooth=False)
    # ----- actuators
    def sleeve(self, a, b, R, bone, neck=.76, style=None):
        """Braided sleeve: taut, nearly cylindrical body with short necks into the ferrules. Two
        counter-wound strand families at a shallow braid angle (a sleeve under tension) give long
        lozenges; the relief is modelled and the grooves are darkened through the vertex shade."""
        st = dict(BRAID[self.lod], **(style or {}))
        a, b = Vector(a), Vector(b); D = b-a; L = D.length; z = D/L
        n1 = z.orthogonal().normalized(); n2 = z.cross(n1); f = min(.20, .85*R/L)
        def rad(t):
            e = sm(t/f)*sm((1-t)/f); return R*(neck+(1-neck)*e)*(.99+.01*math.sin(math.pi*t))
        if st.get('strands'):
            return self.woven(a, z, n1, n2, L, rad, R, bone, st)
        n, k = st['n'], st['k']; ta, tb_ = math.tan(math.radians(st['alpha'])), math.tan(math.radians(st['alpha2']))
        along = (math.tau/k)/(abs(ta)/R)
        rings = max(st['min_rings'], int(L/(along/st['rings_per']))+1)
        verts, cols = [], []; P1 = P2 = 0.; prev = None
        for i in range(rings):
            t = i/(rings-1); r0 = rad(t)
            if i: ds = L/(rings-1); P1 += ta/(.5*(r0+prev))*ds; P2 += tb_/(.5*(r0+prev))*ds
            prev = r0
            for j in range(n):
                th = math.tau*j/n
                hA = (.5+.5*math.cos(k*(th+P1)))**st['p']; hB = (.5+.5*math.cos(k*(th+P2)))**st['p']
                rel = (hA+st['w2']*hB)/(1+st['w2'])
                r = r0*(1+st['amp']*(rel-.5)); c = 1-st['shade']*(1-rel)
                verts.append(a+z*(t*L)+r*(math.cos(th)*n1+math.sin(th)*n2)); cols.append(c)
        faces = [(i*n+j, i*n+(j+1) % n, (i+1)*n+(j+1) % n, (i+1)*n+j) for i in range(rings-1) for j in range(n)]
        self.add(verts, faces, SLEEVE, bone, st.get('smooth', True), cols)
    def woven(self, a, z, n1, n2, L, rad, R, bone, st):
        """Modelled braid: k flat strands per family wound at +/-alpha over a darker core, passing over
        and under each other in a checkerboard (1-over-1) at every crossing."""
        k = st['k']; ta = math.tan(math.radians(st['alpha'])); dl = st['lift']*R
        cross = (math.tau/k)/(2*ta/R)                      # distance between crossings along one strand
        rings = max(6, int(L/(cross/st['per_cross']))+1); ds = L/(rings-1)
        Phi = [0.]; rr = [rad(0.)]
        for i in range(1, rings):
            r0 = rad(i/(rings-1)); Phi.append(Phi[-1]+ta/(.5*(r0+rr[-1]))*ds); rr.append(r0)
        nc = st['core_sides']; cr = max(2, int(L/.06)+1); verts = []
        for i in range(cr):
            t = i/(cr-1); r0 = rad(t)*st['core']
            verts += [a+z*(t*L)+r0*(math.cos(math.tau*j/nc)*n1+math.sin(math.tau*j/nc)*n2) for j in range(nc)]
        faces = [(i*nc+j, i*nc+(j+1) % nc, (i+1)*nc+(j+1) % nc, (i+1)*nc+j) for i in range(cr-1) for j in range(nc)]
        self.add(verts, faces, SLEEVE, bone, True, [st['core_shade']]*len(verts))
        for fam in (1, -1):
            for m in range(k):
                verts, cols = [], []
                for i in range(rings):
                    s = i*ds; th = (math.tau*m/k)+fam*Phi[i]; r0 = rr[i]
                    o = fam*max(-1., min(1., 1.7*math.cos(k*Phi[i])))   # checkerboard: +1 over, -1 under at crossings
                    r = r0*(1+st['lift']*.5)+dl*.5*o
                    N = math.cos(th)*n1+math.sin(th)*n2; Tg = (-math.sin(th)*n1+math.cos(th)*n2)
                    Td = (z+Tg*(fam*ta*r/max(r0, 1e-6))).normalized(); W = N.cross(Td).normalized()
                    C = a+z*s+N*r; hw = .5*st['width']*(math.tau*r0/k)*math.cos(math.atan(ta))
                    verts += [C-W*hw, C+W*hw]; sh = .80+.20*o; cols += [sh, sh]
                faces = [(2*i, 2*(i+1), 2*(i+1)+1, 2*i+1) for i in range(rings-1)]
                self.add(verts, faces, SLEEVE, bone, True, cols, fixed=True)
    def actuator(self, bone, a, b, R, pin_ax, tend_a=None, tend_b=None, neck=.76):
        """Taut braided actuator between attachments a and b (world). An end without a tendon target
        finishes in a rod eye round a pin along pin_ax; an end with one finishes in a crimp and a steel
        tendon to that point (a tangent point on a sheave)."""
        a, b = Vector(a), Vector(b); D = b-a; L = D.length; d = D/L; lod = self.lod
        lr = .010+.25*R; Lf = .012+.70*R
        rod = max(.0021, .15*R); Rf = R*neck*1.10+.0008; rt = max(.0015, .085*R)
        s0 = lr+.55*Lf
        self.sleeve(a+d*s0, b-d*s0, R, bone, neck)
        for end, ax, tend in ((a, d, tend_a), (b, -d, tend_b)):
            fo = end+ax*lr
            if lod == 0:
                prof = [(rod*1.3, -.0012), (Rf*.72, 0.), (Rf, Lf*.12), (Rf, Lf*.36), (Rf*.89, Lf*.44), (Rf, Lf*.52), (Rf, Lf*.97), (Rf*.94, Lf)]
                self.lathe(bone, fo, ax, prof, STEEL, 14)
            else:
                self.lathe(bone, fo, ax, [(Rf*.80, 0.), (Rf, Lf)], STEEL, 5)
            self.cyl(end, fo, rod, STEEL, bone, sides=[8, 4][lod], caps=lod == 0)
            if tend is None:
                if lod == 0: self.torus(end, rod*1.55+.0012, rod*.75+.0006, Vector(pin_ax), STEEL, bone, 10, 5)
            else:
                if lod == 0: self.cyl(end-ax*.0012, end+ax*.007, rod*1.4, STEEL, bone, sides=8)
                self.cyl(end, Vector(tend), rt, STEEL, bone, sides=[6, 4][lod], caps=False)
    def act(self, bone, ua, ub, v, w, R, tend_a=None, tend_b=None):
        """Actuator parallel to the bone axis at (v, w); tend_a/tend_b are u of the sheave tangent points."""
        T_ = lambda u: None if u is None else self.at(bone, u, v, w)
        self.actuator(bone, self.at(bone, ua, v, w), self.at(bone, ub, v, w), R, self.axis(bone, 1), T_(tend_a), T_(tend_b))
    # ----- exo-frame
    def cage(self, bone, u0, u1, Wf, Lo, Hi, bays, tb, db, bulk=(), knots=(), rungs=True):
        """Open carbon frame outside the actuators: corner longerons (ventral rail at Lo, dorsal at Hi),
        end collars and bulkheads, Warren diagonals across the dorsal and ventral faces. The side faces
        stay open, so the actuators read from the side between the rails."""
        lod = self.lod; us = [u0]+sorted(k for k in knots if u0 < k < u1)+[u1]; e2 = self.axis(bone, 1); e3 = self.axis(bone, 2)
        for sv in (-1, 1):
            for F in (Lo, Hi):
                pts = [self.at(bone, u, sv*Wf(u), F(u)) for u in us]
                pts[0] = pts[0]-(pts[1]-pts[0]).normalized()*tb*.5; pts[-1] = pts[-1]+(pts[-1]-pts[-2]).normalized()*tb*.5
                self.ribbon(bone, pts, db, tb, e2)
        for u in [u0, u1]+list(bulk):
            W = Wf(u)
            for F in (Lo, Hi): self.bar(bone, (u, -W, F(u)), (u, W, F(u)), 0, db, .008, ext=tb*.5)
            if lod == 0:
                for sv in (-1, 1): self.bar(bone, (u, sv*W, Lo(u)), (u, sv*W, Hi(u)), 0, tb, .008, ext=db*.3)
        nodes = [u0+(u1-u0)*i/bays for i in range(bays+1)]
        for F in (Lo, Hi):
            for i in range(bays):
                ua, ub = nodes[i], nodes[i+1]; s = 1 if i % 2 == 0 else -1
                self.bar(bone, (ua, s*Wf(ua), F(ua)), (ub, -s*Wf(ub), F(ub)), e3, .0085, db*.6, ext=.002)
        if lod == 0 and rungs:
            for u in nodes:
                for sv in (-1, 1):
                    for F, sw in ((Hi, 1),):
                        p = self.at(bone, u, sv*Wf(u), F(u)+sw*db*.5); self.cyl(p, p+e3*sw*.0026, .0040, STEEL, bone, sides=6, smooth=False)

# ------------------------------------------------------------------ walking legs
def leg2(g, id):
    L = M.LEG[id]; k = L['k']; ks = .62+.38*k; lod = g.lod
    cx, bs, me, ca, pr, da = [s+'_'+id for s in M.SEGS]
    e2 = g.axis(me, 1); pv = V3(L['pivot']); n0 = [22, 8][lod]
    Lme, Lca, Lpr, Lda = L['merus'], L['carpus'], L['propodus'], L['dactyl']
    tb, db = .0085*ks, .0110*ks                                   # rail section (along v, along w)
    # merus: two antagonist pairs in series on a mid bulkhead
    Rm, dm = .0185*ks, .0205*ks; rtm = max(.0015, .085*Rm)
    Wm = Rm+.004*ks+tb/2; Hm = dm+Rm+.004*ks+db/2
    # ---- hip: coxa yaw drum, short arm with a fork round the basis axle; basis block carrying the merus sheave
    g.cyl(pv-Z*.036*ks, pv+Z*.026*ks, .040*ks, DARK, cx, sides=n0)
    g.cyl(pv+Z*.026*ks, pv+Z*.031*ks, .030*ks, STEEL, cx, sides=n0)
    g.fbox(cx, .0, L['coxa'], .017*ks, .020*ks, DARK)
    if lod == 0:
        for sv in (-1, 1): g.lug(cx, L['coxa'], 0., .026*ks, .004, -.022*ks, .022*ks, sv*.0245*ks, .006*ks)
    g.axle(cx, V3(M.H[bs]), g.axis(cx, 1), .0275*ks, .019*ks, .0055*ks)
    g.cyl(g.at(bs, 0, -.0195*ks, 0), g.at(bs, 0, .0195*ks, 0), .021*ks, DARK, bs, sides=[16, 8][lod])
    g.fbox(bs, -.006, L['basis']-.6*dm, .0160*ks, .021*ks, DARK)
    g.sheave(bs, V3(M.H[me]), e2, dm, [0.], Wm-tb/2-.002, rtm)
    # ---- merus: pair A pulls back over the basis sheave (lifts the leg), pair B forward over the knee sheave
    rcm = .036*ks; u0 = rcm+.012*ks; u1 = Lme-.072*ks; um = .5*(u0+u1)
    for sv in (-1, 1):
        g.lug(me, 0., 0., rcm, u0, -Hm-db/2, Hm+db/2, sv*Wm, tb)
        g.lug(me, Lme, 0., rcm, u1, -Hm-db/2, Hm+db/2, sv*Wm, tb)
    g.axle(me, V3(M.H[me]), e2, Wm+tb/2, .023*ks, .0055*ks); g.axle(me, V3(M.H[ca]), e2, Wm+tb/2, .023*ks, .0055*ks)
    g.cage(me, u0, u1, lambda u: Wm, lambda u: -Hm, lambda u: Hm, [8, 3][lod], tb, db, bulk=[um])
    rp = max(.0024, .16*Rm)
    for sw in (-1, 1):
        w = sw*dm
        for u in (um-.014*ks, um+.014*ks): g.pin(me, u, w, Wm, rp)
        g.act(me, u0+.020*ks, um-.014*ks, 0., w, Rm, tend_a=0.)
        g.act(me, um+.014*ks, u1-.020*ks, 0., w, Rm, tend_b=Lme)
    # ---- carpus: narrow knee block inside the merus fork; its sheave takes the merus B tendons
    tbc, dbc = .0070*ks, .0095*ks; Rc, dc = .0115*ks, .0130*ks; rtc = max(.0015, .085*Rc)
    Wc = Wm-tb/2-.0015*ks-tbc/2; Hc = dc+Rc+.004*ks+dbc/2
    rct = .0315*ks; u0c = rct+.009*ks; u1c = Lca-.036*ks
    g.sheave(ca, V3(M.H[ca]), e2, dm, [0.], Wc-tbc/2-.0015, rtm)
    for sv in (-1, 1):
        g.lug(ca, 0., 0., rct, u0c, -Hc-dbc/2, Hc+dbc/2, sv*Wc, tbc)
        if lod == 0: g.lug(ca, Lca, 0., .030*ks, u1c, -Hc-dbc/2, Hc+dbc/2, sv*Wc, tbc)
    g.cage(ca, u0c, u1c, lambda u: Wc, lambda u: -Hc, lambda u: Hc, 2 if lod == 0 else 1, tbc, dbc, rungs=False)
    if lod == 0:
        for sw in (-1, 1):
            g.pin(ca, u0c+.010*ks, sw*dc, Wc, max(.0022, .16*Rc))
            g.act(ca, u0c+.010*ks, u1c-.004, 0., sw*dc, Rc, tend_b=Lca)
    # ---- propodus: fixed knuckle round the carpus, one pair driving the dactyl through long tendons
    tbp, dbp = .0080*ks, .0105*ks; Rp, dp = .0150*ks, .0165*ks; rtp = max(.0015, .085*Rp)
    Wp0 = Wc+tbc/2+.002*ks+tbp/2; Wd, td = .0095*ks, .0070*ks; Wp1 = Wd+td/2+.0015*ks+tbp/2
    Hp0 = dp+Rp+.004*ks+dbp/2; Hp1 = dp+.006*ks+dbp/2
    rcp = .034*ks; rcd = .026*ks; u0p = rcp+.010*ks; u1p = Lpr-.052*ks
    ua = u0p+.012*ks; utc = ua+.24*k; ut = utc+.02*ks
    Hpf = lambda u: Hp0 if u <= ut else Hp0+(Hp1-Hp0)*(u-ut)/(u1p-ut)
    Wpf = lambda u: Wp0 if u <= ut else Wp0+(Wp1-Wp0)*(u-ut)/(u1p-ut)
    g.sheave(pr, V3(M.H[pr]), e2, dc, [0.], Wc-tbc/2-.0015, rtc)
    for sv in (-1, 1):
        g.lug(pr, 0., 0., rcp, u0p, -Hp0-dbp/2, Hp0+dbp/2, sv*Wp0, tbp)
        g.lug(pr, Lpr, 0., rcd, u1p, -Hp1-dbp/2, Hp1+dbp/2, sv*Wp1, tbp)
    if lod: g.fbox(ca, u1c-.004, Lca+.01*ks, Wc+tbc/2, Hc, FRAME)   # game tier: knuckle as one block
    g.axle(pr, V3(M.H[pr]), e2, Wp0+tbp/2, .021*ks, .005*ks); g.axle(pr, V3(M.H[da]), e2, Wp1+tbp/2, .018*ks, .0045*ks)
    g.cage(pr, u0p, u1p, Wpf, lambda u: -Hpf(u), Hpf, [7, 3][lod], tbp, dbp, bulk=[ut] if lod == 0 else [], knots=[ut])
    for sw in (-1, 1):
        g.pin(pr, ua, sw*dp, Wp0, max(.0022, .16*Rp))
        g.act(pr, ua, utc, 0., sw*dp, Rp, tend_b=Lpr)
    # ---- dactyl: tongue and sheave in the propodus fork, tapered carbon spike, hardened steel point
    g.sheave(da, V3(M.H[da]), e2, dp, [0.], Wd-td/2-.001, rtp)
    for sv in (-1, 1): g.lug(da, 0., 0., .024*ks, .060*ks, -.016*ks, .016*ks, sv*Wd, td)
    st = [16, 6][lod]; r0 = .0165*ks; ustart = .036*ks; pts, rad = [], []
    for i in range(st+1):
        f = i/st; u = ustart+(Lda-ustart)*f; ff = u/Lda
        pts.append(g.at(da, u, 0., -.030*Lda*math.sin(math.pi*ff))); rad.append(r0*max(0., 1-ff)**.85 if i < st else 0.)
    cut = int(st*.86)
    g.sweep(pts[:cut+1], rad[:cut+1], FRAME, da, sides=[12, 5][lod], up=g.axis(da, 2))
    g.sweep(pts[cut:], rad[cut:], CLAW, da, sides=[12, 5][lod], up=g.axis(da, 2))
    if lod == 0:
        for f in (.16, .80):
            i = int(st*f); g.torus(pts[i], rad[i]*1.02, .0022, (pts[i+1]-pts[i-1]).normalized(), STEEL, da, 16, 4)

# ------------------------------------------------------------------ chelipeds
def w_bite(u): return .020+.008*(u-.30)/.33

def chela2(g, id):
    C = M.CHELA[id]; lod = g.lod; cx, bs, me, ca, pr, da = [s+'_'+id for s in M.SEGS]
    pv = V3(C['pivot']); e2 = g.axis(me, 1); n0 = [22, 10][lod]
    Lme, Lca = C['merus'], C['carpus']; hu, hw = C['hinge_u'], C['hinge_w']
    tb, db = .0090, .0115; Rm, dm = .0190, .0215; rtm = max(.0015, .085*Rm)
    Wm = Rm+.004+tb/2; Hm = dm+Rm+.004+db/2
    # ---- hip
    g.cyl(pv-Z*.034, pv+Z*.024, .038, DARK, cx, sides=n0); g.cyl(pv+Z*.024, pv+Z*.029, .028, STEEL, cx, sides=n0)
    g.fbox(cx, 0., C['coxa'], .017, .020, DARK)
    if lod == 0:
        for sv in (-1, 1): g.lug(cx, C['coxa'], 0., .025, .004, -.021, .021, sv*.0245, .006)
    g.axle(cx, V3(M.H[bs]), g.axis(cx, 1), .0275, .019, .0055)
    g.cyl(g.at(bs, 0, -.0195, 0), g.at(bs, 0, .0195, 0), .021, DARK, bs, sides=[16, 8][lod])
    g.fbox(bs, -.006, C['basis']-.6*dm, .016, .021, DARK)
    g.sheave(bs, V3(M.H[me]), e2, dm, [0.], Wm-tb/2-.002, rtm)
    # ---- merus: lift pair and elbow pair in series
    rcm = .038; u0 = .050; u1 = Lme-.074; um = .5*(u0+u1)
    for sv in (-1, 1):
        g.lug(me, 0., 0., rcm, u0, -Hm-db/2, Hm+db/2, sv*Wm, tb)
        g.lug(me, Lme, 0., rcm, u1, -Hm-db/2, Hm+db/2, sv*Wm, tb)
    g.axle(me, V3(M.H[me]), e2, Wm+tb/2, .024, .006); g.axle(me, V3(M.H[ca]), e2, Wm+tb/2, .024, .006)
    g.cage(me, u0, u1, lambda u: Wm, lambda u: -Hm, lambda u: Hm, [4, 2][lod], tb, db, bulk=[um])
    for sw in (-1, 1):
        w = sw*dm
        for u in (um-.014, um+.014): g.pin(me, u, w, Wm, .0026)
        g.act(me, u0+.018, um-.014, 0., w, Rm, tend_a=0.)
        g.act(me, um+.014, u1-.018, 0., w, Rm, tend_b=Lme)
    # ---- carpus: wrist block inside the merus fork, neck into the palm's ball
    Wc = Wm-tb/2-.0015-.0035
    g.sheave(ca, V3(M.H[ca]), e2, dm, [0.], Wc-.0035-.0015, rtm)
    for sv in (-1, 1): g.lug(ca, 0., 0., .034, .062, -.028, .028, sv*Wc, .007)
    g.fbox(ca, .044, .094, Wc-.002, .024, DARK)
    if lod == 0:
        for sv in (-1, 1):
            for u in (.054, .084): g.bolt(g.at(ca, u, sv*(Wc-.002), 0.), ca, axis=tuple(g.axis(ca, 1)*sv))
    g.torus(g.at(ca, .070), .026, .0030, g.axis(ca, 0), STEEL, ca, [20, 8][lod], [5, 3][lod])
    g.cyl(g.at(ca, .090), g.at(ca, Lca-.008), .0150, DARK, ca, sides=[14, 8][lod])
    # ---- palm: ball wrist, bowed open frame round a big closer and two slim openers, fork round the hinge
    rb = .032; g.ball(V3(M.H[pr]), rb, DARK, pr)
    g.torus(g.at(pr, rb*.62), rb*.79, .0030, g.axis(pr, 0), STEEL, pr, [20, 8][lod], [5, 3][lod])
    bow = lambda u: math.sin(math.pi*min(1., max(0., (u-.040)/.26)))
    Hi = lambda u: .058+.022*bow(u); Lo = lambda u: -.020-.020*bow(u); Wf = lambda u: .046+.008*bow(u)
    g.lathe(pr, g.at(pr, .016), g.axis(pr, 0), [(.026, 0.), (.036, .016), (.038, .026)], DARK, [18, 8][lod])
    g.cage(pr, .042, .222, Wf, Lo, Hi, [4, 2][lod], tb, db, knots=[.10, .15])
    for sv in (-1, 1): g.lug(pr, hu, hw, .044, .222, Lo(.222)-db/2, Hi(.222)+db/2, sv*Wf(.222), tb)
    g.axle(pr, g.at(pr, hu, 0., hw), g.axis(pr, 1), Wf(.222)+tb/2, .027, .0065)
    rsh = .030; wt = hw-rsh
    g.pin(pr, .052, wt, Wf(.052), .0030)
    g.act(pr, .052, .214, 0., wt, .0230, tend_b=hu)
    for sv in (-1, 1): g.act(pr, .052, .214, sv*.0325, wt, .0085, tend_b=hu)
    # pollex: open truss blade, cutting rail and ventral rail converging on a steel point
    ut0, ut1 = .222, .600; st = [12, 6][lod]   # tips end where takaashi_motion checks floor clearance
    cut = [g.at(pr, u, 0., w_bite(max(u, .30))-.0090-.0045) for u in [ut0+(ut1-ut0)*i/st for i in range(st+1)]]
    ven = []
    for i in range(st+1):
        u = ut0+(ut1-ut0)*i/st; s = i/st; ven.append(g.at(pr, u, 0., w_bite(max(u, .30))-.0135-.050*(1-s)**1.25))
    wv = [.014-.006*i/st for i in range(st+1)]
    g.ribbon(pr, cut, .009, wv, g.axis(pr, 1)); g.ribbon(pr, ven, .010, wv, g.axis(pr, 1))
    nweb = [5, 2][lod]
    for i in range(nweb):
        ia = int(round(st*i/nweb)); ib = int(round(st*(i+1)/nweb)); a, b = (cut[ia], ven[ib]) if i % 2 == 0 else (ven[ia], cut[ib])
        g.ribbon(pr, [a, b], .008, .009-.003*i/nweb, g.axis(pr, 1))
    tip0 = g.at(pr, ut1, 0., w_bite(ut1)-.0135); tip1 = g.at(pr, .632, 0., w_bite(.632)-.010)
    g.cyl(tip0-(tip1-tip0).normalized()*.004, tip1, .0085, CLAW, pr, r1=0., sides=[10, 6][lod])
    for i, u in enumerate([.325+.05*j for j in range(6)]):
        if lod and i % 2: continue
        s = (u-.30)/.33; g.tooth(pr, u, w_bite(u)-.0090, .0105*(1-.25*s), .014*(1-.3*s), .010*(1-.3*s), 1)
    # ---- dactyl (movable finger), authored closed in palm coordinates and offset to the hinge
    D = lambda u, w, v=0.: g.at(da, u-hu, v, w-hw)
    g.sheave(da, V3(M.H[da]), g.axis(da, 1), rsh, [0., -.0325, .0325], .043, .0025)
    for sv in (-1, 1): g.lug(da, 0., 0., rsh+.004, .050, -.040, .026, sv*.017, .006)
    g.fbox(da, .030, .052, .014, .030, DARK, w0=-.007)
    ud0, ud1 = .300, .615
    dcut = [D(u, w_bite(u)+.0090+.0045) for u in [ud0+(ud1-ud0)*i/st for i in range(st+1)]]
    dtop = []
    for i in range(st+1):
        u = ud0+(ud1-ud0)*i/st; s = i/st; dtop.append(D(u, w_bite(u)+.0135+.046*(1-s)**1.1))
    e2d = g.axis(da, 1); wv = [.013-.005*i/st for i in range(st+1)]
    g.ribbon(da, dcut, .009, wv, e2d); g.ribbon(da, dtop, .010, wv, e2d)
    for i in range(nweb):
        ia = int(round(st*i/nweb)); ib = int(round(st*(i+1)/nweb)); a, b = (dcut[ia], dtop[ib]) if i % 2 == 0 else (dtop[ia], dcut[ib])
        g.ribbon(da, [a, b], .008, .008-.003*i/nweb, e2d)
    tip0 = D(ud1, w_bite(ud1)+.0135); tip1 = D(.662, .010)   # hooks just past and below the pollex point when shut
    g.cyl(tip0-(tip1-tip0).normalized()*.004, tip1, .008, CLAW, da, r1=0., sides=[10, 6][lod])
    for i, u in enumerate([.350+.05*j for j in range(5)]):
        if lod and i % 2: continue
        s = (u-.30)/.33; g.tooth(da, u-hu, w_bite(u)+.0090-hw, .0105*(1-.25*s), .014*(1-.3*s), .010*(1-.3*s), -1)

# ------------------------------------------------------------------ body
def core_z(x, y):
    q = 1-(x/.060)**2-((y-.015)/.215)**2
    return .615+.060*math.sqrt(q) if q > 0 else None

def body2(g):
    lod = g.lod; rnd = random.Random(23)
    T.lattice(g)
    n = [72, 28][lod]; ring = []
    for i in range(n+1):
        a = math.tau*i/n; s = math.sqrt(1-T.ZCUT*T.ZCUT); ring.append(T.cara((s*math.cos(a), s*math.sin(a), T.ZCUT)))
    g.sweep(ring, [[.012, .015][lod]]*(n+1), FRAME, 'BODY', sides=[8, 5][lod])
    # slim dark spine core with a carbon keel: the space under the dome is left to the actuators
    T.ellipsoid_mesh(g, lambda p: Vector((p[0]*.060, .015+p[1]*.215, .615+p[2]*.060)), [14, 8][lod], [24, 12][lod], DARK, 'BODY')
    keel = [Vector((0., y, core_z(0., y)+.006)) for y in [-.17+.39*i/10 for i in range(11)]]
    g.ribbon('BODY', keel, .034, .010, Z)
    # sternum: dark block, open carbon ring and spokes to every coxa socket
    g.box((0, .03, .502), (.11, .33, .050), DARK, 'BODY', .006 if lod == 0 else 0)
    nr = [48, 20][lod]
    g.ribbon('BODY', [Vector((.262*math.cos(math.tau*i/nr), .03+.300*math.sin(math.tau*i/nr), .522)) for i in range(nr)], .018, .012, Z, closed=True, caps=False)
    limbs = [(id, V3(M.LEG[id]['pivot']), .62+.38*M.LEG[id]['k']) for id in M.LEGS]+[(id, V3(M.CHELA[id]['pivot']), .95) for id in M.CHELAE]
    for id, pv, ks in limbs:
        s = 1 if pv.x > 0 else -1
        g.ribbon('BODY', [Vector((s*.050, pv.y*.85+.02, .512)), pv+Vector((-s*.040*ks, 0, .022))], .022, .010, Z)
        # coxa socket: dark annular housing with a steel face round the coxa drum
        r_in, r_out = .041*ks, .055*ks
        g.lathe('BODY', pv, Z, [(r_in, .028), (r_out, .028), (r_out, .046), (r_in, .046)], DARK, [24, 8][lod], closed=True)
        if lod == 0: g.lathe('BODY', pv, Z, [(r_in+.002, .046), (r_out-.003, .046), (r_out-.003, .0485), (r_in+.002, .0485)], STEEL, 24, closed=True)
    # body actuators: from clevises on the keel down to a bracket over each coxa (they drive the coxa)
    for id, pv, ks in limbs:
        s = 1 if pv.x > 0 else -1; chela = id in M.CHELAE
        ya = -.170 if chela else pv.y*.80+.012
        a = Vector((s*.030, ya, core_z(0., ya)+.012)); b = Vector((s*(abs(pv.x)-.042*ks), pv.y, .574))
        d = (b-a).normalized(); pin_ax = d.cross(Z).normalized()
        g.box(b+Vector((0, 0, -.006)), (.030, .030, .022), DARK, 'BODY', .004 if lod == 0 else 0)
        g.box(a+Vector((-s*.006, 0, -.008)), (.016, .020, .016), STEEL, 'BODY', .002 if lod == 0 else 0)
        for p in (a, b): g.cyl(p-pin_ax*.012, p+pin_ax*.012, .0028, STEEL, 'BODY', sides=[8, 5][lod])
        g.actuator('BODY', a, b, .0145 if not chela else .0135, pin_ax)
    # dorsal spines and the rostrum, in claw steel
    count = [24, 10][lod]; pts = []; tries = 0
    while len(pts) < count and tries < 4000:
        tries += 1; v = Vector((rnd.gauss(0, 1), rnd.gauss(0, 1), abs(rnd.gauss(0, 1)))).normalized()
        if v.z < .25 or v.y > .7: continue
        if any((v-q).length < (.32 if lod == 0 else .45) for q in pts): continue
        pts.append(v)
    for v in pts:
        base = T.cara(v); nrm = (T.cara(v*1.02)-T.cara(v*.98)).normalized(); nrm = (nrm+Vector((0, .45, .25))).normalized()
        Ls = .032+.040*max(0., -v.y*.5+v.z*.6)+.010*rnd.random()
        g.cyl(base-nrm*.01, base+nrm*Ls, .0085, CLAW, 'BODY', r1=0., sides=[8, 5][lod], smooth=True)
    for s in (-1, 1):
        a = Vector((s*.118, -.285, .748)); g.sweep([a, a+Vector((s*.030, -.045, .030)), a+Vector((s*.050, -.085, .075))], [.009, .0055, 0.], CLAW, 'BODY', sides=[8, 5][lod])
        a = Vector((s*.022, -.335, .735))
        g.sweep([a, a+Vector((s*.010, -.060, .020)), a+Vector((s*.030, -.110, .065)), a+Vector((s*.042, -.135, .115))], [.012, .009, .0055, 0.], CLAW, 'BODY', sides=[8, 5][lod])
    # eyes: short carbon stalks, dark housings, small recessed #28a8ff lenses behind a steel bezel
    for side, s in (('L', 1), ('R', -1)):
        h = V3(M.H['EYESTALK_'+side]); bone = 'EYESTALK_'+side
        g.disc(h+Vector((0, .010, 0)), (0, 1, 0), .028, .010, DARK, 'BODY', sides=[16, 8][lod])
        tip = h+Vector((s*.004, -.030, .004)); fwd = Vector((0, -1, 0))
        g.cyl(h, tip, .010, FRAME, bone, r1=.0085, sides=[10, 6][lod])
        g.cyl(tip-fwd*.004, tip+fwd*.014, .0165, DARK, bone, sides=[16, 8][lod])
        g.cyl(tip+fwd*.0125, tip+fwd*.0142, .0105, LENS, bone, sides=[16, 8][lod])
        if lod == 0: g.torus(tip+fwd*.0142, .0128, .0022, fwd, STEEL, bone, 16, 5)
    for side, s in (('L', 1), ('R', -1)):
        h = V3(M.H['ANTENNA_'+side])
        g.sweep([h, h+Vector((s*.012, -.06, .030)), h+Vector((s*.034, -.14, .075)), h+Vector((s*.060, -.22, .095))], [.0055, .0042, .0026, 0.], CLAW, 'ANTENNA_'+side, sides=[6, 4][lod])
        # third maxillipeds and mandibles, parted in the rest mesh (about 8 and 6 degrees each side)
        h = V3(M.H['MAXILLIPED_'+side]); bone = 'MAXILLIPED_'+side; n1 = len(g.v)
        g.box(h+Vector((s*.010, -.012, -.036)), (.040, .012, .078), FRAME, bone, .003 if lod == 0 else 0)
        for kk in range(3):
            x = h.x+s*(-.006+kk*.014); bb = Vector((x, h.y-.016, h.z-.072))
            g.cyl(bb, bb+Vector((-s*.004, -.010, -.030+.006*kk)), .0050, CLAW, bone, r1=0., sides=[6, 4][lod])
        if lod == 0:
            for kk in range(3): g.bolt((h.x+s*(.002+kk*.012), h.y-.019, h.z-.010), bone, axis=(0, -1, 0))
        g.xform(n1, h, Matrix.Rotation(s*math.radians(8.), 3, 'Y'))
        h = V3(M.H['MANDIBLE_'+side]); n1 = len(g.v)
        g.sweep([h, h+Vector((s*.004, -.020, -.040)), h+Vector((-s*.004, -.034, -.075)), h+Vector((-s*.012, -.040, -.098))], [.011, .009, .0055, 0.], CLAW, 'MANDIBLE_'+side, sides=[8, 5][lod])
        g.xform(n1, h, Matrix.Rotation(s*math.radians(6.), 3, 'Y'))
    g.box((0, -.345, .565), (.12, .04, .10), DARK, 'BODY', .004 if lod == 0 else 0)
    h = V3(M.H['SENSOR_YAW'])
    g.cyl(h-Z*.012, h+Z*.008, .018, DARK, 'SENSOR_YAW', sides=[12, 6][lod])
    g.cyl(h+Vector((0, -.010, 0)), h+Vector((0, -.024, 0)), .0085, DARK, 'SENSOR_YAW', sides=[12, 6][lod])
    g.cyl(h+Vector((0, -.0238, 0)), h+Vector((0, -.0252, 0)), .0062, LENS, 'SENSOR_YAW', sides=[12, 6][lod])

def shape(lod):
    g = Crab2(lod)
    if lod == 2:
        T.body(g)
        for id in M.LEGS: T.walking_leg(g, id)
        for id in M.CHELAE: T.cheliped(g, id)
        return g
    body2(g)
    for id in M.LEGS: leg2(g, id)
    for id in M.CHELAE: chela2(g, id)
    return g

# ------------------------------------------------------------------ rig, skin, export
def make_arm(col):
    d = bpy.data.armatures.new('TK02_SKELETON'); arm = bpy.data.objects.new('TK02_RIG', d); col.objects.link(arm)
    bpy.context.view_layer.objects.active = arm; arm.select_set(True); bpy.ops.object.mode_set(mode='EDIT')
    for n in M.ORDER:
        b = d.edit_bones.new(n); b.head = V3(M.H[n]); b.tail = V3(M.H[n])+Vector((0, 0, .03)); b.use_deform = not n.startswith('SOCKET_')
        if M.PAR[n]: b.parent = d.edit_bones[M.PAR[n]]
    bpy.ops.object.mode_set(mode='OBJECT'); arm.show_in_front = True
    arm['rig'] = 'TAKAASHI-02 rigid braided-actuator rig (TAKAASHI-01 skeleton): 8 walking legs and 2 chelipeds of 6 segments, eyestalks, antennae, maxillipeds, mandibles'
    return arm

def make_skin(g, col, arm, lod):
    d = bpy.data.meshes.new('TK02_GEOMETRY'); d.from_pydata([tuple(v) for v in g.v], [], g.f); d.update()
    o = bpy.data.objects.new('TK02_SKIN', d); col.objects.link(o)
    if lod == 2:
        d.materials.append(material(0, True)); colors = d.color_attributes.new(name='Palette', type='FLOAT_COLOR', domain='CORNER')
        for p, m in zip(d.polygons, g.mi):
            for li in p.loop_indices: colors.data[li].color = (*DIST[m], 1)
        for p in d.polygons: p.use_smooth = False
    else:
        for i in range(6): d.materials.append(material(i))
        for p, m, sm_ in zip(d.polygons, g.mi, g.smooth): p.material_index = m; p.use_smooth = sm_
        shade = d.color_attributes.new(name='Braid', type='BYTE_COLOR', domain='POINT')
        for i, c in enumerate(g.c): shade.data[i].color = (c, c, c, 1.)
        d.color_attributes.active_color = shade
    bm = bmesh.new(); bm.from_mesh(d); bm.faces.ensure_lookup_table()
    fixed = g.fixed if len(g.fixed) == len(bm.faces) else [False]*len(bm.faces)
    bmesh.ops.recalc_face_normals(bm, faces=[f for f in bm.faces if not fixed[f.index]])
    if lod < 2:
        lim = math.radians(40.)
        for e in bm.edges:
            if len(e.link_faces) == 2 and e.calc_face_angle(0.) > lim: e.smooth = False
    bm.to_mesh(d); bm.free()
    if lod < 2:
        groups = {}
        for i, b in enumerate(g.b): groups.setdefault(b, []).append(i)
        for n in M.ORDER:
            if n in groups: o.vertex_groups.new(name=n).add(groups[n], 1., 'REPLACE')
        mod = o.modifiers.new('TK02_RigidBraided', 'ARMATURE'); mod.object = arm
    return o

def build():
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
    scene = bpy.context.scene; scene.name = 'TAKAASHI02_SPIDER_CRAB'; scene.render.fps = M.FPS; scene.frame_start = 0
    scene.frame_end = round(max(c['duration_s'] for c in M.CLIPS)*M.FPS); assets = []
    for lod in LODS:
        col = bpy.data.collections.new('TK02_LOD'+str(lod)); scene.collection.children.link(col)
        root = bpy.data.objects.new('ROOT', None); col.objects.link(root); root['forward'] = '+Z in glTF'; root['damage_level'] = 0
        g = shape(lod); log('LOD', lod, 'built', len(g.f), 'faces', len(g.v), 'verts')
        arm = make_arm(col); arm.parent = root; skin = make_skin(g, col, arm, lod)
        if lod < 2 and ANIMATE: T.animate(arm)
        bpy.ops.object.select_all(action='DESELECT')
        for o in col.objects: o.select_set(True)
        scene.frame_set(0); path = OUT/f'takaashi02_d0_lod{lod}.glb'
        bpy.ops.export_scene.gltf(filepath=str(path), export_format='GLB', use_selection=True, export_extras=True,
                                  export_animations=lod < 2 and ANIMATE, export_animation_mode='NLA_TRACKS', export_frame_range=False,
                                  export_force_sampling=True, export_cameras=False, export_lights=False, export_vertex_color='ACTIVE')
        e = dict(file=path.name, lod=lod, damage_level=0, static=lod == 2, derived=False, **T.measure(path), clips=M.CLIPS if lod < 2 else [],
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
    manifest = dict(family='takaashi02', label='TAKAASHI-02 / Braided Spider Crab', variant_of='takaashi01', plain_glb_source_of_truth=True,
        coordinate_system=dict(units='metres', up='+Y', forward='+Z', origin='ground under the carapace centre; crab left is +X'),
        damage_states={'d0': 'intact only'},
        animation=dict(fps=M.FPS, skeleton_joints=len(M.ORDER), motion_node='MOTION', body_node='BODY', engine_driven_excluded=['SENSOR_YAW'],
                       shared_with='takaashi01: identical joint names, rest pose, sockets and clips',
                       gait_topology='Lateral: alternating tetrapod L1 R2 L3 R4 / R1 L2 R3 L4. Forward: posterior-to-anterior wave, one leg per side in swing.'),
        lod_selection=dict(initial=2, approach_distance_m=30, hysteresis_m=8, lod0='Detailed recording master', lod1='Animated gameplay tier; keep while moving', lod2='Static standing distance/loading silhouette; no animation'),
        assets=assets)
    (OUT/'manifest.json').write_text(json.dumps(manifest, indent=2)+'\n'); log('TAKAASHI02_COMPLETE')

if __name__ == '__main__':
    build()
