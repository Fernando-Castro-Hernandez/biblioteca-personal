import { beforeEach, expect, test, vi } from 'vitest';
import { BOOK, BOOK_KEY, plainRich } from '../src/lib/book';
import { DEFAULT, loadState, mergeBackup, normalizeState, parseBackup } from '../src/lib/storage';
import type { Annotation } from '../src/lib/annotations';

const block=BOOK[4].blocks.find(b=>b.kind==='p' && b.rich && plainRich(b).length>20)!;
const a: Annotation={id:'one',chapter:4,segments:[{block:block.id,start:0,end:20,quote:plainRich(block).slice(0,20)}],color:'blue',pen:'pencil',weight:2,note:'Mi primera idea',createdAt:'2026-10-28T10:00:00Z',updatedAt:'2026-10-28T10:00:00Z'};
const backup=(s: unknown)=>JSON.stringify({book:BOOK_KEY,state:s});
beforeEach(()=>{localStorage.clear();});
test('migra un respaldo v1 manteniendo notas, marcadores, posición y preferencias',()=>{
 const old={chapter:4,anchor:block.id,offset:45,theme:'sepia',size:'24',marks:[{chapter:4,anchor:block.id,title:'Pasaje'}],notes:{4:'Mi nota anterior'}};
 localStorage.setItem(BOOK_KEY,JSON.stringify(old));const {state}=loadState();
 expect(state).toMatchObject({...old,size:24,version:3,annotations:[],drawings:[]});expect(parseBackup(backup(old)).notes['4']).toBe('Mi nota anterior');
});
test('exportar e importar conserva varios colores, trazos y notas sin duplicar',()=>{
 const original={...DEFAULT,annotations:[a,{...a,id:'two',color:'rose' as const,pen:'wave' as const}],notes:{4:'Contexto'}};
 const imported=parseBackup(backup(original));expect(imported).toEqual(original);
 expect(mergeBackup(original,imported)).toEqual(original);
});
test('mezcla notas sin eliminar el texto que ya existe',()=>{
 const current={...DEFAULT,notes:{4:'Primera nota'},annotations:[a]};
 const incoming={...DEFAULT,notes:{4:'Segunda nota'},annotations:[{...a,note:'Idea editada',updatedAt:'2026-10-28T12:00:00Z'}]};
 const merged=mergeBackup(current,incoming);expect(merged.notes[4]).toBe('Primera nota\n\nSegunda nota');expect(merged.annotations[0].note).toContain('Mi primera idea');expect(merged.annotations[0].note).toContain('Idea editada');
});
test('un respaldo anterior conserva su nota sin reemplazar el trazo más reciente',()=>{
 const current={...DEFAULT,annotations:[{...a,color:'violet' as const,note:'Idea nueva',updatedAt:'2026-10-28T12:00:00Z'}]};
 const incoming={...DEFAULT,annotations:[a]};
 const merged=mergeBackup(current,incoming);
 expect(merged.annotations[0]).toMatchObject({color:'violet',note:'Idea nueva\n\nMi primera idea'});
 expect(mergeBackup(merged,incoming)).toEqual(merged);
});
test.each([
 {book:'otro-libro',state:DEFAULT},
 {book:BOOK_KEY,state:{...DEFAULT,annotations:[{...a,color:'red'}]}},
 {book:BOOK_KEY,state:{...DEFAULT,annotations:[{...a,segments:[{...a.segments[0],end:999999}]}]}},
 {book:BOOK_KEY,state:{...DEFAULT,annotations:[{...a,chapter:5}]}},
 {book:BOOK_KEY,state:{...DEFAULT,marks:[{chapter:4,anchor:'missing',title:'bad'}]}},
])('rechaza el respaldo inválido sin modificar los datos actuales',payload=>{
 const before=structuredClone(DEFAULT);expect(()=>parseBackup(JSON.stringify(payload))).toThrow();expect(DEFAULT).toEqual(before);
});
test('el contenido HTML de una nota permanece texto, nunca se inserta como HTML',()=>{
 const note='<img src=x onerror=alert(1)>';const s=parseBackup(backup({...DEFAULT,annotations:[{...a,note}]}));expect(s.annotations[0].note).toBe(note);
});
test('una lectura corrupta conserva un aviso y no revienta el lector',()=>{
 localStorage.setItem(BOOK_KEY,'not json');expect(loadState().warning).not.toBe('');
});
test('maneja navegadores que bloquean el almacenamiento',()=>{
 vi.spyOn(Storage.prototype,'getItem').mockImplementation(()=>{throw new DOMException('blocked');});expect(loadState().state).toEqual(DEFAULT);expect(loadState().warning).toContain('No se pudieron');
});
test('los valores fuera de rango no rompen los ajustes de lectura',()=>{
 expect(normalizeState({chapter:999,size:900,theme:'unknown',annotations:null})).toEqual(DEFAULT);
});
