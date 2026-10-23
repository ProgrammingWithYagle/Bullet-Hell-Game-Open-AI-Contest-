"""Inventory the rendered PDF and make paginated contact sheets for visual review."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
from pypdf import PdfReader
import json,hashlib,re
ROOT=Path(__file__).resolve().parents[1]
version=json.loads((ROOT/'content/rules.json').read_text(encoding='utf8'))['contentVersion']
pdf=ROOT/f'output/stage1/Grave-Accord-Production-Bible-v{version}.pdf'
reader=PdfReader(pdf);folder=ROOT/f'tmp/pdfs/v{version}'
files=sorted(folder.glob('page-*.png'))
assert len(files)==len(reader.pages),(len(files),len(reader.pages))
font=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',17)
for group in range(0,len(files),12):
    plate=Image.new('RGB',(1600,1770),'#d9ddcf');d=ImageDraw.Draw(plate)
    for k,file in enumerate(files[group:group+12]):
        im=Image.open(file).convert('RGB');im.thumbnail((376,525))
        x=12+(k%4)*400;y=12+(k//4)*590
        plate.paste(im,(x,y));d.text((x,y+530),'Page '+str(group+k+1),font=font,fill='#19352d')
    plate.save(folder/f'contact-{group//12+1:02}.png')
pages=[{'page':i+1,'firstText':p.extract_text().splitlines()[:3]} for i,p in enumerate(reader.pages)]
text='\n'.join(p.extract_text() for p in reader.pages)
assert '\ufffd' not in text
assert not re.search(r'\b(TBD|TODO|FIXME)\b',text)
assert 'City Eater' in text and 'The Last Knocker' in text and '959' in text
report={'pages':len(files),'pdfSha256':hashlib.sha256(pdf.read_bytes()).hexdigest(),'textCharacters':len(text),'bookmarks':bool(reader.outline),'rendered':True,'visualReview':'Pending inspection of contact sheets and representative full-size pages.','pageIndex':pages}
(ROOT/'reviews/pdf-render-v0.2.0.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf8')
print(json.dumps(report,indent=2))
