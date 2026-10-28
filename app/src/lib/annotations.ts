export const COLORS = [
  { id: 'yellow', label: 'Amarillo', hex: '#e6b737' },
  { id: 'green', label: 'Verde', hex: '#46a881' },
  { id: 'blue', label: 'Azul', hex: '#579ce3' },
  { id: 'rose', label: 'Rosa', hex: '#dd7f98' },
  { id: 'violet', label: 'Violeta', hex: '#a38cdd' },
] as const;
export const TOOLS = [
  { id: 'highlighter', label: 'Resaltador' },
  { id: 'underline', label: 'Bolígrafo' },
  { id: 'pencil', label: 'Lápiz' },
  { id: 'wave', label: 'Ondulado' },
] as const;
export type Ink = typeof COLORS[number]['id'];
export type Pen = typeof TOOLS[number]['id'];
export interface Segment { block: string; start: number; end: number; quote: string }
export interface Annotation { id: string; chapter: number; segments: Segment[]; color: Ink; pen: Pen; weight: number; note: string; createdAt: string; updatedAt: string }
export interface SelectionDraft { chapter: number; segments: Segment[] }

/** DOM text offsets are stable across inline emphasis, recoloring and font changes. */
export function captureSelection(article: HTMLElement, chapter: number, selection = window.getSelection()): SelectionDraft | null {
  if (!selection || selection.isCollapsed || !selection.rangeCount) return null;
  const range = selection.getRangeAt(0);
  if (!article.contains(range.startContainer) || !article.contains(range.endContainer)) return null;
  const segments: Segment[] = [];
  for (const el of article.querySelectorAll<HTMLElement>('[data-block]')) {
    if (!range.intersectsNode(el)) continue;
    const text = el.textContent || '';
    const offset = (node: Node, position: number) => {
      const prefix = document.createRange(); prefix.selectNodeContents(el); prefix.setEnd(node, position);
      return prefix.toString().length;
    };
    const start = el.contains(range.startContainer) ? offset(range.startContainer, range.startOffset) : 0;
    const end = el.contains(range.endContainer) ? offset(range.endContainer, range.endOffset) : text.length;
    if (end > start && text.slice(start, end).trim()) segments.push({ block: el.dataset.block!, start, end, quote: text.slice(start, end) });
  }
  return segments.length ? { chapter, segments } : null;
}

/** Split text nodes at annotation boundaries; leave <em>, <code>, links and tables intact.
 * Overlaps display the most recently edited annotation; deleting it reveals earlier ink. */
export function paintAnnotations(article: HTMLElement, annotations: Annotation[]) {
  const sorted = [...annotations].sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
  for (const el of article.querySelectorAll<HTMLElement>('[data-block]')) {
    const text = el.textContent || '';
    const spans = sorted.flatMap(a => a.segments.filter(s => s.block === el.dataset.block && s.start >= 0 && s.end <= text.length && text.slice(s.start, s.end) === s.quote).map(s => ({ ...s, annotation: a })));
    if (!spans.length) continue;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = []; let n: Node | null;
    while ((n = walker.nextNode())) nodes.push(n as Text);
    let position = 0;
    for (const node of nodes) {
      const value = node.data, start = position, end = position + value.length; position = end;
      const relevant = spans.filter(s => s.start < end && s.end > start);
      if (!relevant.length) continue;
      const cuts = [...new Set([start, end, ...relevant.flatMap(s => [Math.max(start, s.start), Math.min(end, s.end)])])].sort((a, b) => a - b);
      const fragment = document.createDocumentFragment();
      for (let i = 0; i < cuts.length - 1; i++) {
        const left = cuts[i], right = cuts[i + 1];
        const active = relevant.findLast(s => s.start <= left && s.end >= right)?.annotation;
        const part = value.slice(left - start, right - start);
        if (!active) { fragment.append(document.createTextNode(part)); continue; }
        const mark = document.createElement('mark');
        mark.textContent = part; mark.dataset.annotation = active.id; mark.dataset.pen = active.pen;
        mark.style.setProperty('--ink-color', COLORS.find(c => c.id === active.color)!.hex);
        mark.style.setProperty('--ink-weight', `${active.weight}px`);
        mark.style.setProperty('--ink-opacity', `${20 + active.weight * 10}%`);
        mark.tabIndex = 0; mark.setAttribute('role', 'button');
        mark.setAttribute('aria-label', `Editar anotación: ${part}`);
        mark.title = active.note || 'Editar esta anotación';
        fragment.append(mark);
      }
      node.replaceWith(fragment);
    }
  }
}
