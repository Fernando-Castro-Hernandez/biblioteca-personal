from pathlib import Path
import fitz,re,json,html,unicodedata,urllib.parse,collections
ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'lector';(OUT/'assets').mkdir(exist_ok=True,parents=True)
def order(f):
 m=re.search(r'^(\d+)-',f.stem); return int(m[1]) if m else 0
def clean(s):return unicodedata.normalize('NFC',s).replace('\u00ad','')
def join(a,b):
 if a.endswith(('‐','\u00ad')):return a[:-1]+b
 return a+' '+b
chapters=[];report=[]
manifest=json.loads((ROOT/'pdfs/indice.json').read_text())
for ci,entry in enumerate(manifest):
 f=ROOT/'pdfs'/entry['archivo']
 d=fitz.open(f); seq=entry['orden']
 title=entry['titulo']
 blocks=[]; headings=[]; images=0; empty=[]
 for pn,p in enumerate(d):
  raw=p.get_text('dict'); events=[]
  table_spec={(13,44):([33.75,266.25,440.25],[23.25,74.25,341.25]),(17,22):([33.75,128.25,200.25,291.75,368.25,464.25],[23.25,54,145.5,216.75,288,378.75])}.get((seq,pn))
  table_rect=None
  if table_spec:
   xs,ys=table_spec;table_rect=fitz.Rect(xs[0],ys[0],xs[-1],ys[-1]);rows=[]
   for ya,yb in zip(ys,ys[1:]):
    row=[]
    for xa,xb in zip(xs,xs[1:]):
     lines=p.get_text('text',clip=fitz.Rect(xa,ya,xb,yb),sort=True).splitlines();value=''
     for line in lines:value=join(value,line.strip()) if value else line.strip()
     row.append(clean(value))
    rows.append(row)
   rich='<div class="table-scroll"><table><thead><tr>'+''.join('<th scope="col">'+html.escape(x)+'</th>' for x in rows[0])+'</tr></thead><tbody>'+''.join('<tr>'+''.join('<td>'+html.escape(x)+'</td>' for x in row)+'</tr>' for row in rows[1:])+'</tbody></table></div>'
   events.append({'kind':'table','text':' '.join(x for row in rows for x in row),'rich':rich,'y':ys[0],'bottom':ys[-1],'x':xs[0],'page':pn+1})
  bullets=[x['rect'] for x in p.get_drawings() if 1<x['rect'].width<6 and 1<x['rect'].height<6 and x['rect'].x0<100]
  for b in raw['blocks']:
   if b['type']==1:
    r=fitz.Rect(b['bbox'])
    if r.y0<3 and r.width>700 and r.height<60:continue
    if r.width<20 or r.height<20:continue
    name=f'{ci:02}-{pn+1:03}-{images:03}.png'
    clip=r & p.rect
    if clip.is_empty:continue
    p.get_pixmap(matrix=fitz.Matrix(2,2),clip=clip).save(OUT/'assets'/name)
    events.append({'kind':'image','src':'assets/'+name,'width':round(clip.width*2),'height':round(clip.height*2),'y':r.y0,'bottom':r.y1,'x':r.x0,'page':pn+1,'text':''});images+=1
   elif b['type']==0:
    for l in b['lines']:
     if table_rect and table_rect.contains(fitz.Point(l['bbox'][0]+1,(l['bbox'][1]+l['bbox'][3])/2)):continue
     spans=l['spans'];text=clean(''.join(s['text'] for s in spans)).strip()
     if not text:continue
     size=max(s['size'] for s in spans)
     kind='h2' if size>=19 else 'h3' if size>=14 else 'code' if all(('Mono' in s['font'] or 'Courier' in s['font']) for s in spans if s['text'].strip()) else 'p'
     if kind=='code':text=clean(''.join(s['text'] for s in spans)).rstrip()
     if size<=9.5 and text.isdigit():kind='sup'
     rich=''
     for s in spans:
      t=html.escape(clean(s['text']))
      if 'Mono' in s['font'] or 'Courier' in s['font']:t='<code>'+t+'</code>'
      if 'Italic' in s['font']:t='<em>'+t+'</em>'
      if 'Bold' in s['font']:t='<strong>'+t+'</strong>'
      rich+=t
     bullet=any(abs(r.x1-l['bbox'][0])<15 and l['bbox'][1]<=r.y0<=l['bbox'][3] for r in bullets)
     events.append({'bullet':bullet,'kind':kind,'text':text,'rich':rich,'y':l['bbox'][1],'bottom':l['bbox'][3],'x':l['bbox'][0],'page':pn+1,'size':size})
  # Integrate superscript references into their nearest baseline rather than the end of the page.
  supers=[e for e in events if e['kind']=='sup'];events=[e for e in events if e['kind']!='sup']
  for s in supers:
   candidates=[e for e in events if e['kind'] not in ['image'] and abs(e['y']-s['y'])<15]
   if candidates:
    near=min(candidates,key=lambda e:abs(e['y']-s['y']))
    near['rich']+='<sup>'+html.escape(s['text'])+'</sup>';near['text']+=' ['+s['text']+']'
   else:s['kind']='p';events.append(s)
  events.sort(key=lambda e:(round(e['y']/3),e['x']))
  if not events:empty.append(pn+1)
  for e in events:
   prev=blocks[-1] if blocks else None
   same=prev and prev['kind']==e['kind'] and e['kind'] not in ['image','table'] and not e.get('bullet') and (e['kind']=='code' or abs(prev['x']-e['x'])<10)
   adjacent=prev and ((e['page']==prev['endpage'] and -2<=e['y']-prev['bottom']<=13) or (e['page']==prev['endpage']+1 and prev['bottom']>550 and e['y']<40))
   # Avoid merging separate entries in the alphabetical index; preserve code indentation.
   if same and adjacent and seq!=19:
    sep='\n' if e['kind']=='code' else ' '
    if e['kind']=='code':
     prev['text']+='\n'+e['text'];prev['rich']=html.escape(prev['text'])
    else:
     hyphen=prev['text'].endswith('‐')
     prev['text']=join(prev['text'],e['text'])
     if hyphen:prev['rich']=re.sub(r'‐((?:</(?:em|strong)>)*?)$',r'\1',prev['rich'])+e['rich']
     else:prev['rich']+=' '+e['rich']
    prev['bottom']=e['bottom'];prev['endpage']=e['page']
   else:
    e['endpage']=e['page']
    if e['kind']=='code':e['rich']=html.escape(e['text'])
    blocks.append(e)
 # The first extracted heading duplicates the reader's own chapter heading.
 if blocks and blocks[0]['kind'] in ['h2','h3']: blocks[0]['kind']='source-title'
 for bi,b in enumerate(blocks):
  b['id']=f'c{ci}-b{bi}'
  if b['kind'] in ['h2','h3']:headings.append({'id':b['id'],'title':b['text']})
  for k in ['y','bottom','x','size','endpage']:b.pop(k,None)
 chapters.append({'title':title,'file':'../pdfs/'+urllib.parse.quote(f.name),'pages':len(d),'blocks':blocks,'headings':headings,'words':sum(len(b['text'].split()) for b in blocks)})
 report.append({'archivo':f.name,'orden':seq,'paginas':len(d),'bloques':len(blocks),'imagenes':images,'paginas_sin_contenido':empty})
(OUT/'conversion.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
(ROOT/'herramientas'/'book.json').write_text(json.dumps(chapters,ensure_ascii=False))
template=(ROOT/'herramientas'/'lector.template.html').read_text()
(OUT/'index.html').write_text(template.replace('/*BOOK_DATA*/',json.dumps(chapters,ensure_ascii=False).replace('</','<\\/')))
print(json.dumps({'archivos':len(chapters),'paginas':sum(c['pages'] for c in chapters),'palabras':sum(c['words'] for c in chapters),'imagenes':sum(r['imagenes'] for r in report)},ensure_ascii=False))
