"""Deterministic model/runtime handoff; source Blender project remains external."""
import hashlib
import json
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sha = lambda data: hashlib.sha256(data).hexdigest()
families = ['assets/red-witness', 'assets/helmet-lab/red-witness']
for destination, included in [(families[0], families), (families[1], [families[1]])]:
    payload = {}
    for folder in included:
        base = ROOT / folder
        manifest = json.loads((base / 'manifest.json').read_text())
        assert json.loads((base / 'validation-report.json').read_text())['status'] == 'passed'
        for name in ['README.md', 'LICENSE.md', 'ATTRIBUTIONS.md', 'manifest.json', 'provenance.json', 'runtime.js', 'validation-report.json'] + [a['file'] for a in manifest['assets']]:
            payload[folder + '/' + name] = (base / name).read_bytes()
        for asset in manifest['assets']:
            assert sha(payload[folder + '/' + asset['file']]) == asset['sha256']
    for name in ['README.md', 'LICENSE.md', 'ATTRIBUTIONS.md']:
        payload[name] = (ROOT / destination / name).read_bytes()
    payload['PACKAGE-CONTENTS.txt'] = ('Red Witness by Jelaludo — attribution required.\nAdapted GLBs, runtime and integration notes. Original Blender project and PNG bakes remain external.\n\n' + '\n'.join(sorted(payload)) + '\n').encode()
    payload['SHA256SUMS'] = ''.join(f'{sha(data)}  {name}\n' for name, data in sorted(payload.items())).encode()
    archive = ROOT / destination / 'red-witness.zip'
    with zipfile.ZipFile(archive, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for name, data in sorted(payload.items()):
            item = zipfile.ZipInfo(name, (2026, 11, 11, 0, 0, 0))
            item.compress_type = zipfile.ZIP_DEFLATED
            item.external_attr = 0o100644 << 16
            z.writestr(item, data, compresslevel=9)
    with zipfile.ZipFile(archive) as z:
        assert z.testzip() is None
        for name, data in payload.items():
            assert sha(z.read(name)) == sha(data)
    report = {'status': 'passed', 'file': archive.name, 'bytes': archive.stat().st_size, 'sha256': sha(archive.read_bytes()), 'files': {name: {'bytes': len(data), 'sha256': sha(data)} for name, data in sorted(payload.items())}, 'scope': 'ZIP extraction and exact file hashes; model/runtime package, not an offline viewer or Blender source distribution.'}
    (ROOT / destination / 'package-report.json').write_text(json.dumps(report, indent=2) + '\n')
    print(destination, report['bytes'], 'bytes,', len(payload), 'files verified')
