import { beforeEach, describe, expect, test } from 'vitest';
import { captureSelection, paintAnnotations, type Annotation } from '../src/lib/annotations';

let article: HTMLElement;
const html = '<p data-block="b1">Leer <strong>código <em>ajeno</em></strong> ayuda.</p><p data-block="b2">Y comprender sus decisiones.</p>';
function select(start: Node, startOffset: number, end: Node, endOffset: number) {
  const r = document.createRange(); r.setStart(start,startOffset); r.setEnd(end,endOffset);
  const selection = window.getSelection()!; selection.removeAllRanges(); selection.addRange(r); return selection;
}
function annotation(overrides: Partial<Annotation> = {}): Annotation {
  return { id:'a1',chapter:4,segments:[{block:'b1',start:5,end:17,quote:'código ajeno'}],color:'yellow',pen:'highlighter',weight:2,note:'Una idea',createdAt:'2026-10-28T12:00:00.000Z',updatedAt:'2026-10-28T12:00:00.000Z',...overrides };
}
beforeEach(()=>{ document.body.innerHTML = `<article>${html}</article><p id="outside">Fuera</p>`; article=document.querySelector('article')!;window.getSelection()?.removeAllRanges(); });
describe('selecciones y texto enriquecido',()=>{
  test('captura una selección que atraviesa negritas y cursivas sin perder sus offsets',()=>{
    const s=select(article.querySelector('strong')!.firstChild!,0,article.querySelector('em')!.firstChild!,5);
    expect(captureSelection(article,4,s)?.segments).toEqual([{block:'b1',start:5,end:17,quote:'código ajeno'}]);
  });
  test('captura varios párrafos como una sola anotación',()=>{
    const s=select(article.firstElementChild!.firstChild!,0,article.lastElementChild!.firstChild!,12);
    const draft=captureSelection(article,4,s)!;
    expect(draft.segments).toHaveLength(2);expect(draft.segments[1].quote).toBe('Y comprender');
  });
  test('rechaza selecciones vacías o que incluyen controles ajenos al libro',()=>{
    expect(captureSelection(article,4)).toBeNull();
    const s=select(article.firstElementChild!.firstChild!,0,document.querySelector('#outside')!.firstChild!,3);
    expect(captureSelection(article,4,s)).toBeNull();
  });
  test('mantiene el texto y el formato al aplicar un trazo entre nodos',()=>{
    const before=article.textContent;paintAnnotations(article,[annotation()]);
    expect(article.textContent).toBe(before);expect(article.querySelector('strong em')).not.toBeNull();
    expect([...article.querySelectorAll('mark')].map(m=>m.textContent).join('')).toBe('código ajeno');
    expect(article.querySelector('mark')?.getAttribute('role')).toBe('button');
  });
  test('seleccionar texto ya marcado conserva los mismos offsets',()=>{
    paintAnnotations(article,[annotation()]);const nodes=article.querySelectorAll('mark');
    const s=select(nodes[0].firstChild!,0,nodes[1].firstChild!,5);
    expect(captureSelection(article,4,s)?.segments).toEqual(annotation().segments);
  });
  test.each(['highlighter','underline','pencil','wave'] as const)('pinta el tipo %s y conserva color y grosor',pen=>{
    paintAnnotations(article,[annotation({pen,color:'violet',weight:3})]);const mark=article.querySelector('mark')!;
    expect(mark.dataset.pen).toBe(pen);expect(mark.style.getPropertyValue('--ink-weight')).toBe('3px');expect(mark.style.getPropertyValue('--ink-color')).toBe('#a38cdd');
  });
  test('las superposiciones mantienen ambos datos y dejan ver el trazo anterior al borrar el nuevo',()=>{
    const old=annotation();const newer=annotation({id:'a2',segments:[{block:'b1',start:12,end:17,quote:'ajeno'}],color:'blue',updatedAt:'2026-10-28T13:00:00.000Z'});
    paintAnnotations(article,[old,newer]);expect(article.querySelector('[data-annotation="a2"]')?.textContent).toBe('ajeno');
    article.innerHTML=html;paintAnnotations(article,[old]);expect([...article.querySelectorAll('[data-annotation="a1"]')].map(m=>m.textContent).join('')).toBe('código ajeno');
  });
  test('no marca un pasaje cuyo texto ya no corresponde al respaldo',()=>{
    paintAnnotations(article,[annotation({segments:[{block:'b1',start:5,end:17,quote:'otra versión'}]})]);expect(article.querySelector('mark')).toBeNull();
  });
});
