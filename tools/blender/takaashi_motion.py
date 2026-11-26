"""TAKAASHI-01 mechanical spider crab: joint table, rest solve and authored motion.

Pure Python (no bpy, mathutils or numpy) so reach, contact and loop checks also
run outside Blender:  python3 tools/blender/takaashi_motion.py
Blender axes: metres, Z up, -Y forward (glTF +Z), +X is the crab's left.

Original procedural motion. Gait topology follows published decapod
observations: lateral walking with an alternating tetrapod (L1 R2 L3 R4 against
R1 L2 R3 L4), leading legs pulling by flexion and trailing legs pushing by
extension; slower forward walking as a posterior-to-anterior wave; chelae that
pick from the substrate and pass food to constantly working mouthparts. No
captured or third-party animation keys are used.
"""
import math

FPS = 60

# ---------------------------------------------------------------- vectors
def add(a, b): return (a[0]+b[0], a[1]+b[1], a[2]+b[2])
def sub(a, b): return (a[0]-b[0], a[1]-b[1], a[2]-b[2])
def mul(a, k): return (a[0]*k, a[1]*k, a[2]*k)
def dot(a, b): return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]
def cross(a, b): return (a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0])
def norm(a): return math.sqrt(dot(a, a))
def unit(a):
    n = norm(a)
    return mul(a, 1/n) if n > 1e-12 else a
def lerp(a, b, u): return add(a, mul(sub(b, a), u))
def mv(M, a): return tuple(M[i][0]*a[0]+M[i][1]*a[1]+M[i][2]*a[2] for i in range(3))
def mm(A, B): return tuple(tuple(sum(A[i][k]*B[k][j] for k in range(3)) for j in range(3)) for i in range(3))
def tr(A): return tuple(tuple(A[j][i] for j in range(3)) for i in range(3))
I3 = ((1., 0., 0.), (0., 1., 0.), (0., 0., 1.))
Z = (0., 0., 1.)
def rot(axis, ang):
    x, y, z = unit(axis); c = math.cos(ang); s = math.sin(ang); C = 1-c
    return ((c+x*x*C, x*y*C-z*s, x*z*C+y*s), (y*x*C+z*s, c+y*y*C, y*z*C-x*s), (z*x*C-y*s, z*y*C+x*s, c+z*z*C))
def rx(a): return rot((1, 0, 0), a)
def ry(a): return rot((0, 1, 0), a)
def rz(a): return rot((0, 0, 1), a)
def cols(e1, e2, e3): return tuple((e1[i], e2[i], e3[i]) for i in range(3))
def col(M, j): return (M[0][j], M[1][j], M[2][j])
def rot2(v, a): return (v[0]*math.cos(a)-v[1]*math.sin(a), v[0]*math.sin(a)+v[1]*math.cos(a))

# ---------------------------------------------------------------- easing
def clamp(x, a, b): return max(a, min(b, x))
def smooth(a, b, t):
    u = clamp((t-a)/(b-a), 0., 1.); return u*u*(3-2*u)
def pulse(a, b, c, d, t): return smooth(a, b, t)*(1-smooth(c, d, t))
def window(a, b, t):
    """0..1 progress inside [a,b], used for sin-shaped lifts."""
    return clamp((t-a)/(b-a), 0., 1.)
def _blend(a, b, u):
    return a+(b-a)*u if isinstance(a, (int, float)) else tuple(x+(y-x)*u for x, y in zip(a, b))
def spline(keys, t, period=None):
    """Catmull-Rom through (time, value[, 'hold']) keys; 'hold' keys have zero
    velocity. With period, the curve wraps seamlessly (last key == first + period)."""
    n = len(keys)
    if period:
        t = t % period
    if t <= keys[0][0]: return keys[0][1]
    if t >= keys[-1][0]: return keys[-1][1]
    for i in range(n-1):
        (t0, p0, *h0), (t1, p1, *h1) = keys[i], keys[i+1]
        if t0 <= t <= t1: break
    def tangent(j):
        k = keys[j]
        if len(k) > 2 and k[2] == 'hold': return None
        if period:
            a = keys[j-1] if j > 0 else (keys[-2][0]-period, keys[-2][1])
            b = keys[j+1] if j < n-1 else (keys[1][0]+period, keys[1][1])
        else:
            if j == 0 or j == n-1: return None
            a, b = keys[j-1], keys[j+1]
        dt = b[0]-a[0]
        return _blend(a[1], b[1], 1.) if False else (
            (b[1]-a[1])/dt if isinstance(a[1], (int, float)) else tuple((y-x)/dt for x, y in zip(a[1], b[1])))
    m0, m1 = tangent(i), tangent(i+1); dt = t1-t0; u = (t-t0)/dt
    h00 = 2*u**3-3*u*u+1; h10 = u**3-2*u*u+u; h01 = -2*u**3+3*u*u; h11 = u**3-u*u
    def comp(a, b, ma, mb): return h00*a+h10*dt*(ma or 0.)+h01*b+h11*dt*(mb or 0.)
    if isinstance(p0, (int, float)): return comp(p0, p1, m0, m1)
    return tuple(comp(p0[k], p1[k], m0[k] if m0 else 0., m1[k] if m1 else 0.) for k in range(len(p0)))

# ---------------------------------------------------------------- joint table
H = {}; PAR = {}; ORDER = []; FRAME = {}
def joint(name, p, parent):
    H[name] = tuple(float(x) for x in p); PAR[name] = parent; ORDER.append(name); FRAME.setdefault(name, I3)

BODY_Z = .61
TIP_Z = .002          # dactyl point rests 2 mm above the authored floor
PIVOT_Z = .50
LEGS = ['L1', 'L2', 'L3', 'L4', 'R1', 'R2', 'R3', 'R4']
CHELAE = ['CL', 'CR']
SEGS = ['COXA', 'BASIS', 'MERUS', 'CARPUS', 'PROPODUS', 'DACTYL']
CHELA_SEGS = ['COXA', 'BASIS', 'MERUS', 'CARPUS', 'PROPODUS', 'DACTYL']
PIVOT = {1: (.200, -.140), 2: (.238, -.020), 3: (.242, .100), 4: (.218, .212)}
YAW_DEG = {1: 40., 2: 12., 3: -16., 4: -42.}          # forward of lateral
REACH = {1: 1.34, 2: 1.28, 3: 1.18, 4: 1.02}          # pivot to tip, horizontal
SCALE = {1: 1.0, 2: .95, 3: .86, 4: .74}
LEN = dict(coxa=.060, basis=.090, merus=.840, carpus=.170, propodus=.700, dactyl=.420)
EPS0 = .30            # basis elevation above horizontal
BETA = .44            # fixed carpus-propodus bend, radians
DELTA0 = .42          # dactyl angle from vertical at rest reach
K_DELTA = .55         # dactyl slants further as the tip reaches out

LEG = {}
for _id in LEGS:
    s = 1 if _id[0] == 'L' else -1; i = int(_id[1]); k = SCALE[i]; y = math.radians(YAW_DEG[i])
    pivot = (s*PIVOT[i][0], PIVOT[i][1], PIVOT_Z); h = (s*math.cos(y), -math.sin(y), 0.)
    LEG[_id] = dict(s=s, i=i, k=k, pivot=pivot, reach=REACH[i], **{n: LEN[n]*k for n in LEN})
    LEG[_id]['tip'] = (pivot[0]+h[0]*REACH[i], pivot[1]+h[1]*REACH[i], TIP_Z)

CHELA = {}
for _id, s in (('CL', 1), ('CR', -1)):
    CHELA[_id] = dict(s=s, pivot=(s*.135, -.260, .505), coxa=.05, basis=.07, merus=.46, carpus=.14,
                      palm=.28, finger=.36, dactyl=.40, hinge_u=.262, hinge_w=.058, elevation=.20)
# Neutral claw pose, body-local: wrist (carpus-propodus joint), palm axis, roll, finger gap.
def W0(s): return (s*.34, -.80, .50)
def P0(s): return unit((-s*.10, -.72, -.69))
ROLL0 = .85
G0 = .30              # bind-pose dactyl opening, radians

MAX_REACH_ERROR = 0.; WORST_REACH = None

def ik2(A, C, L1, L2, tag):
    """Planar two-bone IK; middle joint on the counter-clockwise (dorsal) side."""
    global MAX_REACH_ERROR, WORST_REACH
    dx, dz = C[0]-A[0], C[1]-A[1]; raw = math.hypot(dx, dz)
    err = max(0., raw-(L1+L2), abs(L1-L2)-raw)
    if err > MAX_REACH_ERROR: MAX_REACH_ERROR = err; WORST_REACH = tag
    dist = min(L1+L2-1e-6, max(abs(L1-L2)+1e-6, raw)); ux, uz = dx/raw, dz/raw; nx, nz = -uz, ux
    along = (L1*L1-L2*L2+dist*dist)/(2*dist); hgt = math.sqrt(max(0., L1*L1-along*along))
    return (A[0]+ux*along+nx*hgt, A[1]+uz*along+nz*hgt)

def _plane(p0, target):
    d = sub(target, p0); h = unit((d[0], d[1], 0.)); return h, math.hypot(d[0], d[1]), d[2]

def _frames(P3, e2):
    out = []
    for a, b in zip(P3, P3[1:]):
        e1 = unit(sub(b, a)); out.append(cols(e1, e2, cross(e1, e2)))
    return out

def solve_leg(id, tip, lift=0., curl=0.):
    """Body-local walking leg. Returns joint heads COXA..DACTYL, the tip and frames.
    Columns of each frame: e1 along the segment, e2 hinge axis, e3 dorsal side."""
    L = LEG[id]; p0 = L['pivot']; h, rt, zt = _plane(p0, tip)
    P1 = (L['coxa'], 0.); e = EPS0+lift
    B = (P1[0]+L['basis']*math.cos(e), P1[1]+L['basis']*math.sin(e))
    delta = clamp(DELTA0+K_DELTA*(rt-L['reach'])-curl, -.45, 1.35)
    ddir = (math.sin(delta), -math.cos(delta))
    PD = (rt-L['dactyl']*ddir[0], zt-L['dactyl']*ddir[1])
    Lc, Lp = L['carpus'], L['propodus']
    chord = math.sqrt(Lc*Lc+Lp*Lp+2*Lc*Lp*math.cos(BETA)); gam = math.asin(Lp*math.sin(BETA)/chord)
    K = ik2(B, PD, L['merus'], chord, (id, 'knee'))
    cd = (PD[0]-K[0], PD[1]-K[1]); n = math.hypot(*cd); cd = (cd[0]/n, cd[1]/n)
    c1 = rot2(cd, gam); C = (K[0]+Lc*c1[0], K[1]+Lc*c1[1])
    p1 = rot2(cd, gam-BETA); PDr = (C[0]+Lp*p1[0], C[1]+Lp*p1[1])
    T = (PDr[0]+L['dactyl']*ddir[0], PDr[1]+L['dactyl']*ddir[1])
    pts = [(0., 0.), P1, B, K, C, PDr, T]
    P3 = [add(p0, add(mul(h, r), mul(Z, z))) for r, z in pts]
    return P3, _frames(P3, cross(Z, h))

def palm_frame(id, h, P, roll):
    C = CHELA[id]; P = unit(P); ref = cross(Z, h); ref = unit(sub(ref, mul(P, dot(P, ref))))
    e2 = mv(rot(P, roll*C['s']), ref); return cols(P, e2, cross(P, e2))

def solve_chela(id, W, P, roll, g):
    """Body-local cheliped. W = wrist (palm base), P = palm axis, g = dactyl gap."""
    C = CHELA[id]; p0 = C['pivot']; h, rw, zw = _plane(p0, W)
    P1 = (C['coxa'], 0.); e = C['elevation']; B = (P1[0]+C['basis']*math.cos(e), P1[1]+C['basis']*math.sin(e))
    E = ik2(B, (rw, zw), C['merus'], C['carpus'], (id, 'elbow'))
    d = (rw-E[0], zw-E[1]); n = math.hypot(*d); Wr = (E[0]+C['carpus']*d[0]/n, E[1]+C['carpus']*d[1]/n)
    pts = [(0., 0.), P1, B, E, Wr]
    P3 = [add(p0, add(mul(h, r), mul(Z, z))) for r, z in pts]
    frames = _frames(P3, cross(Z, h))
    palm = palm_frame(id, h, P, roll)
    dact = mm(rot(col(palm, 1), -g), palm)
    hinge = add(P3[4], mv(palm, (C['hinge_u'], 0., C['hinge_w'])))
    return P3+[hinge], frames+[palm, dact]

# ---------------------------------------------------------------- build rest skeleton
joint('MOTION', (0, 0, 0), None)
joint('BODY', (0, 0, BODY_Z), 'MOTION')
for _side, _s in (('L', 1), ('R', -1)):
    joint('EYESTALK_'+_side, (_s*.070, -.330, .720), 'BODY')
    joint('ANTENNA_'+_side, (_s*.028, -.368, .680), 'BODY')
    joint('MAXILLIPED_'+_side, (_s*.048, -.362, .595), 'BODY')
    joint('MANDIBLE_'+_side, (_s*.019, -.355, .566), 'BODY')
joint('SENSOR_YAW', (0, -.288, .772), 'BODY'); joint('SOCKET_SENSOR', (0, -.348, .772), 'SENSOR_YAW')
joint('SOCKET_MOUTH', (0, -.398, .530), 'BODY'); joint('SOCKET_PAYLOAD', (0, .040, .935), 'BODY')
for _id in LEGS:
    P3, F = solve_leg(_id, LEG[_id]['tip'])
    for j, seg in enumerate(SEGS):
        joint(seg+'_'+_id, P3[j], 'BODY' if j == 0 else SEGS[j-1]+'_'+_id); FRAME[seg+'_'+_id] = F[j]
    joint('SOCKET_TIP_'+_id, P3[6], 'DACTYL_'+_id); FRAME['SOCKET_TIP_'+_id] = F[5]
for _id in CHELAE:
    s = CHELA[_id]['s']; P3, F = solve_chela(_id, W0(s), P0(s), ROLL0, G0)
    for j, seg in enumerate(CHELA_SEGS):
        parent = 'BODY' if j == 0 else ('PROPODUS_'+_id if seg == 'DACTYL' else CHELA_SEGS[j-1]+'_'+_id)
        joint(seg+'_'+_id, P3[j], parent); FRAME[seg+'_'+_id] = F[j]
    palm = F[4]
    joint('SOCKET_GRIP_'+_id, add(P3[4], mv(palm, (.47, 0., .014))), 'PROPODUS_'+_id); FRAME['SOCKET_GRIP_'+_id] = palm
REST_REACH_ERROR = MAX_REACH_ERROR

# ---------------------------------------------------------------- clips
TETRA = {'L1': 0., 'R2': .03, 'L3': .015, 'R4': .045, 'R1': .5, 'L2': .53, 'R3': .515, 'L4': .545}
WAVE = {'L4': 0., 'L3': .25, 'L2': .5, 'L1': .75, 'R4': .5, 'R3': .75, 'R2': 0., 'R1': .25}
GAITS = {
    'Scuttle_Left_Cycle': dict(T=1.5, duty=.62, v=(.30, 0.), w=0., lift=.13, phase=TETRA),
    'Scuttle_Right_Cycle': dict(T=1.5, duty=.62, v=(-.30, 0.), w=0., lift=.13, phase=TETRA),
    'Forward_Walk_Cycle': dict(T=2.4, duty=.75, v=(0., -.16), w=0., lift=.10, phase=WAVE),
    'Turn_Left_Cycle': dict(T=2.0, duty=.62, v=(0., 0.), w=.22, lift=.11, phase=TETRA),
    'Turn_Right_Cycle': dict(T=2.0, duty=.62, v=(0., 0.), w=-.22, lift=.11, phase=TETRA),
}
def _gltf_v(v): return [round(v[0], 6), 0.0, round(-v[1], 6)]
CLIPS = [
    {'name': 'Watch_Idle', 'duration_s': 4.0, 'loop': True, 'swing_windows_s': {'L2': [.5, 1.1], 'R3': [2.4, 3.0]},
     'description': 'Planted watch: breathing body, scanning eyestalks, working mouthparts, idle claw flexing and two single-leg resets.'},
]
for _n in ['Scuttle_Left_Cycle', 'Scuttle_Right_Cycle', 'Forward_Walk_Cycle', 'Turn_Left_Cycle', 'Turn_Right_Cycle']:
    _g = GAITS[_n]
    CLIPS.append({'name': _n, 'duration_s': _g['T'], 'loop': True,
                  'gait': 'posterior-to-anterior wave' if _g['phase'] is WAVE else 'alternating tetrapod',
                  'duty_factor': _g['duty'], 'touchdown_phase': dict(_g['phase']), 'swing_lift_m': _g['lift'],
                  'velocity_mps': _gltf_v(_g['v']), 'speed_mps': round(math.hypot(*_g['v']), 6),
                  'yaw_rate_rad_s': _g['w']})
CLIPS += [
    {'name': 'Feed_Cycle', 'duration_s': 4.0, 'loop': True, 'phase_landmarks_s': {'CL_pinch': .82, 'CL_mouth': 2.1, 'CR_pinch': 2.82, 'CR_mouth': .1},
     'description': 'Lowered body; chelae alternately pick from the floor and pass food to fast-working mouthparts while the other claw waits aside.'},
    {'name': 'Claw_Snap', 'duration_s': 2.4, 'loop': False, 'events_s': {'snap_CL': 1.05, 'snap_CR': 1.20},
     'description': 'Raise and open both chelae, tremble, then close each in 70 ms and settle.'},
    {'name': 'Threat_Display', 'duration_s': 4.0, 'loop': False, 'phase_landmarks_s': {'raised': .95, 'release': 2.9, 'settled': 3.8}, 'swing_windows_s': {'L1': [.30, 3.55], 'R1': [.30, 3.55]},
     'description': 'Rise on six legs, lift the first walking pair, spread and pulse the open chelae, then settle.'},
]
DURATION = {c['name']: c['duration_s'] for c in CLIPS}

def neutral():
    return dict(body=(0., 0., 0.), ypr=(0., 0., 0.),
                feet={id: (LEG[id]['tip'], 0., 0., True) for id in LEGS},
                chela={id: (W0(CHELA[id]['s']), P0(CHELA[id]['s']), ROLL0, G0) for id in CHELAE},
                eye={'L': (0., 0.), 'R': (0., 0.)}, maxilliped=.10, mandible=0., antenna={'L': (0., 0.), 'R': (0., 0.)})

def gait_foot(g, id, u):
    """Tip in the MOTION frame, swing progress and contact for a cyclic gait."""
    T, d = g['T'], g['duty']; F = LEG[id]['tip']; vx, vy = g['v']; w = g['w']
    def planted(tau):
        p = mv(rz(-w*tau), F); return (p[0]-vx*tau, p[1]-vy*tau, TIP_Z)
    p = (u-g['phase'][id]) % 1.
    if p < d: return planted((p-d/2)*T), 0., True
    q = (p-d)/(1-d); Ts = (1-d)*T; a = planted(d*T/2); b = planted(-d*T/2); eps = 1e-4
    va = mul(sub(planted(d*T/2+eps), planted(d*T/2-eps)), 1/(2*eps)); vb = mul(sub(planted(-d*T/2+eps), planted(-d*T/2-eps)), 1/(2*eps))
    h00 = 2*q**3-3*q*q+1; h10 = q**3-2*q*q+q; h01 = -2*q**3+3*q*q; h11 = q**3-q*q
    x = h00*a[0]+h10*Ts*va[0]+h01*b[0]+h11*Ts*vb[0]; y = h00*a[1]+h10*Ts*va[1]+h01*b[1]+h11*Ts*vb[1]
    # Quick lift, travel high, then a slower, deliberate placement of the point.
    s = math.sin(math.pi*q**.85)**2
    return (x, y, TIP_Z+g['lift']*s), math.sin(math.pi*q), False

def eye_track(t, period=4.0):
    k = [(0., 0.), (.45, .32), (1.5, .30, 'hold'), (1.9, -.28), (3.1, -.30, 'hold'), (3.5, 0.), (4.0, 0.)]
    return spline(k, t, period)

def state(clip, t):
    st = neutral(); s2 = {'L': 1, 'R': -1}
    if clip == 'Watch_Idle':
        w = math.tau/4.0
        # Every idle term is zero at t=0, so the loop starts on the neutral (bind) pose
        # that the one-shot clips also start and end on.
        st['body'] = (.004*math.sin(w*t), 0., .006*math.sin(2*w*t))
        st['ypr'] = (.010*math.sin(w*t), .008*math.sin(2*w*t), -.010*math.sin(2*w*t))
        for id, a, b, out in (('L2', .5, 1.1, .03), ('R3', 2.4, 3.0, .02)):
            q = window(a, b, t)
            if 0 < q < 1:
                tip = LEG[id]['tip']; hh = unit((tip[0]-LEG[id]['pivot'][0], tip[1]-LEG[id]['pivot'][1], 0.))
                sw = math.sin(math.pi*q); st['feet'][id] = (add(tip, add(mul(hh, out*sw), (0., 0., .055*sw**2))), .6*sw, .25*sw, False)
        for id in CHELAE:
            s = CHELA[id]['s']; k = 1 if s > 0 else 2; a = 1. if s > 0 else -.7
            st['chela'][id] = (add(W0(s), (0., -.012*a*math.sin(k*w*t), .014*math.sin(k*w*t))), P0(s), ROLL0, G0+.10*a*math.sin(2*k*w*t))
        y = eye_track(t); st['eye'] = {'L': (y+.05*math.sin(2*w*t), .04*math.sin(w*t)), 'R': (y-.05*math.sin(3*w*t), -.04*math.sin(w*t))}
        st['maxilliped'] = .10+.08*math.sin(math.tau*2*t); st['mandible'] = .06*math.sin(math.tau*t)
        st['antenna'] = {k: ((.14 if k == 'L' else -.11)*math.sin(math.tau*.75*t), .06*math.sin(math.tau*.5*t)) for k in 'LR'}
    elif clip in GAITS:
        g = GAITS[clip]; T = g['T']; u = (t/T) % 1.; wave = math.tau*u
        for id in LEGS:
            tip, lf, c = gait_foot(g, id, u); st['feet'][id] = (tip, .9*lf, .30*lf, c)
        if g['phase'] is WAVE:
            st['body'] = (.006*math.sin(wave), 0., -.004-.004*math.cos(4*wave))
            st['ypr'] = (.012*math.sin(wave), .012*math.sin(wave+.6), .010*math.sin(2*wave))
            look = (0., -.06)
        elif g['w']:
            sg = 1 if g['w'] > 0 else -1
            st['body'] = (0., 0., -.008-.008*math.cos(2*wave))
            st['ypr'] = (sg*.03*math.sin(2*wave), sg*.015, .008*math.sin(2*wave))
            look = (sg*.28, -.04)
        else:
            sg = 1 if g['v'][0] > 0 else -1
            st['body'] = (sg*.010*math.sin(2*wave), 0., -.010-.009*math.cos(2*wave))
            st['ypr'] = (.012*math.sin(wave), sg*(.028+.010*math.sin(2*wave)), .006*math.sin(2*wave))
            look = (sg*.42, -.02)
        st['eye'] = {k: (look[0]+.03*math.sin(2*wave+(0 if k == 'L' else 1)), look[1]) for k in 'LR'}
        for id in CHELAE:
            s = CHELA[id]['s']; carry = add(W0(s), (-s*.03, .03, .07))
            st['chela'][id] = (add(carry, (0., 0., .012*math.sin(2*wave+(0 if s > 0 else math.pi)))), unit(add(P0(s), (0., -.12, .10))), ROLL0, .18+.05*math.sin(2*wave))
        st['maxilliped'] = .10+.05*math.sin(2*wave)
        st['mandible'] = .03*math.sin(2*wave)
        st['antenna'] = {k: (.10*math.sin(2*wave+(0 if k == 'L' else 1.4)), .05) for k in 'LR'}
    elif clip == 'Feed_Cycle':
        w = math.tau/4.0
        st['body'] = (0., -.01, -.065+.006*math.sin(2*w*t))
        st['ypr'] = (.025*math.sin(w*t), .012*math.sin(w*t+.5), .075+.008*math.sin(2*w*t))
        for id in CHELAE:
            st['chela'][id] = feed_claw(id, (t-(0. if id == 'CL' else 2.0)) % 4.0)
        st['eye'] = {'L': (.10*math.sin(w*t), .26), 'R': (.10*math.sin(w*t+.4), .26)}
        st['maxilliped'] = .16+.13*math.sin(math.tau*3*t); st['mandible'] = .10*math.sin(math.tau*1.5*t)
        st['antenna'] = {k: (.08*math.sin(math.tau*t+(0 if k == 'L' else 2.)), -.12) for k in 'LR'}
    elif clip == 'Claw_Snap':
        up = pulse(.05, .55, 1.55, 2.30, t)
        st['body'] = (0., .012*up, .028*up-.018*pulse(1.05, 1.11, 1.13, 1.45, t))
        st['ypr'] = (0., 0., -.055*up+.025*pulse(1.05, 1.10, 1.25, 1.6, t))
        for id, snap in (('CL', 1.05), ('CR', 1.20)):
            s = CHELA[id]['s']; ready = (s*.36, -.86, .70); Pr = unit((s*.08, -.95, .25))
            W = lerp(W0(s), ready, up); P = unit(lerp(P0(s), Pr, up)); roll = ROLL0+(.15-ROLL0)*.6*up
            trem = .0035*math.sin(math.tau*9*t)*pulse(.55, .65, snap-.05, snap, t)
            thrust = .045*pulse(snap, snap+.07, snap+.12, snap+.40, t)
            W = add(W, add(mul(P, thrust), (0., 0., trem)))
            gap = G0+(.95-G0)*smooth(.10, .55, t)
            gap = gap*(1-smooth(snap, snap+.07, t))+0.*smooth(snap, snap+.07, t)
            gap = gap+(G0-gap)*smooth(1.6, 2.3, t)
            st['chela'][id] = (W, P, roll, gap)
        st['eye'] = {k: (.08*math.sin(math.tau*.8*t)*up, -.05*up) for k in 'LR'}
        st['maxilliped'] = .10+.06*up; st['mandible'] = .10*up
        st['antenna'] = {k: (.25*up, .12*up) for k in 'LR'}
    elif clip == 'Threat_Display':
        up = smooth(.10, .95, t)*(1-smooth(2.9, 3.8, t)); hold = pulse(.85, 1.1, 2.7, 2.95, t)
        sway = .030*math.sin(math.tau*.55*(t-.9))*hold
        st['body'] = (sway, .03*up, .160*up)
        st['ypr'] = (.05*math.sin(math.tau*.55*(t-.9)+.8)*hold, -.04*math.sin(math.tau*.55*(t-.9))*hold, -.13*up)
        lift = smooth(.30, .95, t)*(1-smooth(2.85, 3.55, t))
        for id in ('L1', 'R1'):
            tip = LEG[id]['tip']; pv = LEG[id]['pivot']; hh = unit((tip[0]-pv[0], tip[1]-pv[1], 0.))
            wave = .05*math.sin(math.tau*.9*(t-1.0)+(0 if id == 'L1' else 1.5))*hold
            raised = add(tip, add(mul(hh, -.18), (0., -.10, .52+wave)))
            st['feet'][id] = (lerp(tip, raised, lift), .25*lift, -.55*lift, lift <= 0.)
        for id in CHELAE:
            s = CHELA[id]['s']; spread = (s*.52, -.70, .80); Pt = unit((s*.50, -.55, .65))
            pump = .06*math.sin(math.tau*1.1*(t-1.0))*hold
            W = add(lerp(W0(s), spread, up), (0., 0., pump*.25))
            P = unit(lerp(P0(s), Pt, up)); gap = G0+(.92-G0)*up-.30*max(0., math.sin(math.tau*1.1*(t-1.0)))*hold
            st['chela'][id] = (W, P, ROLL0+(.30-ROLL0)*up, gap)
        st['eye'] = {k: (.10*math.sin(math.tau*.55*(t-.9))*hold, -.10*up) for k in 'LR'}
        st['maxilliped'] = .10+.18*up; st['mandible'] = .16*up
        st['antenna'] = {k: (.35*up, .20*up) for k in 'LR'}
    return st

def feed_claw(id, tau):
    s = CHELA[id]['s']; mouth = H['SOCKET_MOUTH']
    # Food is passed across the mouth with the palm held transversely, as crabs do.
    # Mouth pose chosen by a clearance search (palm frame at least 1 cm off its own merus, fingers
    # in front of the mouthparts, grip within 9 cm of SOCKET_MOUTH).
    W_m = (s*.275, -.76, .757); P_m = unit((-s*.575, .629, -.523))
    W_p = (s*.42, -.82, .70); P_p = unit((-s*.10, -.62, -.78))
    W_r = add(W_p, (0., -.01, .07))
    # mouth -> reach out -> descend/pick -> lift -> mouth, all loop-continuous.
    # The waiting claw parks aside, so only one palm crosses the mouth at a time. Leaving the mouth
    # the claw rises and turns through a midway heading over a full second (under 15 degrees per
    # 30 fps frame), so the fingers neither snap round nor sweep the floor.
    W_a = (s*.36, -.74, .58); P_a = P0(s)
    W_x = (s*0.36, -0.8, 0.76); P_x = unit((-s*0.4, -0.3, -0.7))
    W = spline([(0., W_a), (.40, W_r), (.70, W_p, 'hold'), (.95, W_p, 'hold'), (1.35, W_r), (1.75, W_m, 'hold'), (2.4, W_m, 'hold'), (2.9, W_x), (3.4, W_a, 'hold'), (4.0, W_a, 'hold')], tau)
    P = unit(spline([(0., P_a), (.45, P_p), (.95, P_p, 'hold'), (1.35, P_p), (1.75, P_m, 'hold'), (2.4, P_m, 'hold'), (2.9, P_x), (3.4, P_a, 'hold'), (4.0, P_a, 'hold')], tau))
    gap = spline([(0., .25), (.55, .78), (.70, .80, 'hold'), (.82, .02, 'hold'), (1.75, .04), (2.4, .06), (3.2, .25, 'hold'), (4.0, .25, 'hold')], tau)
    gap += .10*max(0., math.sin(math.tau*1.5*(tau-1.75)))*pulse(1.75, 1.8, 2.25, 2.4, tau)
    W = add(W, (0., .010*math.sin(math.tau*2*tau)*pulse(1.8, 1.9, 2.25, 2.4, tau), 0.))
    roll = spline([(0., ROLL0), (.5, ROLL0), (.95, ROLL0, 'hold'), (1.6, .68), (2.4, .68, 'hold'), (3.4, ROLL0, 'hold'), (4.0, ROLL0, 'hold')], tau)
    return W, P, roll, gap

# ---------------------------------------------------------------- pose
def pose(clip, t):
    """Absolute joint heads and rest-relative rotations in armature space."""
    st = state(clip, t)
    yaw, roll, pitch = st['ypr']; R = mm(rz(yaw), mm(ry(roll), rx(pitch)))
    bp = add(H['BODY'], st['body']); hb = H['BODY']
    def B(p): return add(bp, mv(R, sub(p, hb)))
    Rt = tr(R)
    pos = {'MOTION': (0., 0., 0.), 'BODY': bp}; ori = {'MOTION': I3, 'BODY': R}
    def rigid(n, local=I3):
        pos[n] = B(H[n]); ori[n] = mm(R, local)
    for side, sg in (('L', 1), ('R', -1)):
        ey, ep = st['eye'][side]; rigid('EYESTALK_'+side, mm(rz(ey), rx(ep)))
        a1, a2 = st['antenna'][side]; rigid('ANTENNA_'+side, mm(rz(sg*a1), rx(-a2)))
        rigid('MAXILLIPED_'+side, ry(-sg*st['maxilliped']))
        rigid('MANDIBLE_'+side, mm(ry(-sg*abs(st['mandible'])), rx(.4*st['mandible'])))
    for n in ('SENSOR_YAW', 'SOCKET_SENSOR', 'SOCKET_MOUTH', 'SOCKET_PAYLOAD'): rigid(n)
    contact = {}
    for id in LEGS:
        tip, lift, curl, stance = st['feet'][id]; local = add(hb, mv(Rt, sub(tip, bp)))
        P3, F = solve_leg(id, local, lift*.20, curl)
        for j, seg in enumerate(SEGS):
            n = seg+'_'+id; pos[n] = B(P3[j]); ori[n] = mm(mm(R, F[j]), tr(FRAME[n]))
        pos['SOCKET_TIP_'+id] = B(P3[6]); ori['SOCKET_TIP_'+id] = ori['DACTYL_'+id]
        contact[id] = stance
    gaps = {}; tips = {}
    for id in CHELAE:
        W, P, rl, g = st['chela'][id]; P3, F = solve_chela(id, W, P, rl, g)
        for j, seg in enumerate(CHELA_SEGS):
            n = seg+'_'+id; pos[n] = B(P3[j]); ori[n] = mm(mm(R, F[j]), tr(FRAME[n]))
        n = 'SOCKET_GRIP_'+id; pos[n] = add(pos['PROPODUS_'+id], mv(ori['PROPODUS_'+id], sub(H[n], H['PROPODUS_'+id]))); ori[n] = ori['PROPODUS_'+id]
        gaps[id] = g
        # Finger points (palm-frame pollex tip, dactyl-frame tip) for clearance checks.
        Fp = mm(R, F[4]); Fd = mm(R, F[5]); C = CHELA[id]
        tips[id] = (add(pos['PROPODUS_'+id], mv(Fp, (C['palm']+C['finger']-.01, 0., .016))), add(pos['DACTYL_'+id], mv(Fd, (C['dactyl'], .014, -.058))))
    return pos, ori, dict(contact=contact, gap=gaps, finger_tips=tips)

def instance_transform(clip, t):
    """Engine-applied travel for cyclic gaits: world = Rz(w t) local + v t."""
    g = GAITS.get(clip)
    if not g: return I3, (0., 0., 0.)
    return rz(g['w']*t), (g['v'][0]*t, g['v'][1]*t, 0.)

def to_world(clip, t, p):
    M, o = instance_transform(clip, t); return add(mv(M, p), o)

# ---------------------------------------------------------------- self-test
def self_test(hz=120):
    global MAX_REACH_ERROR
    report = {'rest_reach_error_m': REST_REACH_ERROR, 'clips': {}}
    lengths = {}
    for n in ORDER:
        p = PAR[n]
        if p and p not in ('MOTION',): lengths[n] = norm(sub(H[n], H[p]))
    for c in CLIPS:
        name, T = c['name'], c['duration_s']; frames = round(T*hz)
        MAX_REACH_ERROR = 0.; slip = 0.; minz = 1e9; minsup = 8; seg = 0.; anchors = {}; gmin = 9; gmax = -9
        first = None; fmin = 9.
        for f in range(frames+1):
            t = f/hz; pos, ori, info = pose(name, t)
            for n, l in lengths.items(): seg = max(seg, abs(norm(sub(pos[n], pos[PAR[n]]))-l))
            minz = min(minz, min(pos[n][2] for n in pos if n != 'MOTION'))
            sup = 0
            for id in LEGS:
                w = to_world(name, t, pos['SOCKET_TIP_'+id])
                if info['contact'][id]:
                    sup += 1
                    if id in anchors: slip = max(slip, norm(sub(w, anchors[id])))
                    else: anchors[id] = w
                else: anchors.pop(id, None)
            minsup = min(minsup, sup); gmin = min(gmin, *info['gap'].values()); gmax = max(gmax, *info['gap'].values())
            fmin = min(fmin, *(p[2] for pair in info['finger_tips'].values() for p in pair))
            if f == 0: first = pos
        rest = pose('Watch_Idle', 0.)[0]
        seam = max(norm(sub(first[n], pos[n])) for n in pos) if c['loop'] else max(max(norm(sub(first[n], rest[n])), norm(sub(pos[n], rest[n]))) for n in pos)
        idle_vs_bind = max(norm(sub(rest[n], H[n])) for n in pos)
        report['clips'][name] = dict(reach_error_m=round(MAX_REACH_ERROR, 6), worst=str(WORST_REACH) if MAX_REACH_ERROR else None,
            stance_slip_m=round(slip, 6), min_joint_z_m=round(minz, 4), min_support=minsup, segment_error_m=round(seg, 8),
            seam_m=round(seam, 6), finger_tip_min_z_m=round(fmin, 4), gap_range_rad=(round(gmin, 3), round(gmax, 3)), idle_start_vs_bind_m=round(idle_vs_bind, 6))
    return report

if __name__ == '__main__':
    import json
    print(json.dumps(self_test(), indent=1))
    print('joints', len(ORDER))
    for id in ('L1', 'L2', 'L3', 'L4'): print(id, 'knee z %.3f' % H['CARPUS_'+id][2], 'tip', tuple(round(x, 3) for x in H['SOCKET_TIP_'+id]))
    for id in CHELAE: print(id, 'grip', tuple(round(x, 3) for x in H['SOCKET_GRIP_'+id]), 'dactyl', tuple(round(x, 3) for x in H['DACTYL_'+id]))
