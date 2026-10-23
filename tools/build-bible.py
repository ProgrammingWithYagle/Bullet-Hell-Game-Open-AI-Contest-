"""Render the editable production bible and authored addenda into an illustrated PDF."""
from pathlib import Path
import re, html, json
from reportlab.pdfgen import canvas
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, PageBreak, LongTable, TableStyle, KeepTogether
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from PIL import Image as PILImage

ROOT=Path(__file__).resolve().parents[1]
VERSION=json.loads((ROOT/'content/rules.json').read_text(encoding='utf8'))['contentVersion']
OUT=ROOT/f'output/stage1/Grave-Accord-Production-Bible-v{VERSION}.pdf'
OUT.parent.mkdir(parents=True,exist_ok=True)
font_root=Path(__import__('reportlab').__file__).parent/'fonts'
for name,file in [('Vera','Vera.ttf'),('Vera-Bold','VeraBd.ttf'),('Vera-Italic','VeraIt.ttf')]:
    pdfmetrics.registerFont(TTFont(name,str(font_root/file)))
pdfmetrics.registerFontFamily('Vera',normal='Vera',bold='Vera-Bold',italic='Vera-Italic')
INK=colors.HexColor('#172c2a');TEAL=colors.HexColor('#3c6a60');PAPER=colors.HexColor('#f4f0e4');RULE=colors.HexColor('#c6caba')
styles=getSampleStyleSheet()
for name in ['Normal','BodyText']:
    styles[name].fontName='Vera';styles[name].fontSize=8.5;styles[name].leading=12;styles[name].textColor=INK;styles[name].spaceAfter=6
for name,size,leading in [('Title',28,33),('Heading1',20,25),('Heading2',15,19),('Heading3',11,15)]:
    styles[name].fontName='Vera-Bold';styles[name].fontSize=size;styles[name].leading=leading;styles[name].textColor=TEAL;styles[name].spaceBefore=13;styles[name].spaceAfter=7
    styles[name].keepWithNext=True
styles.add(ParagraphStyle(name='Cell',fontName='Vera',fontSize=6.7,leading=9.1,textColor=INK,spaceAfter=0,wordWrap='LTR',splitLongWords=True))
styles.add(ParagraphStyle(name='CellHead',parent=styles['Cell'],fontName='Vera-Bold',textColor=colors.white))
styles.add(ParagraphStyle(name='Small',parent=styles['Normal'],fontSize=7,leading=10))
WIDTH,HEIGHT=A4;AVAILABLE=WIDTH-84

def inline(s):
    for dash in ['\u2010','\u2011','\u2012','\u2013','\u2014','\u2212']:s=s.replace(dash,'-')
    s=html.escape(s)
    s=re.sub(r'\[([^\]]+)\]\((https?://[^\)]+)\)',lambda m:'<link href="'+m[2]+'" color="#3c6a60">'+m[1]+'</link>',s)
    s=re.sub(r'\*\*([^*]+)\*\*',r'<b>\1</b>',s)
    s=re.sub(r'`([^`]+)`',r'\1',s)
    return s

def cell(s,head=False):return Paragraph(inline(s),styles['CellHead' if head else 'Cell'])

def table_cells(line):
    # Pipes inside inline code are text, not Markdown column delimiters.
    cells=[];current=[];in_code=False;escaped=False
    for char in line.strip().strip('|'):
        if escaped:
            current.append(char);escaped=False;continue
        if char=='\\':escaped=True;continue
        if char=='`':in_code=not in_code
        if char=='|' and not in_code:cells.append(''.join(current).strip());current=[]
        else:current.append(char)
    cells.append(''.join(current).strip());return cells

def table(lines):
    rows=[table_cells(line) for line in lines]
    rows=[r for r in rows if not all(re.fullmatch(r':?-+:?',v.replace(' ','')) for v in r)]
    columns=len(rows[0]);assert all(len(r)==columns for r in rows),'Malformed table columns: '+repr(rows)
    weights=[min(40,max(8,max(len(r[i]) for r in rows)**.6*3)) for i in range(columns)]
    if columns>=5:weights=[max(7,w) for w in weights]
    widths=[AVAILABLE*w/sum(weights) for w in weights]
    t=LongTable([[cell(v,idx==0) for v in r] for idx,r in enumerate(rows)],colWidths=widths,repeatRows=1,hAlign='LEFT')
    t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),TEAL),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),5),('RIGHTPADDING',(0,0),(-1,-1),5),('TOPPADDING',(0,0),(-1,-1),5),('BOTTOMPADDING',(0,0),(-1,-1),5),('LINEBELOW',(0,0),(-1,-1),.35,RULE),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.HexColor('#edf0e6'),colors.HexColor('#faf8f0')])]))
    return t

def md(file):
    lines=(ROOT/file).read_text(encoding='utf8').splitlines();flow=[];i=0
    while i<len(lines):
        line=lines[i].strip()
        if line.startswith('<!--'):i+=1;continue
        if file=='docs/LOCALIZATION_IMPLEMENTATION.md' and line.startswith('- Traditional Chinese is a separate editable source'):
            line='- Traditional Chinese is an independent editable source and JSON catalog. Initial script conversion was followed by traditional terminology adjustments for game, settings, server, screen, network, loading, saving and port. The editable Markdown retains the native-script examples. Review both Chinese variants independently; this is not native-speaker certification.'
        if not line:i+=1;continue
        if line.startswith('|'):
            chunk=[]
            while i<len(lines) and lines[i].strip().startswith('|'):chunk.append(lines[i]);i+=1
            flow.extend([table(chunk),Spacer(1,8)]);continue
        if line.startswith('#'):
            n=len(line)-len(line.lstrip('#'));style='Heading'+str(min(n,3));flow.append(Paragraph(inline(line[n:].strip()),styles[style]));i+=1;continue
        if line.startswith('```'):
            block=[];i+=1
            while i<len(lines) and not lines[i].startswith('```'):block.append(lines[i]);i+=1
            # Code is editable in the source; use wrapped plain paragraphs in the print document.
            for item in block:flow.append(Paragraph(inline(item) or ' ',styles['Small']))
            i+=1;continue
        if line.startswith('- '):flow.append(Paragraph('&#8226; '+inline(line[2:]),styles['Normal']));i+=1;continue
        paragraph=[line];i+=1
        while i<len(lines) and lines[i].strip() and not lines[i].lstrip().startswith(('#','|','- ','```')):paragraph.append(lines[i].strip());i+=1
        flow.append(Paragraph(inline(' '.join(paragraph)),styles['Normal']))
    return flow

def illustration(file,max_height=360):
    with PILImage.open(ROOT/file) as im:w,h=im.size
    scale=min(AVAILABLE/w,max_height/h)
    return Image(str(ROOT/file),width=w*scale,height=h*scale,hAlign='CENTER')

def page(canv,doc):
    canv.saveState();canv.setFillColor(PAPER);canv.rect(0,0,WIDTH,HEIGHT,fill=1,stroke=0)
    canv.setStrokeColor(RULE);canv.line(42,36,WIDTH-42,36);canv.setFont('Vera',7);canv.setFillColor(TEAL)
    canv.drawString(42,24,'GRAVE ACCORD / PRODUCTION BIBLE / '+VERSION);canv.drawRightString(WIDTH-42,24,str(doc.page));canv.restoreState()

story=[Spacer(1,18),Paragraph('GRAVE ACCORD',styles['Title']),Paragraph('The city forgot their names.<br/>They remember each other.',styles['Heading2']),Spacer(1,12),illustration('assets/proofs/cover-v1.png',330),Spacer(1,14),Paragraph('Illustrated production bible',styles['Heading1']),Paragraph('Edition '+VERSION+' · 22 October 2026',styles['Normal']),Paragraph('Expanded 60-boss design, authored preproduction specifications, art and audio proofs. This packet does not claim a playable release, measured runtime performance, native-speaker review or human playtesting.',styles['Normal']),PageBreak()]
story+=md('docs/GAME_BIBLE.md')
for file in ['docs/BOSS_ROSTER_EXPANSION.md','docs/LEADERBOARDS.md','docs/AUDIO_BIBLE.md','docs/LOCALIZATION_IMPLEMENTATION.md','docs/NETWORK_AND_SAVE_CONTRACT.md','docs/IMPLEMENTATION_BACKLOG.md']:
    if (ROOT/file).exists():story.append(PageBreak());story+=md(file)
story.append(PageBreak());story.append(Paragraph('Art proof plates',styles['Heading1']))
contract=json.loads((ROOT/'docs/art-contracts.json').read_text(encoding='utf8'))
for idx,p in enumerate(contract['proofs']+contract.get('supplementalProofs',[])):
    if idx:story.append(PageBreak())
    story.extend([Paragraph(p['id'],styles['Heading2']),Paragraph(p['acceptance'],styles['Normal']),Spacer(1,10),illustration(p['file'],535),Spacer(1,12),Paragraph(p['file'],styles['Small'])])
story.append(PageBreak());story+=md('CHANGELOG.md')
class BibleDoc(SimpleDocTemplate):
    section_counter=0
    def afterFlowable(self,flowable):
        if isinstance(flowable,Paragraph) and flowable.style.name in ['Heading1','Heading2']:
            level=0 if flowable.style.name=='Heading1' or not self.section_counter else 1
            self.section_counter+=1;key='section-'+str(self.section_counter)
            self.canv.bookmarkPage(key);self.canv.addOutlineEntry(flowable.getPlainText(),key,level,closed=True)
doc=BibleDoc(str(OUT),pagesize=A4,rightMargin=42,leftMargin=42,topMargin=40,bottomMargin=47,title='Grave Accord - Illustrated Production Bible',author='ProgrammingWithYagle / OpenAI coding assistant',pageCompression=1)
doc.build(story,onFirstPage=page,onLaterPages=page)
print(OUT)
