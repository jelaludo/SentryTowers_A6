/** Batch Blender-reduced meshes within sibling assemblies; retain animation and sockets. */
import fs from 'node:fs/promises';
import {NodeIO,PropertyType,Logger} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {dedup,join,weld,prune} from '@gltf-transform/functions';
const base=new URL('../../',import.meta.url),out=new URL('assets/game-ready/',base);
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);
function stats(doc){let triangles=0,draws=0;for(const n of doc.getRoot().listNodes()){const m=n.getMesh();if(m)for(const p of m.listPrimitives()){triangles+=(p.getIndices()?.getCount()??p.getAttribute('POSITION').getCount())/3;draws++;}}return {triangles,draw_calls:draws,nodes:doc.getRoot().listNodes().length};}
const manifest=JSON.parse(await fs.readFile(new URL('manifest.json',out),'utf8'));
for(const entry of manifest.assets){
 const path=new URL(entry.file,out);const doc=await io.read(path.pathname);doc.setLogger(new Logger(Logger.Verbosity.WARN));
 const original=await io.read(new URL(entry.source_file,out).pathname);const before=stats(original);
 await doc.transform(dedup({propertyTypes:[PropertyType.MATERIAL]}),join({cleanup:false,filter:n=>!n.getName().startsWith('FLAT_LANDING_FOOT_')}),weld(),dedup(),prune({keepLeaves:true,keepAttributes:true}));
 const animated=new Set(doc.getRoot().listAnimations().flatMap(a=>a.listChannels().map(c=>c.getTargetNode())));
 for(const n of doc.getRoot().listNodes())if(!n.getMesh()&&!n.listChildren().length&&!animated.has(n)&&!Object.keys(n.getExtras()).length&&!/^[A-Z0-9_]+$/.test(n.getName()))n.dispose();
 const after=stats(doc);if(after.triangles>41000)throw Error('Budget exceeded '+entry.id);
 await io.write(path.pathname,doc);
 Object.assign(entry,after,{source_triangles:before.triangles,source_draw_calls:before.draw_calls,bytes:(await fs.stat(path)).size});
 console.log(entry.id,before.triangles+' -> '+after.triangles+' tris;',before.draw_calls+' -> '+after.draw_calls+' draw calls');
}
await fs.writeFile(new URL('manifest.json',out),JSON.stringify(manifest,null,2)+'\n');
