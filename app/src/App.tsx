import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Pencil as PencilIcon, ArrowDownToLine, ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, Bookmark, Check, ChevronDown, ChevronLeft, ChevronRight, FileText, Highlighter, Library, Maximize, Menu, MessageSquare, NotebookPen, Plus, Search, Settings2, Trash2, X } from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { FigureZoom } from '@/components/FigureZoom';
import { CanvasLayer } from '@/components/CanvasLayer';
import { CanvasTools } from '@/components/CanvasTools';
import { DRAW_TOOLS, type CanvasTool, type Drawing } from '@/lib/drawings';
import { useMarkupHistory } from '@/lib/useMarkupHistory';
import { Article } from '@/components/Article';
import { InkControls, type InkOptions } from '@/components/InkControls';
import { Settings } from '@/components/Settings';
import { BOOK, BOOK_KEY, BOOK_PATH, asset, cover, delivery, normalize, pdfURL, searchIndex } from '@/lib/book';
import { COLORS, TOOLS, type Annotation, type SelectionDraft } from '@/lib/annotations';
import { loadState, mergeBackup, parseBackup, type ReaderState } from '@/lib/storage';

type View = 'library' | 'reader' | 'notebook' | 'deliveries';
const initial = loadState();
const route = () => {
  const match = location.hash.match(/^#leer\/(\d+)(?:\/(c\d+-b\d+))?$/);
  if (match && BOOK[Number(match[1])]) return { view: 'reader' as View, chapter: Number(match[1]), anchor: match[2] || '' };
  return { view: ({ '#cuaderno': 'notebook', '#entregas': 'deliveries', '#biblioteca': 'library' }[location.hash] || document.documentElement.dataset.view || 'library') as View };
};
const initialRoute = route();
function IconButton({ label, children, onClick, pressed }: { label: string; children: React.ReactNode; onClick: () => void; pressed?: boolean }) {
  return <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" aria-label={label} aria-pressed={pressed} onClick={onClick}>{children}</Button></TooltipTrigger><TooltipContent>{label}</TooltipContent></Tooltip>;
}
function App() {
  const [state, setState] = useState<ReaderState>(() => {
    if (initialRoute.chapter === undefined) return initial.state;
    const resume = !initialRoute.anchor && initialRoute.chapter === initial.state.chapter;
    return { ...initial.state, chapter: initialRoute.chapter, anchor: resume ? initial.state.anchor : initialRoute.anchor || '', offset: resume ? initial.state.offset : 0 };
  });
  const stateRef = useRef(state); stateRef.current = state;
  const markup = useMarkupHistory(stateRef, setState);
  const [canvasTool, setCanvasTool] = useState<CanvasTool>('read');
  const [wheelOpen, setWheelOpen] = useState(false);
  const [selectedDrawing, setSelectedDrawing] = useState<string | null>(null);
  const [clearCanvas, setClearCanvas] = useState(false);
  const [view, setView] = useState<View>(initialRoute.view);
  const viewRef = useRef(view); viewRef.current = view;
  const [jump, setJump] = useState(0);
  const [mobileNav, setMobileNav] = useState(false);
  const [focus, setFocus] = useState(false);
  const [settings, setSettings] = useState(false);
  const [search, setSearch] = useState(false);
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [notebookQuery, setNotebookQuery] = useState('');
  const [notebookFilter, setNotebookFilter] = useState('all');
  const [chapterNotes, setChapterNotes] = useState(false);
  const [zoom, setZoom] = useState('');
  const [pending, setPending] = useState<SelectionDraft | null>(null);
  const [editor, setEditor] = useState<Annotation | null>(null);
  const [storageWarning, setStorageWarning] = useState(initial.warning);
  const [progress, setProgress] = useState({ percent: 0, page: 1 });
  const restore = useRef(false);
  const penOptions: InkOptions = { color: state.ink, pen: state.pen, weight: state.weight };
  const chapter = BOOK[state.chapter];
  const chapterInk = useMemo(() => state.annotations.filter(a => a.chapter === state.chapter), [state.annotations, state.chapter]);
  const chapterDrawings = useMemo(() => state.drawings.filter(d => d.chapter === state.chapter), [state.drawings, state.chapter]);
  const chosenDrawing = chapterDrawings.find(d => d.id === selectedDrawing);
  const changeTool = useCallback((tool: CanvasTool) => { setCanvasTool(tool); setPending(null); if(tool !== 'select')setSelectedDrawing(null); window.getSelection()?.removeAllRanges(); }, []);
  useEffect(() => { changeTool('read'); setWheelOpen(false); }, [view, state.chapter, changeTool]);
  const patch = useCallback((value: Partial<ReaderState>) => setState(s => ({ ...s, ...value })), []);
  useEffect(() => {
    try { localStorage.setItem(BOOK_KEY, JSON.stringify(state)); setStorageWarning(initial.warning); }
    catch { setStorageWarning('No se pudo guardar en este navegador. Tus cambios siguen abiertos: exporta un respaldo.'); }
  }, [state]);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', state.theme === 'dark');
    document.documentElement.dataset.theme = state.theme;
  }, [state.theme]);

  const currentLocation = useCallback(() => {
    const blocks = [...document.querySelectorAll<HTMLElement>('#book-text > [id]')];
    const el = blocks.find(b => b.getBoundingClientRect().bottom > 110) || blocks.at(-1);
    return { anchor: el?.id || '', offset: el ? 110 - el.getBoundingClientRect().top : 0, page: Number(el?.dataset.page) || 1 };
  }, []);
  const capture = useCallback(() => {
    if (viewRef.current !== 'reader' || restore.current) return;
    const { anchor, offset } = currentLocation();
    setState(s => s.anchor === anchor && Math.abs(s.offset - offset) < 1 ? s : { ...s, anchor, offset });
  }, [currentLocation]);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const update = () => {
      if (viewRef.current !== 'reader') return;
      const max = document.documentElement.scrollHeight - innerHeight;
      setProgress({ percent: max > 0 ? Math.max(0, Math.min(100, Math.round(scrollY / max * 100))) : 100, page: currentLocation().page });
      clearTimeout(timer); timer = setTimeout(capture, 300);
    };
    const saveNow = () => {
      if (viewRef.current !== 'reader' || restore.current) return;
      const { anchor, offset } = currentLocation();
      try { localStorage.setItem(BOOK_KEY, JSON.stringify({ ...stateRef.current, anchor, offset })); } catch { /* visible storage warning is handled by the regular save */ }
    };
    window.addEventListener('scroll', update, { passive: true }); window.addEventListener('resize', update); window.addEventListener('pagehide', saveNow);
    return () => { clearTimeout(timer); window.removeEventListener('scroll', update); window.removeEventListener('resize', update); window.removeEventListener('pagehide', saveNow); };
  }, [capture, currentLocation]);

  const navigate = useCallback((target: View) => {
    capture(); setPending(null); setMobileNav(false); setView(target);
    history.pushState(null, '', target === 'reader' ? `#leer/${stateRef.current.chapter}` : { library: '#biblioteca', notebook: '#cuaderno', deliveries: '#entregas' }[target]);
  }, [capture]);
  const go = useCallback((ci: number, anchor = '', offset = 0) => {
    if (!BOOK[ci]) return;
    restore.current = true;
    setPending(null); setMobileNav(false); setState(s => ({ ...s, chapter: ci, anchor, offset })); setView('reader'); setJump(v => v + 1);
    history.pushState(null, '', `#leer/${ci}${anchor ? '/' + anchor : ''}`);
  }, []);
  useEffect(() => {
    const back = () => {
      const r = route(); setPending(null); setView(r.view); setMobileNav(false);
      if (r.chapter !== undefined) setState(s => ({ ...s, chapter: r.chapter!, anchor: r.anchor!, offset: 0 }));
      setJump(v => v + 1);
    };
    window.addEventListener('popstate', back); return () => window.removeEventListener('popstate', back);
  }, []);
  useEffect(() => {
    document.title = view === 'reader' ? `${chapter.title} · Mïo` : 'Mïo · Biblioteca de Fernando';
    restore.current = true;
    const frame = requestAnimationFrame(() => {
      const target = view === 'reader' && stateRef.current.anchor ? document.getElementById(stateRef.current.anchor) : null;
      window.scrollTo({ top: target ? target.getBoundingClientRect().top + scrollY - 110 + stateRef.current.offset : 0, behavior: 'instant' });
      restore.current = false;
      setProgress({ percent: Math.max(0, Math.min(100, Math.round(scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight) * 100))), page: currentLocation().page });
    });
    return () => cancelAnimationFrame(frame);
  }, [view, state.chapter, jump, chapter.title, currentLocation]);
  useEffect(() => {
    const keys = (e: KeyboardEvent) => {
      if (document.querySelector('[role="dialog"]') || (e.target as HTMLElement).matches('input,textarea,select,[contenteditable=true]')) return;
      if (e.key === 'Escape') { document.querySelector<HTMLButtonElement>('[aria-label="Mostrar herramientas del lienzo"]')?.focus({preventScroll:true}); changeTool('read'); setWheelOpen(false); setPending(null); setMobileNav(false); window.getSelection()?.removeAllRanges(); }
      if (viewRef.current === 'reader' && !document.querySelector('[role="dialog"]') && canvasTool !== 'read') {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? markup.redo() : markup.undo(); setSelectedDrawing(null); }
        if (canvasTool==='select' && selectedDrawing && ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key) && !e.altKey) {
          e.preventDefault();const step=e.shiftKey?10:2;
          const dx=e.key==='ArrowLeft'?-step:e.key==='ArrowRight'?step:0,dy=e.key==='ArrowUp'?-step:e.key==='ArrowDown'?step:0;
          markup.commit(s=>({...s,drawings:s.drawings.map(d=>d.id!==selectedDrawing?d:{...d,updatedAt:new Date().toISOString(),points:d.points.map(p=>{
            const el=document.getElementById(p.block);const box=(el?.querySelector('img')||el)?.getBoundingClientRect();
            return box&&box.width&&box.height?{...p,x:p.x+dx/box.width,y:p.y+dy/box.height}:p;
          })})}));
        }
        if ((e.key === 'Delete' || e.key === 'Backspace') && selectedDrawing) { e.preventDefault(); markup.commit(s => ({...s,drawings:s.drawings.filter(d=>d.id!==selectedDrawing)})); setSelectedDrawing(null); }
      }
      if (viewRef.current === 'reader' && e.altKey && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) { e.preventDefault(); go(stateRef.current.chapter + (e.key === 'ArrowRight' ? 1 : -1)); }
    };
    document.addEventListener('keydown', keys); return () => document.removeEventListener('keydown', keys);
  }, [go, canvasTool, selectedDrawing, changeTool, markup.commit, markup.undo, markup.redo]);
  const selectText = useCallback((draft: SelectionDraft) => setPending(old => JSON.stringify(old) === JSON.stringify(draft) ? old : draft), []);
  const openAnnotation = useCallback((id: string) => { const a = stateRef.current.annotations.find(a => a.id === id); if (a) { setPending(null); setEditor(structuredClone(a)); } }, []);
  const makeAnnotation = (): Annotation | null => {
    if (!pending) return null;
    const now = new Date().toISOString();
    return { ...pending, id: crypto.randomUUID(), ...penOptions, note: '', createdAt: now, updatedAt: now };
  };
  const saveAnnotation = (a: Annotation) => {
    const next = { ...a, updatedAt: new Date().toISOString() };
    markup.commit(s => ({ ...s, annotations: [...s.annotations.filter(x => x.id !== a.id), next] }));
    setPending(null); setEditor(null); window.getSelection()?.removeAllRanges(); toast.success('Anotación guardada');
  };
  const removeAnnotation = (a: Annotation) => {
    markup.commit(s => ({ ...s, annotations: s.annotations.filter(x => x.id !== a.id) })); setEditor(null);
    toast('Anotación eliminada', { id:'markup-action', action: { label: 'Deshacer', onClick: markup.undo } });
  };
  const saveDrawing = useCallback((drawing: Drawing) => {
    markup.commit(s => ({...s, drawings:[...s.drawings.filter(d=>d.id!==drawing.id),drawing]}));
  }, [markup.commit]);
  const eraseMarkup = useCallback((drawings:Set<string>, annotations:Set<string>) => {
    markup.commit(s=>({...s,drawings:s.drawings.filter(d=>!drawings.has(d.id)),annotations:s.annotations.filter(a=>!annotations.has(a.id))}));
    setSelectedDrawing(null); setPending(null);
    toast('Marcas eliminadas', {id:'markup-action',action:{label:'Deshacer',onClick:markup.undo}});
  }, [markup.commit,markup.undo]);
  const editDrawing = (changes: Partial<Pick<Drawing,'color'|'weight'>>) => {
    if(chosenDrawing)saveDrawing({...chosenDrawing,...changes,updatedAt:new Date().toISOString()});
  };
  const duplicateDrawing = () => {
    if(!chosenDrawing)return;
    const now=new Date().toISOString();
    const duplicate={...chosenDrawing,id:crypto.randomUUID(),points:chosenDrawing.points.map(p=>({...p,x:p.x+.025,y:p.y+.025})),createdAt:now,updatedAt:now};
    saveDrawing(duplicate);setSelectedDrawing(duplicate.id);
  };
  const pendingAnnotations = pending ? state.annotations.filter(a=>a.chapter===pending.chapter && a.segments.some(s=>pending.segments.some(p=>p.block===s.block&&p.start<s.end&&p.end>s.start))) : [];
  const bookmark = () => {
    const anchor = currentLocation().anchor;
    if (!anchor) return;
    if (state.marks.some(m => m.anchor === anchor)) { toast('Este pasaje ya tiene un marcador'); return; }
    const title = document.getElementById(anchor)?.textContent?.trim().slice(0, 90) || chapter.title;
    setState(s => ({ ...s, marks: [...s.marks, { chapter: s.chapter, anchor, title }] })); toast.success('Marcador guardado en tu cuaderno');
  };
  const exportBackup = () => {
    const position = view === 'reader' ? currentLocation() : {};
    const blob = new Blob([JSON.stringify({ book: BOOK_KEY, version: 3, state: { ...stateRef.current, ...position } }, null, 2)], { type: 'application/json' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `mio-respaldo-${new Date().toISOString().slice(0,10)}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 2000);
  };
  const importBackup = async (file: File) => {
    try {
      if (file.size > 10 * 1024 * 1024) throw Error('El respaldo supera los 10 MB.');
      const incoming = parseBackup(await file.text());
      const merged = mergeBackup(stateRef.current, incoming);
      markup.commit(() => ({annotations:merged.annotations,drawings:merged.drawings}));
      setState(s => ({...s, marks:merged.marks, notes:merged.notes})); toast.success('Respaldo importado. Tus anotaciones anteriores se conservaron.');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'No se pudo importar el respaldo.'); }
  };
  const hits = useMemo(() => {
    const q = normalize(deferredQuery.trim()); return q.length < 2 ? [] : searchIndex.filter(b => b.normalized.includes(q));
  }, [deferredQuery]);
  const filteredInk = state.annotations.filter(a => (notebookFilter === 'all' || String(a.chapter) === notebookFilter) && normalize(a.segments.map(s => s.quote).join(' ') + ' ' + a.note).includes(normalize(notebookQuery)));
  const noteEntries = Object.entries(state.notes).filter(([,note]) => note.trim());

  const sidebarContent = <>
    <button className="brand" onClick={() => navigate('library')} aria-label="Mïo, ir a la biblioteca"><span className="brand-icon"><BookOpen size={22} /></span><span>Mïo<span className="brand-caption">LA BIBLIOTECA DE FERNANDO</span></span></button>
    <div className="side-section-label">MI ESPACIO</div>
    <nav className="main-nav" aria-label="Biblioteca personal">
      {([{ v: 'library', label: 'Mi estante', icon: Library }, { v: 'notebook', label: 'Mi cuaderno', icon: NotebookPen }, { v: 'deliveries', label: 'Entregas', icon: FileText }] as const).map(({v,label,icon:Icon}) => <Button key={v} variant={view === v ? 'secondary' : 'ghost'} className="nav-button" aria-current={view === v ? 'page' : undefined} onClick={() => navigate(v)}><Icon size={18} />{label}{v === 'notebook' && state.annotations.length ? <span className="nav-count">{state.annotations.length}</span> : null}</Button>)}
    </nav>
    {view === 'reader' ? <><div className="side-section-label mt-7">EN ESTE LIBRO <span>22</span></div><nav className="chapter-nav" aria-label="Capítulos del libro">{BOOK.map((c,i) => <button key={i} className={i === state.chapter ? 'active' : ''} aria-current={i === state.chapter ? 'page' : undefined} onClick={() => go(i)}><span className="chapter-number">{i >= 4 && i <= 18 ? String(i-3).padStart(2,'0') : '·'}</span><span>{c.title.replace(/^\d+\.\s*/, '')}</span>{state.annotations.some(a => a.chapter === i) ? <span className="ink-dot" aria-label="Tiene anotaciones" /> : null}</button>)}</nav></> : <div className="sidebar-reading"><div className="side-section-label">LEYENDO AHORA</div><button onClick={() => navigate('reader')} className="mini-book"><img src={cover} alt="Portada de Fundamentos" /><span>Fundamentos de la ingeniería de software<small>{chapter.title}</small></span></button></div>}
    <div className="side-bottom"><span className="avatar">F</span><div>Fernando<small>Un capítulo a la vez.</small></div><Settings2 size={16} className="muted" /></div>
  </>;
  return <TooltipProvider delayDuration={250}><div className={`app-shell ${focus && view === 'reader' ? 'focus-mode' : ''}`} style={{ '--reading-size': `${state.size}px`, '--reading-leading': state.leading, '--reading-width': `${state.width}px`, '--reading-font': state.font === 'serif' ? 'Georgia, "Times New Roman", serif' : 'system-ui, sans-serif' } as CSSProperties}>
    <a href="#main-content" className="skip-link">Saltar al contenido</a>
    <aside className="desktop-sidebar">{sidebarContent}</aside>
    <Sheet open={mobileNav} onOpenChange={setMobileNav}><SheetContent side="left" className="mobile-sidebar"><SheetHeader className="sr-only"><SheetTitle>Biblioteca</SheetTitle><SheetDescription>Navegación y capítulos del libro.</SheetDescription></SheetHeader>{sidebarContent}</SheetContent></Sheet>
    <div className="app-body">
      <header className="topbar"><div className="topbar-location"><Button className="mobile-menu" size="icon" variant="ghost" aria-label="Abrir navegación" onClick={() => setMobileNav(true)}><Menu /></Button><span className="muted">Biblioteca</span><ChevronRight size={14} /><span className="truncate">{view === 'reader' ? chapter.title : {library:'Mi estante', notebook:'Mi cuaderno', deliveries:'Entregas'}[view]}</span></div><div className="topbar-actions"><Button variant="ghost" className="search-button" onClick={() => setSearch(true)}><Search size={17} /><span>Buscar en el libro</span></Button>{view === 'reader' ? <><IconButton label="Guardar marcador" onClick={bookmark}><Bookmark /></IconButton><IconButton label="Mostrar herramientas del lienzo" pressed={!state.canvasHidden && wheelOpen} onClick={() => {patch({canvasHidden:false});setWheelOpen(v=>!v);}}><PencilIcon /></IconButton><IconButton label="Notas del capítulo" onClick={() => setChapterNotes(true)}><MessageSquare /></IconButton><IconButton label={focus ? 'Salir de enfoque' : 'Modo enfoque'} pressed={focus} onClick={() => setFocus(v => !v)}><Maximize /></IconButton></> : null}<IconButton label="Ajustes de lectura" onClick={() => setSettings(true)}><Settings2 /></IconButton></div></header>
      {storageWarning ? <div role="alert" className="storage-warning">{storageWarning}<Button size="sm" variant="outline" onClick={exportBackup}>Exportar respaldo</Button></div> : null}
      {view === 'library' ? <main id="main-content" className="library-page"><div className="page-intro"><div><p className="eyebrow">UN ESPACIO PARA APRENDER</p><h1>Mi estante<span className="accent-dot">.</span></h1><p className="muted">Las ideas que leo. El ingeniero que quiero ser.</p></div><Badge variant="outline" className="library-status"><span className="status-dot" />Biblioteca personal</Badge></div>
        <div className="shelf-heading"><h2>Continuar leyendo</h2><span className="muted">01 libro en tu biblioteca</span></div>
        <Card className="featured-book"><CardContent className="featured-content"><div className="book-art"><img src={cover} alt="Portada de Fundamentos de la ingeniería de software" /><span className="book-shadow" /></div><div className="book-details"><Badge variant="secondary">INGENIERÍA DE SOFTWARE</Badge><h2>Fundamentos de la<br className="desktop-only" /> ingeniería de software</h2><p className="author">Nathaniel Schutta & Dan Vega <span>·</span> O’Reilly</p><p className="book-description">Del código que funciona al software que otras personas pueden entender, mantener y mejorar.</p><div className="book-facts"><span><BookOpen size={15} />15 capítulos</span><span>752 páginas de origen</span><span><Highlighter size={15} />{state.annotations.length} anotaciones</span><span><PencilIcon size={15}/>{state.drawings.length} dibujos</span></div><div className="reading-location"><span className="eyebrow">TU ÚLTIMA LECTURA</span><p>{chapter.title}</p></div><div className="featured-buttons"><Button size="lg" onClick={() => navigate('reader')}>Continuar lectura<ArrowRight size={17} /></Button><Button variant="outline" size="lg" onClick={() => go(0)}>Ver el libro</Button></div></div></CardContent></Card>
        <div className="below-shelf"><div className="notebook-promo"><div className="promo-icon"><NotebookPen /></div><div><h3>Haz tuyas las ideas</h3><p className="muted">Subraya un pasaje, deja una nota o dibuja sobre las imágenes. Tus ideas quedan en el cuaderno.</p><Button variant="link" className="p-0" onClick={() => navigate('notebook')}>Abrir mi cuaderno<ArrowUpRight size={15} /></Button></div></div><div className="next-books"><span className="new-book-icon"><Plus /></span><div><h3>El siguiente libro está por llegar</h3><p className="muted">Este estante crecerá con nuevas lecturas y aprendizajes.</p></div></div></div><div className="library-footer"><span>Hecha para leer con calma.</span><span><span className="status-dot" />Disponible sin conexión</span></div>
      </main> : null}
      {view === 'reader' ? <><div className="reading-progress" aria-label={`Progreso del capítulo: ${progress.percent}%`}><span style={{ width: `${progress.percent}%` }} /></div><main id="main-content" className="reader-page"><div className="chapter-meta"><Badge variant="outline">{state.chapter >= 4 && state.chapter <= 18 ? `CAPÍTULO ${String(state.chapter-3).padStart(2,'0')}` : 'EL LIBRO'}</Badge><span>{Math.max(1,Math.round(chapter.words/220))} min de lectura</span><a href={pdfURL(state.chapter)} target="_blank" rel="noopener">PDF original<ArrowUpRight size={12} /></a></div><h1 tabIndex={-1}>{chapter.title.replace(/^\d+\.\s*/, '')}</h1><div className="reader-guide"><Highlighter size={15} /><span>{canvasTool==='read'?'Selecciona texto o abre el engrane para dibujar.':`${DRAW_TOOLS.find(t=>t.id===canvasTool)?.label} activo · Escape para volver a leer`}</span><button onClick={() => navigate('notebook')}>Mi cuaderno<ArrowUpRight size={12} /></button></div>
        {chapter.headings.length ? <details className="section-index"><summary>En este capítulo<ChevronDown size={16} /></summary><nav aria-label="Secciones del capítulo">{chapter.headings.map(h => <button key={h.id} onClick={() => go(state.chapter,h.id)}>{h.title}</button>)}</nav></details> : null}
        <div className={`book-canvas ${canvasTool !== 'read' ? 'canvas-active' : ''}`}>
          <Article chapter={state.chapter} annotations={chapterInk} onSelect={selectText} onEdit={openAnnotation} onZoom={setZoom} />
          <CanvasLayer key={state.chapter} chapter={state.chapter} drawings={chapterDrawings} annotations={chapterInk} tool={canvasTool} color={state.drawingColor} weight={state.drawingWeight} selected={selectedDrawing} onSelect={setSelectedDrawing} onSave={saveDrawing} onErase={eraseMarkup}/>
        </div>
        <div className="chapter-pagination"><Button variant="outline" disabled={state.chapter === 0} onClick={() => go(state.chapter-1)}><ChevronLeft />Anterior</Button><span>{state.chapter+1} de {BOOK.length} apartados</span><Button variant="outline" disabled={state.chapter === BOOK.length-1} onClick={() => go(state.chapter+1)}>Siguiente<ChevronRight /></Button></div>
      </main><footer className="reading-footer"><span>{progress.percent}% del capítulo<span className="footer-page"> · PDF {progress.page} / {chapter.pages}</span></span><span className="saved-label"><Check size={13} />{storageWarning ? 'Pendiente de respaldo' : 'Guardado en este navegador'}</span><button onClick={() => window.scrollTo({ top:0, behavior:'smooth' })}>Volver arriba ↑</button></footer></> : null}
      {view === 'notebook' ? <main id="main-content" className="notebook-page"><div className="page-intro"><div><p className="eyebrow">IDEAS QUE QUIERO CONSERVAR</p><h1>Mi cuaderno<span className="accent-dot">.</span></h1><p className="muted">Pasajes, preguntas y hallazgos de mis lecturas.</p></div><Button variant="outline" onClick={exportBackup}><ArrowDownToLine />Exportar respaldo</Button></div>
        <Tabs defaultValue="annotations"><TabsList><TabsTrigger value="annotations">Anotaciones <span>{state.annotations.length}</span></TabsTrigger><TabsTrigger value="notes">Notas <span>{noteEntries.length}</span></TabsTrigger><TabsTrigger value="drawings">Dibujos <span>{state.drawings.length}</span></TabsTrigger><TabsTrigger value="bookmarks">Marcadores <span>{state.marks.length}</span></TabsTrigger></TabsList>
          <TabsContent value="annotations"><div className="notebook-filters"><Input aria-label="Buscar en mis anotaciones" placeholder="Buscar una idea o una nota…" value={notebookQuery} onChange={e => setNotebookQuery(e.target.value)} /><select className="native-select" aria-label="Filtrar anotaciones por capítulo" value={notebookFilter} onChange={e => setNotebookFilter(e.target.value)}><option value="all">Todos los capítulos</option>{[...new Set(state.annotations.map(a => a.chapter))].sort((a,b)=>a-b).map(ci => <option key={ci} value={ci}>{BOOK[ci].title}</option>)}</select></div>
            {!filteredInk.length ? <div className="empty-state"><Highlighter size={32} /><h2>{state.annotations.length ? 'No encontramos esa idea' : 'Tu próxima idea empieza en una línea'}</h2><p>{state.annotations.length ? 'Prueba otra búsqueda o cambia el capítulo.' : 'Selecciona texto mientras lees y elige un color y un trazo. Aquí encontrarás todos tus pasajes y sus notas.'}</p><Button variant="outline" onClick={() => navigate('reader')}>Volver al libro<ArrowRight /></Button></div> : <div className="annotation-list">{filteredInk.slice().reverse().map(a => <Card key={a.id} className="annotation-card" style={{ '--annotation-color': COLORS.find(c => c.id === a.color)!.hex } as CSSProperties}><CardContent><div className="annotation-meta"><span>{BOOK[a.chapter].title}</span><Badge variant="outline">{TOOLS.find(t => t.id === a.pen)?.label} · {COLORS.find(c => c.id === a.color)?.label}</Badge></div><blockquote>{a.segments.map(s => s.quote).join(' … ')}</blockquote>{a.note ? <p className="annotation-note">{a.note}</p> : null}<div className="annotation-actions"><Button size="sm" variant="ghost" onClick={() => go(a.chapter,a.segments[0].block)}>Ver en el libro<ArrowUpRight /></Button><Button size="sm" variant="outline" onClick={() => openAnnotation(a.id)}>Editar anotación</Button><Button size="icon" variant="ghost" aria-label="Eliminar anotación" onClick={()=>removeAnnotation(a)}><Trash2 size={15}/></Button></div></CardContent></Card>)}</div>}
          </TabsContent>
          <TabsContent value="drawings">{!state.drawings.length?<div className="empty-state"><PencilIcon size={32}/><h2>El libro también es tu lienzo</h2><p>Abre el engrane lateral del lector para dibujar, rodear una idea o señalar una imagen.</p><Button variant="outline" onClick={()=>{navigate('reader');patch({canvasHidden:false});setWheelOpen(true);}}>Abrir el lector</Button></div>:<div className="annotation-list">{state.drawings.map(d=><Card key={d.id}><CardContent><div className="annotation-meta"><span>{BOOK[d.chapter].title}</span><Badge variant="outline">{DRAW_TOOLS.find(t=>t.id===d.kind)?.label} · {COLORS.find(c=>c.id===d.color)?.label}</Badge></div><p className="muted text-sm my-3">Sobre {BOOK[d.chapter].blocks.find(b=>b.id===d.points[0].block)?.kind==='image'?'una ilustración':'el texto del capítulo'}</p><div className="flex gap-2"><Button size="sm" variant="outline" onClick={()=>go(d.chapter,d.points[0].block)}>Ver dibujo<ArrowUpRight/></Button><Button size="sm" variant="ghost" onClick={()=>eraseMarkup(new Set([d.id]),new Set())}>Eliminar dibujo<Trash2/></Button></div></CardContent></Card>)}</div>}</TabsContent>
          <TabsContent value="notes">{!noteEntries.length ? <div className="empty-state"><MessageSquare size={32} /><h2>Un lugar para pensar en voz baja</h2><p>Escribe notas de capítulo desde el icono de notas del lector.</p><Button variant="outline" onClick={() => { navigate('reader'); setChapterNotes(true); }}>Escribir una nota</Button></div> : <div className="annotation-list">{noteEntries.map(([ci,note]) => <Card key={ci}><CardContent><h3 className="font-medium">{BOOK[Number(ci)].title}</h3><p className="annotation-note my-4">{note}</p><Button variant="outline" size="sm" onClick={() => { go(Number(ci)); setChapterNotes(true); }}>Editar nota</Button></CardContent></Card>)}</div>}</TabsContent>
          <TabsContent value="bookmarks">{!state.marks.length ? <div className="empty-state"><Bookmark size={32} /><h2>Vuelve a donde importa</h2><p>Usa el marcador de la barra del lector para guardar tu pasaje actual.</p></div> : <div className="annotation-list">{state.marks.map(m => <Card key={m.anchor}><CardContent><p className="muted text-sm">{BOOK[m.chapter].title}</p><p className="my-3">{m.title}</p><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => go(m.chapter,m.anchor)}>Ir al pasaje<ArrowUpRight /></Button><Button size="sm" variant="ghost" onClick={() => { setState(s => ({ ...s, marks: s.marks.filter(x => x.anchor !== m.anchor) })); toast('Marcador eliminado', { action: { label:'Deshacer', onClick:() => setState(s => ({...s,marks:s.marks.some(x=>x.anchor===m.anchor)?s.marks:[...s.marks,m]})) } }); }}>Eliminar</Button></div></CardContent></Card>)}</div>}</TabsContent>
        </Tabs>
      </main> : null}
      {view === 'deliveries' ? <main id="main-content" className="deliveries-page"><div className="page-intro"><div><p className="eyebrow">APRENDER TAMBIÉN ES COMPARTIR</p><h1>Mis entregas<span className="accent-dot">.</span></h1><p className="muted">La versión más reciente de cada presentación.</p></div></div><Card className="delivery-card"><CardContent><img src={asset('docs/imagenes/presentacion.png')} alt="Portada de la presentación Aprender ingeniería en la era de la IA" /><div><Badge variant="secondary">CAPÍTULOS 1–5</Badge><h2>Aprender ingeniería<br />en la era de la IA</h2><p className="muted">20 diapositivas sobre lo que me dejó esta lectura. Incluye notas para exponer y figuras del libro.</p><div className="flex flex-wrap gap-2 mt-6"><Button asChild><a href={delivery('pdf')} target="_blank" rel="noopener"><FileText />Ver PDF</a></Button><Button asChild variant="outline"><a href={delivery('pptx')} download><ArrowDownToLine />PowerPoint</a></Button></div></div></CardContent></Card></main> : null}
    </div>
    {pending && view === 'reader' && canvasTool === 'read' ? <section className="selection-toolbar" aria-label="Herramientas de anotación"><div className="selection-heading"><span><Highlighter size={15} />Marcar un pasaje</span><Button size="icon" variant="ghost" aria-label="Cancelar selección" onClick={() => { setPending(null); window.getSelection()?.removeAllRanges(); }}><X size={16} /></Button></div><p className="selection-preview">“{pending.segments.map(s=>s.quote).join(' … ')}”</p><InkControls value={penOptions} onChange={v => patch({ ink:v.color, pen:v.pen, weight:v.weight })} /><div className="selection-actions">{pendingAnnotations.length?<Button variant="ghost" aria-label="Eliminar anotaciones del pasaje seleccionado" onClick={()=>eraseMarkup(new Set(),new Set(pendingAnnotations.map(a=>a.id)))}><Trash2 size={15}/>Quitar marcas</Button>:null}<Button variant="outline" onClick={() => { const a = makeAnnotation(); if (a) { setPending(null); setEditor(a); window.getSelection()?.removeAllRanges(); } }}><MessageSquare size={15} />Añadir nota</Button><Button onClick={() => { const a=makeAnnotation(); if(a)saveAnnotation(a); }}><Check size={15} />Marcar texto</Button></div></section> : null}
    {view==='reader'?<CanvasTools open={wheelOpen} hidden={state.canvasHidden} tool={canvasTool} color={state.drawingColor} weight={state.drawingWeight} selected={chosenDrawing} drawings={chapterDrawings} onSelect={setSelectedDrawing} count={chapterInk.length+chapterDrawings.length} canUndo={markup.canUndo} canRedo={markup.canRedo} onOpen={setWheelOpen} onTool={changeTool} onHide={()=>{document.querySelector<HTMLButtonElement>('[aria-label="Mostrar herramientas del lienzo"]')?.focus({preventScroll:true});patch({canvasHidden:true});changeTool('read');setWheelOpen(false);}} onColor={color=>{patch({drawingColor:color});editDrawing({color});}} onWeight={weight=>{patch({drawingWeight:weight});editDrawing({weight});}} onUndo={()=>{markup.undo();setSelectedDrawing(null);}} onRedo={()=>{markup.redo();setSelectedDrawing(null);}} onDelete={()=>{if(chosenDrawing)eraseMarkup(new Set([chosenDrawing.id]),new Set());}} onDuplicate={duplicateDrawing} onClear={()=>setClearCanvas(true)}/>:null}
    <Dialog open={clearCanvas} onOpenChange={setClearCanvas}><DialogContent><DialogHeader><DialogTitle>Limpiar las marcas del capítulo</DialogTitle><DialogDescription>Se eliminarán {chapterDrawings.length} dibujos y {chapterInk.length} {chapterInk.length===1?'anotación':'anotaciones'} de «{chapter.title}». El texto, las imágenes originales y tus notas de capítulo se conservan. Puedes deshacer esta operación.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={()=>setClearCanvas(false)}>Cancelar</Button><Button variant="destructive" onClick={()=>{eraseMarkup(new Set(chapterDrawings.map(d=>d.id)),new Set(chapterInk.map(a=>a.id)));setClearCanvas(false);}}>Eliminar marcas del capítulo</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={!!editor} onOpenChange={open => { if(!open)setEditor(null); }}><DialogContent className="annotation-dialog"><DialogHeader><DialogTitle>{state.annotations.some(a=>a.id===editor?.id)?'Editar anotación':'Una idea sobre este pasaje'}</DialogTitle><DialogDescription>{editor ? BOOK[editor.chapter].title : ''}</DialogDescription></DialogHeader>{editor ? <><blockquote className="editor-quote">{editor.segments.map(s=>s.quote).join(' … ')}</blockquote><InkControls value={editor} onChange={v=>setEditor({...editor,...v})}/><Label htmlFor="passage-note">Mi nota <span className="muted font-normal">(opcional)</span></Label><Textarea id="passage-note" value={editor.note} onChange={e=>setEditor({...editor,note:e.target.value})} placeholder="¿Qué te hizo pensar este pasaje?" className="min-h-28" /><DialogFooter className="editor-footer">{state.annotations.some(a=>a.id===editor.id)?<Button variant="ghost" className="text-destructive mr-auto" onClick={()=>removeAnnotation(editor)}><Trash2/>Eliminar</Button>:null}<Button variant="outline" onClick={()=>setEditor(null)}>Cancelar</Button><Button onClick={()=>saveAnnotation(editor)}>Guardar anotación</Button></DialogFooter></>:null}</DialogContent></Dialog>
    <Dialog open={chapterNotes} onOpenChange={setChapterNotes}><DialogContent><DialogHeader><DialogTitle>Notas del capítulo</DialogTitle><DialogDescription>{chapter.title}</DialogDescription></DialogHeader><Label htmlFor="chapter-note">Mis ideas</Label><Textarea id="chapter-note" className="min-h-64" value={state.notes[state.chapter]||''} onChange={e=>setState(s=>({...s,notes:{...s.notes,[s.chapter]:e.target.value}}))} placeholder="Una pregunta, una conexión, algo que quiero probar…"/><p className="muted text-xs">Guardado automático en este navegador. También aparecerá en Mi cuaderno.</p></DialogContent></Dialog>
    <Dialog open={search} onOpenChange={setSearch}><DialogContent className="search-dialog"><DialogHeader><DialogTitle>Buscar en el libro</DialogTitle><DialogDescription>Una palabra, una frase, una idea. Busca en los 22 apartados.</DialogDescription></DialogHeader><Input aria-label="Buscar texto en el libro" placeholder="Por ejemplo: pruebas automatizadas" value={query} onChange={e=>setQuery(e.target.value)}/><p className="muted text-xs" aria-live="polite">{query.trim().length<2?'Escribe al menos dos caracteres.':`${hits.length} pasajes encontrados${hits.length>80?' · primeros 80':''}`}</p><div className="search-results">{hits.slice(0,80).map(h=>{const at=h.normalized.indexOf(normalize(deferredQuery.trim()));return <button key={h.block} onClick={()=>{setSearch(false);go(h.chapter,h.block);}}><span>{BOOK[h.chapter].title}</span><p>{at>60?'…':''}{h.text.slice(Math.max(0,at-60),at+180)}…</p><ArrowUpRight size={15}/></button>})}</div></DialogContent></Dialog>
    <Settings open={settings} onOpenChange={setSettings} state={state} patch={patch} onExport={exportBackup} onImport={importBackup}/>
    <Dialog open={!!zoom} onOpenChange={open=>{if(!open)setZoom('');}}><DialogContent className="image-dialog"><DialogHeader><DialogTitle>Ilustración del libro</DialogTitle><DialogDescription>{chapter.title}</DialogDescription></DialogHeader>{zoom?<FigureZoom src={zoom} chapter={state.chapter} drawings={chapterDrawings}/>:null}</DialogContent></Dialog>
    <Toaster position="bottom-right" richColors theme={state.theme==='dark'?'dark':'light'} closeButton />
  </div></TooltipProvider>;
}
export default App;
