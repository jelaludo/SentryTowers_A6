// Node validation needs geometry and material factors, without a DOM image decoder.
// Browser QA separately loads and verifies the actual textured source files.
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {prune} from '@gltf-transform/functions';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS),loader=new GLTFLoader();
export async function loadGeometryGLB(bytes){
 const doc=await io.readBinary(new Uint8Array(bytes));
 if(doc.getRoot().listTextures().length){
  for(const m of doc.getRoot().listMaterials())m.setBaseColorTexture(null).setNormalTexture(null).setOcclusionTexture(null).setMetallicRoughnessTexture(null).setEmissiveTexture(null);
  await doc.transform(prune({keepLeaves:true,keepAttributes:true}));bytes=await io.writeBinary(doc);
 }
 return(await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')).scene;
}
