# Mïo · Interfaz de la biblioteca

Lector local en React y TypeScript con componentes **shadcn/ui** sobre Radix y Tailwind CSS. La biblioteca, el cuaderno y las entregas comparten navegación y preferencias.

## Leer

Abrir `../biblioteca.html` con doble clic. Los accesos llevan al HTML canónico en `libros/fundamentos-ingenieria-software/lector/index.html`, para compartir las notas y la posición entre el estante y el lector. Mantener la carpeta completa: las imágenes, PDFs y presentaciones son archivos relativos.

El HTML compilado incluye JavaScript, estilos y texto del libro. No utiliza una CDN, fuentes remotas ni un servidor de datos. El almacenamiento de archivos locales depende del navegador: exportar un respaldo antes de mover la biblioteca o cambiar de navegador.

## Desarrollo

Utilizar Node.js 24 o posterior. Desde esta carpeta:

```sh
npm ci
npm run dev
npm test
npm run build
```

La dirección de desarrollo aparece en la terminal. `npm run preview` sirve la compilación después del build. Ambos servidores permiten consultar las imágenes, PDFs y entregas del repositorio.

`npm run build` comprueba TypeScript, compila con Vite y genera los archivos locales mediante `scripts/publish-local.mjs`. También actualiza `../lector/index.html`, una copia local ignorada por Git para conservar la ubicación usada por el lector anterior. No editar manualmente los HTML generados.

## Componentes shadcn/ui

Los componentes de `src/components/ui/` se incorporaron con la CLI oficial:

```sh
npx shadcn@latest add button badge card dialog sheet tabs input textarea label slider toggle-group separator dropdown-menu tooltip sonner --yes
```

`components.json` contiene la configuración. Se adaptaron los colores, la tipografía, los textos de cierre en español y la etiqueta accesible del control de tamaño de letra. Los paneles de anotación y ajustes usan Dialog; la navegación móvil usa Sheet; el cuaderno usa Tabs y Card.

## Modelo de lectura y anotaciones

- `src/lib/book.ts`: carga el contenido extraído, el índice y las rutas de recursos.
- `src/lib/annotations.ts`: captura la selección como rangos dentro de bloques; aplica colores y trazos conservando el formato del libro.
- `src/lib/storage.ts`: valida, migra y combina los datos de lectura y los respaldos.
- `src/components/Article.tsx`: representa el texto y conecta selección, edición e imágenes ampliables.
- `src/App.tsx`: estante, lector, cuaderno, entregas y navegación.

Cada anotación contiene capítulo, identificadores de bloque, posiciones de inicio y fin, texto seleccionado, color, trazo, grosor, nota y fechas. Hay cinco colores, cuatro trazos sobre el texto (resaltador, bolígrafo, lápiz discontinuo y ondulado) y tres grosores. El resaltador utiliza el grosor para variar su intensidad.

La selección puede atravesar párrafos y texto con formato. Si dos marcas coinciden, la más reciente queda visible; al eliminarla reaparece la anterior. Si cambia el texto original y ya no coincide con el pasaje guardado, esa marca no se aplica a otro contenido por aproximación.

La clave `fundamentos-reader-v1` se conserva para recuperar los datos anteriores; el contenido pasa a versión 2. Las notas, marcadores y preferencias existentes se migran. Los respaldos del lector anterior también se pueden importar. La importación combina por identificador y conserva los textos de las notas; no duplica una misma anotación al importar de nuevo el mismo archivo.

Los datos se guardan en el navegador, no en el repositorio. La vista de desarrollo HTTP y los archivos abiertos con doble clic pueden tener almacenamientos separados: utilizar Exportar/Importar para trasladar las notas.

## Verificación

`npm test` cubre selecciones entre párrafos y etiquetas, superposición de marcas, conservación del texto, los cuatro trazos, migración de datos anteriores, respaldos y errores de almacenamiento. La compilación comprueba que el HTML no dependa de archivos externos de JavaScript o CSS.

Para revisar la interfaz después de un cambio: seleccionar un pasaje, marcarlo, añadir una nota, editar su trazo, recargar, borrarlo y deshacer; después exportar e importar el respaldo. Revisar también el panel en pantalla estrecha y comprobar que las imágenes y enlaces a los PDFs sigan disponibles.
