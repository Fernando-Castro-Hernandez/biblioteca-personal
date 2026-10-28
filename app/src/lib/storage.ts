import { BOOK, BOOK_KEY, blockById, plainRich } from './book';
import { COLORS, TOOLS, type Annotation, type Ink, type Pen } from './annotations';
import { validDrawing, type Drawing } from './drawings';

export interface Bookmark { chapter: number; anchor: string; title: string }
export interface ReaderState {
  version: 3; chapter: number; anchor: string; offset: number;
  theme: 'light' | 'sepia' | 'dark'; size: number; font: 'serif' | 'sans'; leading: string; width: string;
  marks: Bookmark[]; notes: Record<string, string>; annotations: Annotation[];
  ink: Ink; pen: Pen; weight: number;
  drawings: Drawing[]; canvasHidden: boolean; drawingColor: Ink; drawingWeight: number;
}
export const DEFAULT: ReaderState = { version: 3, chapter: 3, anchor: '', offset: 0, theme: 'light', size: 21, font: 'serif', leading: '1.85', width: '740', marks: [], notes: {}, annotations: [], ink: 'yellow', pen: 'highlighter', weight: 2, drawings: [], canvasHidden: false, drawingColor: 'blue', drawingWeight: 2 };
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const validChapter = (c: unknown): c is number => Number.isInteger(c) && Number(c) >= 0 && Number(c) < BOOK.length;
const string = (s: unknown): s is string => typeof s === 'string';
export function validAnnotation(v: unknown): v is Annotation {
  if (!record(v) || !string(v.id) || !v.id || !validChapter(v.chapter) || !string(v.note) || v.note.length > 100000 || !COLORS.some(c => c.id === v.color) || !TOOLS.some(t => t.id === v.pen) || ![1,2,3].includes(Number(v.weight)) || !string(v.createdAt) || !string(v.updatedAt) || !Array.isArray(v.segments) || !v.segments.length) return false;
  return v.segments.every(s => {
    if (!record(s) || !string(s.block) || !string(s.quote) || !s.quote.trim() || !Number.isInteger(s.start) || !Number.isInteger(s.end)) return false;
    const entry = blockById.get(s.block);
    return !!entry && entry.chapter === v.chapter && Number(s.start) >= 0 && Number(s.end) > Number(s.start) && plainRich(entry.block).slice(Number(s.start), Number(s.end)) === s.quote && Number(s.end) <= plainRich(entry.block).length;
  });
}
function validMark(v: unknown): v is Bookmark {
  return record(v) && validChapter(v.chapter) && string(v.anchor) && blockById.get(v.anchor)?.chapter === v.chapter && string(v.title);
}
export function normalizeState(input: unknown): ReaderState {
  if (!record(input)) return structuredClone(DEFAULT);
  const out = structuredClone(DEFAULT);
  if (validChapter(input.chapter)) out.chapter = input.chapter;
  if (string(input.anchor) && blockById.get(input.anchor)?.chapter === out.chapter) out.anchor = input.anchor;
  if (typeof input.offset === 'number' && Number.isFinite(input.offset)) out.offset = input.offset;
  if (['light','sepia','dark'].includes(String(input.theme))) out.theme = input.theme as ReaderState['theme'];
  if (Number(input.size) >= 16 && Number(input.size) <= 30) out.size = Number(input.size);
  if (input.font === 'sans') out.font = 'sans';
  if (['1.6','1.85','2.15'].includes(String(input.leading))) out.leading = String(input.leading);
  if (['620','740','900'].includes(String(input.width))) out.width = String(input.width);
  if (Array.isArray(input.marks)) out.marks = input.marks.filter(validMark);
  if (record(input.notes)) out.notes = Object.fromEntries(Object.entries(input.notes).filter(([key,value]) => /^\d+$/.test(key) && validChapter(Number(key)) && string(value)) as [string,string][]);
  if (Array.isArray(input.annotations)) out.annotations = input.annotations.filter(validAnnotation);
  if (Array.isArray(input.drawings)) out.drawings = input.drawings.filter(validDrawing);
  if (typeof input.canvasHidden === 'boolean') out.canvasHidden = input.canvasHidden;
  if (COLORS.some(c => c.id === input.drawingColor)) out.drawingColor = input.drawingColor as Ink;
  if ([1,2,3].includes(input.drawingWeight as number)) out.drawingWeight = input.drawingWeight as number;
  if (COLORS.some(c => c.id === input.ink)) out.ink = input.ink as Ink;
  if (TOOLS.some(t => t.id === input.pen)) out.pen = input.pen as Pen;
  if ([1,2,3].includes(Number(input.weight))) out.weight = Number(input.weight);
  return out;
}
export function loadState(): { state: ReaderState; warning: string } {
  try {
    const raw = localStorage.getItem(BOOK_KEY);
    if (!raw) return { state: structuredClone(DEFAULT), warning: '' };
    const parsed = JSON.parse(raw);
    if (!record(parsed)) throw new Error();
    return { state: normalizeState(parsed), warning: '' };
  } catch {
    // Preserve unreadable data before a subsequent save can replace the main key.
    try { const raw = localStorage.getItem(BOOK_KEY); if (raw) localStorage.setItem(BOOK_KEY + '-recovery-' + Date.now(), raw); } catch { /* storage can be unavailable */ }
    return { state: structuredClone(DEFAULT), warning: 'No se pudieron leer los datos guardados. Conserva un respaldo antes de continuar.' };
  }
}
export function parseBackup(text: string): ReaderState {
  const payload: unknown = JSON.parse(text);
  if (!record(payload) || payload.book !== BOOK_KEY || !record(payload.state)) throw Error('Este archivo no es un respaldo de este libro.');
  const s = payload.state;
  if (!validChapter(s.chapter) || !Array.isArray(s.marks) || !s.marks.every(validMark) || !record(s.notes) || !Object.entries(s.notes).every(([k,v]) => /^\d+$/.test(k) && validChapter(Number(k)) && string(v))) throw Error('El respaldo contiene datos de lectura inválidos.');
  if (s.annotations !== undefined && (!Array.isArray(s.annotations) || !s.annotations.every(validAnnotation))) throw Error('Hay anotaciones que no corresponden al texto de este libro. No se importó ningún cambio.');
  if (s.drawings !== undefined && (!Array.isArray(s.drawings) || !s.drawings.every(validDrawing))) throw Error('El respaldo contiene dibujos inválidos. No se importó ningún cambio.');
  return normalizeState(s);
}
export function mergeBackup(current: ReaderState, incoming: ReaderState): ReaderState {
  const marks = new Map(current.marks.map(m => [m.anchor, m]));
  incoming.marks.forEach(m => { if (!marks.has(m.anchor)) marks.set(m.anchor, m); });
  const annotations = new Map(current.annotations.map(a => [a.id, a]));
  incoming.annotations.forEach(a => {
    const old = annotations.get(a.id);
    if (!old) annotations.set(a.id, a);
    else if (JSON.stringify(old) !== JSON.stringify(a)) {
      // Keep the latest appearance but preserve note text even from an older backup.
      const note = !old.note ? a.note : !a.note || old.note.includes(a.note) ? old.note : a.note.includes(old.note) ? a.note : old.note + '\n\n' + a.note;
      annotations.set(a.id, { ...(a.updatedAt > old.updatedAt ? a : old), note });
    }
  });
  const notes = { ...current.notes };
  Object.entries(incoming.notes).forEach(([key, value]) => {
    if (!value) return;
    if (!notes[key]) notes[key] = value;
    else if (!notes[key].includes(value)) notes[key] += '\n\n' + value;
  });
  const drawings = new Map(current.drawings.map(d => [d.id,d]));
  incoming.drawings.forEach(d => { const old=drawings.get(d.id); if(!old || d.updatedAt>old.updatedAt)drawings.set(d.id,d); });
  return { ...current, marks: [...marks.values()], annotations: [...annotations.values()], drawings:[...drawings.values()], notes };
}
