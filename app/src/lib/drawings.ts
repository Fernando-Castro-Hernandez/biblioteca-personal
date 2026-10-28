import { blockById } from './book';
import { COLORS, type Ink, type Annotation } from './annotations';

export const DRAW_TOOLS = [
  { id: 'select', label: 'Seleccionar y mover' },
  { id: 'freehand', label: 'Lápiz libre' },
  { id: 'marker', label: 'Marcador libre' },
  { id: 'arrow', label: 'Flecha' },
  { id: 'rectangle', label: 'Rectángulo' },
  { id: 'ellipse', label: 'Elipse' },
  { id: 'eraser', label: 'Borrador' },
] as const;
export type CanvasTool = 'read' | typeof DRAW_TOOLS[number]['id'];
export type DrawingKind = 'freehand' | 'marker' | 'arrow' | 'rectangle' | 'ellipse';
export interface Point { x: number; y: number }
export interface AnchoredPoint extends Point { block: string }
export interface Box { id: string; x: number; y: number; width: number; height: number }
export interface Drawing {
  id: string; chapter: number; kind: DrawingKind; color: Ink; weight: number;
  points: AnchoredPoint[]; createdAt: string; updatedAt: string;
}
export interface Markup { annotations: Annotation[]; drawings: Drawing[] }

/** Store coordinates relative to content, not the viewport or the chapter's total height. */
export function anchorPoint(point: Point, boxes: Box[]): AnchoredPoint | null {
  let closest: Box | undefined;
  let distance = Infinity;
  for (const box of boxes) {
    if (box.width <= 0 || box.height <= 0) continue;
    const dy = Math.max(box.y - point.y, 0, point.y - box.y - box.height);
    const dx = Math.max(box.x - point.x, 0, point.x - box.x - box.width);
    const score = dy * dy + dx * dx;
    if (score < distance) { distance = score; closest = box; }
  }
  return closest ? { block: closest.id, x: (point.x - closest.x) / closest.width, y: (point.y - closest.y) / closest.height } : null;
}
export function projectPoint(point: AnchoredPoint, boxes: Map<string, Box>): Point | null {
  const box = boxes.get(point.block);
  return box ? { x: box.x + point.x * box.width, y: box.y + point.y * box.height } : null;
}
export function projectDrawing(drawing: Drawing, boxes: Map<string, Box>): Point[] {
  const points = drawing.points.map(p => projectPoint(p, boxes));
  return points.every((p): p is Point => p !== null) ? points : [];
}
const rounded = (n: number) => Math.round(n * 100) / 100;
export function shapePath(kind: DrawingKind, points: Point[]): string {
  if (points.length < 2) return '';
  const a = points[0], b = points.at(-1)!;
  if (kind === 'rectangle') return `M${a.x},${a.y} H${b.x} V${b.y} H${a.x} Z`;
  if (kind === 'ellipse') {
    const rx = Math.abs(b.x - a.x) / 2, ry = Math.abs(b.y - a.y) / 2;
    const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
    return `M${cx-rx},${cy} a${rx},${ry} 0 1,0 ${2*rx},0 a${rx},${ry} 0 1,0 ${-2*rx},0`;
  }
  if (kind === 'arrow') {
    const angle = Math.atan2(b.y-a.y, b.x-a.x), head = Math.min(18, Math.hypot(b.x-a.x,b.y-a.y)*.4);
    const left = {x:b.x-head*Math.cos(angle-.5),y:b.y-head*Math.sin(angle-.5)};
    const right = {x:b.x-head*Math.cos(angle+.5),y:b.y-head*Math.sin(angle+.5)};
    return `M${a.x},${a.y} L${b.x},${b.y} M${left.x},${left.y} L${b.x},${b.y} L${right.x},${right.y}`;
  }
  return points.map((p,i) => `${i ? 'L' : 'M'}${rounded(p.x)},${rounded(p.y)}`).join(' ') + (points.every(p=>p.x===a.x&&p.y===a.y) ? ' l0.1,0.1' : '');
}
export function drawingBounds(points: Point[]) {
  return { x:Math.min(...points.map(p=>p.x)), y:Math.min(...points.map(p=>p.y)), width:Math.max(...points.map(p=>p.x))-Math.min(...points.map(p=>p.x)), height:Math.max(...points.map(p=>p.y))-Math.min(...points.map(p=>p.y)) };
}
export function distanceToSegment(p: Point, a: Point, b: Point) {
  const dx=b.x-a.x,dy=b.y-a.y,len=dx*dx+dy*dy;
  const t=len ? Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/len)) : 0;
  return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);
}
export function hitDrawing(drawing: Drawing, points: Point[], point: Point): boolean {
  if (points.length < 2) return false;
  const tolerance = (drawing.kind === 'marker' ? drawing.weight * 5 : drawing.weight + 1) + 7;
  const a=points[0],b=points.at(-1)!;
  if (drawing.kind === 'rectangle') {
    const c={x:b.x,y:a.y},d={x:a.x,y:b.y};
    return [[a,c],[c,b],[b,d],[d,a]].some(([p,q])=>distanceToSegment(point,p,q)<=tolerance);
  }
  if (drawing.kind === 'ellipse') {
    const rx=Math.abs(b.x-a.x)/2,ry=Math.abs(b.y-a.y)/2;
    if (rx < 1 || ry < 1) return distanceToSegment(point,a,b)<=tolerance;
    const radius=Math.hypot((point.x-(a.x+b.x)/2)/rx,(point.y-(a.y+b.y)/2)/ry);
    return Math.abs(radius-1)*Math.min(rx,ry)<=tolerance;
  }
  return points.slice(1).some((p,i)=>distanceToSegment(point,points[i],p)<=tolerance);
}
export function validDrawing(value: unknown): value is Drawing {
  if (!value || typeof value !== 'object') return false;
  const d=value as Drawing;
  if (typeof d.id!=='string'||!d.id||!Number.isInteger(d.chapter)||!['freehand','marker','arrow','rectangle','ellipse'].includes(d.kind)||!COLORS.some(c=>c.id===d.color)||![1,2,3].includes(d.weight)||!Number.isFinite(Date.parse(d.createdAt))||!Number.isFinite(Date.parse(d.updatedAt))||!Array.isArray(d.points)||d.points.length<2||d.points.length>5000) return false;
  if (!['freehand','marker'].includes(d.kind) && d.points.length!==2) return false;
  return d.points.every(p=>p && typeof p.block==='string' && blockById.get(p.block)?.chapter===d.chapter && blockById.get(p.block)?.block.kind!=='source-title' && Number.isFinite(p.x) && Number.isFinite(p.y) && Math.abs(p.x)<=100 && Math.abs(p.y)<=100);
}

/** History contains only marks/drawings; undo never rewinds reading position or chapter notes. */
export function createMarkupHistory(limit = 40) {
  const past: Markup[] = [], future: Markup[] = [];
  return {
    get canUndo() { return past.length > 0; }, get canRedo() { return future.length > 0; },
    record(before: Markup) { past.push(before); if(past.length>limit)past.shift(); future.length=0; },
    undo(current: Markup) { const previous=past.pop(); if(previous)future.push(current); return previous; },
    redo(current: Markup) { const next=future.pop(); if(next)past.push(current); return next; },
  };
}
