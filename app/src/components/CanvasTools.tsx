import { useRef, type CSSProperties } from 'react';
import { ArrowUpRight, Circle, Copy, Eraser, EyeOff, Hand, Highlighter, MousePointer2, Pencil, Redo2, Settings as Cog, Square, Trash2, Undo2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { COLORS, type Ink } from '@/lib/annotations';
import { DRAW_TOOLS, type CanvasTool, type Drawing } from '@/lib/drawings';

const icons={select:MousePointer2,freehand:Pencil,marker:Highlighter,arrow:ArrowUpRight,rectangle:Square,ellipse:Circle,eraser:Eraser};
interface Props {
  open:boolean; hidden:boolean; tool:CanvasTool; color:Ink; weight:number; selected:Drawing|undefined;
  canUndo:boolean; canRedo:boolean; count:number; drawings:Drawing[]; onSelect:(id:string|null)=>void;
  onOpen:(open:boolean)=>void; onHide:()=>void; onTool:(tool:CanvasTool)=>void;
  onColor:(color:Ink)=>void; onWeight:(weight:number)=>void;
  onUndo:()=>void; onRedo:()=>void; onDelete:()=>void; onDuplicate:()=>void; onClear:()=>void;
}
export function CanvasTools(props:Props) {
  const {open,hidden,tool,color,weight,selected,onOpen,onTool}=props;
  const trigger=useRef<HTMLButtonElement>(null);
  const close=()=>{onOpen(false);trigger.current?.focus({preventScroll:true});};
  const choose=(next:CanvasTool)=>{onTool(next);close();};
  if(hidden)return null;
  const label=tool==='read'?'Modo lectura':DRAW_TOOLS.find(t=>t.id===tool)!.label;
  return <>
    <div className={`canvas-wheel ${open?'is-open':''}`}>
      {open?<div className="wheel-arc" id="canvas-wheel-panel" role="group" aria-label="Herramientas del lienzo">
        {DRAW_TOOLS.map((t,i)=>{
          const angle=(-90+i*180/(DRAW_TOOLS.length-1))*Math.PI/180,Icon=icons[t.id];
          return <Button key={t.id} size="icon" variant={tool===t.id?'default':'outline'} className="wheel-tool" aria-label={t.label} aria-pressed={tool===t.id} title={t.label} style={{'--arc-x':`${Math.cos(angle)*116}px`,'--arc-y':`${Math.sin(angle)*146}px`} as CSSProperties} onClick={()=>choose(t.id)}><Icon/><span className="wheel-label">{t.label}</span></Button>;
        })}
        <div className="wheel-center"><span>MI LIENZO</span><Button variant="ghost" size="sm" onClick={()=>choose('read')}><Hand size={15}/>Leer</Button><Button className="wheel-hide" variant="ghost" size="sm" aria-label="Ocultar menú del lienzo" onClick={props.onHide}><EyeOff size={14}/>Ocultar</Button></div>
      </div>:null}
      <Button ref={trigger} className="wheel-trigger" variant="default" aria-label={open?'Plegar herramientas del lienzo':'Abrir herramientas del lienzo'} aria-expanded={open} aria-controls={open?'canvas-wheel-panel':undefined} onClick={()=>onOpen(!open)}><Cog/><span>Lienzo</span></Button>
    </div>
    {open||tool!=='read'||selected?<section className="canvas-inspector" aria-label="Propiedades del lienzo">
      <div className="canvas-inspector-title"><strong>{selected?'Dibujo seleccionado':label}</strong><Button size="icon" variant="ghost" aria-label="Volver a lectura" onClick={()=>choose('read')}><X size={15}/></Button></div>
      {tool==='select'&&props.drawings.length?<select className="native-select canvas-drawing-picker" aria-label="Seleccionar dibujo del capítulo" value={selected?.id||''} onChange={e=>props.onSelect(e.target.value||null)}><option value="">Elegir un dibujo…</option>{props.drawings.map((d,i)=><option key={d.id} value={d.id}>{i+1}. {DRAW_TOOLS.find(t=>t.id===d.kind)?.label} · {COLORS.find(c=>c.id===d.color)?.label}</option>)}</select>:null}
      <p className="canvas-hint">{tool==='eraser'?'Pasa sobre dibujos o subrayados para borrarlos.':tool==='select'?'Elige un dibujo y arrástralo. También puedes moverlo con las flechas del teclado.':tool==='read'?'Elige una herramienta en el semicírculo.':'Arrastra sobre el texto o una imagen. Escape para leer.'}</p>
      {tool!=='eraser'&&(tool!=='select'||selected)?<div className="ink-row">
        <div className="color-options" role="group" aria-label="Color del dibujo">{COLORS.map(c=><button key={c.id} className="color-swatch" aria-label={`Color ${c.label.toLowerCase()}`} aria-pressed={(selected?.color||color)===c.id} style={{'--swatch':c.hex} as CSSProperties} onClick={()=>props.onColor(c.id)}><span/>{(selected?.color||color)===c.id?<span className="swatch-check">✓</span>:null}</button>)}</div>
        <div className="weight-options" role="group" aria-label="Grosor del dibujo">{[1,2,3].map(w=><Button key={w} size="sm" variant={(selected?.weight||weight)===w?'secondary':'ghost'} aria-label={`Grosor ${w}`} aria-pressed={(selected?.weight||weight)===w} onClick={()=>props.onWeight(w)}><span className="weight-sample" style={{height:w*2}}/></Button>)}</div>
      </div>:null}
      <div className="canvas-actions">
        <Button size="icon" variant="outline" aria-label="Deshacer cambio del lienzo" title="Deshacer · ⌘/Ctrl Z" disabled={!props.canUndo} onClick={props.onUndo}><Undo2/></Button>
        <Button size="icon" variant="outline" aria-label="Rehacer cambio del lienzo" title="Rehacer · ⌘/Ctrl Mayús Z" disabled={!props.canRedo} onClick={props.onRedo}><Redo2/></Button>
        {selected?<><Button size="icon" variant="outline" aria-label="Duplicar dibujo" onClick={props.onDuplicate}><Copy/></Button><Button size="icon" variant="outline" aria-label="Eliminar dibujo seleccionado" onClick={props.onDelete}><Trash2/></Button></>:null}
        <Button size="sm" variant="ghost" disabled={!props.count} onClick={props.onClear}>Limpiar capítulo</Button>
        <Button size="icon" variant="ghost" aria-label="Ocultar herramientas del lienzo" title="Ocultar herramientas" onClick={props.onHide}><EyeOff/></Button>
      </div>
    </section>:null}
  </>;
}
