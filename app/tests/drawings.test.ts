import { expect, test } from 'vitest';
import { BOOK, BOOK_KEY } from '../src/lib/book';
import { anchorPoint, createMarkupHistory, hitDrawing, projectDrawing, shapePath, validDrawing, type Box, type Drawing } from '../src/lib/drawings';
import { DEFAULT, mergeBackup, normalizeState, parseBackup } from '../src/lib/storage';

const chapter=8, block=BOOK[chapter].blocks.find(b=>b.kind==='image')!;
const boxes:Box[]=[{id:block.id,x:20,y:100,width:600,height:400}];
const arrow:Drawing={id:'arrow-one',chapter,kind:'arrow',color:'blue',weight:2,points:[{block:block.id,x:.1,y:.2},{block:block.id,x:.8,y:.7}],createdAt:'2026-10-28T12:00:00Z',updatedAt:'2026-10-28T12:00:00Z'};
test('una flecha permanece en los mismos lugares de la imagen al cambiar tamaño y posición',()=>{
  expect(anchorPoint({x:80,y:180},boxes)).toEqual(arrow.points[0]);
  expect(projectDrawing(arrow,new Map(boxes.map(b=>[b.id,b])))).toEqual([{x:80,y:180},{x:500,y:380}]);
  const smaller={...boxes[0],x:10,y:850,width:300,height:200};
  expect(projectDrawing(arrow,new Map([[block.id,smaller]]))).toEqual([{x:40,y:890},{x:250,y:990}]);
});
test('un trazo entre párrafos conserva referencias independientes cuando cambia el flujo',()=>{
  const first={id:'a',x:0,y:0,width:100,height:20},second={id:'b',x:0,y:50,width:100,height:20};
  const points=[anchorPoint({x:10,y:10},[first,second])!,anchorPoint({x:80,y:60},[first,second])!];
  const drawing={...arrow,kind:'freehand' as const,points};
  expect(projectDrawing(drawing,new Map([['a',{...first,height:40}],['b',{...second,y:100,height:40}]]))).toEqual([{x:10,y:20},{x:80,y:120}]);
});
test('las marcas de bloques inexistentes no se desplazan a contenido ajeno',()=>{
 expect(projectDrawing(arrow,new Map())).toEqual([]);
 expect(anchorPoint({x:1,y:1},[])).toBeNull();
});
test('el borrador alcanza el borde de una forma, no todo su interior',()=>{
 const rectangle={...arrow,kind:'rectangle' as const};const points=[{x:10,y:10},{x:100,y:100}];
 expect(hitDrawing(rectangle,points,{x:50,y:11})).toBe(true);
 expect(hitDrawing(rectangle,points,{x:50,y:50})).toBe(false);
 expect(hitDrawing(arrow,points,{x:49,y:51})).toBe(true);
 expect(hitDrawing(arrow,points,{x:150,y:150})).toBe(false);
});
test.each(['arrow','rectangle','ellipse','freehand','marker'] as const)('genera geometría finita para %s en ambas direcciones',kind=>{
 for(const points of [[{x:20,y:40},{x:150,y:200}],[{x:150,y:200},{x:20,y:40}]]){
  const path=shapePath(kind,points);expect(path.startsWith('M')).toBe(true);expect(path).not.toMatch(/NaN|Infinity|undefined/);
 }
});
test('un toque con el lápiz produce un punto visible',()=>{
 expect(shapePath('freehand',[{x:1,y:2},{x:1,y:2}])).toContain('l0.1,0.1');
});
test('deshacer y rehacer recuperan trazos completos y una edición nueva descarta el futuro',()=>{
 const empty={annotations:[],drawings:[]};const one={annotations:[],drawings:[arrow]};const changed={...one,drawings:[{...arrow,color:'rose' as const}]};
 const history=createMarkupHistory();history.record(empty);history.record(one);
 expect(history.undo(changed)).toEqual(one);expect(history.undo(one)).toEqual(empty);
 expect(history.redo(empty)).toEqual(one);history.record(one);expect(history.canRedo).toBe(false);
});
test('versiones anteriores se migran sin exigir dibujos',()=>{
 const {drawings,canvasHidden,drawingColor,drawingWeight,...old}=DEFAULT;
 expect(normalizeState({...old,version:2})).toEqual(DEFAULT);
});
test('un respaldo conserva el dibujo y se combina sin duplicarlo',()=>{
 const state={...DEFAULT,drawings:[arrow]};
 const imported=parseBackup(JSON.stringify({book:BOOK_KEY,state}));
 expect(imported).toEqual(state);expect(mergeBackup(state,imported)).toEqual(state);
 const newest={...arrow,color:'rose' as const,updatedAt:'2026-10-28T13:00:00Z'};
 expect(mergeBackup(state,{...state,drawings:[newest]}).drawings).toEqual([newest]);
});
test.each([
 {...arrow,points:[{block:block.id,x:Infinity,y:0},arrow.points[1]]},
 {...arrow,chapter:4},
 {...arrow,kind:'script'},
 {...arrow,weight:'2'},
 {...arrow,updatedAt:'invalid'},
 {...arrow,points:[arrow.points[0]]},
 {...arrow,points:[{block:'missing',x:.2,y:.3},arrow.points[1]]},
])('rechaza un dibujo inválido sin importar parcialmente el respaldo',drawing=>{
 expect(validDrawing(drawing)).toBe(false);
 expect(()=>parseBackup(JSON.stringify({book:BOOK_KEY,state:{...DEFAULT,drawings:[arrow,drawing]}}))).toThrow();
});
