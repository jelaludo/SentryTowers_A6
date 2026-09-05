"""Dependency-free, rigid-part glTF 2.0 sentry generator. +Y up, +Z forward."""
import json, math, struct
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / 'assets'
COLORS = [('Armor', [.16,.21,.26]), ('Edge', [.32,.40,.46]), ('Dark', [.035,.05,.065]), ('Copper', [.55,.27,.10]), ('Signal', [0,.8,1]), ('Identification', [.65,.06,.04])]

class Model:
    def __init__(self, family, tier, color):
        self.data = bytearray()
        self.doc = dict(asset={'version':'2.0','generator':'Sentry Workshop'}, scene=0, scenes=[{'nodes':[0]}], nodes=[], meshes=[], materials=[], buffers=[], bufferViews=[], accessors=[])
        for name, rgb in COLORS:
            rgb = color if name == 'Signal' else rgb
            mat = dict(name=name, pbrMetallicRoughness=dict(baseColorFactor=rgb+[1], metallicFactor=.65, roughnessFactor=.38))
            if name == 'Signal': mat['emissiveFactor'] = rgb
            self.doc['materials'].append(mat)
        self.root=self.node('ROOT', None)
        self.base=self.node('BASE', self.root)
        self.yaw=self.node('YAW',self.root, [0,.55,0])
        self.pitch=self.node('PITCH',self.yaw,[0,.48,0])
        self.recoil=self.node('RECOIL',self.pitch)
        self.doc['nodes'][0]['extras']={'family':family,'tier':tier,'forward':'+Z','up':'+Y','stationary':family=='Relay'}
    def node(self,name,parent,pos=None):
        n={'name':name,'translation':pos or [0,0,0]}; i=len(self.doc['nodes']); self.doc['nodes'].append(n)
        if parent is not None: self.doc['nodes'][parent].setdefault('children',[]).append(i)
        return i
    def accessor(self,values,kind,width):
        while len(self.data)%4:self.data.append(0)
        offset=len(self.data); flat=[v for row in values for v in row]
        self.data.extend(struct.pack('<'+'f'*len(flat),*flat))
        vi=len(self.doc['bufferViews']); self.doc['bufferViews'].append(dict(buffer=0,byteOffset=offset,byteLength=len(flat)*4))
        a=dict(bufferView=vi,componentType=5126,count=len(values),type=kind)
        if width==3: a.update(min=[min(v[j] for v in values) for j in range(3)],max=[max(v[j] for v in values) for j in range(3)])
        ai=len(self.doc['accessors']);self.doc['accessors'].append(a);return ai
    def shape(self,name,parent,pos,size,mat=0,sides=0,axis='y',taper=1,hollow=0):
        verts=[]; norms=[]
        def face(points):
            a,b,c=points[:3]; u=[b[i]-a[i] for i in range(3)];v=[c[i]-a[i] for i in range(3)]
            n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];l=math.sqrt(sum(x*x for x in n));n=[x/l for x in n]
            for k in range(1,len(points)-1):verts.extend([points[0],points[k],points[k+1]]);norms.extend([n]*3)
        if sides:
            rings=[[(math.cos(i*2*math.pi/sides)*(.5 if h==0 else taper*.5),h-.5,math.sin(i*2*math.pi/sides)*(.5 if h==0 else taper*.5)) for i in range(sides)] for h in range(2)]
            if hollow:
                inner=[[(x*hollow,y,z*hollow) for x,y,z in ring] for ring in rings]
                for i in range(sides):
                    j=(i+1)%sides
                    face([inner[0][i],inner[0][j],inner[1][j],inner[1][i]])
                    face([rings[0][i],rings[0][j],inner[0][j],inner[0][i]])
                    face([rings[1][j],rings[1][i],inner[1][i],inner[1][j]])
            else:
                face(rings[0]);face(list(reversed(rings[1])))
            for i in range(sides):j=(i+1)%sides;face([rings[0][i],rings[1][i],rings[1][j],rings[0][j]])
        else:
            p=[(-.5,-.5,-.5),(.5,-.5,-.5),(.5,.5,-.5),(-.5,.5,-.5),(-.5,-.5,.5),(.5,-.5,.5),(.5,.5,.5),(-.5,.5,.5)]
            for ids in [(0,3,2,1),(4,5,6,7),(0,4,7,3),(1,2,6,5),(0,1,5,4),(3,7,6,2)]:face([p[i] for i in ids])
        def rotate(v):return [v[0],-v[2],v[1]] if axis=='z' else ([v[1],-v[0],v[2]] if axis=='x' else list(v))
        verts=[[rotate(v)[j]*size[j] for j in range(3)] for v in verts]
        norms=[rotate(n) for n in norms]
        # inverse-transpose the nonuniform scale, then normalize
        norms=[[n[j]/size[j] for j in range(3)] for n in norms]
        norms=[[x/math.sqrt(sum(q*q for q in n)) for x in n] for n in norms]
        mesh=len(self.doc['meshes']); self.doc['meshes'].append({'name':name,'primitives':[{'attributes':{'POSITION':self.accessor(verts,'VEC3',3),'NORMAL':self.accessor(norms,'VEC3',3)},'material':mat}]})
        ni=self.node(name,parent,pos);self.doc['nodes'][ni]['mesh']=mesh
    def save(self,path):
        self.doc['buffers']=[{'byteLength':len(self.data)}]
        raw=json.dumps(self.doc,separators=(',',':')).encode();raw+=b' '*((-len(raw))%4)
        binary=bytes(self.data);binary+=b'\0'*((-len(binary))%4)
        path.write_bytes(struct.pack('<III',0x46546c67,2,28+len(raw)+len(binary))+struct.pack('<II',len(raw),0x4e4f534a)+raw+struct.pack('<II',len(binary),0x004e4942)+binary)

def build(f,t):
    colors={'Needle':[0,.7,1],'Rotor':[1,.48,.025],'Kiln':[1,.12,.015],'Quiver':[.1,1,.25],'Lancer':[.65,.85,1],'Relay':[.3,.65,1]}
    m=Model(f,t,colors[f]); b=m.base;r=m.recoil;y=m.yaw
    def box(n,p,s,mat=0,parent=r):m.shape(n,parent,p,s,mat)
    def cyl(n,p,s,mat=1,parent=r,sides=12,axis='y'):m.shape(n,parent,p,s,mat,sides,axis)
    cyl('Foundation',[0,.12,0],[1.55,.24,1.55],0,b,{'Needle':6,'Rotor':16,'Kiln':3,'Quiver':4,'Lancer':4,'Relay':8}[f])
    cyl('Base upper armor',[0,.3,0],[1.15,.16,1.15],1,b,8)
    if f=='Relay':
        # All visible relay geometry belongs to the stationary BASE.
        r=b
        def fixedbox(n,p,s,mat=0):box(n,p,s,mat,b)
        for x in [-.42,.42]:
            for z in [-.42,.42]:
                fixedbox('Lattice leg',[x,.5+t*.4,z],[.085,.5+t*.8,.085],1)
                for h in range(t*3): fixedbox('Lattice tie',[0,.5+h*.25,z],[.88,.045,.055],1)
        fixedbox('Transformer',[0,.65+t*.27,0],[.43,.6+t*.45,.43])
        for h in range(3+t*2):
            cyl('Induction loop',[0,.6+h*.16,0],[.64,.045,.64],3,b,12)
            cyl('Core window',[0,.65+h*.16,0],[.46,.025,.46],4,b,8)
        for stage in range(t):
            height=1.1+stage*.62; width=1.45+stage*.22
            fixedbox('Crossarm',[0,height,0],[width,.09,.16],1)
            for side in [-1,1]:
                for bank in range(1+stage):
                    x=side*(width/2-.12-bank*.19)
                    cyl('Insulator stem',[x,height+.2,0],[.07,.4,.07],4,b)
                    for k in range(5):cyl('Ceramic disc',[x,height+.08+k*.065,0],[.15,.035,.15],1,b)
        for x in [-.22,0,.22]:cyl('Crown conductor',[x,1.25+t*.62,0],[.035,.4,.035],3,b)
        for side in [-1,1]:fixedbox('Switchgear',[side*.55,.49,-.25],[.22,.42,.4])
    else:
        cyl('Yaw bearing',[0,0,0],[.8,.22,.8],2,y)
        for side in [-1,1]:
            box('Elevation fork',[side*.43,.23,0],[.16,.48,.35],1,y)
            cyl('Trunnion',[side*.44,0,0],[.20,.3,.3],1,r,12,'x')
        box('Receiver',[0,0,-.12],[.65,.34,.72])
        box('Rear equipment',[0,0,-.52-t*.065],[.5,.28+t*.08,.25+t*.12],1)
        if f in ('Needle','Lancer'):
            length=1.5*(1+.3*(t-1));end=.25+length
            if f=='Needle':
                cyl('Single accelerator',[0,0,.25+length/2],[.12,.12,length],1,r,8,'z')
                box('Tapered receiver',[0,.03,.23],[.32,.27,.65])
                for k in range(t*2-1):box('Axial charge channel',[.075,.07,.4+k*length/(t*2)],[.035,.035,length/(t*2.5)],4)
                box('Offset optic',[.25,.25,.12],[.18,.14,.36],2)
                box('Optic glass',[.25,.25,.305],[.13,.09,.015],4)
                for k in range(t):
                    cyl('Accelerator collar',[0,0,.65+k*.55],[.20,.20,.09],0,r,8,'z')
                box('Slotted muzzle body',[0,0,end],[.23,.20,.22],0)
                box('Muzzle bore',[0,0,end+.115],[.105,.07,.01],2)
            else:
                for side in [-1,1]:box('Conductive rail',[side*.18,0,.25+length/2],[.11,.17,length],1)
                box('Optical channel',[0,0,.25+length/2],[.08,.055,length],4)
                for k in range(2*t-1):
                    z=.5+k*(length-.3)/max(1,2*t-2)
                    for side in [-1,1]:box('Focus collar upright',[side*.25,0,z],[.055,.38,.08])
                    for h in [-.18,.18]:box('Focus collar bridge',[0,h,z],[.55,.055,.08])
                box('Aperture',[0,0,end],[.6,.42,.15])
                cyl('Focusing lens',[0,0,end+.08],[.28,.28,.015],4,r,16,'z')
                box('Sight',[0,.28,.2],[.12,.12,.5],2)
            if t==3:
                for side in [-1,1]:box('Longitudinal brace',[side*.25,-.14,length*.48],[.07,.09,length*.94],1)
            m.node('MUZZLE_00',r,[0,0,end+.13])
        elif f=='Rotor':
            length=.8+t*.26;rot=m.node('ROTOR',r,[0,0,.3])
            for k in range(6 if t==3 else 4):
                a=k*2*math.pi/(6 if t==3 else 4);x=.18*math.cos(a);h=.18*math.sin(a)
                cyl('Rotary barrel',[x,h,length/2],[.105,.105,length],1,rot,8,'z')
                cyl('Bore',[x,h,length+.004],[.069,.069,.012],2,rot,8,'z')
                m.node('MUZZLE_%02d'%k,rot,[x,h,length+.015])
            for k in range(t):
                z=.15+k*(length-.25)/max(1,t-1)
                for a in range(8):
                    ang=a*math.pi/4
                    cyl('Cage fastener',[.29*math.cos(ang),.29*math.sin(ang),z],[.09,.09,.12],0,rot,6,'z')
            for side in ([-1,1] if t==3 else [0]):
                cyl('Ammunition drum',[side*.47,-.29,-.2],[.34+t*.10,.34+t*.10,.5],0,r,16,'z')
                box('Feed chute',[side*.4,-.13,0],[.16,.24,.35],3)
            cyl('Tracking lens',[0,.3,.23],[.15,.15,.08],4,r,12,'z')
        elif f=='Kiln':
            for side in [-1,1]:
                x=side*.44;length=.55+t*.22
                cyl('Projector chamber',[x,0,.2+length/2],[.48+t*.045,.48+t*.045,length],0,r,8,'z')
                cyl('Recessed throat',[x,0,.2+length+.005],[.37,.37,.015],2,r,8,'z')
                cyl('Internal glow',[x,0,.2+length+.016],[.23,.23,.01],4,r,8,'z')
                for k in range(t):cyl('Focusing rim',[x,0,.38+k*.24],[.58,.58,.07],1,r,8,'z')
                if t>1:cyl('Pressure tank',[side*.7,0,-.35],[.25,.5+t*.12,.25],1)
                box('Insulated feed',[side*.38,-.24,-.05],[.10,.11,.8],3)
                m.node('MUZZLE_0'+str(0 if side<0 else 1),r,[x,0,.23+length])
            box('Cooling spine',[0,.18,0],[.22,.34,.65],1)
        elif f=='Quiver':
            for side in [-1,1]:
                width=t*.20+.12;x=side*(.27+width/2);depth=.55+t*.22
                box('Launch pod',[x,0,.15],[width,.76,depth])
                box('Recessed tube panel',[x,0,.155+depth/2],[width-.045,.7,.012],2)
                for col in range(t):
                    for row in range(3):
                        xx=x+(col-(t-1)/2)*.20;yy=(row-1)*.22
                        cyl('Capped missile cell',[xx,yy,.17+depth/2],[.155,.155,.035],1,r,10,'z')
                        m.node('MUZZLE_%02d'%((0 if side<0 else t*3)+col*3+row),r,[xx,yy,.20+depth/2])
                box('Pod identification',[x,.40,.15],[width,.035,.3],5)
                box('Readiness',[x,-.29,.20+depth/2],[.07,.025,.015],4)
                if t==3:box('Reload magazine',[x,0,-.6],[width,.65,.3],1)
            cyl('Tracking sensor',[0,.13,.44],[.29+t*.02,.29+t*.02,.12],2,r,8,'z')
            cyl('Sensor glass',[0,.13,.505],[.19,.19,.018],4,r,12,'z')
        for k in range(t*3):box('Rear radiator',[0,.18+k*.047,-.55],[.64,.022,.32],2)
    path=OUT/(f.lower()+'_t'+str(t)+'.glb');m.save(path)
    return {'family':f,'tier':t,'file':'assets/'+path.name,'stationary':f=='Relay'}

if __name__=='__main__':
    OUT.mkdir(exist_ok=True)
    entries=[build(f,t) for f in ['Needle','Rotor','Kiln','Quiver','Lancer','Relay'] for t in [1,2,3]]
    from extra_sentries import build_extra
    entries += [build_extra(Model,OUT,f,t) for f in ['Railgun','Howitzer','Mortar','Heptapod A6','Plasma'] for t in [1,2,3]]
    (OUT/'manifest.json').write_text(json.dumps(entries,indent=2)+'\n')
    print('Exported',len(entries),'GLBs to',OUT)
