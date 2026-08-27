# src/assets/

Imágenes que Astro optimiza en construcción. Se importan con `import` o se
resuelven desde `src/lib/imagenes.ts`, nunca se referencian por URL.

## Dos tipos de imagen, dos sitios

**Imágenes de CONTENIDO** — pertenecen a una entrada de una colección. Van en una
subcarpeta con el nombre de la familia y el archivo se llama **igual que el slug**
de la entrada:

```
src/assets/servicios/auditoria-anual.webp   → servicio `auditoria-anual`
src/assets/articulos/como-elegimos.webp     → artículo `como-elegimos`
src/assets/equipo/ana-torres.webp           → persona `ana-torres`
```

Esa correspondencia de nombres es todo el contrato: no hay ningún índice que
mantener. `imagenes.ts` las encuentra sola, y si el archivo no existe, la página
degrada a su marca gráfica en vez de romperse.

**Imágenes de PÁGINA** — heroes, fondos, ilustraciones. Se reutilizan entre
páginas, así que no pertenecen a ninguna entrada: van en la raíz de esta carpeta y
se importan directamente donde se usan.

```astro
import portada from '../assets/hero.webp';
```

## Cómo entran

No copies archivos aquí a mano. Suéltalos en `imagenes-entrada/<familia>/` y
ejecuta:

```bash
npm run imagenes
```

El script recorta al preset de la familia, convierte a WebP, **quita los metadatos
EXIF** —que en una foto de móvil incluyen coordenadas GPS— y deja el archivo aquí
con el nombre ya normalizado. Un JPEG de cámara sin pasar por ahí son ocho
megabytes en el historial de git para siempre.

## El texto alternativo no vive aquí

Va en el frontmatter de la entrada (`portadaAlt`) o en el campo `alt` del asset
del CMS. Describir una imagen es una decisión sobre el contenido, no sobre el
archivo, y sin alt `imagenes.ts` prefiere no publicar la imagen antes que
publicarla muda.
