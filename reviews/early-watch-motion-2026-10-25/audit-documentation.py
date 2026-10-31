from pathlib import Path
import re,json,hashlib,urllib.parse
r=Path(r'C:\Users\yigal\OneDrive\Documents\ChatGPT\OpenAI Multiplayer Game Contest (Bullet Hell)')
j=json.loads((r/'docs/checkpoint-cleanup-2026-10-25.json').read_text(encoding='utf-8'))
for a in j['archives']:
    p=r/a['archive'];assert p.stat().st_size==a['bytes'] and hashlib.sha256(p.read_bytes()).hexdigest()==a['sha256'],a['path']
paths=[r/'README.md',*sorted((r/'docs').glob('*.md')),*sorted((r/'docs/wiki').glob('*.md'))]
broken=[];checked=0
for p in paths:
    s=p.read_text(encoding='utf-8')
    for dest in re.findall(r'\]\(([^\s\)]+)\)',s):
        if re.match(r'^[a-zA-Z]+:',dest) or dest.startswith('#'):continue
        rel=urllib.parse.unquote(dest.split('#')[0]);target=p.parent/rel
        if p.parent.name=='wiki' and not Path(rel).suffix:target=target.with_suffix('.md')
        checked+=1
        if not target.exists():broken.append({'file':p.relative_to(r).as_posix(),'target':dest})
report={'archivedDocuments':len(j['archives']),'archiveBytesAndHashesMatch':True,'activeMarkdownFiles':len(paths),'relativeLinksChecked':checked,'brokenLinks':broken}
Path(__file__).with_name('documentation-audit.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps(report,indent=2))
