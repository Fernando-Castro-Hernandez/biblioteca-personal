import { memo, useLayoutEffect, useRef } from 'react';
import { BOOK, BOOK_PATH, asset, type Block } from '@/lib/book';
import { captureSelection, paintAnnotations, type Annotation, type SelectionDraft } from '@/lib/annotations';

const escape = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
function blockHTML(b: Block, chapter: number) {
  if (b.kind === 'source-title') return '';
  if (b.kind === 'image') return `<figure id="${b.id}" data-page="${b.page}"><img src="${asset(BOOK_PATH + 'lector/' + b.src)}" alt="Ilustración de ${escape(BOOK[chapter].title)}, página ${b.page}" loading="lazy" width="${b.width}" height="${b.height}" tabindex="0" role="button"><figcaption>Ilustración del libro · página ${b.page}</figcaption></figure>`;
  const tag = b.kind === 'table' ? 'div' : b.kind === 'code' ? 'pre' : ['p','h2','h3'].includes(b.kind) ? b.kind : 'p';
  return `<${tag} id="${b.id}" data-block="${b.id}" data-page="${b.page}" class="${b.bullet && !b.text.trim().startsWith('•') ? 'list-item' : ''} ${b.text.startsWith('Este trabajo se ha traducido') ? 'translation-note' : ''}">${b.rich || ''}</${tag}>`;
}
export const Article = memo(function Article({ chapter, annotations, onSelect, onEdit, onZoom }: {
  chapter: number; annotations: Annotation[]; onSelect: (s: SelectionDraft) => void; onEdit: (id: string) => void; onZoom: (src: string) => void;
}) {
  const ref = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const article = ref.current!;
    article.innerHTML = BOOK[chapter].blocks.map(b => blockHTML(b, chapter)).join('');
    paintAnnotations(article, annotations);
  }, [chapter, annotations]);
  // selectionchange also covers touch selection handles; clicking the toolbar retains the captured offsets.
  useLayoutEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const changed = () => {
      clearTimeout(timer);
      timer = setTimeout(() => { const draft = captureSelection(ref.current!, chapter); if (draft) onSelect(draft); }, 180);
    };
    document.addEventListener('selectionchange', changed);
    return () => { clearTimeout(timer); document.removeEventListener('selectionchange', changed); };
  }, [chapter, onSelect]);
  const activate = (target: HTMLElement) => {
    if (window.getSelection()?.toString()) return;
    const mark = target.closest<HTMLElement>('[data-annotation]');
    if (mark) onEdit(mark.dataset.annotation!);
    if (target.tagName === 'IMG') onZoom((target as HTMLImageElement).src);
  };
  return <article id="book-text" ref={ref} className="book-prose" aria-label="Texto del capítulo" onClick={e => activate(e.target as HTMLElement)} onKeyDown={e => {
    if ((e.key === 'Enter' || e.key === ' ') && (e.target as HTMLElement).matches('[data-annotation], img')) { e.preventDefault(); activate(e.target as HTMLElement); }
  }} />;
});
