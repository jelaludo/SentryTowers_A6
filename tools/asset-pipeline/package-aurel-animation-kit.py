"""Reproducible, self-contained asset handoff; no weights or environment files."""
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED
import hashlib
import json

root = Path(__file__).resolve().parents[2]
kit = root / 'assets/robot-assembly/animation-kit'
files = [p for p in kit.rglob('*') if p.is_file() and p.suffix != '.zip' and p.name not in ('download.json', 'browser-validation.json') and 'previews' not in p.parts]
dependencies = [
    'assets/robot-assembly/runtime.js',
    'assets/robot-assembly/muscles/runtime.js',
    'assets/robot-assembly/muscles/specs.js',
    'assets/hand-lab/runtime.js',
    'assets/hand-lab/biped.js',
    'assets/foot-lab/runtime.js',
]
files.extend(root / f for f in dependencies)
payload = {str(p.relative_to(root)): p.read_bytes() for p in sorted(files)}
payload['START-HERE.md'] = (kit / 'README.md').read_bytes()
payload['index.html'] = b'<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=assets/robot-assembly/animation-kit/example.html"><a href="assets/robot-assembly/animation-kit/example.html">Open AUREL-03 preview</a>'
payload['package.json'] = b'{"name":"aurel03-animation-kit","private":true,"type":"module"}\n'
hashes = {name: hashlib.sha256(data).hexdigest() for name, data in payload.items()}
payload['SHA256SUMS.json'] = (json.dumps(hashes, indent=2) + '\n').encode()
zip_path = kit / 'aurel03-animation-kit.zip'
with ZipFile(zip_path, 'w', compression=ZIP_DEFLATED, compresslevel=9) as archive:
    for name, data in sorted(payload.items()):
        info = ZipInfo('aurel03-animation-kit/' + name, date_time=(2026, 11, 9, 0, 0, 0))
        info.compress_type = ZIP_DEFLATED
        info.external_attr = 0o100644 << 16
        archive.writestr(info, data, compresslevel=9)
data = zip_path.read_bytes()
record = {'file': zip_path.name, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest(), 'files': len(payload), 'source_commit': json.loads((kit / 'manifest.json').read_text())['source_commit'], 'contains': 'Four complete rigged GLBs (two heads, game/master), target rig map, muscle follow adapter, runtime dependencies, preview, notes and file hashes. No model weights or generated AI motions.'}
(kit / 'download.json').write_text(json.dumps(record, indent=2) + '\n')
print(json.dumps(record))
