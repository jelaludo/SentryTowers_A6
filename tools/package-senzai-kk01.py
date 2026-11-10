"""Build a deterministic, offline-capable Senzai-KK01 developer distribution."""
import hashlib
import json
import re
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/senzai-kk01'
THREE = ROOT / 'tools/asset-pipeline/node_modules/three'
sha = lambda data: hashlib.sha256(data).hexdigest()
manifest = json.loads((OUT / 'manifest.json').read_text())
assert json.loads((OUT / 'validation-report.json').read_text())['status'] == 'passed'
payload = {}
for name in ['README.md', 'LORE.md', 'LICENSE.md', 'ATTRIBUTIONS.md', 'manifest.json', 'runtime.js', 'behaviors.js', 'validation-report.json'] + [a['file'] for a in manifest['assets']]:
    payload['assets/senzai-kk01/' + name] = (OUT / name).read_bytes()
for a in manifest['assets']:
    assert sha(payload['assets/senzai-kk01/' + a['file']]) == a['sha256']
for file in (ROOT / 'senzai-kk01').iterdir():
    if file.is_file():
        payload['senzai-kk01/' + file.name] = file.read_bytes()
for name in ['navigation.css', 'navigation.js']:
    payload['workshop/' + name] = (ROOT / 'workshop' / name).read_bytes()

# Trace only the dependency graph used by this viewer. The GLBs are texture-free,
# uncompressed and need no Draco/Meshopt decoder or external image files.
queue = [THREE / 'build/three.module.js']
source = (ROOT / 'senzai-kk01/viewer.js').read_text()
queue += [THREE / 'examples/jsm' / p for p in re.findall(r"from\s*['\"]three/addons/([^'\"]+)", source)]
seen = set()
while queue:
    file = queue.pop().resolve()
    if file in seen:
        continue
    assert file.is_relative_to(THREE.resolve()), file
    seen.add(file)
    data = file.read_bytes()
    payload['vendor/three/' + str(file.relative_to(THREE.resolve()))] = data
    for path in re.findall(r"(?:from\s*|import\s*(?:\(\s*)?)['\"]([^'\"]+)['\"]", data.decode()):
        if path.startswith('.'):
            queue.append((file.parent / path).resolve())
payload['vendor/three/LICENSE'] = (THREE / 'LICENSE').read_bytes()

html = payload['senzai-kk01/index.html'].decode()
html = html.replace('https://cdn.jsdelivr.net/npm/three@0.180.0/build/', '../vendor/three/build/')
html = html.replace('https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/', '../vendor/three/examples/jsm/')
html = html.replace('../assets/senzai-kk01/senzai-kk01-developer-package.zip', '../PACKAGE-CONTENTS.txt')
html = html.replace('Download complete package ↓', 'Package contents ↓')
start, end = html.index('<header class="workshop-header"'), html.index('</header>') + len('</header>')
header = html[start:end].replace('href="../', 'href="https://jelaludo.github.io/SentryTowers_A6/')
html = html[:start] + header + html[end:]
payload['senzai-kk01/index.html'] = html.encode()
payload['index.html'] = b'<!doctype html><html lang="en"><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=senzai-kk01/"><title>Senzai-KK01 by Jelaludo</title><a href="senzai-kk01/">Open Senzai-KK01</a></html>'
for name in ['README.md', 'LICENSE.md', 'ATTRIBUTIONS.md']:
    payload[name] = (OUT / name).read_bytes()
payload['PACKAGE-CONTENTS.txt'] = ('Senzai-KK01 by Jelaludo — attribution required for reuse.\n\n' + '\n'.join(sorted(payload)) + '\n').encode()
payload['SHA256SUMS'] = ''.join(f'{sha(data)}  {name}\n' for name, data in sorted(payload.items())).encode()
archive = OUT / 'senzai-kk01-developer-package.zip'
with zipfile.ZipFile(archive, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for name, data in sorted(payload.items()):
        item = zipfile.ZipInfo(name, (2026, 11, 10, 0, 0, 0))
        item.compress_type = zipfile.ZIP_DEFLATED
        item.external_attr = 0o100644 << 16
        z.writestr(item, data, compresslevel=9)
report = {'status': 'packaged', 'file': archive.name, 'derived': True, 'bytes': archive.stat().st_size, 'sha256': sha(archive.read_bytes()), 'files': {name: {'bytes': len(data), 'sha256': sha(data)} for name, data in sorted(payload.items())}, 'vendor': {'three': '0.180.0', 'license': 'MIT'}, 'attribution': 'Jelaludo required; all three GLBs embed credit', 'scope': 'Deterministic archive and asset hashes. Browser report separately verifies extraction and offline rendering.'}
(OUT / 'package-report.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps({'file': str(archive), 'bytes': report['bytes'], 'files': len(payload), 'sha256': report['sha256']}))
