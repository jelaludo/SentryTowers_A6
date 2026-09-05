"""Artillery and six-legged missile carrier; rigid glTF animation clips."""
import math

def quat_z(a): return [0, 0, math.sin(a/2), math.cos(a/2)]

def perforated_nozzle(m,parent,length,radius,rows):
    """Closed-thickness flared sleeve with actual circular through-holes."""
    vertices=[];normals=[];columns=10;thickness=.045
    def point(u,z,inside=False):
        r=radius*(.82+.18*z/length)-(thickness if inside else 0)
        return [r*math.cos(u/radius),r*math.sin(u/radius),.38+z]
    def face(points):
        for j in range(1,len(points)-1):
            a,b,c=points[0],points[j],points[j+1]
            u=[b[k]-a[k] for k in range(3)];v=[c[k]-a[k] for k in range(3)]
            n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]]
            size=math.sqrt(sum(x*x for x in n));vertices.extend([a,b,c]);normals.extend([[x/size for x in n]]*3)
    width=2*math.pi*radius/columns;height=length/rows;hole=min(width,height)*.29
    for row in range(rows):
        for col in range(columns):
            boundary=[];rim=[]
            for k in range(16):
                angle=2*math.pi*k/16;cx,cz=math.cos(angle),math.sin(angle)
                reach=min(width/(2*max(abs(cx),1e-9)),height/(2*max(abs(cz),1e-9)))
                center=[(col+.5)*width,(row+.5)*height]
                boundary.append([center[0]+cx*reach,center[1]+cz*reach])
                rim.append([center[0]+cx*hole,center[1]+cz*hole])
            for k in range(16):
                j=(k+1)%16
                face([point(*boundary[k]),point(*boundary[j]),point(*rim[j]),point(*rim[k])])
                face([point(*rim[k],True),point(*rim[j],True),point(*boundary[j],True),point(*boundary[k],True)])
                face([point(*rim[k]),point(*rim[j]),point(*rim[j],True),point(*rim[k],True)])
                for z,end in [(0,-1),(length,1)]:
                    if abs(boundary[k][1]-z)<1e-8 and abs(boundary[j][1]-z)<1e-8:
                        face([point(*boundary[j]),point(*boundary[k]),point(*boundary[k],True),point(*boundary[j],True)])
    mesh=len(m.doc['meshes'])
    m.doc['meshes'].append(dict(name='Perforated nozzle',primitives=[dict(attributes={'POSITION':m.accessor(vertices,'VEC3',3),'NORMAL':m.accessor(normals,'VEC3',3)},material=1)]))
    node=m.node('PERFORATED_NOZZLE',parent);m.doc['nodes'][node].update(mesh=mesh,extras={'throughHoles':rows*columns})

def build_extra(Model, out, family, tier):
    t=tier
    m=Model(family,t,{'Railgun':[.3,.55,1], 'Howitzer':[1,.55,.08], 'Mortar':[.6,1,.18], 'Heptapod A6':[.7,.25,1], 'Plasma':[.15,1,.65]}[family])
    def box(n,parent,p,s,mat=0):m.shape(n,parent,p,s,mat)
    def cyl(n,parent,p,s,mat=1,axis='y',sides=12):m.shape(n,parent,p,s,mat,sides,axis)
    def beam(n,parent,a,b,width,mat=1):
        delta=[b[i]-a[i] for i in range(3)];length=math.sqrt(sum(x*x for x in delta));v=[x/length for x in delta]
        joint=m.node(n,parent,[(a[i]+b[i])/2 for i in range(3)])
        q=[v[2],0,-v[0],1+v[1]];norm=math.sqrt(sum(x*x for x in q))
        m.doc['nodes'][joint]['rotation']=[x/norm for x in q] if norm>1e-8 else [1,0,0,0]
        box(n+' armor',joint,[0,0,0],[width,length,width],mat)
    def muzzle(parent,pos,index=0,vertical=False):
        i=m.node('MUZZLE_%02d'%index,parent,pos)
        if vertical:m.doc['nodes'][i]['rotation']=[-math.sqrt(.5),0,0,math.sqrt(.5)]
    def tube(n,parent,x,z,length,radius):
        # Open faceted barrel wall with a genuinely recessed dark bore.
        m.shape(n+' wall',parent,[x,0,z+length/2],[radius*2.2,radius*2.2,length],1,12,'z',hollow=.78)
        cyl(n+' bore',parent,[x,0,z+.06],[radius*1.6,radius*1.6,.025],2,'z')
    r=m.recoil;b=m.base;y=m.yaw
    if family!='Heptapod A6':
        cyl('Ground plinth',b,[0,.12,0],[1.6,.24,1.6],0,sides=6)
        cyl('Bearing',y,[0,0,0],[.95,.24,.95],2)
        for side in [-1,1]:
            box('Cradle',y,[side*.48,.28,0],[.18,.6,.5])
            cyl('Elevation motor',r,[side*.5,0,0],[.22,.38,.38],1,'x')
        box('Breech',r,[0,0,-.25],[.75,.52,.85])
        for k in range(t+1):box('Capacitor',r,[0,.2,-.5-k*.16],[.64,.3,.10],1)
        if family=='Railgun':
            length=1.8+(t-1)*.5
            for side in [-1,1]:
                box('Mass driver rail',r,[side*.26,0,.3+length/2],[.18,.28,length],1)
                box('Induction track',r,[side*.16,.04,.3+length/2],[.025,.08,length],4)
                for k in range(3+t):box('Rail winding',r,[side*.29,0,.5+k*(length-.3)/(2+t)],[.25,.37,.10],3)
            box('Lower spine',r,[0,-.22,length/2],[.75,.12,length],0)
            for k in range(t*3):box('Cooling blade',r,[0,-.34,-.35+k*.14],[.9,.2,.045],2)
            box('Targeting optic',r,[.48,.26,.14],[.2,.14,.4],0)
            box('Optic window',r,[.48,.26,.345],[.15,.09,.02],4)
            muzzle(r,[0,0,length+.32])
        elif family=='Plasma':
            length=.95+(t-1)*.30;radius=.38+(t-1)*.045
            perforated_nozzle(m,r,length,radius,t+2)
            for z,rr in [(.38,radius*.82),(.38+length,radius)]:
                m.shape('Nozzle reinforcing lip',r,[0,0,z],[rr*2+.035,rr*2+.035,.095],0,20,'z',hollow=.88)
            cyl('Recessed combustion core',r,[0,0,.52],[.38,.38,.025],2,'z')
            cyl('Plasma throat',r,[0,0,.54],[.24,.24,.02],4,'z')
            for side in [-1,1]:
                cyl('Pressure reservoir',r,[side*.57,-.08,-.45],[.30+t*.035,.30+t*.035,.65+t*.10],0,'z')
                cyl('Reservoir endcap',r,[side*.57,-.08,-.05],[.29,.29,.06],3,'z')
                beam('Insulated feed pipe',r,[side*.57,-.08,-.03],[side*.29,-.18,.36],.09,3)
                box('Tank charge window',r,[side*.57,.10,-.45],[.09,.025,.35],4)
            for k in range(3+t*2):box('Heat exchanger fin',r,[0,-.30,-.65+k*.12],[.72,.18,.045],2)
            box('Pilot housing',r,[0,-radius-.03,.28+length],[.16,.12,.3],0)
            box('Pilot aperture',r,[0,-radius-.03,.435+length],[.09,.06,.015],4)
            muzzle(r,[0,0,.45+length])
        elif family=='Howitzer':
            m.doc['nodes'][m.pitch]['rotation']=[-math.sin(math.radians(25)/2),0,0,math.cos(math.radians(25)/2)]
            length=1.25+t*.28
            tube('Siege barrel',r,0,.18,length,.22+t*.025)
            for side in [-1,1]:
                cyl('Recoil absorber',r,[side*.38,-.18,.45],[.15,.15,1.05],3,'z')
                box('Breech cheek',r,[side*.40,0,-.3],[.20,.65,.75],1)
            for i in range(3):
                a=i*2*math.pi/3+math.pi/2;dx,dz=math.cos(a),math.sin(a)
                pivot=m.node('STABILIZER_%02d'%i,b)
                beam('Heavy stabilizer',pivot,[dx*.45,.48,dz*.45],[dx*1.55,.15,dz*1.55],.28)
                beam('Hydraulic strut',pivot,[dx*.55,.62,dz*.55],[dx*1.35,.25,dz*1.35],.10,3)
                cyl('Ground shoe',pivot,[dx*1.55,.10,dz*1.55],[.65,.20,.65],0,sides=6)
                box('Ground cleat',pivot,[dx*1.55,.045,dz*1.55],[.45,.09,.45],2)
            muzzle(r,[0,0,.2+length])
        else:
            angle=math.radians(68);m.doc['nodes'][m.pitch]['rotation']=[-math.sin(angle/2),0,0,math.cos(angle/2)]
            length=.9+t*.22
            tube('Mortar tube',r,0,.10,length,.28+t*.025)
            for k in range(t+1):
                cyl('Pressure jacket',r,[0,0,.23+k*.16],[.73,.73,.09],0,'z')
            cyl('Autoloader drum',r,[0,-.12,-.42],[.95,.65,.65],1,'x')
            for side in [-1,1]:box('Feed guide',r,[side*.38,-.08,-.1],[.13,.16,.55],3)
            box('Range radar',y,[.6,.4,-.4],[.25,.34,.16],4)
            muzzle(r,[0,0,.12+length])
    else:
        # The hull hangs underneath raised knees. There is no stationary plinth.
        body=m.node('BODY',m.root,[0,.85,0]);b=body
        m.doc['nodes'][m.root]['extras'].update(mobile=True,legCount=6,jointsPerLeg=3)
        cyl('Suspended hull',b,[0,0,0],[1.65,.34,1.8],0,sides=6)
        box('Belly armor',b,[0,-.21,0],[.85,.18,1.1],2)
        box('Forward sensor',b,[0,0,.85],[.65,.12,.08],4)
        for side in [-1,1]:
            box('Missile cassette',b,[side*.36,.25,0],[.5,.28,1.25],0)
            for j in range(t+2):
                z=(j-(t+1)/2)*.24
                cyl('Vertical launch silo',b,[side*.36,.39,z],[.21,.35,.21],1)
                cyl('Recessed silo cap',b,[side*.36,.57,z],[.15,.015,.15],2)
                cyl('Readiness ring',b,[side*.36,.55,z],[.23,.025,.23],4)
                muzzle(b,[side*.36,.59,z],(0 if side<0 else t+2)+j,True)
        legs=[]
        for i in range(6):
            a=i*math.pi/3;mount=m.node('LEG_%02d_MOUNT'%i,b,[.65*math.cos(a),0,.65*math.sin(a)])
            m.doc['nodes'][mount]['rotation']=[0,-math.sin(a/2),0,math.cos(a/2)]
            hip=m.node('LEG_%02d_HIP'%i,mount)
            knee=m.node('LEG_%02d_KNEE'%i,hip,[.8,0,0])
            ankle=m.node('LEG_%02d_ANKLE'%i,knee,[1.05,0,0])
            for joint,length,width in [(hip,.8,.20),(knee,1.05,.16),(ankle,.9,.12)]:
                box('Leg segment',joint,[length/2,0,0],[length,width,width],1)
                cyl('Joint servo',joint,[0,0,0],[.25,.25,.28],0,'z')
                box('Joint indicator',joint,[.12,0,.145],[.13,.06,.025],4)
                if t>1:box('Segment armor',joint,[length*.5,.10,0],[length*.55,.10,width*1.5],0)
            foot=m.node('LEG_%02d_FOOT'%i,ankle,[.9,0,0])
            cyl('Anchor shoe',foot,[0,0,0],[.30,.10,.30],0)
            spike=m.node('ANCHOR_%02d'%i,foot)
            cyl('Ground spike',spike,[0,-.05,0],[.07,.18+t*.025,.07],3)
            legs.append((a,hip,knee,ankle,foot,spike))
        def solve(a,radial,height,travel=0):
            # Hip uses yaw + lift; knee and ankle solve the final two links.
            xx=radial+travel*math.sin(a);zz=travel*math.cos(a)
            yaw=-math.atan2(zz,xx);reach=math.hypot(xx,zz);first=.95
            dx=reach-.8*math.cos(first);dy=height-.8*math.sin(first)
            bend=-math.acos(max(-1,min(1,(dx*dx+dy*dy-1.05**2-.9**2)/(2*1.05*.9))))
            second=math.atan2(dy,dx)-math.atan2(.9*math.sin(bend),1.05+.9*math.cos(bend))
            sy,cy=math.sin(yaw/2),math.cos(yaw/2);sz,cz=math.sin(first/2),math.cos(first/2)
            return [[sy*sz,sy*cz,cy*sz,cy*cz],quat_z(second-first),quat_z(bend),quat_z(-second-bend)]
        for a,hip,knee,ankle,foot,spike in legs:
            for node,q in zip([hip,knee,ankle,foot],solve(a,1.55,-.80)):m.doc['nodes'][node]['rotation']=q
        def clip(name,duration,anchor=False):
            count=49;times=[[duration*k/(count-1)] for k in range(count)];time=m.accessor(times,'SCALAR',1)
            m.doc['accessors'][time].update(min=[0],max=[duration]);samplers=[];channels=[]
            def channel(node,path,values,kind,width):
                output=m.accessor(values,kind,width);idx=len(samplers);samplers.append(dict(input=time,output=output,interpolation='LINEAR'));channels.append(dict(sampler=idx,target=dict(node=node,path=path)))
            if anchor:channel(body,'translation',[[0,.85-.18*(k/(count-1)),0] for k in range(count)],'VEC3',3)
            for i,(a,hip,knee,ankle,foot,spike) in enumerate(legs):
                poses=[]
                for k in range(count):
                    u=k/(count-1)
                    if anchor:poses.append(solve(a,1.55+.15*u,-.8+.18*u))
                    else:
                        phase=(u+(i%2)*.5)%1
                        travel=.18*math.cos(phase*2*math.pi)
                        lift=.16*max(0,math.sin(phase*2*math.pi))
                        poses.append(solve(a,1.55,-.8+lift,travel))
                for j,node in enumerate([hip,knee,ankle,foot]):channel(node,'rotation',[p[j] for p in poses],'VEC4',4)
                if anchor:channel(spike,'translation',[[0,-.16*k/(count-1),0] for k in range(count)],'VEC3',3)
            m.doc.setdefault('animations',[]).append(dict(name=name,samplers=samplers,channels=channels))
        clip('Walk',1.8);clip('Anchor',1.2,True)
    slug=family.lower().replace(' ','_');path=out/(slug+'_t'+str(t)+'.glb');m.save(path)
    return dict(family=family,tier=t,file='assets/'+path.name,stationary=False,mobile=family=='Heptapod A6')
