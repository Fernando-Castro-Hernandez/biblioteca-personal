import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { COLORS, type Annotation } from '@/lib/annotations';
import { anchorPoint, drawingBounds, hitDrawing, projectDrawing, projectPoint, shapePath, type Box, type CanvasTool, type Drawing, type DrawingKind, type Point } from '@/lib/drawings';

interface Props {
  chapter: number; drawings: Drawing[]; annotations: Annotation[]; tool: CanvasTool;
  color: Drawing['color']; weight: number; selected: string | null;
  onSelect: (id: string | null) => void; onSave: (drawing: Drawing) => void;
  onErase: (drawings: Set<string>, annotations: Set<string>) => void;
}
interface Gesture {
  pointer: number; origin: Point; original?: Drawing; draft?: Drawing;
  erasedDrawings: Set<string>; erasedAnnotations: Set<string>;
}
export function CanvasLayer({ chapter, drawings, annotations, tool, color, weight, selected, onSelect, onSave, onErase }: Props) {
  const svg = useRef<SVGSVGElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const [layout, setLayout] = useState({ width: 1, height: 1, boxes: [] as Box[] });
  const [draft, setDraft] = useState<Drawing | null>(null);
  const [erased, setErased] = useState(new Set<string>());
  const boxes = new Map(layout.boxes.map(b=>[b.id,b]));
  const measure = () => {
    const root=svg.current?.parentElement;
    if(!root)return;
    const base=root.getBoundingClientRect();
    const blocks=[...root.querySelectorAll<HTMLElement>('#book-text > [id]')].map(el=>{
      const rect=(el.querySelector('img') || el).getBoundingClientRect();
      return {id:el.id,x:rect.left-base.left,y:rect.top-base.top,width:rect.width,height:rect.height};
    });
    setLayout({width:base.width,height:base.height,boxes:blocks});
  };
  useLayoutEffect(()=>{
    measure();
    const root=svg.current!.parentElement!;
    const observer=new ResizeObserver(measure); observer.observe(root);
    root.addEventListener('load',measure,true);
    return ()=>{observer.disconnect();root.removeEventListener('load',measure,true);};
  },[chapter]);
  useLayoutEffect(()=>{measure();},[annotations]);
  const cancel = () => { gesture.current=null;setDraft(null);setErased(new Set()); };
  useEffect(()=>{cancel();},[tool,chapter]);
  useEffect(()=>{
    const escape=(event:KeyboardEvent)=>{if(event.key==='Escape')cancel();};
    window.addEventListener('keydown',escape);return()=>window.removeEventListener('keydown',escape);
  },[]);
  const local = (e: ReactPointerEvent): Point => {
    const rect=svg.current!.getBoundingClientRect();
    return {x:Math.max(0,Math.min(rect.width,e.clientX-rect.left)),y:Math.max(0,Math.min(rect.height,e.clientY-rect.top))};
  };
  const hit = (point: Point) => drawings.findLast(d=>hitDrawing(d,projectDrawing(d,boxes),point));
  const erase = (e: ReactPointerEvent, point: Point, g: Gesture) => {
    for(const d of drawings)if(hitDrawing(d,projectDrawing(d,boxes),point))g.erasedDrawings.add(d.id);
    // Text can contain several inline fragments, each with its own visible rectangle.
    for(const mark of svg.current!.parentElement!.querySelectorAll<HTMLElement>('mark[data-annotation]')) {
      if([...mark.getClientRects()].some(r=>e.clientX>=r.left-4&&e.clientX<=r.right+4&&e.clientY>=r.top-4&&e.clientY<=r.bottom+4))g.erasedAnnotations.add(mark.dataset.annotation!);
    }
    setErased(new Set(g.erasedDrawings));
  };
  const down = (e: ReactPointerEvent<SVGSVGElement>) => {
    if(e.button!==0||!e.isPrimary||tool==='read'||gesture.current)return;
    e.preventDefault();window.getSelection()?.removeAllRanges();
    const point=local(e),g:Gesture={pointer:e.pointerId,origin:point,erasedDrawings:new Set(),erasedAnnotations:new Set()};
    gesture.current=g;e.currentTarget.setPointerCapture(e.pointerId);
    if(tool==='eraser'){erase(e,point,g);return;}
    if(tool==='select'){
      const found=hit(point);onSelect(found?.id||null);
      if(found){g.original=found;g.draft=found;setDraft(found);}return;
    }
    const anchored=anchorPoint(point,layout.boxes);
    if(!anchored){cancel();return;}
    const now=new Date().toISOString();
    const drawing:Drawing={id:crypto.randomUUID(),chapter,kind:tool as DrawingKind,color,weight,points:[anchored,anchored],createdAt:now,updatedAt:now};
    g.draft=drawing;setDraft(drawing);onSelect(null);
  };
  const move = (e: ReactPointerEvent<SVGSVGElement>) => {
    const g=gesture.current;if(!g||g.pointer!==e.pointerId)return;
    const point=local(e);
    if(tool==='eraser'){erase(e,point,g);return;}
    if(!g.draft)return;
    if(g.original){
      const dx=point.x-g.origin.x,dy=point.y-g.origin.y;
      const points=projectDrawing(g.original,boxes).map(p=>anchorPoint({x:p.x+dx,y:p.y+dy},layout.boxes)!);
      g.draft={...g.original,points};
    }else{
      const anchored=anchorPoint(point,layout.boxes);if(!anchored)return;
      const free=g.draft.kind==='freehand'||g.draft.kind==='marker';
      if(free){
        const last=projectPoint(g.draft.points.at(-1)!,boxes)!;
        if(Math.hypot(point.x-last.x,point.y-last.y)<1.5||g.draft.points.length>=5000)return;
      }
      g.draft={...g.draft,points:free?[...g.draft.points,anchored]:[g.draft.points[0],anchored]};
    }
    setDraft(g.draft);
  };
  const up = (e: ReactPointerEvent<SVGSVGElement>) => {
    const g=gesture.current;if(!g||g.pointer!==e.pointerId)return;
    move(e);
    if(tool==='eraser'){
      if(g.erasedDrawings.size||g.erasedAnnotations.size)onErase(g.erasedDrawings,g.erasedAnnotations);
    }else if(g.draft){
      const points=projectDrawing(g.draft,boxes),bounds=drawingBounds(points);
      const moved=Math.hypot(local(e).x-g.origin.x,local(e).y-g.origin.y)>2;
      if(g.original ? moved : ['freehand','marker'].includes(g.draft.kind)||Math.hypot(bounds.width,bounds.height)>4){
        onSave({...g.draft,updatedAt:new Date().toISOString()});
        if(g.original)onSelect(g.draft.id);
      }
    }
    cancel();if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);
  };
  const renderDrawings=[...drawings.filter(d=>d.id!==draft?.id&&!erased.has(d.id)),...(draft?[draft]:[])];
  const chosen=renderDrawings.find(d=>d.id===selected);
  const selectedPoints=chosen?projectDrawing(chosen,boxes):[];
  const bounds=selectedPoints.length?drawingBounds(selectedPoints):null;
  return <svg ref={svg} className={`drawing-canvas tool-${tool}`} width={layout.width} height={layout.height} aria-label="Lienzo de anotaciones" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={cancel} onLostPointerCapture={cancel}>
    <title>Dibujos sobre el texto y las ilustraciones</title>
    {renderDrawings.map(d=><path key={d.id} data-drawing={d.id} data-kind={d.kind} d={shapePath(d.kind,projectDrawing(d,boxes))} fill="none" stroke={COLORS.find(c=>c.id===d.color)!.hex} strokeWidth={d.kind==='marker'?d.weight*7:d.weight*2} strokeOpacity={d.kind==='marker'?.35:1} strokeLinecap="round" strokeLinejoin="round" />)}
    {bounds&&tool==='select'?<rect className="drawing-selection" x={bounds.x-7} y={bounds.y-7} width={Math.max(14,bounds.width+14)} height={Math.max(14,bounds.height+14)} rx="4" fill="none" stroke="var(--primary)" strokeDasharray="5 4" strokeWidth="1.5"/>:null}
  </svg>;
}
