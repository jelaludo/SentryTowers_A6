"""Fetch only the pinned, licensed source files recorded by Hand Lab. Preserve existing originals."""
from pathlib import Path
import hashlib,json,urllib.request
root=Path(__file__).resolve().parents[2]/'assets/hand-lab/references'
for e in json.loads((root/'sources.lock.json').read_text()):
 p=root/e['file']
 if p.exists():
  data=p.read_bytes()
  assert hashlib.sha256(data).hexdigest()==e['sha256'],f'Existing source differs; preserve and inspect: {p}'
 else:
  data=urllib.request.urlopen(e['url']).read()
  assert len(data)==e['bytes'] and hashlib.sha256(data).hexdigest()==e['sha256'],e['file']
  p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(data)
 print('Verified',e['file'])
