import { useRef } from 'react';
import { Download, Upload, Moon, Sun, Coffee } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Separator } from '@/components/ui/separator';
import type { ReaderState } from '@/lib/storage';

export function Settings({ open, onOpenChange, state, patch, onExport, onImport }: {
  open: boolean; onOpenChange: (v: boolean) => void; state: ReaderState; patch: (v: Partial<ReaderState>) => void; onExport: () => void; onImport: (f: File) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="settings-dialog"><DialogHeader><DialogTitle>A tu manera</DialogTitle><DialogDescription>Un espacio cómodo para leer y volver a tus ideas.</DialogDescription></DialogHeader>
    <div className="settings-fields">
      <Label>Tema de lectura</Label><ToggleGroup type="single" value={state.theme} onValueChange={theme => { if (theme) patch({ theme: theme as ReaderState['theme'] }); }} variant="outline" className="full-toggle" aria-label="Tema de lectura"><ToggleGroupItem value="light"><Sun />Claro</ToggleGroupItem><ToggleGroupItem value="sepia"><Coffee />Sepia</ToggleGroupItem><ToggleGroupItem value="dark"><Moon />Oscuro</ToggleGroupItem></ToggleGroup>
      <Label htmlFor="reading-size">Tamaño de letra <span>{state.size} px</span></Label><Slider id="reading-size" aria-label="Tamaño de letra" min={16} max={30} step={1} value={[state.size]} onValueChange={([size]) => patch({ size })} />
      <Label>Tipografía</Label><ToggleGroup type="single" value={state.font} onValueChange={font => { if (font) patch({ font: font as ReaderState['font'] }); }} variant="outline" className="full-toggle" aria-label="Tipografía"><ToggleGroupItem value="serif">Serif · libro</ToggleGroupItem><ToggleGroupItem value="sans">Sans · sencilla</ToggleGroupItem></ToggleGroup>
      <Label>Interlineado</Label><ToggleGroup type="single" value={state.leading} onValueChange={leading => { if (leading) patch({ leading }); }} variant="outline" className="full-toggle" aria-label="Interlineado">{['1.6','1.85','2.15'].map((v,i) => <ToggleGroupItem key={v} value={v}>{['Compacto','Cómodo','Amplio'][i]}</ToggleGroupItem>)}</ToggleGroup>
      <Label>Ancho del texto</Label><ToggleGroup type="single" value={state.width} onValueChange={width => { if (width) patch({ width }); }} variant="outline" className="full-toggle" aria-label="Ancho del texto">{['620','740','900'].map((v,i) => <ToggleGroupItem key={v} value={v}>{['Estrecho','Normal','Amplio'][i]}</ToggleGroupItem>)}</ToggleGroup>
      <Separator /><div><h3 className="font-medium mb-2">Tus ideas, contigo</h3><p className="muted text-sm">Respalda notas, marcadores, subrayados y dibujos. Se guardan en este navegador; importar combina tus anotaciones sin borrar las actuales.</p></div>
      <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={onExport}><Download />Exportar respaldo</Button><Button variant="outline" onClick={() => input.current?.click()}><Upload />Importar respaldo</Button></div>
      <input ref={input} type="file" accept="application/json,.json" aria-label="Archivo de respaldo" className="sr-only" onChange={e => { const file = e.target.files?.[0]; if (file) onImport(file); e.target.value = ''; }} />
    </div>
  </DialogContent></Dialog>;
}
