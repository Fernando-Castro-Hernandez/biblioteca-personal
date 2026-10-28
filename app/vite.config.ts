import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { fileURLToPath } from 'node:url';
import { createReadStream, statSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';

const libraryRoot = resolve(fileURLToPath(new URL('../', import.meta.url)));
function serveBookAssets(server: Pick<import('vite').ViteDevServer, 'middlewares'>) {
    server.middlewares.use((req, res, next) => {
      const path = decodeURIComponent((req.url || '').split('?')[0]);
      if (!/^\/(libros\/fundamentos-ingenieria-software\/(lector\/assets|pdfs)\/|entregas\/fundamentos-ingenieria-software\/|docs\/imagenes\/)/.test(path)) return next();
      const file = resolve(libraryRoot, '.' + path);
      if (!file.startsWith(libraryRoot + sep) || path.split('/').some(p => p.startsWith('.'))) { res.statusCode = 403; res.end(); return; }
      try {
        if (!statSync(file).isFile()) return next();
        res.setHeader('Content-Type', ({'.png':'image/png','.jpg':'image/jpeg','.pdf':'application/pdf','.pptx':'application/vnd.openxmlformats-officedocument.presentationml.presentation'} as Record<string,string>)[extname(file)] || 'application/octet-stream');
        createReadStream(file).pipe(res);
      } catch { next(); }
    });
}
const localBookAssets = {
  name: 'local-book-assets',
  configureServer: serveBookAssets,
  configurePreviewServer: serveBookAssets,
};

export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile(), localBookAssets],
  base: './',
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: { fs: { allow: ['..'] } },
  build: { target: 'es2022', chunkSizeWarningLimit: 4000 },
  test: { environment: 'jsdom', include: ['tests/**/*.test.ts'], restoreMocks: true },
});
