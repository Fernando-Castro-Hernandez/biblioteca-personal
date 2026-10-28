import { Highlighter, PenLine, Pencil, Waves } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Button } from '@/components/ui/button';
import { COLORS, TOOLS, type Ink, type Pen } from '@/lib/annotations';

export interface InkOptions { color: Ink; pen: Pen; weight: number }
const icons = { highlighter: Highlighter, underline: PenLine, pencil: Pencil, wave: Waves };
export function InkControls({ value, onChange }: { value: InkOptions; onChange: (v: InkOptions) => void }) {
  return <div className="ink-controls">
    <ToggleGroup type="single" value={value.pen} onValueChange={pen => { if (pen) onChange({ ...value, pen: pen as Pen }); }} aria-label="Tipo de lápiz" className="pen-options" variant="outline">
      {TOOLS.map(t => { const Icon = icons[t.id]; return <ToggleGroupItem key={t.id} value={t.id} aria-label={t.label} title={t.label}><Icon size={16} /><span>{t.label}</span></ToggleGroupItem>; })}
    </ToggleGroup>
    <div className="ink-row">
      <div className="color-options" role="group" aria-label="Color de tinta">
        {COLORS.map(c => <button key={c.id} type="button" className="color-swatch" aria-label={c.label} aria-pressed={value.color === c.id} title={c.label} style={{ '--swatch': c.hex } as React.CSSProperties} onClick={() => onChange({ ...value, color: c.id })}><span />{value.color === c.id ? <span className="swatch-check">✓</span> : null}</button>)}
      </div>
      <div className="weight-options" role="group" aria-label="Grosor del trazo">
        {[1,2,3].map((w,i) => <Button key={w} size="sm" variant={value.weight === w ? 'secondary' : 'ghost'} aria-label={['Trazo fino','Trazo medio','Trazo grueso'][i]} aria-pressed={value.weight === w} onClick={() => onChange({ ...value, weight: w })}><span className="weight-sample" style={{ height: w + 1 }} /></Button>)}
      </div>
    </div>
  </div>;
}
