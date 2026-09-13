import fs from 'node:fs';
import { NodeIO, getBounds } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';

const assetDir = new URL('../../assets/isao-birudoron/', import.meta.url);
const manifestURL = new URL('manifest.json', assetDir);
const manifest = JSON.parse(fs.readFileSync(manifestURL, 'utf8'));
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const rounded = values => values.map(value => Math.round(value * 1e6) / 1e6);

for (const entry of manifest.assets.filter(item => item.production_lod)) {
  const document = await io.read(new URL(entry.file, assetDir).pathname);
  const root = document.getRoot();
  const scene = root.getDefaultScene() || root.listScenes()[0];
  const bounds = getBounds(scene);
  entry.bounds_min_m = rounded(bounds.min);
  entry.bounds_max_m = rounded(bounds.max);
  entry.dimensions_m = rounded(bounds.max.map((value, axis) => value - bounds.min[axis]));
}

fs.writeFileSync(manifestURL, `${JSON.stringify(manifest, null, 2)}\n`);
