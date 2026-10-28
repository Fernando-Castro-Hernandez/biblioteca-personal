import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = new URL('../../', import.meta.url);
const html = (await readFile(new URL('../dist/index.html', import.meta.url), 'utf8')).replace(/^[\t ]+$/gm, '');
if (/<script[^>]+src=|<link[^>]+rel="stylesheet"/.test(html)) throw new Error('La compilación debe ser autónoma para funcionar sin conexión.');
for (const [path, prefix, view] of [
  ['libros/fundamentos-ingenieria-software/lector/index.html', '../../../', 'reader'],
  ['lector/index.html', '../', 'reader'],
]) {
  const output = html.replace('data-root="../"', `data-root="${prefix}"`).replace('data-view="library"', `data-view="${view}"`);
  await mkdir(new URL('.', new URL(path, root)), { recursive: true });
  await writeFile(new URL(path, root), output);
  console.log('Actualizado:', path);
}
const entry = '<!doctype html><html lang="es"><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=libros/fundamentos-ingenieria-software/lector/index.html#biblioteca"><title>Mïo · Biblioteca de Fernando</title><p><a href="libros/fundamentos-ingenieria-software/lector/index.html#biblioteca">Abrir mi biblioteca</a></p></html>\n';
await writeFile(new URL('biblioteca.html', root), entry);
await writeFile(new URL('Abrir libro.html', root), entry);
console.log('Biblioteca local:', fileURLToPath(new URL('biblioteca.html', root)));
