import data from '../../../libros/fundamentos-ingenieria-software/herramientas/book.json';

export interface Block { id: string; kind: string; text: string; rich?: string; page: number; src?: string; width?: number; height?: number; bullet?: boolean }
export interface Chapter { title: string; file: string; pages: number; words: number; blocks: Block[]; headings: { id: string; title: string }[] }
export const BOOK = data as Chapter[];
export const BOOK_KEY = 'fundamentos-reader-v1';
export const BOOK_PATH = 'libros/fundamentos-ingenieria-software/';
export const rootURL = new URL(document.documentElement.dataset.root || '../', location.href);
export const asset = (path: string) => new URL(path, rootURL).href;
export const cover = asset(BOOK_PATH + 'lector/assets/00-002-000.png');
export const pdfURL = (chapter: number) => asset(BOOK_PATH + 'pdfs/' + BOOK[chapter].file.split('/').at(-1));
export const delivery = (ext: string) => asset('entregas/fundamentos-ingenieria-software/capitulos-01-05/presentacion.' + ext);
export const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export const searchIndex = BOOK.flatMap((chapter, ci) => chapter.blocks.filter(b => b.kind !== 'image' && b.kind !== 'source-title').map(b => ({ chapter: ci, block: b.id, text: b.text, normalized: normalize(b.text) })));
export function plainRich(block: Block): string {
  const el = document.createElement('div');
  el.innerHTML = block.rich || '';
  return el.textContent || '';
}
export const blockById = new Map(BOOK.flatMap((c, chapter) => c.blocks.map(b => [b.id, { block: b, chapter }] as const)));
