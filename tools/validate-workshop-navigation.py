from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urljoin,urlparse
import subprocess,re,hashlib
P=Path(__file__).resolve().parents[1]
class Page(HTMLParser):
 def __init__(self,s):
  super().__init__();self.tags=[];self.feed(s)
 def handle_starttag(self,t,a):self.tags.append((t,dict(a)))
viewers=[p for p in P.glob('*/index.html') if p.parent.name not in ['devlog','best-practices']]
for p in viewers+[P/'index.html',P/'reuse.html',P/'devlog/index.html',P/'best-practices/index.html']:
 s=p.read_text();doc=Page(s);headers=[a for t,a in doc.tags if t=='header'];assert len(headers)==1 and headers[0].get('class')=='workshop-header',p
 ids=[a['id'] for t,a in doc.tags if 'id'in a];assert len(ids)==len(set(ids)),p
 base='https://example.test/SentryTowers_A6/'+str(p.relative_to(P))
 for t,a in doc.tags:
  if t=='base':base=urljoin(base,a['href'])
 nav=re.search(r'<header class="workshop-header">(.*?)</header>',s,re.S).group(1)
 links=[urlparse(urljoin(base,a['href'])).path for t,a in Page(nav).tags if t=='a']
 assert links==['/SentryTowers_A6/','/SentryTowers_A6/','/SentryTowers_A6/devlog/','/SentryTowers_A6/best-practices/'],(p,links)
 if p in viewers:
  assert any(t=='body' and a.get('class')=='workshop-viewer' for t,a in doc.tags),p
  old=subprocess.check_output(['git','show','HEAD:'+str(p.relative_to(P))],cwd=P,text=True)
  oldids={a['id'] for t,a in Page(old).tags if 'id'in a};assert oldids<=set(ids),(p,oldids-set(ids))
 for t,a in doc.tags:
  ref=a.get('src') if t=='script' else a.get('href') if t=='link' or (p.parent.name in ['devlog','best-practices'] and t=='a') else None
  if ref:
   url=urlparse(urljoin(base,ref))
   if url.hostname=='example.test':assert (P/url.path.removeprefix('/SentryTowers_A6/')).exists(),(p,ref)
assert hashlib.sha256((P/'docs/ASSET-COLLABORATION.md').read_bytes()).hexdigest()=='f52544d5e097f4bb319376ed87b181c6e8255a746e7a407d4a1598b0e5a5ff41'
print(f'PASS {len(viewers)} viewers + 4 library pages: common navigation, base-aware URLs, unique IDs, preserved viewer controls, documentation links and verbatim developer notes.')
