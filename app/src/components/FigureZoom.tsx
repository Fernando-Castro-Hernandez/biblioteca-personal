import { BOOK, BOOK_PATH, asset } from '@/lib/book';
import { COLORS } from '@/lib/annotations';
import { projectDrawing, shapePath, type Drawing } from '@/lib/drawings';

export function FigureZoom({src,chapter,drawings}:{src:string;chapter:number;drawings:Drawing[]}) {
  const block=BOOK[chapter].blocks.find(b=>b.kind==='image'&&asset(BOOK_PATH+'lector/'+b.src)===src);
  const width=block?.width||1,height=block?.height||1;
  const boxes=new Map(block?[[block.id,{id:block.id,x:0,y:0,width,height}]]:[]);
  return <div className="zoom-figure"><img src={src} alt="Ilustración ampliada del libro"/>{block?<svg className="zoom-drawings" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-label="Marcas sobre la ilustración">{drawings.map(d=>{
    const points=projectDrawing(d,boxes);
    return points.length?<path key={d.id} data-zoom-drawing={d.id} d={shapePath(d.kind,points)} fill="none" stroke={COLORS.find(c=>c.id===d.color)!.hex} strokeWidth={d.kind==='marker'?d.weight*7:d.weight*2} strokeOpacity={d.kind==='marker'?.35:1} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"/>:null;
  })}</svg>:null}</div>;
}
