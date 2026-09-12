"""Build static documentation and the shared navigation; no runtime markdown dependency."""
from pathlib import Path
import re,html
P=Path(__file__).resolve().parents[1]
def inline(s):
 s=html.escape(s)
 s=re.sub(r'`([^`]+)`',r'<code>\1</code>',s)
 s=re.sub(r'\*\*([^*]+)\*\*',r'<strong>\1</strong>',s)
 return re.sub(r'\[([^]]+)\]\(([^)]+)\)',r'<a href="\2">\1</a>',s)
def markdown(s):
 lines=s.splitlines();out=[];i=0
 while i<len(lines):
  line=lines[i]
  if not line.strip():i+=1;continue
  if line.startswith('#'):
   n=len(line)-len(line.lstrip('#'));out.append(f'<h{n}>{inline(line[n:].strip())}</h{n}>');i+=1;continue
  if line.startswith('|'):
   rows=[]
   while i<len(lines) and lines[i].startswith('|'):
    if not re.fullmatch(r'[| :\-]+',lines[i]):rows.append([inline(c.strip()) for c in lines[i].strip('|').split('|')])
    i+=1
   out.append('<div class="table-scroll"><table><thead><tr>'+''.join('<th scope="col">'+c+'</th>' for c in rows[0])+'</tr></thead><tbody>'+''.join('<tr>'+''.join('<td>'+c+'</td>' for c in r)+'</tr>' for r in rows[1:])+'</tbody></table></div>');continue
  if re.match(r'(- |\d+\. )',line):
   tag='ul' if line.startswith('- ') else 'ol';items=[]
   while i<len(lines) and re.match(r'(- |\d+\. )',lines[i]):
    value=re.sub(r'^(- |\d+\. )','',lines[i]);i+=1
    while i<len(lines) and lines[i].startswith('  '):value+=' '+lines[i].strip();i+=1
    items.append('<li>'+inline(value)+'</li>')
   out.append(f'<{tag}>'+''.join(items)+f'</{tag}>');continue
  para=[line];i+=1
  while i<len(lines) and lines[i].strip() and not re.match(r'(#|\||- |\d+\. )',lines[i]):para.append(lines[i]);i+=1
  out.append('<p>'+inline(' '.join(para))+'</p>')
 return '\n'.join(out)
def nav(prefix,active='workshop',viewer=False):
 links=''.join(f'<a href="{(prefix+route) or "./"}"'+(' aria-current="page"' if key==active else '')+f'>{label}</a>' for key,route,label in [('workshop','','Workshop'),('devlog','devlog/','Devlog'),('best-practices','best-practices/','Best Practices')])
 return f'<header class="workshop-header"><a class="workshop-home" href="{prefix or "./"}">{"← Back to Workshop" if viewer or active!="workshop" else "jelaludo / Workshop"}</a><nav class="workshop-tabs" aria-label="Workshop navigation">{links}</nav></header>'
for route,source,title in [('devlog','DEVLOG.md','Devlog'),('best-practices','ASSET-COLLABORATION.md','Best Practices')]:
 text=(P/'docs'/source).read_text()
 if route=='best-practices':text=re.sub(r'^# .*','# Best Practices',text,count=1)
 intro='Game developer contract · received 12 September 2026. These are requirements and targets for ongoing work; older assets may still need changes. The developer identifies Solar as the reference example. Engine-facing node names and manifest fields must still be checked at each hand-off.' if route=='best-practices' else 'Changes and requests for the model library.'
 page=f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{title} / jelaludo Workshop</title><link rel="stylesheet" href="../workshop/documentation.css"><link rel="stylesheet" href="../workshop/navigation.css"></head><body>{nav('../',route)}<main class="documentation"><p class="eyebrow">Workshop / {title}</p><div class="doc-source">{intro}<br><a href="../docs/{source}">Read the source notes</a> · <a href="../docs/{source}" download>Download Markdown</a></div>{markdown(text)}<footer>Models by jelaludo · Documentation is versioned with the asset library.</footer></main></body></html>'''
 (P/route/'index.html').write_text(page)
# All existing asset viewers retain their title, local tabs, and DOM control IDs.
viewers=[p for p in P.glob('*/index.html') if p.parent.name not in ['devlog','best-practices']]
for p in viewers+[P/'index.html',P/'reuse.html']:
 s=p.read_text();viewer=p in viewers;prefix='' if p.parent==P or re.search(r'<base\b',s) else '../'
 if 'class="workshop-header"' in s:s=re.sub(r'<header class="workshop-header">.*?</header>',nav(prefix,viewer=viewer),s,count=1,flags=re.S)
 else:
  match=re.search(r'<header\b.*?</header>',s,re.S)
  if not match:raise RuntimeError(f'Missing header: {p}')
  heading=match.group()
  if viewer:
   # Remove redundant global navigation, preserving local collection tabs.
   heading=re.sub(r'<a\b[^>]*>[^<]*(?:Workshop|All collections)[^<]*</a>','',heading)
   heading=re.sub(r'^<header[^>]*>','<section class="asset-heading" aria-label="Asset title">',heading).replace('</header>','</section>')
   replacement=nav(prefix,viewer=True)+heading
  else:replacement=nav(prefix)
  s=s[:match.start()]+replacement+s[match.end():]
 if viewer:
  s=re.sub(r'<aside>\s*<a[^>]*>← Workshop</a>','<aside>',s)
  if re.search(r'<body\b',s):
   if 'workshop-viewer' not in s:s=s.replace('<body>','<body class="workshop-viewer">',1)
  else:s=s.replace('<header class="workshop-header">','<body class="workshop-viewer"><header class="workshop-header">',1)
 if 'workshop/navigation.css' not in s:
  link=f'<link rel="stylesheet" href="{prefix}workshop/navigation.css">'
  if '</head>' in s:s=s.replace('</head>',link+'</head>',1)
  else:s=s.replace('<body',link+'<body',1)
 if viewer and 'workshop/navigation.js' not in s:
  script=f'<script type="module" src="{prefix}workshop/navigation.js"></script>'
  s=s.replace('</html>',script+'</html>')
 p.write_text(s)
print(f'Built 2 documentation pages and shared navigation for {len(viewers)} asset viewers, Workshop and reuse page.')
