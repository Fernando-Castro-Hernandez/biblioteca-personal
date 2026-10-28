# Fundamentos de la ingeniería de software

<img src="lector/assets/00-002-000.png" alt="Portada del libro" width="240" align="right">

**Nathaniel Schutta y Dan Vega · O’Reilly**

Un recorrido por el trabajo de ingeniería que acompaña a la programación: comprender sistemas existentes, escribir código que otras personas puedan leer, modelar, probar, colaborar y mantener software.

Mi lectura registrada abarca los **capítulos 1 al 5**. La copia local incluye los 15 capítulos y las secciones complementarias: **22 PDFs y 752 páginas de origen**.

**[Presentación de los capítulos 1–5](../../entregas/fundamentos-ingenieria-software/capitulos-01-05/README.md)**

Para leer sin conexión, abrir `lector/index.html` en un navegador. No necesita instalación. Los PDF originales también se pueden abrir desde el lector.

<br clear="right">

## PDFs en orden de lectura

| Orden | Sección | Páginas |
| --- | --- | ---: |
| 00 | [Portada](pdfs/00-portada.pdf) | 3 |
| 01 | [Elogios](pdfs/01-elogios.pdf) | 3 |
| 02 | [Créditos y derechos](pdfs/02-creditos-y-derechos.pdf) | 3 |
| 03 | [Prefacio](pdfs/03-prefacio.pdf) | 16 |
| 04 | [1. De programador a ingeniero](pdfs/04-capitulo-01-de-programador-a-ingeniero.pdf) | 26 |
| 05 | [2. Lectura de código](pdfs/05-capitulo-02-lectura-de-codigo.pdf) | 39 |
| 06 | [3. Escribir código](pdfs/06-capitulo-03-escribir-codigo.pdf) | 36 |
| 07 | [4. Modelado](pdfs/07-capitulo-04-modelado.pdf) | 32 |
| 08 | [5. Pruebas automatizadas](pdfs/08-capitulo-05-pruebas-automatizadas.pdf) | 34 |
| 09 | [6. Exploración y modificación de sistemas desconocidos](pdfs/09-capitulo-06-exploracion-y-modificacion-de-sistemas-desconocidos.pdf) | 53 |
| 10 | [7. Diseño de la interfaz de usuario](pdfs/10-capitulo-07-diseno-de-la-interfaz-de-usuario.pdf) | 51 |
| 11 | [8. Trabajar con datos](pdfs/11-capitulo-08-trabajar-con-datos.pdf) | 88 |
| 12 | [9. Arquitectura de software](pdfs/12-capitulo-09-arquitectura-de-software.pdf) | 34 |
| 13 | [10. A producción](pdfs/13-capitulo-10-a-produccion.pdf) | 73 |
| 14 | [11. Aumentar tu productividad](pdfs/14-capitulo-11-aumentar-tu-productividad.pdf) | 25 |
| 15 | [12. Aprender a aprender](pdfs/15-capitulo-12-aprender-a-aprender.pdf) | 32 |
| 16 | [13. Dominar las habilidades sociales en el mundo tecnológico](pdfs/16-capitulo-13-dominar-las-habilidades-sociales-en-el-mundo-tecnologico.pdf) | 37 |
| 17 | [14. Gestión de la carrera profesional](pdfs/17-capitulo-14-gestion-de-la-carrera-profesional.pdf) | 70 |
| 18 | [15. El ingeniero de software impulsado por la IA](pdfs/18-capitulo-15-el-ingeniero-de-software-impulsado-por-la-ia.pdf) | 56 |
| 19 | [Índice alfabético](pdfs/19-indice-alfabetico.pdf) | 37 |
| 20 | [Acerca de los autores](pdfs/20-acerca-de-los-autores.pdf) | 2 |
| 21 | [Colofón](pdfs/21-colofon.pdf) | 2 |

## Lector interactivo

- Índice por capítulos y secciones; búsqueda en todo el libro.
- Temas claro, sepia y oscuro; ajustes de tipografía, tamaño, interlineado y ancho.
- Subrayados en cinco colores y cuatro trazos, con tres grosores.
- Notas asociadas a pasajes, edición y borrado con opción de deshacer.
- Lienzo con lápiz libre, marcador, flechas, rectángulos, elipses y borrador.
- Menú semicircular lateral plegable y ocultable; selección, movimiento, duplicado y edición de dibujos.
- Marcas sobre imágenes que también se ven al ampliarlas; dibujos incluidos en los respaldos.
- Cuaderno con búsqueda, filtro por capítulo y acceso al texto original.
- Marcadores, notas por capítulo y recuperación de posición.
- Modo enfoque e imágenes ampliables.
- Exportación e importación de anotaciones, notas y marcadores desde **Ajustes de lectura**.

Los datos personales de lectura permanecen en el almacenamiento del navegador. Exportar un respaldo antes de cambiar de navegador, mover la carpeta o borrar sus datos.

La conversión reorganiza los archivos, une líneas partidas y conserva las imágenes. Mantiene el orden interno de las páginas suministradas y las particularidades de la traducción de origen. Para revisar el diseño exacto, consultar el PDF correspondiente.

## Reconstruir el lector

La extracción de los PDF utiliza Python; la interfaz React con shadcn/ui se compila con Node.js. **Leer el HTML ya generado no requiere instalar ninguno de los dos**.

Desde esta carpeta:

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r herramientas/requirements.txt
.venv/bin/python herramientas/crear_lector.py
npm --prefix ../../app ci
npm --prefix ../../app run build
```

`pdfs/indice.json` establece el orden y los títulos. El generador extrae las imágenes, `herramientas/book.json` y el informe `lector/conversion.json`. La compilación de `app/` incorpora ese contenido a `lector/index.html` y actualiza los accesos a la biblioteca. Para cambiar solo la interfaz no es necesario repetir la extracción. Consulta la [guía técnica](../../app/README.md).

Las figuras y la portada proceden de los PDFs suministrados. Se conserva su autoría original.

[← Volver a la biblioteca](../../README.md)
