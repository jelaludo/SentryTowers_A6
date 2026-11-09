"""Reproducible helmet handoff; no external concept or reference-head files."""
import hashlib
import json
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'assets/helmet-lab/breach-warden'
manifest = json.loads((OUT / 'manifest.json').read_text())
files = [a['file'] for a in manifest['assets']] + ['README.md', 'manifest.json', 'runtime.js', 'validation-report.json']
payload = {name: (OUT / name).read_bytes() for name in sorted(files)}
digest = lambda data: hashlib.sha256(data).hexdigest()
for asset in manifest['assets']:
    assert digest(payload[asset['file']]) == asset['sha256']
report = json.loads(payload['validation-report.json'])
assert report['status'] == 'passed'
assert [a['sha256'] for a in report['files']] == [a['sha256'] for a in manifest['assets']]
payload['SHA256SUMS'] = ''.join(f'{digest(data)}  {name}\n' for name, data in payload.items()).encode()
archive = OUT / 'breach-warden.zip'
with zipfile.ZipFile(archive, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for name, data in sorted(payload.items()):
        entry = zipfile.ZipInfo('breach-warden/' + name, (2026, 11, 9, 0, 0, 0))
        entry.compress_type = zipfile.ZIP_DEFLATED
        entry.external_attr = 0o100644 << 16
        z.writestr(entry, data, compresslevel=9)
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
    for name, data in payload.items():
        assert z.read('breach-warden/' + name) == data
result = {'file': archive.name, 'bytes': archive.stat().st_size, 'sha256': digest(archive.read_bytes()), 'payload_files': len(payload), 'verified': True}
(OUT / 'download.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result))
